import { readFileSync } from 'fs';
import { parse } from 'dotenv';
import Redis from 'ioredis';

const env = parse(readFileSync('.env.local'));
const REDIS_URL = env.REDIS_URL;

if (!REDIS_URL) {
  console.log("No REDIS_URL found in .env.local");
  process.exit(1);
}

console.log("Testing connection to:", REDIS_URL.split('@').pop() || REDIS_URL); // Don't log password

const client = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

client.on('connect', () => {
  console.log("✅ Successfully connected to Redis!");
  client.set('test_key', 'working', 'EX', 10).then(() => {
    console.log("✅ Successfully wrote to Redis!");
    process.exit(0);
  }).catch(err => {
    console.error("❌ Failed to write to Redis:", err.message);
    process.exit(1);
  });
});

client.on('error', (err) => {
  console.error("❌ Redis Connection Error:", err.message);
  process.exit(1);
});
