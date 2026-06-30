import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import redis from "@/lib/redis";

// Helper to authenticate user
async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

export async function GET() {
  try {
    const userId = await getAuthUser();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(userId).select("apiKey plan");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      apiKey: user.apiKey || null,
      plan: user.plan || "free",
    });
  } catch (error) {
    console.error("API Key GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const userId = await getAuthUser();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Generate a secure, unique API key
    const newApiKey = "api_live_" + crypto.randomBytes(24).toString("hex");
    
    // If user already had an API key, we should invalidate the old one in Redis Cache
    if (user.apiKey) {
      await redis.del(`auth:${user.apiKey}`);
    }

    user.apiKey = newApiKey;
    await user.save();

    // Cache the new key in Redis for auth lookups
    await redis.setex(`auth:${newApiKey}`, 3600, user.plan);

    return NextResponse.json({
      apiKey: user.apiKey,
      plan: user.plan,
    });
  } catch (error) {
    console.error("API Key POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT() {
  try {
    const userId = await getAuthUser();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Simulate Stripe payment success by immediately upgrading them
    user.plan = "pro";
    await user.save();

    // Update the Redis cache and clear any stale rate-limit state
    if (user.apiKey) {
      await redis.setex(`auth:${user.apiKey}`, 3600, "pro");
      // Clear any block from the free plan so Pro takes effect immediately
      await redis.del(`blocked:key:${user.apiKey}`);
      // Clear the sliding-window counter so old free-plan hits don't carry over
      await redis.del(`ratelimit:key:${user.apiKey}`);
    }

    return NextResponse.json({
      message: "Upgraded to Pro successfully!",
      plan: user.plan,
    });
  } catch (error) {
    console.error("API Key PUT Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
