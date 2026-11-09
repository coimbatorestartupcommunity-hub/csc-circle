import { beforeEach, describe, expect, it, vi } from "vitest";

const REDIS_ENV_KEYS = [
  "CSC_KV_REST_API_URL",
  "CSC_KV_REST_API_TOKEN",
  "CSC_REDIS_ENABLED",
  "CSC_REDIS_CACHE",
  "CSC_REDIS_RATE_LIMIT",
  "CSC_REDIS_ENV",
  "CSC_REDIS_REGION",
];

function clearRedisEnv() {
  for (const key of REDIS_ENV_KEYS) vi.stubEnv(key, "");
}

beforeEach(() => {
  vi.resetModules();
  clearRedisEnv();
});

describe("redis flags default OFF", () => {
  it("disables everything when no flags are set", async () => {
    const config = await import("@/lib/redis/config");
    expect(config.isRedisEnabled()).toBe(false);
    expect(config.isRedisCacheEnabled()).toBe(false);
    expect(config.isRedisRateLimitEnabled()).toBe(false);
  });

  it("requires the master switch for sub-features", async () => {
    vi.stubEnv("CSC_REDIS_CACHE", "true");
    vi.stubEnv("CSC_REDIS_RATE_LIMIT", "true");
    const config = await import("@/lib/redis/config");
    expect(config.isRedisCacheEnabled()).toBe(false);
    expect(config.isRedisRateLimitEnabled()).toBe(false);
  });

  it("enables sub-features only with the master switch", async () => {
    vi.stubEnv("CSC_REDIS_ENABLED", "true");
    vi.stubEnv("CSC_REDIS_CACHE", "true");
    vi.stubEnv("CSC_REDIS_RATE_LIMIT", "true");
    const config = await import("@/lib/redis/config");
    expect(config.isRedisEnabled()).toBe(true);
    expect(config.isRedisCacheEnabled()).toBe(true);
    expect(config.isRedisRateLimitEnabled()).toBe(true);
  });
});

describe("redis client init", () => {
  it("returns null when credentials are missing", async () => {
    vi.stubEnv("CSC_REDIS_ENABLED", "true");
    const client = await import("@/lib/redis/client");
    expect(client.getRedisClient()).toBeNull();
    expect(client.isRedisConfigured()).toBe(false);
  });

  it("returns null when only one credential is present", async () => {
    vi.stubEnv("CSC_KV_REST_API_URL", "https://example.upstash.io");
    const client = await import("@/lib/redis/client");
    expect(client.getRedisClient()).toBeNull();
  });

  it("builds a lazy singleton without network I/O", async () => {
    vi.stubEnv("CSC_KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("CSC_KV_REST_API_TOKEN", "test-token");
    const client = await import("@/lib/redis/client");
    const first = client.getRedisClient();
    const second = client.getRedisClient();
    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(client.isRedisConfigured()).toBe(true);
  });

  it("picks up credential changes after a reset", async () => {
    const client = await import("@/lib/redis/client");
    expect(client.getRedisClient()).toBeNull();
    vi.stubEnv("CSC_KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("CSC_KV_REST_API_TOKEN", "test-token");
    client.__resetRedisClientForTests();
    expect(client.getRedisClient()).not.toBeNull();
    client.__resetRedisClientForTests();
  });
});

describe("redis client is server-only", () => {
  it("imports the server-only guard", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync("src/lib/redis/client.ts", "utf8");
    expect(source).toMatch(/^import "server-only";/m);
    for (const file of ["connectivity.ts", "cache.ts", "throttle.ts", "locks.ts", "diagnostics.ts"]) {
      expect(fs.readFileSync(`src/lib/redis/${file}`, "utf8")).toMatch(/^import "server-only";/m);
    }
  });
});

describe("redis namespaces", () => {
  it("namespaces keys per environment", async () => {
    const config = await import("@/lib/redis/config");
    vi.stubEnv("CSC_REDIS_ENV", "test");
    expect(config.publicCacheKey("events", "list")).toBe("csc:test:cache:content-events:list");
    vi.stubEnv("CSC_REDIS_ENV", "production");
    expect(config.publicCacheKey("events", "list")).toBe("csc:production:cache:content-events:list");
  });

  it("derives preview/production from Vercel env", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const config = await import("@/lib/redis/config");
    expect(config.redisEnvName()).toBe("preview");
    vi.stubEnv("VERCEL_ENV", "");
  });
});
