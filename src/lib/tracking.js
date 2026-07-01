import { NextResponse } from "next/server";
import { headers } from "next/headers";
import redis from "@/lib/redis";
import { checkRateLimit, BLOCK_DURATION_S } from "@/lib/rateLimit";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { emitHit, emitThrottle, emitGeo, emitLatency } from "@/lib/socketEmitter";

// Predefined geo-data for well-known public DNS IPs (for demo)
const KNOWN_IPS = {
  "8.8.8.8": { lat: 37.386, lng: -122.084, city: "Mountain View", country: "US" },
  "8.8.4.4": { lat: 37.386, lng: -122.084, city: "Mountain View", country: "US" },
  "1.1.1.1": { lat: -33.868, lng: 151.207, city: "Sydney", country: "AU" },
  "208.67.222.222": { lat: 37.774, lng: -122.419, city: "San Francisco", country: "US" },
  "9.9.9.9": { lat: 40.724, lng: -74.001, city: "New York", country: "US" },
  "185.228.168.9": { lat: 50.110, lng: 8.682, city: "Frankfurt", country: "DE" },
  "77.88.8.8": { lat: 55.756, lng: 37.617, city: "Moscow", country: "RU" },
  "101.101.101.101": { lat: 25.033, lng: 121.565, city: "Taipei", country: "TW" },
  "223.5.5.5": { lat: 30.294, lng: 120.161, city: "Hangzhou", country: "CN" },
  "156.154.70.1": { lat: 38.907, lng: -77.037, city: "Washington", country: "US" },
  "114.114.114.114": { lat: 31.230, lng: 121.474, city: "Shanghai", country: "CN" },
  "94.140.14.14": { lat: 35.167, lng: 33.367, city: "Nicosia", country: "CY" },
  "76.76.19.19": { lat: 34.052, lng: -118.244, city: "Los Angeles", country: "US" },
  "203.0.113.42": { lat: 51.507, lng: -0.128, city: "London", country: "GB" },
};

function resolveGeo(ip) {
  return KNOWN_IPS[ip] || null;
}

/**
 * Shared tracking logic for all demo API endpoints.
 */
export async function trackRequest(request, endpoint) {
  const headersList = await headers();

  const apiKey = headersList.get("x-api-key");

  {/* if the api-key is not found on the header then throw error */ }
  if (!apiKey) {
    console.error("[Tracking] Missing x-api-key header");
    return NextResponse.json(
      { error: "Unauthorized. Missing x-api-key header." },
      { status: 401 }
    );
  }

  // Redis Auth Cache: Check if we know this API Key and its plan
  let plan = await redis.get(`auth:${apiKey}`);

  {/* CACHE MISS! query mongoDB */ }
  if (!plan) {
    await connectDB();
    const user = await User.findOne({ apiKey });

    {/* if user is not found in db then throw error */ }
    if (!user) {
      console.error(`[Tracking] Invalid API Key in DB: ${apiKey}`);
      return NextResponse.json(
        { error: "Unauthorized. Invalid API Key." },
        { status: 401 }
      );
    }

    plan = user.plan || "free";
    // Cache it for 1 hour to ensure sub-2ms latency on subsequent hits
    await redis.setex(`auth:${apiKey}`, 3600, plan);
  }


  // Rate limit check based on API Key and Plan
  const rateLimitResult = await checkRateLimit(apiKey, plan);

  // Simply grab the simulated IP from our frontend ApiTester, or default to localhost
  let ip = headersList.get("x-simulated-ip") || "127.0.0.1";

  {/* the rate limit is exceeded */ }
  if (!rateLimitResult.allowed) {
    // If newly blocked, log the throttle event to Redis
    if (rateLimitResult.newlyBlocked) {
      const geo = resolveGeo(ip);
      try {
        const throttleData = {
          ip: ip, // Log the IP address that got blocked
          endpoint,
          reason: `Exceeded ${rateLimitResult.total} requests/minute (${plan} plan)`,
          blockedUntil: new Date(Date.now() + BLOCK_DURATION_S * 1000).toISOString(),
          city: geo?.city || "Unknown", //city in which the ip address lies
          country: geo?.country || "Unknown", //country in which the ip address lies
          timestamp: new Date().toISOString(),
        };
        const throttleEntry = JSON.stringify(throttleData);
        await redis.lpush("throttle:logs", throttleEntry);
        await redis.ltrim("throttle:logs", 0, 99); // Keep last 100 entries
        await redis.sadd("throttle:ips", apiKey); // adding the blocked api key in the set "throttle:ips"

        // 🔌 Real-time push: throttle event via socket
        emitThrottle(throttleData);
      } catch (e) {
        console.error("Failed to log throttle event:", e.message);
      }
    }

    return NextResponse.json(
      {
        error: `Rate limit exceeded. Please upgrade your plan to increase limits.`,
        retryAfter: rateLimitResult.blocked ? "5 minutes" : "60 seconds",
      },
      {
        status: 429,
      }
    );
  }

  // Track the hit in Redis -> if the user is NOT rate limited then track the hit to update the graphs
  let newHitCount = 0;
  try {
    const nowMs = Date.now();
    const coeff = 1000 * 60 * 5; // 5 minutes
    const rounded = new Date(Math.floor(nowMs / coeff) * coeff);  //rounded off to the nearest 5 minutes
    {/* any request that happend between the 5 min interval lie in the same time bucket */ }
    const timeBucket = rounded.toISOString().slice(0, 16); // e.g. "2026-06-29T12:35"

    // 1. Add +1 to the total hits counter
    const hitCount = await redis.incr(`api:hits:${endpoint}`);

    // 2. Add +1 to this specific 5-minute bucket (used for timeline graphs)
    const bucketCount = await redis.incr(`api:hits:timeline:${endpoint}:${timeBucket}`);

    // 3. Make sure the 5-minute bucket auto-deletes after 7 days to save database memory
    await redis.expire(`api:hits:timeline:${endpoint}:${timeBucket}`, 24 * 60 * 60);
    newHitCount = hitCount;

    // 🔌 Real-time push: hit event
    emitHit(endpoint, newHitCount, timeBucket, bucketCount);
  } catch (error) {
    console.error("Tracking Redis error:", error.message);
  }

  // Geo-IP tracking in Redis (non-blocking)
  const geo = resolveGeo(ip);
  if (geo) {
    try {
      const geoData = {
        ip,
        endpoint,
        lat: geo.lat,
        lng: geo.lng,
        city: geo.city,
        country: geo.country,
        timestamp: new Date().toISOString(),
      };
      const geoEntry = JSON.stringify(geoData);
      await redis.lpush("geo:hits", geoEntry);
      //we have trimmed by length and not by time becasue if in small duration too many
      //requests arrive then mapping them can cause server crash
      await redis.ltrim("geo:hits", 0, 999); // Keep last 1000
      await redis.sadd("geo:countries", geo.country);//to show live country count

      // 🔌 Real-time push: geo event
      emitGeo(geoData);
    } catch (e) {
      console.error("Failed to save geo hit:", e.message);
    }
  }

  return null; // No rate limit issue, continue to response
}


export async function recordLatency(endpoint, latencyMs) {
  try {
    const key = `api:latency:${endpoint}`;
    // Push new latency to the list
    await redis.lpush(key, Math.round(latencyMs));
    // Trim list to keep only the most recent 1000 requests
    await redis.ltrim(key, 0, 999);

    // 🔌 Real-time push: latency event
    emitLatency(endpoint, Math.round(latencyMs));
  } catch (err) {
    console.error("Failed to record latency:", err.message);
  }
}
