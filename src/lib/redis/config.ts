import { createHash } from "node:crypto";

/**
 * Redis feature flags, namespaces, TTL policy, and key hygiene.
 *
 * Framework-free: safe to import anywhere (server or tests). All flags default
 * to OFF so enabling Redis is always an explicit deployment decision.
 */

export type RedisEnvName = "production" | "preview" | "development" | "test";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function flag(name: string): boolean {
  return readEnv(name)?.toLowerCase() === "true";
}

/** Master switch. When false, every Redis helper is a no-op / fallback. */
export function isRedisEnabled(): boolean {
  return flag("CSC_REDIS_ENABLED");
}

/** Public-content read-through cache layer. Requires the master switch. */
export function isRedisCacheEnabled(): boolean {
  return isRedisEnabled() && flag("CSC_REDIS_CACHE");
}

/** Additive first-layer throttling ahead of the Postgres limiter. Requires master. */
export function isRedisRateLimitEnabled(): boolean {
  return isRedisEnabled() && flag("CSC_REDIS_RATE_LIMIT");
}

/**
 * Deployment environment used for key namespacing. Explicit override first
 * (`CSC_REDIS_ENV`, useful for tests), then Vercel, then NODE_ENV.
 */
export function redisEnvName(): RedisEnvName {
  const override = readEnv("CSC_REDIS_ENV")?.toLowerCase();
  if (override === "production" || override === "preview" || override === "development" || override === "test") {
    return override;
  }
  const vercel = readEnv("VERCEL_ENV")?.toLowerCase();
  if (vercel === "production" || vercel === "preview" || vercel === "development") return vercel;
  if (readEnv("NODE_ENV")?.toLowerCase() === "production") return "production";
  if (readEnv("NODE_ENV")?.toLowerCase() === "test") return "test";
  return "development";
}

/** REST credentials. Never the TCP URL, never the read-only token, never NEXT_PUBLIC_. */
export function redisRestConfig(): { url: string; token: string } | null {
  const url = readEnv("CSC_KV_REST_API_URL");
  const token = readEnv("CSC_KV_REST_API_TOKEN");
  if (!url || !token) return null;
  return { url, token };
}

/** Optional operator-provided region label for diagnostics (REST URL carries none). */
export function redisRegionLabel(): string | null {
  return readEnv("CSC_REDIS_REGION") ?? null;
}

/** Public-content features cached in Redis. Homepage aggregates events/collaborations/updates. */
export type PublicCacheFeature =
  | "events"
  | "resources"
  | "opportunities"
  | "collaborations"
  | "updates";

export const PUBLIC_CACHE_FEATURES: readonly PublicCacheFeature[] = [
  "events",
  "resources",
  "opportunities",
  "collaborations",
  "updates",
];

/** TTL policy (seconds). Content 30-120s, hints 5-120s, locks short-lived. */
export const REDIS_TTL = {
  /** Public content read-through entries. */
  contentSeconds: 60,
  contentMinSeconds: 30,
  contentMaxSeconds: 120,
  /** Ephemeral hints / throttle windows / diagnostics probes. */
  hintSeconds: 30,
  hintMinSeconds: 5,
  hintMaxSeconds: 120,
  /** Distributed lock ownership. */
  lockSeconds: 15,
  /** Connectivity probe scratch key. */
  probeSeconds: 30,
} as const;

export function clampContentTtl(seconds: number): number {
  if (!Number.isFinite(seconds)) return REDIS_TTL.contentSeconds;
  return Math.min(REDIS_TTL.contentMaxSeconds, Math.max(REDIS_TTL.contentMinSeconds, Math.floor(seconds)));
}

/**
 * Hash a sensitive identifier (email, phone, UTR, token, secret) before it can
 * appear in a key. Context binds the digest to one purpose.
 */
export function hashIdentifier(value: string, context: string): string {
  return createHash("sha256").update(`${context}:${value}`).digest("hex");
}

/** Raw sensitive values must never appear in keys; fail closed if one is passed. */
const SENSITIVE_SUBSTRING_PATTERN =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{12}\b|sbp_[A-Za-z0-9]{10,}|sb_secret_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i;

/** Generated token shapes (hashes, UUIDs) can never be raw PII. */
const GENERATED_TOKEN_PATTERN =
  /^([0-9a-f]{64}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Whole-segment phone check so numeric slugs and UUIDs never match. */
function looksLikePhone(segment: string): boolean {
  if (!/^\+?[\d().\-.\s]{7,30}$/.test(segment)) return false;
  const digits = segment.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

export function assertSafeKeySegment(segment: string): void {
  if (GENERATED_TOKEN_PATTERN.test(segment)) return;
  if (SENSITIVE_SUBSTRING_PATTERN.test(segment) || looksLikePhone(segment)) {
    throw new Error("Refusing to place a raw sensitive identifier in a Redis key; hash it first.");
  }
}

function safeSegment(segment: string): string {
  const trimmed = segment.trim().slice(0, 160);
  if (!trimmed) throw new Error("Redis key segment must not be empty.");
  assertSafeKeySegment(trimmed);
  return trimmed.replace(/[^a-zA-Z0-9._~-]/g, "_");
}

/** Namespaced key: csc:{env}:{feature}:{id}. */
export function redisKey(namespace: string, ...segments: string[]): string {
  const env = redisEnvName();
  const parts = [namespace, ...segments].map(safeSegment);
  return [`csc`, env, ...parts].join(":");
}

/** Cache key for public content. `id` is "list" or a slug. */
export function publicCacheKey(feature: PublicCacheFeature, id: string): string {
  return redisKey("cache", `content-${feature}`, id);
}

/** Throttle counter key. Identifier is always hashed. */
export function throttleKey(scope: string, key: string): string {
  return redisKey("throttle", safeSegment(scope), hashIdentifier(key, `throttle:${scope}`));
}

/** Lock key. */
export function lockKey(name: string): string {
  return redisKey("lock", name);
}

/** Unique scratch key for connectivity probes (test namespace only when forced). */
export function probeKey(token: string): string {
  return redisKey("probe", token);
}
