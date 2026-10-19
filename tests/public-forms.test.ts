import { describe, it, expect } from "vitest";
import {
  publicRsvpSchema,
  publicConsultationSchema,
} from "@/lib/validations/forms";
import { rateLimit } from "@/lib/rate-limit";

describe("public RSVP schema (server-side)", () => {
  const valid = {
    eventId: "11111111-1111-4111-8111-111111111111",
    fullName: "Demo Member",
    startup: "Sample Startup",
    whatsapp: "+91 90000 00000",
    email: "a@example.com",
    goal: "Networking" as const,
    consent: true as const,
  };
  it("accepts a valid submission with a required UUID event id", () => {
    expect(publicRsvpSchema.safeParse(valid).success).toBe(true);
    expect(
      publicRsvpSchema.safeParse({
        ...valid,
        eventId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
  });
  it("rejects a non-uuid event id, bad email, and missing consent", () => {
    expect(publicRsvpSchema.safeParse({ ...valid, eventId: "fx-event-1" }).success).toBe(false);
    expect(publicRsvpSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
    expect(publicRsvpSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });
});

describe("public consultation schema (server-side)", () => {
  it("requires a sufficiently detailed challenge and consent", () => {
    const base = {
      fullName: "Demo Member",
      startup: "Sample Startup",
      whatsapp: "+91 90000 00000",
      email: "a@example.com",
    };
    expect(
      publicConsultationSchema.safeParse({ ...base, challenge: "A".repeat(25), consent: true }).success,
    ).toBe(true);
    expect(
      publicConsultationSchema.safeParse({ ...base, challenge: "short", consent: true }).success,
    ).toBe(false);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit then blocks within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 10_000).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 3, 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });
});
