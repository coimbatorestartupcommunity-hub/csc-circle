import { describe, it, expect } from "vitest";
import { rsvpSchema, reviewSchema } from "@/lib/validations/forms";
import { claimSchema, startupSubmissionSchema } from "@/lib/validations/member";
import { eventEditorSchema } from "@/lib/validations/admin";

describe("RSVP schema", () => {
  const valid = {
    fullName: "Demo Member",
    startup: "Sample Startup",
    whatsapp: "+91 90000 00000",
    email: "a@example.com",
    eventId: "e1",
    goal: "Networking" as const,
    consent: true as const,
  };
  it("accepts a complete RSVP", () => {
    expect(rsvpSchema.safeParse(valid).success).toBe(true);
  });
  it("requires consent and a valid email", () => {
    expect(rsvpSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(rsvpSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });
});

describe("review schema", () => {
  it("requires rating 1-5, text and consent", () => {
    expect(reviewSchema.safeParse({ rating: 5, review: "A".repeat(25), consent: true }).success).toBe(true);
    expect(reviewSchema.safeParse({ rating: 0, review: "A".repeat(25), consent: true }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 5, review: "short", consent: true }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 5, review: "A".repeat(25), consent: false }).success).toBe(false);
  });
});

describe("claim schema", () => {
  const valid = {
    fullName: "Demo Member",
    linkedAccountEmail: "a@example.com",
    applicantType: "new_applicant" as const,
    whatsapp: "+91 90000 00000",
    designation: "startup_founder",
    declarationAccurate: true as const,
  };
  it("accepts a valid claim", () => {
    expect(claimSchema.safeParse(valid).success).toBe(true);
  });
  it("requires the accuracy declaration", () => {
    expect(claimSchema.safeParse({ ...valid, declarationAccurate: false }).success).toBe(false);
  });
});

describe("startup submission schema", () => {
  const valid = {
    name: "Northstar Robotics",
    slug: "northstar-robotics",
    industry: "Industrial automation and robotics",
    description: "Building automation systems for small manufacturers.",
    website: "https://northstar.example",
    consent: true as const,
  };

  it("accepts a founder-entered industry instead of requiring a preset option", () => {
    expect(startupSubmissionSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a readable industry value", () => {
    expect(startupSubmissionSchema.safeParse({ ...valid, industry: " " }).success).toBe(false);
  });
});

describe("event editor schema", () => {
  const valid = {
    title: "Founder Meetup",
    slug: "founder-meetup",
    description: "A great meetup for founders.",
    category: "meetup" as const,
    date: "2026-12-01",
    startTime: "18:00",
    endTime: "20:00",
    format: "offline" as const,
    approvalMode: "automatic" as const,
    allowWaitlist: true,
    admission: "free" as const,
    currency: "INR",
    status: "draft" as const,
  };
  it("accepts a valid event", () => {
    expect(eventEditorSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects an invalid slug", () => {
    expect(eventEditorSchema.safeParse({ ...valid, slug: "Not A Slug" }).success).toBe(false);
  });
});
