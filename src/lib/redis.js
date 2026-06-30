import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/**
 * In-memory fallback store that mimics a subset of Redis commands.
 * Used when the real Redis connection is unavailable.
 */
class InMemoryStore {
  constructor() {
    this._data = new Map();
    this._expiry = new Map();
    console.warn("[Redis] Using in-memory fallback — data will not persist across restarts.");
  }

  _isExpired(key) {
    const exp = this._expiry.get(key);
    if (exp && Date.now() > exp) {
      this._data.delete(key);
      this._expiry.delete(key);
      return true;
    }
    return false;
  }

  get(key) {
    this._isExpired(key);
    const val = this._data.get(key);
    return Promise.resolve(val !== undefined ? String(val) : null);
  }

  set(key, value) {
    this._data.set(key, value);
    return Promise.resolve("OK");
  }

  del(...keys) {
    let removed = 0;
    for (const k of keys) {
      if (this._data.delete(k)) removed++;
      this._expiry.delete(k);
    }
    return Promise.resolve(removed);
  }

  setex(key, seconds, value) {
    this._data.set(key, value);
    this._expiry.set(key, Date.now() + seconds * 1000);
    return Promise.resolve("OK");
  }

  incr(key) {
    this._isExpired(key);
    const val = parseInt(this._data.get(key) || "0") + 1;
    this._data.set(key, String(val));
    return Promise.resolve(val);
  }

  expire(key, seconds) {
    this._expiry.set(key, Date.now() + seconds * 1000);
    return Promise.resolve(1);
  }

  lpush(key, ...values) {
    this._isExpired(key);
    let list = this._data.get(key);
    if (!Array.isArray(list)) list = [];
    list.unshift(...values);
    this._data.set(key, list);
    return Promise.resolve(list.length);
  }

  lrange(key, start, stop) {
    this._isExpired(key);
    const list = this._data.get(key);
    if (!Array.isArray(list)) return Promise.resolve([]);
    if (stop === -1) stop = list.length - 1;
    return Promise.resolve(list.slice(start, stop + 1));
  }

  ltrim(key, start, stop) {
    this._isExpired(key);
    const list = this._data.get(key);
    if (!Array.isArray(list)) return Promise.resolve("OK");
    if (stop === -1) stop = list.length - 1;
    this._data.set(key, list.slice(start, stop + 1));
    return Promise.resolve("OK");
  }

  zadd(key, score, member) {
    this._isExpired(key);
    let zset = this._data.get(key);
    if (!(zset instanceof Map)) zset = new Map();
    zset.set(member, score);
    this._data.set(key, zset);
    return Promise.resolve(1);
  }

  zcard(key) {
    this._isExpired(key);
    const zset = this._data.get(key);
    if (!(zset instanceof Map)) return Promise.resolve(0);
    return Promise.resolve(zset.size);
  }

  zremrangebyscore(key, min, max) {
    this._isExpired(key);
    const zset = this._data.get(key);
    if (!(zset instanceof Map)) return Promise.resolve(0);
    let removed = 0;
    for (const [member, score] of zset) {
      if (score >= min && score <= max) {
        zset.delete(member);
        removed++;
      }
    }
    return Promise.resolve(removed);
  }

  scan(cursor, _match, pattern, _count, _countVal) {
    const results = [];
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this._data.keys()) {
      if (typeof key === "string" && regex.test(key)) results.push(key);
    }
    return Promise.resolve(["0", results]);
  }

  sadd(key, ...members) {
    this._isExpired(key);
    let set = this._data.get(key);
    if (!(set instanceof Set)) set = new Set();
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) { set.add(m); added++; }
    }
    this._data.set(key, set);
    return Promise.resolve(added);
  }

  smembers(key) {
    this._isExpired(key);
    const set = this._data.get(key);
    if (!(set instanceof Set)) return Promise.resolve([]);
    return Promise.resolve([...set]);
  }

  scard(key) {
    this._isExpired(key);
    const set = this._data.get(key);
    if (!(set instanceof Set)) return Promise.resolve(0);
    return Promise.resolve(set.size);
  }

  pipeline() {
    const commands = [];
    const self = this;
    const p = {};
    // Dynamically create chainable methods for all commands
    const methods = [
      "get", "set", "incr", "expire", "zadd", "zcard",
      "zremrangebyscore", "setex", "lpush", "lrange", "ltrim",
      "sadd", "smembers", "scard",
    ];
    for (const method of methods) {
      p[method] = (...args) => {
        commands.push([method, args]);
        return p;
      };
    }
    p.exec = async () => {
      const results = [];
      for (const [cmd, args] of commands) {
        try {
          const result = await self[cmd](...args);
          results.push([null, result]);
        } catch (e) {
          results.push([e, null]);
        }
      }
      return results;
    };
    return p;
  }
}

// ---- Connection logic ----

let redis = null;

function createClient() {
  const isTLS = REDIS_URL.startsWith("rediss://");

  try {
    const client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: true,
      ...(isTLS && {
        tls: { rejectUnauthorized: false },
      }),
    });

    // Test connection
    return client.connect()
      .then(() => {
        console.log("[Redis] Connected successfully.");
        return client;
      })
      .catch((err) => {
        console.warn("[Redis] Connection failed:", err.message, "— using in-memory fallback.");
        try { client.disconnect(); } catch {}
        return new InMemoryStore();
      });
  } catch (err) {
    console.warn("[Redis] Init error:", err.message, "— using in-memory fallback.");
    return Promise.resolve(new InMemoryStore());
  }
}

// Singleton promise
let clientPromise = null;

function getClient() {
  if (process.env.NODE_ENV !== "production") {
    // Dev: cache on global to survive HMR
    if (!global.__redisPromise) {
      global.__redisPromise = createClient();
    }
    return global.__redisPromise;
  }
  if (!clientPromise) {
    clientPromise = createClient();
  }
  return clientPromise;
}

// Eagerly start connecting
const resolvedClientPromise = getClient();

/**
 * Wrapper that provides a synchronous-looking API but internally
 * awaits the redis client promise before executing commands.
 */
const wrapper = {
  async get(key) {
    const r = await resolvedClientPromise;
    return r.get(key);
  },
  async set(key, value) {
    const r = await resolvedClientPromise;
    return r.set(key, value);
  },
  async del(...keys) {
    const r = await resolvedClientPromise;
    return r.del(...keys);
  },
  async setex(key, seconds, value) {
    const r = await resolvedClientPromise;
    return r.setex(key, seconds, value);
  },
  async incr(key) {
    const r = await resolvedClientPromise;
    return r.incr(key);
  },
  async expire(key, seconds) {
    const r = await resolvedClientPromise;
    return r.expire(key, seconds);
  },
  async lpush(key, ...values) {
    const r = await resolvedClientPromise;
    return r.lpush(key, ...values);
  },
  async lrange(key, start, stop) {
    const r = await resolvedClientPromise;
    return r.lrange(key, start, stop);
  },
  async ltrim(key, start, stop) {
    const r = await resolvedClientPromise;
    return r.ltrim(key, start, stop);
  },
  async zadd(key, score, member) {
    const r = await resolvedClientPromise;
    return r.zadd(key, score, member);
  },
  async zcard(key) {
    const r = await resolvedClientPromise;
    return r.zcard(key);
  },
  async zremrangebyscore(key, min, max) {
    const r = await resolvedClientPromise;
    return r.zremrangebyscore(key, min, max);
  },
  async scan(...args) {
    const r = await resolvedClientPromise;
    return r.scan(...args);
  },
  async sadd(key, ...members) {
    const r = await resolvedClientPromise;
    return r.sadd(key, ...members);
  },
  async smembers(key) {
    const r = await resolvedClientPromise;
    return r.smembers(key);
  },
  async scard(key) {
    const r = await resolvedClientPromise;
    return r.scard(key);
  },
  pipeline() {
    // Return a pipeline that collects commands and executes on the resolved client
    const commands = [];
    const methods = [
      "get", "set", "incr", "expire", "zadd", "zcard",
      "zremrangebyscore", "setex", "lpush", "lrange", "ltrim",
      "sadd", "smembers", "scard",
    ];
    const p = {};
    for (const method of methods) {
      p[method] = (...args) => {
        commands.push([method, args]);
        return p;
      };
    }
    p.exec = async () => {
      const r = await resolvedClientPromise;
      // If it's a real Redis client, use a real pipeline for performance
      if (typeof r.pipeline === "function" && !(r instanceof InMemoryStore)) {
        const realPipeline = r.pipeline();
        for (const [cmd, args] of commands) {
          realPipeline[cmd](...args);
        }
        return realPipeline.exec();
      }
      // Otherwise use sequential execution on InMemoryStore
      const results = [];
      for (const [cmd, args] of commands) {
        try {
          const result = await r[cmd](...args);
          results.push([null, result]);
        } catch (e) {
          results.push([e, null]);
        }
      }
      return results;
    };
    return p;
  },
};

export default wrapper;
