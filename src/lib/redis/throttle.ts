import "server-only";

import {
  getRedisClient,
  recordRedisError,
  withRedisTimeout,
  type RedisCommands,
  type TypedRedis,
} from "./client";
import { REDIS_TTL, isRedisRateLimitEnabled, throttleKey } from "./config";

/**
 * Additive first-layer throttling ahead of the authoritative Postgres limiter
 * (`csc_check_rate_limit`, which stays until a replacement is verified).
 *
 * Semantics: Redis may only ADD denials, never grants.
 * - Redis over limit  -> deny early (shapes match the Postgres result).
 * - Redis allows      -> caller MUST still consult Postgres.
 * - Redis unavailable -> `{ deferred: true }`; caller falls through to Postgres,
 *   which fails closed on its own outage. Limits are never silently unlimited.
 *
 * Payments and guest-email flows keep Postgres authoritative under this rule.
 */

export type RedisPrecheck =
  | { deferred: false; allowed: boolean; retryAfter: number; count: number }
  | { deferred: true };

export async function redisPrecheck(
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RedisPrecheck> {
  if (!isRedisRateLimitEnabled()) return { deferred: true };
  if (!Number.isFinite(limit) || limit <= 0) return { deferred: true };
  const client = getRedisClient() as TypedRedis | RedisCommands | null;
  if (!client) return { deferred: true };

  const windowSeconds = Math.max(
    REDIS_TTL.hintMinSeconds,
    Math.min(REDIS_TTL.hintMaxSeconds, Math.max(1, Math.ceil(windowMs / 1000))),
  );

  let redisKey: string;
  try {
    redisKey = throttleKey(scope, key);
  } catch (error) {
    recordRedisError("throttle:key", error);
    return { deferred: true };
  }

  try {
    const count = await withRedisTimeout(Promise.resolve(client.incr(redisKey)));
    const current = typeof count === "number" ? count : Number(count);
    if (!Number.isFinite(current)) return { deferred: true };
    if (current === 1) {
      try {
        await withRedisTimeout(Promise.resolve(client.expire(redisKey, windowSeconds)));
      } catch (error) {
        recordRedisError("throttle:expire", error);
      }
    }
    if (current > limit) {
      let retryAfter = windowSeconds;
      try {
        const ttl = await withRedisTimeout(Promise.resolve(client.ttl(redisKey)));
        if (typeof ttl === "number" && ttl > 0) retryAfter = ttl;
      } catch (error) {
        recordRedisError("throttle:ttl", error);
      }
      return { deferred: false, allowed: false, retryAfter: Math.max(1, retryAfter), count: current };
    }
    return { deferred: false, allowed: true, retryAfter: 0, count: current };
  } catch (error) {
    recordRedisError("throttle:incr", error);
    return { deferred: true };
  }
}
