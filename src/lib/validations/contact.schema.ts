import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  phone: z
    .string()
    .trim()
    .min(5, "Phone number is required")
    .max(30, "Phone number is too long"),
  inquiry: z
    .string()
    .trim()
    .max(2000, "Inquiry must not exceed 2000 characters")
    .optional()
    .or(z.literal("")),
  whatsappConsent: z.boolean(),
  /** Optional honeypot field for bot deterrence. Must be empty. */
  _hp: z.string().optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
