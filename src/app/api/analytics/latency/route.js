import { NextResponse } from "next/server";
import redis from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const endpoints = ["/api/demo/users", "/api/demo/products", "/api/demo/orders"];
    const pipeline = redis.pipeline();

    for (const ep of endpoints) {
      pipeline.lrange(`api:latency:${ep}`, 0, -1);
    }

    const results = await pipeline.exec();
    const latencyData = {};

    endpoints.forEach((ep, index) => {
      // results[index] is [err, data]
      let data = [];
      if (results[index] && results[index][1]) {
        data = results[index][1].map(Number);
      }
      latencyData[ep] = data;
    });

    return NextResponse.json({ latencyData });
  } catch (error) {
    console.error("Latency analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch latency analytics" },
      { status: 500 }
    );
  }
}
