import { NextResponse } from "next/server";
import redis from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get all geo hits from Redis list
    const rawHits = await redis.lrange("geo:hits", 0, 999);
    const hits = rawHits.map((h) => {
      try { return JSON.parse(h); } catch { return null; }
    }).filter(Boolean);

    // Aggregate by location
    const locationMap = {};
    for (const hit of hits) {
      const key = `${hit.lat}:${hit.lng}`;
      if (!locationMap[key]) {
        locationMap[key] = {
          lat: hit.lat,
          lng: hit.lng,
          city: hit.city,
          country: hit.country,
          count: 0,
          lastHit: hit.timestamp,
        };
      }
      locationMap[key].count++;
      if (hit.timestamp > locationMap[key].lastHit) {
        locationMap[key].lastHit = hit.timestamp;
      }
    }

    const geoData = Object.values(locationMap).sort((a, b) => b.count - a.count);

    // Get unique countries
    const countries = await redis.smembers("geo:countries");

    return NextResponse.json({
      geoData,
      totalLocations: geoData.length,
      uniqueCountries: countries.filter((c) => c !== "Unknown").length,
    });
  } catch (error) {
    console.error("Geo analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch geo analytics", geoData: [], totalLocations: 0, uniqueCountries: 0 },
      { status: 500 }
    );
  }
}
