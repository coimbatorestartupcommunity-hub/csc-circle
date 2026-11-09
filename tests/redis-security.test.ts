import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/gate", () => ({
  getAdminContext: vi.fn(),
}));

beforeEach(() => {
  vi.stubEnv("CSC_REDIS_ENABLED", "true");
  vi.stubEnv("CSC_REDIS_CACHE", "true");
  vi.stubEnv("CSC_KV_REST_API_URL", "https://example.upstash.io");
  vi.stubEnv("CSC_KV_REST_API_TOKEN", "secret-token");
  vi.stubEnv("CSC_REDIS_ENV", "test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("key hygiene", () => {
  it("refuses raw emails, phones, UTRs, and secrets in keys", async () => {
    const config = await import("@/lib/redis/config");
    expect(() => config.redisKey("cache", "x", "someone@example.com")).toThrow(/sensitive/);
    expect(() => config.redisKey("cache", "x", "+91 98200 12345")).toThrow(/sensitive/);
    expect(() => config.redisKey("cache", "x", "123456789012")).toThrow(/sensitive/);
    expect(() => config.redisKey("cache", "x", "sbp_abcdefghijklm")).toThrow(/sensitive/);
  });

  it("still rejects phone variants", async () => {
    const config = await import("@/lib/redis/config");
    expect(() => config.redisKey("cache", "x", "9820012345")).toThrow(/sensitive/);
    expect(() => config.redisKey("cache", "x", "(022) 4123-4567")).toThrow(/sensitive/);
  });

  it("accepts UUIDs, hashes, and numeric slugs", async () => {
    const config = await import("@/lib/redis/config");
    expect(() => config.redisKey("probe", "9e021ad5-078e-4cb7-9491-6595afe7860f")).not.toThrow();
    expect(() => config.redisKey("cache", "x", "meetup-jan-2026-01-15")).not.toThrow();
    expect(() => config.redisKey("cache", "x", "2026")).not.toThrow();
    // Even adversarial all-digit token shapes pass only as full UUID/hash forms.
    expect(() =>
      config.redisKey("probe", "12345678-1234-1234-1234-123456789012"),
    ).not.toThrow();
  });

  it("hashes sensitive throttle identifiers", async () => {
    const config = await import("@/lib/redis/config");
    const key = config.throttleKey("member-survey-email", "someone@example.com");
    expect(key).not.toContain("someone");
    expect(key).toMatch(/^csc:test:throttle:member-survey-email:[0-9a-f]{64}$/);
  });

  it("keeps throttle keys stable per scope+identifier", async () => {
    const config = await import("@/lib/redis/config");
    expect(config.throttleKey("s", "id")).toBe(config.throttleKey("s", "id"));
    expect(config.throttleKey("s", "id")).not.toBe(config.throttleKey("s", "other"));
  });
});

describe("no client-side or secret exposure", () => {
  it("never references NEXT_PUBLIC_ or TCP/readonly credentials", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = "src/lib/redis";
    for (const file of fs.readdirSync(dir)) {
      const source = fs.readFileSync(path.join(dir, file), "utf8");
      const code = source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|\s)\/\/.*$/gm, "$1");
      expect(code).not.toContain("NEXT_PUBLIC_");
      expect(code).not.toMatch(/CSC_KV_URL(?!_REST)/);
      expect(code).not.toContain("CSC_REDIS_URL");
      expect(code).not.toContain("READ_ONLY");
      expect(code).not.toContain("fromEnv");
    }
  });

  it("diagnostics payload carries no tokens, URLs, or key contents", async () => {
    const { getRedisDiagnostics } = await import("@/lib/redis/diagnostics");
    const payload = await getRedisDiagnostics({ probe: false });
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("example.upstash.io");
    expect(payload).toMatchObject({ env: "test", cacheEnabled: true });
  });
});

describe("diagnostics route authorization", () => {
  it("returns 404 for non-live contexts", async () => {
    const gate = await import("@/lib/admin/gate");
    vi.mocked(gate.getAdminContext).mockResolvedValue({
      mode: "closed",
      roles: [],
      permissions: new Set(),
      userId: null,
      displayName: "",
    });
    const route = await import("@/app/api/admin/redis/diagnostics/route");
    const closed = await route.GET();
    expect(closed.status).toBe(404);

    vi.mocked(gate.getAdminContext).mockResolvedValue({
      mode: "forbidden",
      roles: [],
      permissions: new Set(),
      userId: "u",
      displayName: "",
    });
    const forbidden = await route.GET();
    expect(forbidden.status).toBe(404);
  });

  it("serves diagnostics to live admins without secrets", async () => {
    const { InMemoryRedis } = await import("./redis-double");
    const { __setRedisTestDouble, __resetRedisClientForTests } = await import("@/lib/redis/client");
    __setRedisTestDouble(new InMemoryRedis());
    const gate = await import("@/lib/admin/gate");
    vi.mocked(gate.getAdminContext).mockResolvedValue({
      mode: "live",
      roles: ["super_admin"],
      permissions: new Set(["settings.manage"]),
      userId: "u",
      displayName: "Admin",
    });
    const route = await import("@/app/api/admin/redis/diagnostics/route");
    const response = await route.GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enabled).toBe(true);
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(body.connectivity?.ok).toBe(true);
    __resetRedisClientForTests();
  });
});
