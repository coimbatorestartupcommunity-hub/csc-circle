import { describe, expect, it } from "vitest";
import { z } from "zod";
import { paidRegistrationRoles, paidRegistrationReferrals, additionalAttendeeSchema } from "@/lib/validations/paid-registration";

const freeRegistrationSchema = z.object({
  eventId: z.string().uuid("Invalid event reference."),
  fullName: z.string().trim().min(2, "Please enter your full name (minimum 2 characters).").max(100),
  email: z.string().trim().email("Please enter a valid email address.").max(254),
  whatsapp: z.string().trim().regex(/^\+?[0-9][0-9\s()-]{7,20}$/, "Please enter a valid WhatsApp or phone number (e.g. +91 98765 43210)."),
  organization: z.string().trim().min(2, "Please enter your startup, company, or venture name.").max(120),
  role: z.enum(paidRegistrationRoles, { message: "Please select your role from the list." }),
  attendeeCount: z.coerce.number().int().min(1).max(10),
  additionalAttendees: z.array(additionalAttendeeSchema).optional(),
  additionalAttendeeNames: z.string().trim().max(1000).optional().or(z.literal("")),
  referralSource: z.enum(paidRegistrationReferrals).optional().or(z.literal("")),
  dietaryAccessibilityNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  consentContact: z.literal("true").optional().or(z.literal("false")).or(z.literal("")),
  consentPaymentTerms: z.literal("true", { message: "Please accept the event registration terms." }),
});

describe("free event registration schema", () => {
  const validFree = {
    eventId: "948bfc48-c627-4b06-a665-5c2cd8226505",
    fullName: "Coimbatore Founder",
    email: "founder@coimbatore.example",
    whatsapp: "+91 98765 43210",
    organization: "Logic Intelligence",
    role: "Startup Founder / Co-Founder",
    attendeeCount: 1,
    consentContact: "true",
    consentPaymentTerms: "true",
  };

  it("accepts valid free event registration data", () => {
    const result = freeRegistrationSchema.safeParse(validFree);
    expect(result.success).toBe(true);
  });

  it("allows consentContact to be optional or false for free registration", () => {
    expect(freeRegistrationSchema.safeParse({ ...validFree, consentContact: "" }).success).toBe(true);
    expect(freeRegistrationSchema.safeParse({ ...validFree, consentContact: "false" }).success).toBe(true);
    expect(freeRegistrationSchema.safeParse({ ...validFree, consentContact: undefined }).success).toBe(true);
  });

  it("requires consentPaymentTerms (community guidelines)", () => {
    expect(freeRegistrationSchema.safeParse({ ...validFree, consentPaymentTerms: "false" }).success).toBe(false);
  });

  it("validates multi-attendee additions correctly", () => {
    const multi = {
      ...validFree,
      attendeeCount: 2,
      additionalAttendees: [
        {
          fullName: "Attendee Two",
          email: "att2@example.com",
          whatsapp: "+91 98765 43211",
          organization: "Logic Intelligence",
          role: "Entrepreneur / Business Owner",
        },
      ],
    };
    expect(freeRegistrationSchema.safeParse(multi).success).toBe(true);
  });
});
