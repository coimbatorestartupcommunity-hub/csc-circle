import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FailingRedis, InMemoryRedis } from "./redis-double";
import {
  __clearRedisErrorsForTests,
  __resetRedisClientForTests,
  __setRedisTestDouble,
} from "@/lib/redis/client";
import { __clearCacheInflightForTests } from "@/lib/redis/cache";

const published = (slug: string) => ({ slug, title: slug, status: "published" });

beforeEach(() => {
  vi.stubEnv("CSC_REDIS_ENABLED", "true");
  vi.stubEnv("CSC_REDIS_CACHE", "true");
  vi.stubEnv("CSC_REDIS_ENV", "test");
  __clearRedisErrorsForTests();
  __clearCacheInflightForTests();
});

afterEach(() => {
  __resetRedisClientForTests();
  __clearRedisErrorsForTests();
  __clearCacheInflightForTests();
  vi.unstubAllEnvs();
});

describe("cachedPublic", () => {
  it("misses once then hits without reloading", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { cachedPublic } = await import("@/lib/redis/cache");
    const loader = vi.fn(async () => [published("a"), published("b")]);
    const first = await cachedPublic("resources", "list", loader);
    const second = await cachedPublic("resources", "list", loader);
    expect(first).toEqual(second);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(double.calls.filter((c) => c.startsWith("get:"))).toHaveLength(2);
  });

  it("expires entries after TTL", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { cachedPublic } = await import("@/lib/redis/cache");
    // TTL clamps to the 30-120s content policy floor.
    await cachedPublic("updates", "list", async () => [published("u")], { ttlSeconds: 30 });
    const ttl = await double.ttl("csc:test:cache:content-updates:list");
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(30);
  });

  it("falls back to the loader on Redis outage", async () => {
    __setRedisTestDouble(new FailingRedis());
    const { cachedPublic } = await import("@/lib/redis/cache");
    const loader = vi.fn(async () => [published("a")]);
    await expect(cachedPublic("events", "list", loader)).resolves.toEqual([published("a")]);
    await expect(cachedPublic("events", "list", loader)).resolves.toEqual([published("a")]);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("bypasses Redis entirely when the cache flag is off", async () => {
    vi.stubEnv("CSC_REDIS_CACHE", "");
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { cachedPublic } = await import("@/lib/redis/cache");
    const loader = vi.fn(async () => [published("a")]);
    await cachedPublic("events", "list", loader);
    await cachedPublic("events", "list", loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(double.calls).toHaveLength(0);
  });

  it("hides unpublished records on read and reloads", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { cachedPublic } = await import("@/lib/redis/cache");
    // Poison the cache with an unpublished record as if invalidation raced.
    await double.set(
      "csc:test:cache:content-resources:old-slug",
      JSON.stringify({ v: 1, storedAt: new Date().toISOString(), data: { slug: "old-slug", status: "draft" } }),
      { ex: 60 },
    );
    const loader = vi.fn(async () => null);
    await expect(cachedPublic("resources", "old-slug", loader)).resolves.toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("filters drafts out of cached lists", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { cachedPublic } = await import("@/lib/redis/cache");
    await double.set(
      "csc:test:cache:content-updates:list",
      JSON.stringify({ v: 1, storedAt: new Date().toISOString(), data: [published("live"), { slug: "d", status: "draft" }] }),
      { ex: 60 },
    );
    const loader = vi.fn(async () => []);
    await expect(cachedPublic("updates", "list", loader)).resolves.toEqual([published("live")]);
    expect(loader).not.toHaveBeenCalled();
  });

  it("coalesces concurrent misses into one load", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { cachedPublic } = await import("@/lib/redis/cache");
    let loads = 0;
    const loader = async () => {
      loads += 1;
      await new Promise((r) => setTimeout(r, 20));
      return [published("c")];
    };
    const results = await Promise.all([
      cachedPublic("opportunities", "list", loader),
      cachedPublic("opportunities", "list", loader),
      cachedPublic("opportunities", "list", loader),
    ]);
    expect(loads).toBe(1);
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
  });

  it("never caches nulls", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { cachedPublic } = await import("@/lib/redis/cache");
    const loader = vi.fn(async () => null);
    await cachedPublic("resources", "missing", loader);
    await cachedPublic("resources", "missing", loader);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(double.keys()).toHaveLength(0);
  });
});

describe("invalidatePublicContent", () => {
  it("deletes list + detail keys so new publishes appear and unpublishes vanish", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { cachedPublic, invalidatePublicContent } = await import("@/lib/redis/cache");
    let rows = [published("v1")];
    const loader = vi.fn(async () => rows);
    await cachedPublic("resources", "list", loader);
    // Publish a new row, then invalidate: the next read must reload.
    rows = [published("v1"), published("v2")];
    const result = await invalidatePublicContent("resources");
    expect(result).toMatchObject({ attempted: true });
    await expect(cachedPublic("resources", "list", loader)).resolves.toEqual(rows);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("clears detail keys by slug", async () => {
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { cachedPublic, invalidatePublicContent } = await import("@/lib/redis/cache");
    await cachedPublic("updates", "hello", async () => published("hello"));
    expect(double.keys()).toContain("csc:test:cache:content-updates:hello");
    await invalidatePublicContent("updates", ["hello"]);
    expect(double.keys()).not.toContain("csc:test:cache:content-updates:hello");
  });

  it("is a no-op when the cache flag is off", async () => {
    vi.stubEnv("CSC_REDIS_CACHE", "");
    const double = new InMemoryRedis();
    __setRedisTestDouble(double);
    const { invalidatePublicContent } = await import("@/lib/redis/cache");
    await expect(invalidatePublicContent("events")).resolves.toEqual({ attempted: false, deleted: 0 });
    expect(double.calls).toHaveLength(0);
  });
});
