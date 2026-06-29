import { NextResponse } from "next/server";
import redis from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get all endpoint hit counters from Redis
    const endpoints = ["/api/demo/users", "/api/demo/products", "/api/demo/orders"];
    
    const pipeline = redis.pipeline();

    for (const ep of endpoints) {
      pipeline.get(`api:hits:${ep}`);
    }

    const results = await pipeline.exec();

    const hits = endpoints.map((endpoint, i) => ({
      endpoint,
      name: endpoint.split("/").pop(), // "users", "products", "orders"
      count: parseInt(results[i][1]) || 0,
    }));

    const totalHits = hits.reduce((sum, h) => sum + h.count, 0);

    return NextResponse.json({ hits, totalHits });
  } catch (error) {
    console.error("Hits analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hit analytics", hits: [], totalHits: 0 },
      { status: 500 }
    );
  }
}
