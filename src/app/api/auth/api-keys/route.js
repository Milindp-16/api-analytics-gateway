import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import redis from "@/lib/redis";

// Helper to authenticate user -> is the user is logged in it return userId
async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

//when user opens the dashboard, the frontend calls this route to fetch the API key 
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

//when user clicks generate API_KEY this action hits
export async function POST() {
  try {
    const userId = await getAuthUser();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Generate a secure, unique API key by using Node's built-in crypto library
    const newApiKey = "api_live_" + crypto.randomBytes(24).toString("hex");

    // If user already had an API key, we should invalidate the old one in Redis Cache
    if (user.apiKey) {
      await redis.del(`auth:${user.apiKey}`);
    }

    user.apiKey = newApiKey;
    await user.save(); //save the details in the db

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

//when user clicks the 'upgrade to pro' button the below code runs
export async function PUT(request) {
  try {
    const userId = await getAuthUser();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({})); //if the frontend sends empty data then the catch handles tha part
    const targetPlan = body.plan === "free" ? "free" : "pro"; // default to pro for backward compatibility

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Update the user's subscription plan
    user.plan = targetPlan;
    await user.save();

    // Update the Redis cache and clear any stale rate-limit state
    //during update as well as downgrade we are clearing thr redis cache for that paticular key
    if (user.apiKey) {
      await redis.setex(`auth:${user.apiKey}`, 3600, targetPlan);
      // Clear any block from the free plan so Pro takes effect immediately
      await redis.del(`blocked:key:${user.apiKey}`);
      // Clear the sliding-window counter so old free-plan hits don't carry over
      await redis.del(`ratelimit:key:${user.apiKey}`);
    }

    return NextResponse.json({
      message: targetPlan === "pro" ? "Upgraded to Pro successfully!" : "Downgraded to Free plan.",
      plan: user.plan,
    });
  } catch (error) {
    console.error("API Key PUT Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
