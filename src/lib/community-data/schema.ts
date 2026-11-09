import { z } from "zod";

export const memberCategories = [
  "Established Business",
  "Startup Founder",
  "Idea Stage",
] as const;

export const memberCategorySchema = z.enum(memberCategories);
export type MemberCategory = z.infer<typeof memberCategorySchema>;

export const industrySectors = [
  "Technology / Software",
  "Healthcare / Life Sciences",
  "Education / EdTech",
  "Finance / FinTech",
  "E-commerce / Retail",
  "Manufacturing",
  "Agriculture / Food",
  "Hospitality / Travel",
  "Real Estate / Construction",
  "Media / Entertainment",
  "Logistics / Transportation",
  "Consulting / Professional Services",
  "Social Impact / Nonprofit",
  "Other",
] as const;

export const industrySectorSchema = z.enum(industrySectors);

export const establishedBusinessStages = [
  "Recently Established",
  "Operating / Established",
  "Revenue-Generating",
  "Growing / Expanding",
  "Scaling to New Markets",
] as const;

export const startupStages = [
  "Research & Validation",
  "Prototype / MVP",
  "Launched",
  "Revenue-Generating",
  "Growing / Scaling",
] as const;

export const ideaStages = [
  "Not Yet",
  "Researching",
  "Validating the Idea",
  "Building a Prototype",
] as const;

export const stagesForCategory: Record<MemberCategory, readonly string[]> = {
  "Established Business": establishedBusinessStages,
  "Startup Founder": startupStages,
  "Idea Stage": ideaStages,
};

export const allCurrentStages = [
  ...establishedBusinessStages,
  ...startupStages.filter((stage) => !(establishedBusinessStages as readonly string[]).includes(stage)),
  ...ideaStages,
] as const;

export const currentStageSchema = z.enum(allCurrentStages);

export const supportNeededOptions = [
  "Funding / Investment",
  "Mentorship",
  "Networking Opportunities",
  "Marketing & Visibility",
  "Talent / Hiring",
  "Technology Support",
  "Legal & Compliance",
  "Financial Planning",
  "Business Strategy",
  "Product Development",
  "Market Access",
  "Workspace / Infrastructure",
  "Other",
] as const;

export const supportNeededOptionSchema = z.enum(supportNeededOptions);

export const businessTeamSizes = [
  "Just me",
  "2-5",
  "6-10",
  "11-25",
  "26-50",
  "50+",
] as const;

export const businessTeamSizeSchema = z.enum(businessTeamSizes);

export const businessConnectionOptions = [
  "Investors",
  "Mentors",
  "Customers",
  "Distributors / Channel Partners",
  "Suppliers / Vendors",
  "Industry Peers",
  "Government / Policy Support",
  "Talent / Hiring",
  "Technology Partners",
  "Media / Visibility",
  "Other",
] as const;

export const businessConnectionOptionSchema = z.enum(businessConnectionOptions);

export const startupTeamStructures = [
  "Solo Founder",
  "2 Co-founders",
  "Small Team (3-5)",
  "Growing Team (6-15)",
  "Large Team (16+)",
] as const;

export const startupTeamStructureSchema = z.enum(startupTeamStructures);

export const startupSupportOptions = [
  "Mentorship",
  "Funding / Investment",
  "Co-founder Matching",
  "Product Development",
  "Go-to-Market Strategy",
  "Hiring / Talent",
  "Legal / Incorporation",
  "Marketing / Branding",
  "Networking",
  "Technology / Tools",
  "Workspace",
  "Other",
] as const;

export const startupSupportOptionSchema = z.enum(startupSupportOptions);

export const seekingCofounderOptions = [
  "Yes, Actively Looking",
  "Yes, Open to It",
  "No, Have a Team",
  "No, Solo",
] as const;

export const seekingCofounderSchema = z.enum(seekingCofounderOptions);

export const ideaSupportOptions = [
  "Idea Validation",
  "Mentorship",
  "Market Research",
  "Prototyping Support",
  "Technical Guidance",
  "Business Planning",
  "Funding Guidance",
  "Co-founder Matching",
  "Networking",
  "Skill Development",
  "Legal / IP Guidance",
  "Other",
] as const;

export const ideaSupportOptionSchema = z.enum(ideaSupportOptions);

export const discoverySources = [
  "Google Search",
  "Social Media",
  "Friend / Referral",
  "CSC Event",
  "WhatsApp Community",
  "College / Institution",
  "News / Media",
  "Partner Organization",
  "Other",
] as const;

export const discoverySourceSchema = z.enum(discoverySources);

export const preferredContactMethods = [
  "Phone Call",
  "WhatsApp",
  "Email",
  "Any",
] as const;

export const preferredContactMethodSchema = z.enum(preferredContactMethods);

const normalizedText = (label: string, minimum: number, maximum: number) =>
  z.string()
    .trim()
    .min(minimum, `${label} must be at least ${minimum} characters.`)
    .max(maximum, `${label} must be ${maximum} characters or fewer.`);

const blankableText = (label: string, maximum: number) =>
  z.string()
    .trim()
    .max(maximum, `${label} must be ${maximum} characters or fewer.`)
    .nullish()
    .transform((value) => (value ? value : undefined));

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).nullish().transform((value) => value ?? undefined);

const optionalMultiEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.array(z.enum(values)).max(values.length).nullish().transform((value) => value ?? undefined);

export const contactNumberSchema = z.string()
  .trim()
  .min(7, "Enter a valid contact number.")
  .max(30, "Contact number must be 30 characters or fewer.")
  .regex(/^[+0-9() .-]+$/, "Use only numbers and standard phone punctuation.")
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Enter a valid Indian or international contact number.");

const surveyYear = new Date().getFullYear();

const establishedYearSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number()
    .int("Enter a valid 4-digit year.")
    .min(1900, "Enter a valid 4-digit year.")
    .max(surveyYear, `Established year cannot be later than ${surveyYear}.`)
    .optional(),
);

export function normalizeWebsiteUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withScheme.replace(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//, (match) => match.toLowerCase());
}

export function isValidWebsiteUrl(value?: string): boolean {
  const normalized = normalizeWebsiteUrl(value);
  if (!normalized || normalized.length > 2048) return false;
  try {
    const parsed = new URL(normalized);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export const memberSurveyFieldsSchema = z.object({
  full_name: normalizedText("Full name", 2, 120),
  contact_number: contactNumberSchema,
  email: z.string()
    .trim()
    .max(254, "Email address must be 254 characters or fewer.")
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  city: normalizedText("City", 2, 120),
  member_category: memberCategorySchema,
  business_or_idea_name: normalizedText("Business, startup, or idea name", 2, 160),
  industry_sector: z.enum(industrySectors, { error: "Select your industry." }),
  industry_other: blankableText("Industry details", 120),
  current_stage: z.enum(allCurrentStages, { error: "Select your current stage." }),
  description: normalizedText("Description", 10, 3000),
  support_needed: z.array(supportNeededOptionSchema, {
    error: "Select at least one area where you need support.",
  }).min(1, "Select at least one area where you need support.").max(supportNeededOptions.length),
  support_needed_other: blankableText("Other support details", 200),
  biggest_challenge: blankableText("Biggest challenge", 1000),
  website_url: blankableText("Website URL", 2048),
  discovery_source: optionalEnum(discoverySources),
  discovery_source_other: blankableText("Discovery details", 200),
  preferred_contact_method: optionalEnum(preferredContactMethods),
  established_year: establishedYearSchema,
  business_team_size: optionalEnum(businessTeamSizes),
  business_connections: optionalMultiEnum(businessConnectionOptions),
  business_connections_other: blankableText("Other connection details", 200),
  startup_team_structure: optionalEnum(startupTeamStructures),
  startup_support: optionalMultiEnum(startupSupportOptions),
  startup_support_other: blankableText("Other startup support details", 200),
  startup_current_focus: blankableText("Current focus", 1000),
  seeking_cofounder: optionalEnum(seekingCofounderOptions),
  idea_support: optionalMultiEnum(ideaSupportOptions),
  idea_support_other: blankableText("Other idea support details", 200),
  idea_problem_statement: blankableText("Problem statement", 1000),
  consent: z.boolean().refine(
    (value) => value,
    "You must agree to the privacy notice before submitting.",
  ),
}).superRefine((value, context) => {
  if (value.industry_sector === "Other" && !value.industry_other?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["industry_other"],
      message: "Please specify your industry.",
    });
  }
  const allowedStages = stagesForCategory[value.member_category];
  if (!allowedStages.includes(value.current_stage)) {
    context.addIssue({
      code: "custom",
      path: ["current_stage"],
      message: "Select a current stage that matches the chosen category.",
    });
  }
  if (value.website_url?.trim() && !isValidWebsiteUrl(value.website_url)) {
    context.addIssue({
      code: "custom",
      path: ["website_url"],
      message: "Enter a valid website URL, for example https://example.com.",
    });
  }
});

export const memberSurveySubmissionSchema = memberSurveyFieldsSchema.extend({
  submission_token: z.string().uuid("Invalid submission identifier."),
  form_started_at: z.coerce.number().int().positive(),
  website: z.string().max(0, "Automated submission rejected.").optional().default(""),
});

export type MemberSurveyFields = z.input<typeof memberSurveyFieldsSchema>;
export type MemberSurveyFieldsOutput = z.output<typeof memberSurveyFieldsSchema>;
export type MemberSurveySubmission = z.output<typeof memberSurveySubmissionSchema>;

function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanArray<T extends string>(value: readonly T[] | undefined): T[] | undefined {
  return value && value.length > 0 ? [...value] : undefined;
}

/**
 * Removes values that do not belong to the submission's final category and
 * normalizes optional fields, so category switches never persist stale data.
 * Safe to apply on both the client (before submit) and the server.
 */
export function sanitizeMemberSurveyValues(value: MemberSurveySubmission): MemberSurveySubmission {
  const isEstablished = value.member_category === "Established Business";
  const isStartup = value.member_category === "Startup Founder";
  const isIdea = value.member_category === "Idea Stage";
  return {
    ...value,
    industry_other: value.industry_sector === "Other" ? cleanText(value.industry_other) : undefined,
    support_needed_other: value.support_needed.includes("Other")
      ? cleanText(value.support_needed_other)
      : undefined,
    biggest_challenge: cleanText(value.biggest_challenge),
    website_url: normalizeWebsiteUrl(value.website_url),
    discovery_source_other: value.discovery_source === "Other"
      ? cleanText(value.discovery_source_other)
      : undefined,
    established_year: isEstablished ? value.established_year : undefined,
    business_team_size: isEstablished ? value.business_team_size : undefined,
    business_connections: isEstablished ? cleanArray(value.business_connections) : undefined,
    business_connections_other: isEstablished && (value.business_connections ?? []).includes("Other")
      ? cleanText(value.business_connections_other)
      : undefined,
    startup_team_structure: isStartup ? value.startup_team_structure : undefined,
    startup_support: isStartup ? cleanArray(value.startup_support) : undefined,
    startup_support_other: isStartup && (value.startup_support ?? []).includes("Other")
      ? cleanText(value.startup_support_other)
      : undefined,
    startup_current_focus: isStartup ? cleanText(value.startup_current_focus) : undefined,
    seeking_cofounder: isIdea ? value.seeking_cofounder : undefined,
    idea_support: isIdea ? cleanArray(value.idea_support) : undefined,
    idea_support_other: isIdea && (value.idea_support ?? []).includes("Other")
      ? cleanText(value.idea_support_other)
      : undefined,
    idea_problem_statement: isIdea ? cleanText(value.idea_problem_statement) : undefined,
  };
}

export const communityDataSorts = ["newest", "oldest", "name_asc", "name_desc"] as const;
export type CommunityDataSort = (typeof communityDataSorts)[number];

const pageSizeSchema = z.coerce.number().int().refine(
  (value) => value === 10 || value === 25 || value === 50,
  "Invalid page size.",
);

const filterDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates.")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()), "Use a valid calendar date.")
  .optional();

export const communityDataFilterSchema = z.object({
  category: memberCategorySchema.optional(),
  search: z.string().trim().max(120, "Search must be 120 characters or fewer.").optional(),
  city: z.string().trim().max(120, "City must be 120 characters or fewer.").optional(),
  industry: industrySectorSchema.optional(),
  stage: currentStageSchema.optional(),
  support: supportNeededOptionSchema.optional(),
  from: filterDateSchema,
  to: filterDateSchema,
  sort: z.enum(communityDataSorts).default("newest"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: pageSizeSchema.default(25),
});

export type CommunityDataFilter = z.output<typeof communityDataFilterSchema>;

export function parseCommunityDataFilter(input: Record<string, unknown>): CommunityDataFilter {
  return communityDataFilterSchema.parse({
    category: input.category || undefined,
    search: input.search || undefined,
    city: input.city || undefined,
    industry: input.industry || undefined,
    stage: input.stage || undefined,
    support: input.support || undefined,
    from: input.from || undefined,
    to: input.to || undefined,
    sort: input.sort || undefined,
    page: input.page || undefined,
    pageSize: input.pageSize || undefined,
  });
}
