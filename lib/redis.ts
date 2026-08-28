import { Redis } from "@upstash/redis";
import { env, isRedisConfigured } from "@/lib/env";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!isRedisConfigured()) return null;
  if (!redis) {
    redis = new Redis({
      url: env.upstashUrl,
      token: env.upstashToken,
    });
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    return (await client.get<T>(key)) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60 * 60 * 24) {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(key, value, { ex: ttlSeconds });
  } catch {
    // Cache is best-effort; never fail the request.
  }
}
