import { describe, expect, it } from "vitest";
import { generateSecurityCode, verifySecurityCode } from "@/lib/auth/security-code";

describe("security code verification engine", () => {
  it("generates a 6-digit numeric security code and verifies it successfully", async () => {
    const testUserId = "test-user-12345";
    const code = await generateSecurityCode(testUserId);

    expect(code).toMatch(/^\d{6}$/);

    // Incorrect code fails
    const wrongResult = await verifySecurityCode(testUserId, "000000");
    expect(wrongResult).toBe(false);

    // Correct code succeeds
    const correctResult = await verifySecurityCode(testUserId, code);
    expect(correctResult).toBe(true);

    // Single-use: verifying again fails immediately
    const reusedResult = await verifySecurityCode(testUserId, code);
    expect(reusedResult).toBe(false);
  });
});
