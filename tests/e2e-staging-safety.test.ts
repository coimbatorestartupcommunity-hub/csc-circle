import { describe, expect, it } from "vitest";
import {
  assertLocalSupabaseStatus,
  assertSafeTestTarget,
  createLocalE2EEnvironment,
  dotenvAssignmentNames,
  parseSupabaseStatus,
} from "../scripts/e2e-staging-safety.mjs";

const localStatus = {
  API_URL: "http://127.0.0.1:54321",
  DB_URL: "postgresql://postgres:local-only@127.0.0.1:54322/postgres",
  PUBLISHABLE_KEY: "local-publishable-key",
  SERVICE_ROLE_KEY: "local-service-role-key",
  MAILPIT_URL: "http://127.0.0.1:54324",
};

describe("isolated E2E target guard", () => {
  it("allows only the local Supabase API", () => {
    expect(assertSafeTestTarget("http://127.0.0.1:54321")).toEqual({ local: true, projectRef: "local" });
  });

  it("rejects missing, production, unverified cloud, and non-loopback targets", () => {
    expect(() => assertSafeTestTarget(undefined)).toThrow(/explicit Supabase test URL/);
    expect(() => assertSafeTestTarget("https://mmsrtfktwcrbyrucjmzo.supabase.co")).toThrow(/CSC production/);
    expect(() => assertSafeTestTarget("https://staging-project.supabase.co")).toThrow(/restricted to the verified loopback/);
    expect(() => assertSafeTestTarget("http://0.0.0.0:54321")).toThrow(/restricted to the verified loopback/);
    expect(() => assertSafeTestTarget("http://127.0.0.1:54321?token=secret")).toThrow(/credentials or tokens/);
  });

  it("requires the local Mailpit endpoint for authenticated tests", () => {
    expect(() => assertSafeTestTarget("http://127.0.0.1:54321", { authenticated: true })).toThrow(/Mailpit sink/);
    expect(() => assertSafeTestTarget("http://127.0.0.1:54321", {
      authenticated: true,
      mailSinkUrl: "https://mail.example.com",
    })).toThrow(/captured by loopback Mailpit/);
    expect(() => assertSafeTestTarget("http://127.0.0.1:54321", {
      authenticated: true,
      mailSinkUrl: "http://127.0.0.1:54324?token=secret",
    })).toThrow(/captured by loopback Mailpit/);
    expect(assertSafeTestTarget("http://127.0.0.1:54321", {
      authenticated: true,
      mailSinkUrl: "http://127.0.0.1:54324",
    })).toEqual({ local: true, projectRef: "local" });
  });

  it("parses local CLI status and verifies API, DB, and required local keys", () => {
    const status = parseSupabaseStatus([
      'API_URL="http://127.0.0.1:54321"',
      'DB_URL="postgresql://postgres:local-only@127.0.0.1:54322/postgres"',
      'PUBLISHABLE_KEY="local-publishable-placeholder"',
      'SERVICE_ROLE_KEY="local-service-placeholder"',
    ].join("\n"));
    expect(assertLocalSupabaseStatus(status)).toBe(true);
    expect(() => assertLocalSupabaseStatus({ ...status, API_URL: "https://mmsrtfktwcrbyrucjmzo.supabase.co" })).toThrow(/CSC production/);
    expect(() => assertLocalSupabaseStatus({ ...status, DB_URL: "postgresql://postgres@127.0.0.1:54322/other" })).toThrow(/local database/);
  });

  it("strips inherited secrets and shadows sensitive dotenv keys before Next loads them", () => {
    const env = createLocalE2EEnvironment({
      PATH: "/usr/bin",
      SUPABASE_SECRET_KEY: "production-secret",
      SUPABASE_SERVICE_ROLE_KEY: "production-service-role",
      DATABASE_URL: "postgresql://production",
      SMTP_APP_PASSWORD: "production-smtp-password",
      VERCEL_OIDC_TOKEN: "production-vercel-token",
      EMAIL_NOTIFICATIONS_ENABLED: "true",
    }, localStatus, ["SUPABASE_SECRET_KEY", "SMTP_PASSWORD", "DATABASE_URL", "VERCEL_OIDC_TOKEN"]);

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(localStatus.API_URL);
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(localStatus.PUBLISHABLE_KEY);
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe(localStatus.SERVICE_ROLE_KEY);
    expect(env.SUPABASE_SECRET_KEY).toBe(localStatus.SERVICE_ROLE_KEY);
    expect(env.DATABASE_URL).toBe("");
    expect(env.SMTP_APP_PASSWORD).toBeUndefined();
    expect(env.VERCEL_OIDC_TOKEN).toBe("");
    expect(env.EMAIL_NOTIFICATIONS_ENABLED).toBe("false");
    expect(env.SMTP_PASSWORD).toBe("");
  });

  it("extracts dotenv key names without retaining or returning secret values", () => {
    expect(dotenvAssignmentNames("SUPABASE_SECRET_KEY=private\nexport SMTP_PASSWORD='secret'\nNEXT_PUBLIC_SITE_URL=http://localhost"))
      .toEqual(["SUPABASE_SECRET_KEY", "SMTP_PASSWORD", "NEXT_PUBLIC_SITE_URL"]);
  });
});
