import { describe, it, expect } from "vitest";
import { validateEnv, getEnv } from "@/lib/env";

describe("Environment Validation (Concept 09)", () => {
  it("validates environment successfully with defaults", () => {
    const result = validateEnv();
    expect(result.valid).toBe(true);
  });

  it("provides reliable getEnv configuration", () => {
    const env = getEnv();
    expect(env.NEXT_PUBLIC_SITE_URL).toBeDefined();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBeDefined();
  });
});
