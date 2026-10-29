import { describe, it, expect } from "vitest";
import {
  membershipStatusMeta,
  registrationStatusMeta,
  consultationStatusMeta,
  reviewModerationMeta,
} from "@/lib/content/member-taxonomy";
import { paymentStatusMeta, notificationStatusMeta, notificationIssueLabel } from "@/lib/admin/status-meta";
import { membershipTransitions } from "@/types/member";
import type {
  RegistrationStatus,
  ConsultationStatus,
  ReviewModerationStatus,
} from "@/types/member";
import type { PaymentStatusAdmin, NotificationStatus } from "@/types/admin";

// Guards against runtime "undefined.label" crashes when a status has no meta.
describe("status meta completeness", () => {
  it("covers every membership status", () => {
    for (const status of Object.keys(membershipTransitions)) {
      expect(membershipStatusMeta[status as keyof typeof membershipStatusMeta]).toBeDefined();
    }
  });

  it("covers every registration status", () => {
    const all: RegistrationStatus[] = [
      "draft", "pending", "pending_review", "pending_payment",
      "payment_verification", "confirmed", "waitlisted", "cancelled",
      "refunded", "checked_in",
    ];
    for (const s of all) expect(registrationStatusMeta[s]).toBeDefined();
  });

  it("covers every consultation status", () => {
    const all: ConsultationStatus[] = [
      "submitted", "under_review", "more_info_required", "approved",
      "scheduled", "completed", "declined", "cancelled",
    ];
    for (const s of all) expect(consultationStatusMeta[s]).toBeDefined();
  });

  it("covers every review moderation status", () => {
    const all: ReviewModerationStatus[] = ["draft", "submitted", "under_review", "approved", "rejected"];
    for (const s of all) expect(reviewModerationMeta[s]).toBeDefined();
  });

  it("covers every payment status", () => {
    const all: PaymentStatusAdmin[] = [
      "awaiting_payment", "pending_verification", "verified",
      "failed", "rejected", "refunded", "partially_refunded",
    ];
    for (const s of all) expect(paymentStatusMeta[s]).toBeDefined();
  });

  it("covers every notification status", () => {
    const all: NotificationStatus[] = ["queued", "processing", "sent", "available", "superseded", "failed", "retrying", "failed_retryable", "failed_permanent"];
    for (const s of all) expect(notificationStatusMeta[s]).toBeDefined();
  });

  it("explains a superseded membership notice without exposing an internal code", () => {
    expect(notificationIssueLabel("superseded", "SUPERSEDED_BUSINESS_STATE", "email", "MembershipMoreInformation")).toBe(
      "Claim status advanced before dispatch; this email was not sent.",
    );
    expect(notificationIssueLabel("superseded", "SUPERSEDED_BUSINESS_STATE", "in_app", "claim.pending_verification")).toMatch(/older inbox notice was replaced/);
    expect(notificationIssueLabel("superseded", "SUPERSEDED_BUSINESS_STATE", "email", "EventUpdated")).toMatch(/source record changed/);
    expect(notificationIssueLabel("failed_permanent", "INVALID_RECIPIENT")).toBe("INVALID_RECIPIENT");
  });
});
