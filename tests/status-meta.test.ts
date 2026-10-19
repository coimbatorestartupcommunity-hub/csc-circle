import { describe, it, expect } from "vitest";
import {
  membershipStatusMeta,
  registrationStatusMeta,
  consultationStatusMeta,
  reviewModerationMeta,
} from "@/lib/content/member-taxonomy";
import { paymentStatusMeta, notificationStatusMeta } from "@/lib/admin/status-meta";
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
    const all: NotificationStatus[] = ["queued", "sent", "failed", "retrying"];
    for (const s of all) expect(notificationStatusMeta[s]).toBeDefined();
  });
});
