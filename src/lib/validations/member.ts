/**
 * Zod schemas for member onboarding, claim and profile. Prepared for Phase 1;
 * submissions are validated client-side but not persisted until the backend
 * exists.
 */

import { z } from "zod";

const whatsappRegex = /^[+]?[\d][\d\s-]{7,16}$/;
const urlOrEmpty = z
  .string()
  .trim()
  .optional()
  .refine(
    (v) => !v || /^https?:\/\/.+/.test(v),
    "Enter a valid URL starting with http(s).",
  );

/* Onboarding — one schema per step for per-step validation. */

export const onboardingStep1Schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80),
  displayName: z.string().trim().min(2, "Enter a display name.").max(60),
  email: z.string().trim().email("Enter a valid email address."),
  whatsapp: z.string().trim().regex(whatsappRegex, "Enter a valid WhatsApp number."),
  city: z.string().trim().min(2, "Enter your city.").max(60),
});

export const onboardingStep2Schema = z.object({
  designations: z
    .array(z.string())
    .min(1, "Select at least one that describes you."),
});

export const onboardingStep3Schema = z.object({
  startupName: z.string().trim().max(120).optional(),
  startupWebsite: urlOrEmpty,
  industry: z.string().trim().optional(),
  stage: z.string().trim().optional(),
  role: z.string().trim().max(80).optional(),
  description: z.string().trim().max(600).optional(),
  challenges: z.string().trim().max(600).optional(),
});

export const onboardingStep4Schema = z.object({
  goals: z.array(z.string()).min(1, "Select at least one goal."),
});

export const onboardingStep5Schema = z.object({
  membershipTerms: z.literal(true, {
    message: "You must accept the membership terms.",
  }),
  operationalEmail: z.boolean(),
  marketingEmail: z.boolean(),
  directoryParticipation: z.boolean(),
  displayNamePublicly: z.boolean(),
  displayPhotoPublicly: z.boolean(),
});

export type OnboardingData = z.infer<typeof onboardingStep1Schema> &
  z.infer<typeof onboardingStep2Schema> &
  z.infer<typeof onboardingStep3Schema> &
  z.infer<typeof onboardingStep4Schema> &
  z.infer<typeof onboardingStep5Schema>;

/* Membership claim */

export const claimSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80),
  linkedAccountEmail: z.string().trim().email("Enter a valid email address."),
  applicantType: z.enum(["existing_member", "new_applicant"], {
    message: "Select whether you're an existing member or new applicant.",
  }),
  reference: z.string().trim().max(80).optional(),
  whatsapp: z.string().trim().regex(whatsappRegex, "Enter a valid WhatsApp number."),
  designation: z.string().min(1, "Select your designation."),
  startupAffiliation: z.string().trim().max(120).optional(),
  declarationAccurate: z.literal(true, {
    message: "Please confirm the information is accurate.",
  }),
});

export type ClaimFormValues = z.infer<typeof claimSchema>;

/* Profile edit */

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  displayName: z.string().trim().min(2).max(60),
  whatsapp: z.string().trim().regex(whatsappRegex, "Enter a valid WhatsApp number."),
  city: z.string().trim().max(60).optional(),
  startupName: z.string().trim().max(120).optional(),
  startupWebsite: urlOrEmpty,
  startupDescription: z.string().trim().max(600).optional(),
  skills: z.string().trim().max(200).optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
