import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculatePaidRegistrationTotal, isAllowedPaymentProof, isPaidRegistrationAmountValid, paidRegistrationSchema } from "@/lib/validations/paid-registration";
import { eventEditorSchema } from "@/lib/validations/admin";
import { parseGoogleFormCsv, validateGoogleFormResponse } from "@/lib/import/google-form-csv";

const valid = {
  eventId: "11111111-1111-4111-8111-111111111111", fullName: "A Person", email: "a@example.com",
  whatsapp: "+91 90000 00000", organization: "Sample Startup", role: "Startup Founder / Co-Founder",
  attendeeCount: "2", additionalAttendeeNames: "Guest Name", totalAmountPaid: "360", upiTransactionRef: "UPI12345", consentContact: "true", consentPaymentTerms: "true",
};

describe("paid event registration", () => {
  it("calculates and validates the exact attendee total", () => {
    expect(calculatePaidRegistrationTotal(180, 3)).toBe(540);
    expect(isPaidRegistrationAmountValid(180, 2, 360)).toBe(true);
    expect(isPaidRegistrationAmountValid(180, 2, 180)).toBe(false);
    expect(paidRegistrationSchema.safeParse(valid).success).toBe(true);
  });

  it("requires contact, role, payment reference, and both consents", () => {
    expect(paidRegistrationSchema.safeParse({ ...valid, email: "bad" }).success).toBe(false);
    expect(paidRegistrationSchema.safeParse({ ...valid, consentContact: "false" }).success).toBe(false);
    expect(paidRegistrationSchema.safeParse({ ...valid, role: "Founder" }).success).toBe(false);
    expect(paidRegistrationSchema.safeParse({ ...valid, attendeeCount: "11" }).success).toBe(false);
  });

  it("accepts only the supported proof MIME types under 5 MB", () => {
    expect(isAllowedPaymentProof({ type: "image/png", size: 100 } as File)).toBe(true);
    expect(isAllowedPaymentProof({ type: "image/svg+xml", size: 100 } as File)).toBe(false);
    expect(isAllowedPaymentProof({ type: "application/pdf", size: 5 * 1024 * 1024 + 1 } as File)).toBe(false);
  });

  it("blocks publishing paid UPI events before the payee, VPA, and QR are configured", () => {
    const draft = { title: "Event Name", slug: "event-name", description: "A valid event description.", category: "networking", date: "2026-11-01", startTime: "11:30", endTime: "14:30", format: "offline", approvalMode: "manual", allowWaitlist: false, admission: "paid", price: "180", currency: "INR", registrationMode: "paid_upi", pricePerAttendee: "180", maxAttendeesPerRegistration: 10, status: "published" };
    expect(eventEditorSchema.safeParse(draft).success).toBe(false);
    expect(eventEditorSchema.safeParse({ ...draft, upiVpa: "verified@bank", upiPayeeName: "CSC", upiQrPath: "event-upi-qr/11111111-1111-4111-8111-111111111111.webp" }).success).toBe(true);
  });

  it("keeps proof storage private and review policies permission-gated", () => {
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20261029120000_native_paid_upi_registration.sql"), "utf8");
    expect(sql).toContain("values('payment-proofs','payment-proofs',false");
    expect(sql).toContain("private.has_permission('registrations.read')");
    expect(sql).toContain("private.has_permission('registrations.approve')");
  });
});

describe("Google Form CSV imports", () => {
  const csv = `Timestamp,Email Address,Full Name,WhatsApp / Mobile Number,Organization / Company / College Name,Your Current Role,Number of Attendees (Including Yourself),Full Names of Additional Attendees,How Did You Hear About This Event?,Total Amount Paid (₹),UPI Transaction ID / Reference Number,Upload Payment Screenshot (a Google Drive URL)\n"10/20/2026 10:12:00",person@example.com,"Person, One",+91 90000 00000,"Startup,\n Co.","Startup Founder / Co-Founder",2,"Guest One",Instagram,"₹360.00",UPI-123,"https://drive.google.com/file/d/abc/view"`;

  it("maps the Google Form headers and parses quoted commas and embedded newlines", () => {
    const [row] = parseGoogleFormCsv(csv);
    expect(row.email).toBe("person@example.com");
    expect(row.fullName).toBe("Person, One");
    expect(row.organization).toBe("Startup,\n Co.");
    expect(row.attendeeCount).toBe(2);
    expect(row.additionalAttendeeNames).toBe("Guest One");
    expect(row.amountPaid).toBe(360);
    expect(row.paymentScreenshotUrl).toContain("drive.google.com");
    expect(validateGoogleFormResponse(row, { maxAttendees: 10, pricePerAttendee: 180 })).toEqual([]);
  });

  it("rejects malformed, over-limit, and mismatched payment responses", () => {
    const [row] = parseGoogleFormCsv(csv);
    expect(validateGoogleFormResponse({ ...row, email: "bad", attendeeCount: 12, amountPaid: 10 }, { maxAttendees: 10, pricePerAttendee: 180 }).length).toBeGreaterThan(0);
    expect(() => parseGoogleFormCsv('Email Address,Full Name\n"unfinished,Person')).toThrow();
  });
});
