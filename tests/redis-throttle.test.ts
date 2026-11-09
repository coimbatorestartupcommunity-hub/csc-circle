import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FailingRedis, InMemoryRedis } from "./redis-double";
import {
  __clearRedisErrorsForTests,
  __resetRedisClientForTests,
  __setRedisTestDouble,
} from "@/lib/redis/client";

beforeEach(() => {
  vi.stubEnv("CSC_REDIS_ENABLED", "true");
  vi.stubEnv("CSC_REDIS_RATE_LIMIT", "true");
  vi.stubEnv("CSC_REDIS_ENV", "test");
  __clearRedisErrorsForTests();
});

afterEach(() => {
  __resetRedisClientForTests();
  __clearRedisErrorsForTests();
  vi.unstubAllEnvs();
});

describe("redisPrecheck", () => {
  it("allows under the limit and denies over it with Retry-After", async () => {
    __setRedisTestDouble(new InMemoryRedis());
    const { redisPrecheck } = await import("@/lib/redis/throttle");
    for (let i = 0; i < 5; i += 1) {
      const allowed = await redisPrecheck("member-survey-ip", "203.0.113.7", 5, 60_000);
      expect(allowed).toMatchObject({ deferred: false, allowed: true });
    }
    const denied = await redisPrecheck("member-survey-ip", "203.0.113.7", 5, 60_000);
    expect(denied.deferred).toBe(false);
    if (!denied.deferred) {
      expect(denied.allowed).toBe(false);
      expect(denied.retryAfter).toBeGreaterThanOrEqual(1);
    }
  });

  it("isolates scopes and keys", async () => {
    __setRedisTestDouble(new InMemoryRedis());
    const { redisPrecheck } = await import("@/lib/redis/throttle");
    await redisPrecheck("scope-a", "same-key", 1, 60_000);
    expect(await redisPrecheck("scope-a", "same-key", 1, 60_000)).toMatchObject({ allowed: false });
    expect(await redisPrecheck("scope-b", "same-key", 1, 60_000)).toMatchObject({ allowed: true });
    expect(await redisPrecheck("scope-a", "other-key", 1, 60_000)).toMatchObject({ allowed: true });
  });

  it("defers when disabled or Redis is down", async () => {
    const { redisPrecheck } = await import("@/lib/redis/throttle");
    vi.stubEnv("CSC_REDIS_RATE_LIMIT", "");
    __setRedisTestDouble(new InMemoryRedis());
    expect(await redisPrecheck("s", "k", 1, 60_000)).toEqual({ deferred: true });
    vi.stubEnv("CSC_REDIS_RATE_LIMIT", "true");
    __setRedisTestDouble(new FailingRedis());
    expect(await redisPrecheck("s", "k", 1, 60_000)).toEqual({ deferred: true });
  });

  it("never stores raw emails in throttle keys", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { redisPrecheck } = await import("@/lib/redis/throttle");
    await redisPrecheck("member-survey-email", "someone@example.com", 3, 3_600_000);
    for (const key of double.keys()) {
      expect(key).not.toContain("someone@example.com");
      expect(key).not.toContain("example.com");
    }
  });
});

describe("distributedRateLimit with Redis first layer", () => {
  function pgAdmin(allowed: boolean, retryAfter = 60) {
    return {
      rpc: vi.fn(async () => ({
        data: { allowed, retry_after: retryAfter, remaining: allowed ? 1 : 0 },
        error: null,
      })),
    };
  }

  it("denies early from Redis without consulting Postgres", async () => {
    __setRedisTestDouble(new InMemoryRedis());
    const { distributedRateLimit } = await import("@/lib/rate-limit");
    const admin = pgAdmin(true);
    for (let i = 0; i < 3; i += 1) {
      await distributedRateLimit(admin as never, "survey", "ip-1", 3, 60_000);
    }
    const denied = await distributedRateLimit(admin as never, "survey", "ip-1", 3, 60_000);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThanOrEqual(1);
    expect(admin.rpc).toHaveBeenCalledTimes(3);
  });

  it("keeps Postgres authoritative: Redis allow still consults Postgres", async () => {
    __setRedisTestDouble(new InMemoryRedis());
    const { distributedRateLimit } = await import("@/lib/rate-limit");
    const denyingPg = pgAdmin(false, 45);
    const result = await distributedRateLimit(denyingPg as never, "create-payment-order", "ip-2", 10, 60_000);
    expect(result).toMatchObject({ allowed: false, retryAfter: 45 });
    expect(denyingPg.rpc).toHaveBeenCalledTimes(1);
  });

  it("falls through to Postgres on Redis outage (limits stay effective)", async () => {
    __setRedisTestDouble(new FailingRedis());
    const { distributedRateLimit } = await import("@/lib/rate-limit");
    const denyingPg = pgAdmin(false, 30);
    const result = await distributedRateLimit(denyingPg as never, "claim-utr", "order:ip", 5, 900_000);
    expect(result).toMatchObject({ allowed: false, retryAfter: 30 });
    expect(denyingPg.rpc).toHaveBeenCalledTimes(1);
  });

  it("preserves fail-closed Postgres behavior when both layers see no Redis", async () => {
    __resetRedisClientForTests();
    const { distributedRateLimit } = await import("@/lib/rate-limit");
    const errorPg = { rpc: vi.fn(async () => ({ data: null, error: { message: "down" } })) };
    const result = await distributedRateLimit(errorPg as never, "order-status", "o:ip", 40, 60_000);
    expect(result).toEqual({ allowed: false, retryAfter: 60 });
  });
});
