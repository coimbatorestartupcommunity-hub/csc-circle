import type { Redis } from "ioredis";
import { logger } from "../utils/logger.js";

export interface RateLimitResult {
  allowed: boolean;
  inJail: boolean;
  remainingJailSeconds?: number;
  currentCount?: number;
}

const WINDOW_SECONDS = 60; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 10;
const JAIL_DURATION_SECONDS = 900; // 15 minutes cooldown

// Fallback in-memory map in case Redis is temporarily disconnected
const localMemoryTimestamps = new Map<string, number[]>();
const localJailMap = new Map<string, number>();

/**
 * Enforces a sliding-window rate limit using Redis.
 * If exceeded, automatically locks the user in a 15-minute cooldown jail.
 */
export async function checkSlidingWindowRateLimit(
  redis: Redis | null,
  phone: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const jailKey = `rate_limit:jail:${phone}`;
  const logKey = `rate_limit:log:${phone}`;

  // 1. Check if user is currently jailed in Redis
  if (redis) {
    try {
      const ttl = await redis.ttl(jailKey);
      if (ttl > 0) {
        return {
          allowed: false,
          inJail: true,
          remainingJailSeconds: ttl,
        };
      }

      // 2. Sliding window check using Redis sorted set
      const windowStart = now - WINDOW_SECONDS * 1000;
      const pipeline = redis.pipeline();

      // Remove timestamps older than 60s
      pipeline.zremrangebyscore(logKey, 0, windowStart);
      // Add current timestamp
      pipeline.zadd(logKey, now, `${now}-${Math.random()}`);
      // Count remaining elements in window
      pipeline.zcard(logKey);
      // Set key expiration
      pipeline.expire(logKey, WINDOW_SECONDS + 5);

      const results = await pipeline.exec();
      const count = (results?.[2]?.[1] as number) || 1;

      if (count > MAX_MESSAGES_PER_WINDOW) {
        // Exceeded: Place in 15-minute jail
        await redis.set(jailKey, "1", "EX", JAIL_DURATION_SECONDS);
        logger.warn("User exceeded sliding-window rate limit; placed in 15-min jail", {
          phone,
          count,
          jailDurationSeconds: JAIL_DURATION_SECONDS,
        });

        return {
          allowed: false,
          inJail: true,
          remainingJailSeconds: JAIL_DURATION_SECONDS,
          currentCount: count,
        };
      }

      return {
        allowed: true,
        inJail: false,
        currentCount: count,
      };
    } catch (err) {
      logger.error("Redis error during rate limiting; falling back to in-memory check", { error: err });
    }
  }

  // Fallback: Local in-memory check
  const jailExpiry = localJailMap.get(phone);
  if (jailExpiry && now < jailExpiry) {
    const remainingSeconds = Math.ceil((jailExpiry - now) / 1000);
    return {
      allowed: false,
      inJail: true,
      remainingJailSeconds: remainingSeconds,
    };
  }

  const timestamps = (localMemoryTimestamps.get(phone) || []).filter(
    (t) => now - t < WINDOW_SECONDS * 1000
  );

  if (timestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    const jailUntil = now + JAIL_DURATION_SECONDS * 1000;
    localJailMap.set(phone, jailUntil);
    return {
      allowed: false,
      inJail: true,
      remainingJailSeconds: JAIL_DURATION_SECONDS,
    };
  }

  timestamps.push(now);
  localMemoryTimestamps.set(phone, timestamps);

  return {
    allowed: true,
    inJail: false,
    currentCount: timestamps.length,
  };
}
