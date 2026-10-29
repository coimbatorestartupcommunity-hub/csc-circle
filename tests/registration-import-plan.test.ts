import { describe, expect, it } from "vitest";
import type { GoogleFormResponse } from "@/lib/import/google-form-csv";
import { indexRegistrationsByEmail, planGoogleFormImport, type ExistingEventRegistration } from "@/lib/import/registration-import-plan";

const response = (email: string): GoogleFormResponse => ({
  timestamp: "10/29/2026 18:00:00", email, fullName: "Sample Attendee", whatsapp: "9000000000",
  organization: "CSC", role: "Student", attendeeCount: 1, additionalAttendeeNames: "", referralSource: "CSC Community",
  amountPaid: 180, transactionRef: "TXN-123", paymentScreenshotUrl: "https://drive.google.com/file/d/example/view", raw: {},
});

const registration = (overrides: Partial<ExistingEventRegistration> = {}): ExistingEventRegistration => ({
  id: "11111111-1111-4111-8111-111111111111", user_id: "user-1", source_email: null, source: "platform",
  status: "pending", payment: "pending", created_at: "2026-10-29T10:00:00.000Z", source_parent_registration_id: null, ...overrides,
});

describe("Google Form registration import planning", () => {
  it("updates an existing platform registration instead of rejecting the CSV row as a duplicate", () => {
    const indexed = indexRegistrationsByEmail([registration()], new Map([["user-1", "member@example.com"]]));
    const planned = planGoogleFormImport([response("member@example.com")], indexed, () => []);
    expect(planned[0].status).toBe("update");
  });

  it("processes every valid row while keeping a repeated email idempotent", () => {
    const planned = planGoogleFormImport(
      [response("one@example.com"), response("two@example.com"), response("one@example.com")],
      new Map(),
      () => [],
    );
    expect(planned.map((row) => row.status)).toEqual(["new", "new", "update"]);
  });

  it("prefers an imported lead over a guest pass or ordinary event row", () => {
    const imported = registration({ id: "22222222-2222-4222-8222-222222222222", source: "google_form_import", source_email: "member@example.com" });
    const guest = registration({ id: "33333333-3333-4333-8333-333333333333", source: "google_form_import", source_email: "member@example.com", source_parent_registration_id: imported.id });
    const indexed = indexRegistrationsByEmail([guest, registration(), imported], new Map([["user-1", "member@example.com"]]));
    expect(indexed.get("member@example.com")?.id).toBe(imported.id);
  });
});
