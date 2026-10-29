import Redis from "ioredis";
import { env } from "./env";

// In-memory fallback stores when Redis is not available locally
const memoryCache = new Map<string, { value: any; expiresAt: number }>();
const memoryLocks = new Set<string>();

let isRedisAvailable = false;

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  lazyConnect: true,
  connectTimeout: 2000,
  retryStrategy: () => null, // Don't spam retries on laptop dev if not running
});

redis.on("connect", () => {
  isRedisAvailable = true;
});

redis.on("error", () => {
  isRedisAvailable = false;
});

// Try initial connection in background without throwing
redis.connect().then(() => {
  isRedisAvailable = true;
}).catch(() => {
  isRedisAvailable = false;
});

export { redis, isRedisAvailable };

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // If Redis is reachable, try Redis
  if (isRedisAvailable) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        try {
          return JSON.parse(cached) as T;
        } catch {
          return cached as unknown as T;
        }
      }
    } catch {
      isRedisAvailable = false;
    }
  }

  // Check in-memory fallback
  const memItem = memoryCache.get(key);
  if (memItem && memItem.expiresAt > Date.now()) {
    return memItem.value as T;
  }

  const value = await fetcher();

  // Try saving to Redis
  if (isRedisAvailable) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      isRedisAvailable = false;
    }
  }

  // Always keep in memory fallback
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  return value;
}

export async function withLocalInferenceLock<T>(
  operation: () => Promise<T>,
  lockKey = "lock:ollama:qwen",
): Promise<T> {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (isRedisAvailable) {
    try {
      const result = await redis.set(lockKey, requestId, "PX", 90000, "NX");
      if (result !== "OK") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return withLocalInferenceLock(operation, lockKey);
      }

      try {
        return await operation();
      } finally {
        try {
          const currentLock = await redis.get(lockKey);
          if (currentLock === requestId) {
            await redis.del(lockKey);
          }
        } catch {
          // ignore cleanup error
        }
      }
    } catch {
      isRedisAvailable = false;
    }
  }

  // In-memory mutex fallback for laptop development without local Redis
  while (memoryLocks.has(lockKey)) {
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  memoryLocks.add(lockKey);
  try {
    return await operation();
  } finally {
    memoryLocks.delete(lockKey);
  }
}
