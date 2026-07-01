import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient = null;

function createClient() {
  const isTLS = REDIS_URL.startsWith("rediss://");

  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    ...(isTLS && {
      tls: { rejectUnauthorized: false },
    }),
  });

  client.on("connect", () => {
    console.log("[Redis] Connected successfully.");
  });

  client.on("error", (err) => {
    console.error("[Redis] Connection Error:", err.message);
    // Let the app crash or handle errors naturally instead of masking them
  });

  return client;
}

if (process.env.NODE_ENV !== "production") {
  // Prevent hot-reloading from creating multiple connections in dev mode
  if (!global.__redisClient) {
    global.__redisClient = createClient();
  }
  redisClient = global.__redisClient;
} else {
  redisClient = createClient();
}

export default redisClient;
