import { describe, expect, it } from "vitest";
import { normalizePhoneNumber, maskPhoneNumber } from "@/lib/phone/normalize";

describe("phone number normalization & validation", () => {
  it("normalizes standard Indian 10-digit mobile number", () => {
    const res = normalizePhoneNumber("9876543210");
    expect(res.valid).toBe(true);
    expect(res.e164).toBe("+919876543210");
    expect(res.internationalDigits).toBe("919876543210");
    expect(res.chatId).toBe("919876543210@c.us");
    expect(res.countryCode).toBe("IN");
  });

  it("normalizes Indian number with +91 prefix and spaces", () => {
    const res = normalizePhoneNumber("+91 98765 43210");
    expect(res.valid).toBe(true);
    expect(res.e164).toBe("+919876543210");
    expect(res.chatId).toBe("919876543210@c.us");
  });

  it("normalizes Indian number with leading zero (09876543210)", () => {
    const res = normalizePhoneNumber("09876543210");
    expect(res.valid).toBe(true);
    expect(res.e164).toBe("+919876543210");
    expect(res.chatId).toBe("919876543210@c.us");
  });

  it("normalizes international US number (+1 202 555 0123)", () => {
    const res = normalizePhoneNumber("+1 202 555 0123");
    expect(res.valid).toBe(true);
    expect(res.e164).toBe("+12025550123");
    expect(res.internationalDigits).toBe("12025550123");
    expect(res.chatId).toBe("12025550123@c.us");
    expect(res.countryCode).toBe("US");
  });

  it("normalizes UK number (+44 20 7946 0958)", () => {
    const res = normalizePhoneNumber("+44 20 7946 0958");
    expect(res.valid).toBe(true);
    expect(res.e164).toBe("+442079460958");
    expect(res.chatId).toBe("442079460958@c.us");
    expect(res.countryCode).toBe("GB");
  });

  it("strips pre-existing @c.us suffix safely without duplicate suffixing", () => {
    const res = normalizePhoneNumber("919876543210@c.us");
    expect(res.valid).toBe(true);
    expect(res.chatId).toBe("919876543210@c.us");
    expect(res.chatId).not.toContain("@c.us@c.us");
  });

  it("rejects invalid or impossible phone numbers", () => {
    const res1 = normalizePhoneNumber("12345");
    expect(res1.valid).toBe(false);
    expect(res1.chatId).toBeNull();

    const res2 = normalizePhoneNumber("abcdefghij");
    expect(res2.valid).toBe(false);
  });

  it("rejects empty or null input", () => {
    expect(normalizePhoneNumber("").valid).toBe(false);
    expect(normalizePhoneNumber(null as unknown as string).valid).toBe(false);
    expect(normalizePhoneNumber(undefined as unknown as string).valid).toBe(false);
  });

  it("masks phone numbers safely for logs", () => {
    expect(maskPhoneNumber("+919876543210")).toBe("+91987****10");
    expect(maskPhoneNumber("9876543210")).toBe("987654****10");
    expect(maskPhoneNumber("")).toBe("[EMPTY]");
  });
});
