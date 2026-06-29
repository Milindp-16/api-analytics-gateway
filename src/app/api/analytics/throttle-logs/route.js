import { NextResponse } from "next/server";
import redis from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get throttle logs from Redis list
    const rawLogs = await redis.lrange("throttle:logs", 0, 99);
    const logs = rawLogs.map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);

    // Get unique blocked IPs
    const uniqueIPs = await redis.smembers("throttle:ips");

    return NextResponse.json({
      logs,
      totalEvents: logs.length,
      uniqueBlockedIPs: uniqueIPs.length,
    });
  } catch (error) {
    console.error("Throttle logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch throttle logs", logs: [], totalEvents: 0, uniqueBlockedIPs: 0 },
      { status: 500 }
    );
  }
}
