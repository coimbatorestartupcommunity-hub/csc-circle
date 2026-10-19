import { describe, it, expect } from "vitest";
import {
  canTransitionMembership,
  isPassEligible,
  passEligibleStatuses,
  membershipTransitions,
  ok,
  fail,
  unavailable,
  type RegistrationStatus,
} from "@/types/member";

describe("membership transitions", () => {
  it("allows legal forward transitions", () => {
    expect(canTransitionMembership("claim_submitted", "pending_verification")).toBe(true);
    expect(canTransitionMembership("pending_verification", "approved")).toBe(true);
    expect(canTransitionMembership("approved", "active")).toBe(true);
    expect(canTransitionMembership("active", "suspended")).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(canTransitionMembership("claim_submitted", "active")).toBe(false);
    expect(canTransitionMembership("revoked", "active")).toBe(false);
    expect(canTransitionMembership("not_started", "active")).toBe(false);
  });

  it("revoked is terminal", () => {
    expect(membershipTransitions.revoked).toEqual([]);
  });
});

describe("event pass eligibility", () => {
  const ineligible: RegistrationStatus[] = [
    "draft",
    "pending",
    "pending_review",
    "pending_payment",
    "payment_verification",
    "waitlisted",
    "cancelled",
    "refunded",
  ];

  it("only confirmed and checked_in are pass-eligible", () => {
    expect(passEligibleStatuses.sort()).toEqual(["checked_in", "confirmed"]);
    expect(isPassEligible("confirmed")).toBe(true);
    expect(isPassEligible("checked_in")).toBe(true);
  });

  it("pending / unpaid / cancelled registrations never issue a pass", () => {
    for (const s of ineligible) {
      expect(isPassEligible(s)).toBe(false);
    }
  });
});

describe("service result helpers", () => {
  it("ok wraps data", () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBe(42);
  });
  it("fail and unavailable carry codes", () => {
    expect(fail("forbidden", "no").ok).toBe(false);
    const u = unavailable();
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.error.code).toBe("unavailable");
  });
});
