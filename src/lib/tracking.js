import { NextResponse } from "next/server";
import { headers } from "next/headers";
import redis from "@/lib/redis";
import { checkRateLimit, BLOCK_DURATION_S } from "@/lib/rateLimit";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { emitHit, emitThrottle, emitGeo } from "@/lib/socketEmitter";

// Predefined geo-data for well-known public DNS IPs (for demo)
const KNOWN_IPS = {
  "8.8.8.8":         { lat: 37.386, lng: -122.084, city: "Mountain View", country: "US" },
  "8.8.4.4":         { lat: 37.386, lng: -122.084, city: "Mountain View", country: "US" },
  "1.1.1.1":         { lat: -33.868, lng: 151.207, city: "Sydney", country: "AU" },
  "208.67.222.222":  { lat: 37.774, lng: -122.419, city: "San Francisco", country: "US" },
  "9.9.9.9":         { lat: 40.724, lng: -74.001, city: "New York", country: "US" },
  "185.228.168.9":   { lat: 50.110, lng: 8.682, city: "Frankfurt", country: "DE" },
  "77.88.8.8":       { lat: 55.756, lng: 37.617, city: "Moscow", country: "RU" },
  "101.101.101.101": { lat: 25.033, lng: 121.565, city: "Taipei", country: "TW" },
  "223.5.5.5":       { lat: 30.294, lng: 120.161, city: "Hangzhou", country: "CN" },
  "156.154.70.1":    { lat: 38.907, lng: -77.037, city: "Washington", country: "US" },
  "114.114.114.114": { lat: 31.230, lng: 121.474, city: "Shanghai", country: "CN" },
  "94.140.14.14":    { lat: 35.167, lng: 33.367, city: "Nicosia", country: "CY" },
  "76.76.19.19":     { lat: 34.052, lng: -118.244, city: "Los Angeles", country: "US" },
  "203.0.113.42":    { lat: 51.507, lng: -0.128, city: "London", country: "GB" },
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
  
  if (!apiKey) {
    console.error("[Tracking] Missing x-api-key header");
    return NextResponse.json(
      { error: "Unauthorized. Missing x-api-key header." },
      { status: 401 }
    );
  }

  // Redis Auth Cache: Check if we know this API Key and its plan
  let plan = await redis.get(`auth:${apiKey}`);
  
  if (!plan) {
    // Cache miss! Query MongoDB
    await connectDB();
    const user = await User.findOne({ apiKey });
    
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

  let ip =
    headersList.get("x-simulated-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "127.0.0.1";

  if (!rateLimitResult.allowed) {
    // If newly blocked, log the throttle event to Redis
    if (rateLimitResult.newlyBlocked) {
      const geo = resolveGeo(ip);
      try {
        const throttleData = {
          ip: apiKey.slice(0, 15) + "...", // Log partial API key instead of IP for security demo
          endpoint,
          reason: `Exceeded ${rateLimitResult.total} requests/minute (${plan} plan)`,
          blockedUntil: new Date(Date.now() + BLOCK_DURATION_S * 1000).toISOString(),
          city: geo?.city || "Unknown",
          country: geo?.country || "Unknown",
          timestamp: new Date().toISOString(),
        };
        const throttleEntry = JSON.stringify(throttleData);
        await redis.lpush("throttle:logs", throttleEntry);
        await redis.ltrim("throttle:logs", 0, 99); // Keep last 100 entries
        await redis.sadd("throttle:ips", apiKey); // Actually tracking API keys now, but reusing set name

        // 🔌 Real-time push: throttle event
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
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.total),
          "X-RateLimit-Remaining": "0",
          "Retry-After": rateLimitResult.blocked ? "300" : "60",
        },
      }
    );
  }

  // Track the hit in Redis
  let newHitCount = 0;
  try {
    const nowMs = Date.now();
    const coeff = 1000 * 60 * 5; // 5 minutes
    const rounded = new Date(Math.floor(nowMs / coeff) * coeff);
    const timeBucket = rounded.toISOString().slice(0, 16); // e.g. "2026-06-29T12:35"
    
    const [hitCount] = await Promise.all([
      redis.incr(`api:hits:${endpoint}`),
      redis.incr(`api:hits:timeline:${endpoint}:${timeBucket}`),
      redis.expire(`api:hits:timeline:${endpoint}:${timeBucket}`, 7 * 24 * 60 * 60),
    ]);
    newHitCount = hitCount;

    // 🔌 Real-time push: hit event
    emitHit(endpoint, newHitCount);
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
      await redis.ltrim("geo:hits", 0, 999); // Keep last 1000
      await redis.sadd("geo:countries", geo.country);

      // 🔌 Real-time push: geo event
      emitGeo(geoData);
    } catch (e) {
      console.error("Failed to save geo hit:", e.message);
    }
  }

  return null; // No rate limit issue, continue to response
}
