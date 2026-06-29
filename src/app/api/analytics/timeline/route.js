import { NextResponse } from "next/server";
import redis from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const endpoints = ["/api/demo/users", "/api/demo/products", "/api/demo/orders"];

    // Scan for timeline keys
    const timelineData = {};
    const pipeline = redis.pipeline();

    // Get the current time bucket to know what to request
    // We'll fetch the last 24 5-minute intervals
    const nowMs = Date.now();
    const coeff = 1000 * 60 * 5;

    for (let i = 0; i < 24; i++) {
      const rounded = new Date(Math.floor((nowMs - i * coeff) / coeff) * coeff);
      const timeBucket = rounded.toISOString().slice(0, 16);

      for (const ep of endpoints) {
        pipeline.get(`api:hits:timeline:${ep}:${timeBucket}`);
      }
    }

    const results = await pipeline.exec();

    // Reconstruct into a flat timeline array
    // results is a flat array corresponding to 24 * 3 get requests
    let resultIndex = 0;
    for (let i = 0; i < 24; i++) {
      const rounded = new Date(Math.floor((nowMs - i * coeff) / coeff) * coeff);
      const timeBucket = rounded.toISOString().slice(0, 16);

      for (const ep of endpoints) {
        // pipeline results are [err, data]
        if (results[resultIndex] && results[resultIndex][1]) {
          if (!timelineData[timeBucket]) {
            timelineData[timeBucket] = { time: timeBucket };
          }
          const name = ep.split("/").pop(); // "users", "products", "orders"
          timelineData[timeBucket][name] = parseInt(results[resultIndex][1]) || 0;
        }
        resultIndex++;
      }
    }

    // Fill missing values with 0 and ensure last 24 (5-minute) intervals exist
    const timeline = [];
    
    // Generate the last 24 intervals (2 hours)
    for (let i = 23; i >= 0; i--) {
      const rounded = new Date(Math.floor((nowMs - i * coeff) / coeff) * coeff);
      const timeBucket = rounded.toISOString().slice(0, 16);
      
      const existing = timelineData[timeBucket] || {};
      timeline.push({
        hour: timeBucket, // Keeping 'hour' key name for frontend compatibility, though it represents a 5min bucket
        users: existing.users || 0,
        products: existing.products || 0,
        orders: existing.orders || 0,
      });
    }

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error("Timeline analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline analytics", timeline: [] },
      { status: 500 }
    );
  }
}
