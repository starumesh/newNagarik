import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";
import { hashIp } from "@/lib/hash";

export async function limitByIp(ip: string, prefix: string, limit = 10) {
  const redis = getRedis();
  if (!redis) return { success: true, remaining: limit };

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, "1 h"),
    prefix: `rs:${prefix}`,
  });

  return ratelimit.limit(hashIp(ip));
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "127.0.0.1";
}
