import "server-only";

import {
  getRecentRedisErrors,
  isRedisConfigured,
  type RedisErrorSample,
} from "./client";
import {
  isRedisCacheEnabled,
  isRedisEnabled,
  isRedisRateLimitEnabled,
  redisEnvName,
  redisRegionLabel,
} from "./config";
import { checkRedisConnectivity, type RedisConnectivityResult } from "./connectivity";

/**
 * Admin diagnostics payload. Authorized callers only (see the diagnostics
 * route). Contains no tokens, URLs, key contents, or customer data.
 */
export interface RedisDiagnostics {
  enabled: boolean;
  configured: boolean;
  cacheEnabled: boolean;
  rateLimitEnabled: boolean;
  env: string;
  region: string | null;
  connectivity: Pick<
    RedisConnectivityResult,
    "ok" | "latencyMs" | "ping" | "roundTrip" | "ttlSeconds" | "checkedAt" | "reason"
  > | null;
  recentErrors: RedisErrorSample[];
  generatedAt: string;
}

export async function getRedisDiagnostics(options: { probe?: boolean } = {}): Promise<RedisDiagnostics> {
  const generatedAt = new Date().toISOString();
  const recentErrors = getRecentRedisErrors();
  const base = {
    enabled: isRedisEnabled(),
    configured: isRedisConfigured(),
    cacheEnabled: isRedisCacheEnabled(),
    rateLimitEnabled: isRedisRateLimitEnabled(),
    env: redisEnvName(),
    region: redisRegionLabel(),
    recentErrors,
    generatedAt,
  };
  if (options.probe === false || !base.enabled || !base.configured) {
    return { ...base, connectivity: null };
  }
  const probe = await checkRedisConnectivity();
  return {
    ...base,
    connectivity: {
      ok: probe.ok,
      latencyMs: probe.latencyMs,
      ping: probe.ping,
      roundTrip: probe.roundTrip,
      ttlSeconds: probe.ttlSeconds,
      checkedAt: probe.checkedAt,
      reason: probe.reason,
    },
  };
}
