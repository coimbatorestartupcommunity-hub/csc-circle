import { z } from "zod";

export const memberCategories = [
  "Established Business",
  "Startup Founder",
  "Idea Stage",
] as const;

export const memberCategorySchema = z.enum(memberCategories);

const normalizedText = (label: string, minimum: number, maximum: number) =>
  z.string()
    .trim()
    .min(minimum, `${label} must be at least ${minimum} characters.`)
    .max(maximum, `${label} must be ${maximum} characters or fewer.`);

export const contactNumberSchema = z.string()
  .trim()
  .min(7, "Enter a valid contact number.")
  .max(30, "Contact number must be 30 characters or fewer.")
  .regex(/^[+0-9() .-]+$/, "Use only numbers and standard phone punctuation.")
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Enter a valid Indian or international contact number.");

export const memberSurveyFieldsSchema = z.object({
  full_name: normalizedText("Full name", 2, 120),
  contact_number: contactNumberSchema,
  email: z.string()
    .trim()
    .max(254, "Email address must be 254 characters or fewer.")
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  member_category: memberCategorySchema,
  business_or_idea_name: normalizedText("Business, startup, or idea name", 2, 160),
  description: normalizedText("Description", 10, 3000),
  consent: z.boolean().refine(
    (value) => value,
    "You must agree to the privacy notice before submitting.",
  ),
});

export const memberSurveySubmissionSchema = memberSurveyFieldsSchema.extend({
  submission_token: z.string().uuid("Invalid submission identifier."),
  form_started_at: z.coerce.number().int().positive(),
  website: z.string().max(0, "Automated submission rejected.").optional().default(""),
});

export type MemberSurveyFields = z.input<typeof memberSurveyFieldsSchema>;
export type MemberSurveySubmission = z.output<typeof memberSurveySubmissionSchema>;

export const communityDataSorts = ["newest", "oldest", "name_asc", "name_desc"] as const;
export type CommunityDataSort = (typeof communityDataSorts)[number];

const pageSizeSchema = z.coerce.number().int().refine(
  (value) => value === 10 || value === 25 || value === 50,
  "Invalid page size.",
);

export const communityDataFilterSchema = z.object({
  category: memberCategorySchema.optional(),
  search: z.string().trim().max(120, "Search must be 120 characters or fewer.").optional(),
  sort: z.enum(communityDataSorts).default("newest"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: pageSizeSchema.default(25),
});

export type CommunityDataFilter = z.output<typeof communityDataFilterSchema>;

export function parseCommunityDataFilter(input: Record<string, unknown>): CommunityDataFilter {
  return communityDataFilterSchema.parse({
    category: input.category || undefined,
    search: input.search || undefined,
    sort: input.sort || undefined,
    page: input.page || undefined,
    pageSize: input.pageSize || undefined,
  });
}
