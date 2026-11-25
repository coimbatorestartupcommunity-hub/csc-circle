import { z } from "zod";

const optionalText = (max: number, label?: string) =>
  z
    .string()
    .trim()
    .max(max, label ? `${label} must be ${max} characters or fewer.` : `Must be ${max} characters or fewer.`)
    .optional()
    .default("");

const optionalHttpUrl = z
  .string()
  .trim()
  .max(500, "URL must be 500 characters or fewer.")
  .optional()
  .default("")
  .refine((v) => !v || /^https?:\/\//i.test(v), "Use a valid http(s) URL.");

const optionalEmail = z
  .string()
  .trim()
  .max(254, "Email must be 254 characters or fewer.")
  .optional()
  .default("")
  .refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email address.");

const optionalPhone = z
  .string()
  .trim()
  .max(24, "Phone number must be 24 characters or fewer.")
  .optional()
  .default("")
  .refine((v) => !v || /^\+?[0-9][0-9 ()-]{7,20}$/.test(v), "Enter a valid phone number with country code.");

const tags = z
  .array(z.string().trim().min(1).max(100, "Each tag must be 100 characters or fewer."))
  .max(30, "You can add up to 30 tags.")
  .default([]);

export const memberStartupSchema = z.object({
  id: z.string().uuid("Invalid startup ID."),
  existingId: z.string().uuid("Invalid existing startup ID.").optional(),
  revisionId: z.string().uuid("Invalid revision ID.").optional(),
  submitForApproval: z.boolean().default(true),
  name: z.string().trim().min(2, "Enter a startup name.").max(180, "Startup name must be 180 characters or fewer."),
  slug: z
    .string()
    .trim()
    .min(3, "Directory URL slug must be at least 3 characters.")
    .max(180, "Directory URL slug must be 180 characters or fewer.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Directory URL slug must only contain lowercase letters, numbers, and hyphens."),
  industry: z.string().trim().min(2, "Enter the startup industry.").max(200, "Industry must be 200 characters or fewer."),
  category: optionalText(300, "Startup category"),
  stage: optionalText(120, "Startup stage"),
  city: z.string().trim().min(2, "Enter the startup city.").max(120, "City must be 120 characters or fewer."),
  state: optionalText(120, "State"),
  country: z.string().trim().min(2, "Enter the country.").max(120, "Country must be 120 characters or fewer."),
  yearFounded: z.number().int().min(1800, "Year must be 1800 or later.").max(new Date().getFullYear(), "Year cannot be in the future.").nullable().optional(),
  tagline: optionalText(300, "Startup tagline"),
  description: z.string().trim().min(20, "Describe your startup in at least 20 characters.").max(4000, "Description must be 4,000 characters or fewer."),
  whatWeDo: optionalText(3000, "What we do"),
  howWeWork: optionalText(3000, "How we work"),
  mission: optionalText(2000, "Our mission"),
  vision: optionalText(2000, "Our vision"),
  problemsSolved: optionalText(2000, "Problems solved"),
  targetAudience: optionalText(2000, "Target audience"),
  approach: optionalText(2000, "Our approach"),
  coreSkills: tags,
  technologies: tags,
  technicalExpertise: tags,
  services: tags,
  capabilities: tags,
  industriesServed: tags,
  collaboration: tags,
  partnershipOpportunities: tags,
  mentorshipInterests: tags,
  fundingInterests: tags,
  website: optionalHttpUrl,
  supportEmail: optionalEmail,
  additionalSupportEmail: optionalEmail,
  companyEmail: optionalEmail,
  companyMobile: optionalPhone,
  companyWhatsapp: optionalPhone,
  contactPerson: optionalText(180, "Contact person"),
  founderRole: z.string().trim().min(2, "Founder designation must be at least 2 characters.").max(120, "Founder designation must be 120 characters or fewer.").default("Founder"),
  founderCity: optionalText(120, "Founder city"),
  founderMobile: optionalPhone,
  founderWhatsapp: optionalPhone,
  founderEmail: optionalEmail,
  founderWebsite: optionalHttpUrl,
  founderLinkedin: optionalHttpUrl,
  founderDescription: optionalText(2000, "Founder description"),
  founderSkills: tags,
  logoPath: z.string().max(240).optional().default(""),
  directoryImagePath: z.string().trim().min(1, "Upload a 4:3 directory image for this startup.").max(240),
  publishWebsite: z.boolean().default(false),
  publishBusinessEmail: z.boolean().default(false),
  publishCompanyPhone: z.boolean().default(false),
  publishFounderContact: z.boolean().default(false),
  consent: z.literal(true, {
    message: "Please check the consent box to submit your startup.",
  }),
});

export type MemberStartupInput = z.infer<typeof memberStartupSchema>;
