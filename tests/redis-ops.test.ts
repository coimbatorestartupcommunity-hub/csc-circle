import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FailingRedis, InMemoryRedis } from "./redis-double";
import {
  __clearRedisErrorsForTests,
  __resetRedisClientForTests,
  __setRedisTestDouble,
  getRecentRedisErrors,
} from "@/lib/redis/client";

beforeEach(() => {
  vi.stubEnv("CSC_REDIS_ENABLED", "true");
  vi.stubEnv("CSC_REDIS_CACHE", "true");
  vi.stubEnv("CSC_REDIS_RATE_LIMIT", "true");
  vi.stubEnv("CSC_REDIS_ENV", "test");
  __clearRedisErrorsForTests();
});

afterEach(() => {
  __resetRedisClientForTests();
  __clearRedisErrorsForTests();
  vi.unstubAllEnvs();
});

describe("connectivity probe (mocked)", () => {
  it("passes PING + SET/GET/DELETE + TTL with latency", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { checkRedisConnectivity } = await import("@/lib/redis/connectivity");
    const result = await checkRedisConnectivity();
    expect(result.ok).toBe(true);
    expect(result.ping).toBe(true);
    expect(result.roundTrip).toBe(true);
    expect(result.ttlSeconds).toBeGreaterThan(0);
    expect(result.latencyMs).not.toBeNull();
    expect(double.keys().filter((k) => k.includes(":probe:"))).toHaveLength(0);
  });

  it("reports disabled without touching Redis", async () => {
    vi.stubEnv("CSC_REDIS_ENABLED", "");
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { checkRedisConnectivity } = await import("@/lib/redis/connectivity");
    const result = await checkRedisConnectivity();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("disabled");
    expect(double.calls).toHaveLength(0);
  });

  it("reports not-configured when no client exists", async () => {
    __resetRedisClientForTests();
    const { checkRedisConnectivity } = await import("@/lib/redis/connectivity");
    const result = await checkRedisConnectivity();
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not-configured");
  });

  it("fails closed with a reason on Redis outage", async () => {
    __setRedisTestDouble(new FailingRedis());
    const { checkRedisConnectivity } = await import("@/lib/redis/connectivity");
    const result = await checkRedisConnectivity(50);
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
    expect(getRecentRedisErrors().length).toBeGreaterThan(0);
  });
});

describe("locks (mocked)", () => {
  it("acquires once and releases with ownership", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { acquireLock, releaseLock } = await import("@/lib/redis/locks");
    const first = await acquireLock("worker");
    expect(first).not.toBeNull();
    expect(await acquireLock("worker")).toBeNull();
    expect(await releaseLock(first!)).toBe(true);
    expect(await acquireLock("worker")).not.toBeNull();
  });

  it("refuses release by a non-owner", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { acquireLock, releaseLock } = await import("@/lib/redis/locks");
    const lock = await acquireLock("worker");
    expect(lock).not.toBeNull();
    expect(await releaseLock({ key: lock!.key, token: "forged-token" })).toBe(false);
    expect(await acquireLock("worker")).toBeNull();
  });

  it("is a no-op when Redis is disabled", async () => {
    vi.stubEnv("CSC_REDIS_ENABLED", "");
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { acquireLock } = await import("@/lib/redis/locks");
    expect(await acquireLock("worker")).toBeNull();
    expect(double.calls).toHaveLength(0);
  });
});

describe("command timeout", () => {
  it("bounds slow commands", async () => {
    const { withRedisTimeout } = await import("@/lib/redis/client");
    await expect(withRedisTimeout(new Promise(() => {}), 20)).rejects.toThrow(/timed out/);
  });
});
