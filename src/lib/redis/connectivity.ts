import "server-only";

import { randomUUID } from "node:crypto";
import {
  getRedisClient,
  recordRedisError,
  withRedisTimeout,
  type RedisCommands,
  type TypedRedis,
} from "./client";
import { REDIS_TTL, isRedisEnabled, probeKey, redisEnvName } from "./config";

export interface RedisConnectivityResult {
  ok: boolean;
  latencyMs: number | null;
  ping: boolean;
  roundTrip: boolean;
  ttlSeconds: number | null;
  checkedAt: string;
  env: string;
  reason?: string;
}

type Client = TypedRedis | RedisCommands;

/**
 * Connectivity probe: PING + temp SET/GET/DELETE + TTL check on a random
 * scratch key with a short TTL. Writes nothing but the random probe key, so it
 * is safe in any namespace; live checks should still prefer non-production.
 */
export async function checkRedisConnectivity(timeoutMs = 5_000): Promise<RedisConnectivityResult> {
  const checkedAt = new Date().toISOString();
  const env = redisEnvName();
  if (!isRedisEnabled()) {
    return { ok: false, latencyMs: null, ping: false, roundTrip: false, ttlSeconds: null, checkedAt, env, reason: "disabled" };
  }
  const client = getRedisClient() as Client | null;
  if (!client) {
    return { ok: false, latencyMs: null, ping: false, roundTrip: false, ttlSeconds: null, checkedAt, env, reason: "not-configured" };
  }

  const started = Date.now();
  const key = probeKey(randomUUID());
  try {
    const pong = await withRedisTimeout(client.ping(), timeoutMs);
    if (pong !== "PONG") {
      return { ok: false, latencyMs: Date.now() - started, ping: false, roundTrip: false, ttlSeconds: null, checkedAt, env, reason: "unexpected-ping" };
    }
    const marker = `probe-${Date.now()}`;
    await withRedisTimeout(Promise.resolve(client.set(key, marker, { ex: REDIS_TTL.probeSeconds })), timeoutMs);
    const [value, ttl] = await Promise.all([
      withRedisTimeout(Promise.resolve(client.get<string>(key)), timeoutMs),
      withRedisTimeout(Promise.resolve(client.ttl(key)), timeoutMs),
    ]);
    const roundTrip = value === marker;
    let ttlSeconds: number | null = typeof ttl === "number" && ttl > 0 ? ttl : null;
    try {
      await withRedisTimeout(Promise.resolve(client.del(key)), timeoutMs);
    } catch {
      ttlSeconds = ttlSeconds ?? REDIS_TTL.probeSeconds; // short TTL self-cleans
    }
    if (!roundTrip || ttlSeconds === null) {
      return { ok: false, latencyMs: Date.now() - started, ping: true, roundTrip, ttlSeconds, checkedAt, env, reason: "round-trip-failed" };
    }
    return { ok: true, latencyMs: Date.now() - started, ping: true, roundTrip: true, ttlSeconds, checkedAt, env };
  } catch (error) {
    recordRedisError("connectivity", error);
    return {
      ok: false,
      latencyMs: Date.now() - started,
      ping: false,
      roundTrip: false,
      ttlSeconds: null,
      checkedAt,
      env,
      reason: error instanceof Error ? error.message.slice(0, 120) : "probe-failed",
    };
  }
}
