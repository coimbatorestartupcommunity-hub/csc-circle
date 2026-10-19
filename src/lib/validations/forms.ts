/**
 * Zod schemas for the public forms. These prepare validation for Phase 1, when
 * the forms connect to a secure submission service. React Hook Form consumes
 * them via @hookform/resolvers/zod.
 */

import { z } from "zod";
import { rsvpGoals } from "@/lib/content/taxonomy";

const whatsappRegex = /^[+]?[\d][\d\s-]{7,16}$/;

export const rsvpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(80, "That name is too long."),
  startup: z
    .string()
    .trim()
    .min(2, "Tell us your startup name or idea.")
    .max(120, "Please keep this under 120 characters."),
  whatsapp: z
    .string()
    .trim()
    .regex(whatsappRegex, "Enter a valid WhatsApp number."),
  email: z.string().trim().email("Enter a valid email address."),
  eventId: z.string().min(1, "Select an event."),
  goal: z.enum(rsvpGoals, { message: "Select your main goal." }),
  consent: z.literal(true, {
    message: "Please accept the contact consent to continue.",
  }),
});

export type RsvpFormValues = z.infer<typeof rsvpSchema>;

export const consultationSchema = rsvpSchema
  .omit({ eventId: true })
  .extend({
    challenge: z
      .string()
      .trim()
      .min(20, "Please describe your challenge in a little more detail.")
      .max(1200, "Please keep this under 1200 characters."),
  });

export type ConsultationFormValues = z.infer<typeof consultationSchema>;

export const reviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Select a rating.")
    .max(5, "Rating cannot exceed 5."),
  review: z
    .string()
    .trim()
    .min(20, "Please share a little more about your experience.")
    .max(600, "Please keep your review under 600 characters."),
  consent: z.literal(true, {
    message: "Please accept the disclosure to continue.",
  }),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;

/** Public (anonymous) RSVP submission accepted by /api/rsvp. */
export const publicRsvpSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  startup: z.string().trim().min(2).max(120),
  whatsapp: z.string().trim().regex(whatsappRegex, "Enter a valid WhatsApp number."),
  email: z.string().trim().email("Enter a valid email address."),
  eventId: z.string().uuid().optional(),
  eventLabel: z.string().trim().max(160).optional(),
  goal: z.enum(rsvpGoals),
  consent: z.literal(true),
});
export type PublicRsvpValues = z.infer<typeof publicRsvpSchema>;

/** Public (anonymous) consultation submission accepted by /api/consultations. */
export const publicConsultationSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  startup: z.string().trim().min(2).max(120),
  whatsapp: z.string().trim().regex(whatsappRegex, "Enter a valid WhatsApp number."),
  email: z.string().trim().email("Enter a valid email address."),
  challenge: z.string().trim().min(20).max(1200),
  consent: z.literal(true),
});
export type PublicConsultationValues = z.infer<typeof publicConsultationSchema>;

export const rsvpDefaultValues: Partial<RsvpFormValues> = {
  fullName: "",
  startup: "",
  whatsapp: "",
  email: "",
  eventId: "",
  consent: false as unknown as true,
};
