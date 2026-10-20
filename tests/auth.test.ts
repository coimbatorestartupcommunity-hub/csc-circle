import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/auth/redirects";
import { loginSchema, signupSchema, resetPasswordSchema } from "@/lib/validations/auth";

describe("auth validation and safe redirects", () => {
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/\nevil.example", "javascript:alert(1)"])("rejects external or browser-normalized destinations: %s", value => {
    expect(safeNext(value)).toBe("/member/profile");
  });
  it("preserves same-site paths and query strings", () => {
    expect(safeNext("/member/events?tab=upcoming")).toBe("/member/events?tab=upcoming");
  });
  it("rejects authentication-route redirects that could create a loop", () => {
    expect(safeNext("/auth/complete")).toBe("/member/profile");
    expect(safeNext("/login?next=%2Fmember")).toBe("/member/profile");
  });
  it("rejects empty login password and malformed email", () => {
    expect(loginSchema.safeParse({ email: "invalid", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "test@example.test", password: "" }).success).toBe(false);
  });
  const valid = { fullName: "Test Member", email: "test@example.test", password: "Strong-passphrase-42", confirmPassword: "Strong-passphrase-42", acceptTerms: true };
  it("accepts a compliant signup and long passphrases", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
    const password = "Strong-42".repeat(30);
    expect(signupSchema.safeParse({ ...valid, password, confirmPassword: password }).success).toBe(true);
  });
  it("rejects weak passwords, mismatch and unaccepted terms", () => {
    expect(signupSchema.safeParse({ ...valid, password: "weak" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, confirmPassword: "wrong" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, acceptTerms: false }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: valid.password, confirmPassword: "wrong" }).success).toBe(false);
  });
});
