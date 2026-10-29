import { z } from "zod";
import { RESOURCE_TYPES, UPDATE_CATEGORIES } from "@/types/cms";

const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.").min(3).max(90);
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal("")).transform((v) => (v ? v : null));
const optionalUrl = z.string().trim().url().max(500).refine((v) => /^https?:\/\//i.test(v), "Use an HTTP or HTTPS link.").optional().or(z.literal("")).transform((v) => (v ? v : null));
const optionalUuid = z.string().uuid().optional().nullable().or(z.literal("")).transform((v) => v || null);
const mediaPath = z.string().trim().max(200).regex(/^(resource-media|resource-docs|opportunity-media)\/[0-9a-f-]{36}(?:\.[a-z0-9]+)?$/i).optional().or(z.literal("")).transform((v) => (v ? v : null));

export const resourceSaveSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  slug,
  title: z.string().trim().min(3).max(140),
  category: z.string().trim().min(2).max(60),
  resourceType: z.enum(RESOURCE_TYPES),
  summary: optionalText(400),
  description: optionalText(8000),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  audience: optionalText(200),
  coverImagePath: mediaPath,
  documentPath: mediaPath,
  documentFilename: optionalText(200),
  documentMime: optionalText(120),
  documentSize: z.number().int().nonnegative().max(8 * 1024 * 1024).optional().nullable(),
  externalUrl: optionalUrl,
  sourceName: optionalText(140),
  sourceOrganization: optionalText(140),
  sourceUrl: optionalUrl,
  author: optionalText(140),
  license: optionalText(200),
  attribution: optionalText(300),
  publicationConsent: z.boolean().default(false),
  seoTitle: optionalText(140),
  metaDescription: optionalText(300),
});
export type ResourceSaveValues = z.infer<typeof resourceSaveSchema>;

export const opportunitySaveSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  slug,
  title: z.string().trim().min(3).max(140),
  category: z.string().trim().min(2).max(60),
  summary: optionalText(400),
  description: optionalText(8000),
  organization: optionalText(140),
  audience: optionalText(200),
  eligibility: optionalText(1000),
  skills: optionalText(600),
  location: optionalText(160),
  participationMode: z.enum(["onsite", "remote", "hybrid"]).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  startsOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  deadline: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  endsOn: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  applicationUrl: optionalUrl,
  applicationInstructions: optionalText(1000),
  contact: optionalText(200),
  bannerPath: mediaPath,
  orgLogoPath: mediaPath,
  source: optionalText(200),
  organizationVerified: z.boolean().default(false),
  publicationConsent: z.boolean().default(false),
  seoTitle: optionalText(140),
  metaDescription: optionalText(300),
});
export type OpportunitySaveValues = z.infer<typeof opportunitySaveSchema>;

export const cmsActionSchema = z.object({
  action: z.enum(["publish", "unpublish", "archive", "delete"]),
});

const updateImage = z.object({
  path: z.string().regex(/^updates-media\/[0-9a-f-]{36}\.webp$/i),
  alt: z.string().trim().min(1).max(250),
  caption: optionalText(300),
  attribution: optionalText(200),
});

export const communityUpdateSaveSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  slug,
  title: z.string().trim().min(3).max(160),
  category: z.enum(UPDATE_CATEGORIES),
  summary: z.string().trim().min(5).max(500),
  body: z.string().trim().min(20).max(20000),
  featured: z.boolean().default(false),
  coverImagePath: z.string().regex(/^updates-media\/[0-9a-f-]{36}\.webp$/i).optional().or(z.literal("")).transform((v) => v || null),
  coverImageAlt: optionalText(250),
  gallery: z.array(updateImage).max(20).default([]),
  author: optionalText(140),
  source: optionalText(500),
  publicationConsent: z.boolean().default(false),
  relatedEventId: optionalUuid,
  relatedCollaborationId: optionalUuid,
  seoTitle: optionalText(160),
  metaDescription: optionalText(300),
});
export type CommunityUpdateSaveValues = z.infer<typeof communityUpdateSaveSchema>;
