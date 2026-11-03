import { z } from "zod";

export const paidRegistrationRoles = [
  "Startup Founder / Co-Founder", "Entrepreneur / Business Owner", "Working Professional",
  "Student", "Freelancer / Creator", "Aspiring Entrepreneur", "Other",
] as const;
export const paidRegistrationReferrals = ["Instagram", "WhatsApp", "LinkedIn", "Friends / Referral", "CSC Community", "Other"] as const;

export function calculatePaidRegistrationTotal(pricePerAttendee: number, attendeeCount: number) {
  return Math.round(pricePerAttendee * 100) * attendeeCount / 100;
}

export function isPaidRegistrationAmountValid(pricePerAttendee: number, attendeeCount: number, submittedAmount: number) {
  return Number.isFinite(pricePerAttendee) && Number.isFinite(submittedAmount)
    && Math.abs(calculatePaidRegistrationTotal(pricePerAttendee, attendeeCount) - submittedAmount) < 0.001;
}

export function parseAdditionalAttendeeNames(value: string | undefined) {
  return (value ?? "").split(/[\r\n;]/).map((name) => name.trim()).filter(Boolean);
}

export const paidRegistrationSchema = z.object({
  eventId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  whatsapp: z.string().trim().regex(/^\+?[0-9][0-9\s()-]{7,20}$/),
  organization: z.string().trim().min(2).max(120),
  role: z.enum(paidRegistrationRoles),
  attendeeCount: z.coerce.number().int().min(1).max(10),
  totalAmountPaid: z.coerce.number().positive().max(100000),
  additionalAttendeeNames: z.string().trim().max(500).optional().or(z.literal("")),
  referralSource: z.enum(paidRegistrationReferrals).optional().or(z.literal("")),
  dietaryAccessibilityNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  upiTransactionRef: z.string().trim().min(3).max(100),
  consentContact: z.literal("true"),
  consentPaymentTerms: z.literal("true"),
}).superRefine((value, ctx) => {
  if (!Number.isFinite(value.totalAmountPaid)) ctx.addIssue({ code: "custom", path: ["totalAmountPaid"], message: "Enter the exact amount paid." });
  const additionalNames = parseAdditionalAttendeeNames(value.additionalAttendeeNames);
  if (additionalNames.length !== value.attendeeCount - 1) ctx.addIssue({ code: "custom", path: ["additionalAttendeeNames"], message: "Add one full name for every attendee after yourself." });
});

export function isAllowedPaymentProof(file: Pick<File, "size" | "type">) {
  return file.size > 0 && file.size <= 5 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type);
}

/**
 * Browser form values as produced by react-hook-form. Checkbox inputs carry
 * value="true", so consents arrive as the string "true"; untouched optional
 * selects/textareas arrive as "".
 */
export interface BrowserRegistrationValues {
  eventId: unknown;
  fullName: unknown;
  email: unknown;
  whatsapp: unknown;
  organization: unknown;
  role: unknown;
  attendeeCount: unknown;
  additionalAttendeeNames?: unknown;
  referralSource?: unknown;
  dietaryAccessibilityNotes?: unknown;
  consentContact: unknown;
  consentPaymentTerms: unknown;
  guestVerificationId?: string | null;
  guestEmailVerificationToken?: string | null;
}

/**
 * Coerces browser registration values into the create-order API contract.
 * The order endpoint requires real booleans for consents and rejects empty
 * strings for enum-typed optionals, so this boundary converts "true" to true
 * and "" to undefined. Without it every checkout submission fails with 422.
 *
 * Lives in the client-safe validations module (never imports node:crypto),
 * so the checkout form can bundle it.
 */
export function toCreateOrderBody(values: BrowserRegistrationValues): Record<string, unknown> {
  const text = (value: unknown): string => (typeof value === "string" ? value : "");
  const optionalText = (value: unknown): string | undefined => {
    const trimmed = text(value).trim();
    return trimmed ? trimmed : undefined;
  };
  const body: Record<string, unknown> = {
    eventId: text(values.eventId),
    fullName: text(values.fullName),
    email: text(values.email),
    whatsapp: text(values.whatsapp),
    organization: text(values.organization),
    role: text(values.role),
    attendeeCount: Number(values.attendeeCount || 1),
    consentContact: values.consentContact === "true" || values.consentContact === true,
    consentPaymentTerms:
      values.consentPaymentTerms === "true" || values.consentPaymentTerms === true,
  };
  const additionalNames = optionalText(values.additionalAttendeeNames);
  if (additionalNames !== undefined) body.additionalAttendeeNames = additionalNames;
  const referral = optionalText(values.referralSource);
  if (referral !== undefined) body.referralSource = referral;
  const notes = optionalText(values.dietaryAccessibilityNotes);
  if (notes !== undefined) body.dietaryAccessibilityNotes = notes;
  if (values.guestVerificationId) body.guestVerificationId = values.guestVerificationId;
  if (values.guestEmailVerificationToken) {
    body.guestEmailVerificationToken = values.guestEmailVerificationToken;
  }
  return body;
}
