import redis from "@/lib/redis";

const WINDOW_SIZE_MS = 60 * 1000; // 60 seconds
const BLOCK_DURATION_S = 5 * 60;  // 5 minutes block

const LIMITS = {
  free: 50,
  pro: 1000,
};

/**
 * Sliding window rate limiter using Redis sorted sets.
 * @param {string} apiKey - The client API Key
 * @param {string} plan - The user's billing plan ("free" | "pro")
 * @returns {{ allowed: boolean, remaining: number, total: number, blocked: boolean }}
 */
export async function checkRateLimit(apiKey, plan = "free") {
  const maxRequests = LIMITS[plan] || LIMITS.free;

  try {
    const key = `ratelimit:key:${apiKey}`;
    const blockKey = `blocked:key:${apiKey}`;

    // Check if key is already blocked
    const isBlocked = await redis.get(blockKey);
    if (isBlocked) {
      return { allowed: false, remaining: 0, total: maxRequests, blocked: true };
    }

    const now = Date.now();
    const windowStart = now - WINDOW_SIZE_MS;

    // Use a Redis pipeline for atomicity
    const pipeline = redis.pipeline();
    // Remove entries outside the sliding window
    pipeline.zremrangebyscore(key, 0, windowStart);
    // Add the current request
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    // Count requests in the window
    pipeline.zcard(key);
    // Set expiry on the sorted set
    pipeline.expire(key, Math.ceil(WINDOW_SIZE_MS / 1000) + 1);

    const results = await pipeline.exec();
    const requestCount = results[2][1]; // zcard result

    if (requestCount > maxRequests) {
      // Block the API Key
      await redis.setex(blockKey, BLOCK_DURATION_S, "1");

      return {
        allowed: false,
        remaining: 0,
        total: maxRequests,
        blocked: false, // just became blocked
        newlyBlocked: true,
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - requestCount,
      total: maxRequests,
      blocked: false,
    };
  } catch (error) {
    console.error("Rate limit Redis error (failing open):", error.message);
    return {
      allowed: true,
      remaining: maxRequests,
      total: maxRequests,
      blocked: false,
    };
  }
}

export { WINDOW_SIZE_MS, LIMITS, BLOCK_DURATION_S };
