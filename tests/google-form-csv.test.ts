import { describe, expect, it } from "vitest";
import { parseGoogleFormCsv, validateGoogleFormResponse } from "@/lib/import/google-form-csv";

const header = [
  "Timestamp", "Email Address", "Full Name", "WhatsApp / Mobile Number",
  "Organization / Company / College Name", "Your Current Role",
  "Number of Attendees (Including Yourself)", "Full Names of Additional Attendees (If Any)",
  "How Did You Hear About This Event?", "Total Amount Paid (₹)",
  "UPI Transaction ID / Reference Number", "Upload Payment Screenshot",
].join(",");

describe("Google Form CSV import", () => {
  it("reads Google Forms formatted attendee counts and amounts", () => {
    const row = [
      "10/29/2026 18:00:00", "attendee@example.com", "Sample Attendee", "+91 90000 00000",
      "Sample Company", "Entrepreneur / Business Owner", "1 attendee — ₹180", "", "Instagram",
      "₹180", "TXN-123", "https://drive.google.com/file/d/example/view",
    ].join(",");
    const [response] = parseGoogleFormCsv(`${header}\n${row}`);

    expect(response.attendeeCount).toBe(1);
    expect(response.amountPaid).toBe(180);
    expect(validateGoogleFormResponse(response, { maxAttendees: 10, pricePerAttendee: 180 })).toEqual([]);
  });

  it("defaults a blank count to one when there are no additional attendee names", () => {
    const row = [
      "10/29/2026 18:00:00", "attendee@example.com", "Sample Attendee", "+91 90000 00000",
      "Sample Company", "Student", "", "", "CSC Community", "180", "TXN-124",
      "https://drive.google.com/file/d/example/view",
    ].join(",");
    expect(parseGoogleFormCsv(`${header}\n${row}`)[0].attendeeCount).toBe(1);
  });

  it("infers group size from the additional-attendee list when the count is blank", () => {
    const row = [
      "10/29/2026 18:00:00", "attendee@example.com", "Sample Attendee", "+91 90000 00000",
      "Sample Company", "Student", "", "Guest One; Guest Two", "CSC Community", "540", "TXN-125",
      "https://drive.google.com/file/d/example/view",
    ].join(",");
    expect(parseGoogleFormCsv(`${header}\n${row}`)[0].attendeeCount).toBe(3);
  });
});
