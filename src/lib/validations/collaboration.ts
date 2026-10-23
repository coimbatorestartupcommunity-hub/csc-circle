import { z } from "zod";

const localAssetPath = z.string().regex(/^\/(images|brand)\/[A-Za-z0-9._/-]+$/).refine((path) => !path.includes(".."));
const collaborationImagePath = localAssetPath.or(z.string().regex(/^collaboration-featured\/[0-9a-f-]{36}\.webp$/i));
const collaborationLogoPath = localAssetPath.or(z.string().regex(/^collaboration-logos\/[0-9a-f-]{36}\.webp$/i));

export const collaborationSaveSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2).max(160),
  tagline: z.string().max(160).default(""),
  summary: z.string().max(500).default(""),
  story: z.string().max(12_000).default(""),
  category: z.string().trim().min(2).max(100),
  status: z.enum(["upcoming", "ongoing", "completed", "cancelled"]),
  publicationStatus: z.enum(["draft", "pending", "published", "archived"]),
  featuredImagePath: collaborationImagePath.or(z.literal("")),
  partnerIds: z.array(z.string().uuid()).min(2).max(8),
  eventId: z.string().uuid().or(z.literal("")),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).refine((value) => {
    if (!value) return true;
    const [date, time] = value.split("T");
    const instant = new Date(`${date}T${time}:00+05:30`);
    const [year, month, day] = date.split("-").map(Number);
    return Number.isFinite(instant.valueOf()) && instant.getUTCFullYear() === year && instant.getUTCMonth() === month - 1 && instant.getUTCDate() === day;
  }, "Enter a valid event date and time."),
  venueName: z.string().max(160).default(""),
  venueAddress: z.string().max(500).default(""),
  seoTitle: z.string().max(180).default(""),
  metaDescription: z.string().max(300).default(""),
  highlights: z.array(z.object({
    icon: z.string().max(40),
    title: z.string().trim().min(2).max(100),
    body: z.string().trim().min(2).max(500),
  })).max(12),
  media: z.array(z.object({
    media_path: collaborationImagePath,
    alt_text: z.string().trim().min(3).max(240),
    caption: z.string().max(240).default(""),
    display_order: z.number().int().min(0).max(19),
  })).max(20),
}).superRefine((value, context) => {
  if (value.publicationStatus === "published" && !value.featuredImagePath) {
    context.addIssue({ code: "custom", path: ["featuredImagePath"], message: "Upload a 4:3 featured image before publishing." });
  }
});

export type CollaborationSaveValues = z.infer<typeof collaborationSaveSchema>;

export const collaborationOrganizationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  organizationType: z.enum(["community", "startup", "company", "college", "incubator", "accelerator", "other"]),
  description: z.string().max(800).default(""),
  logoPath: collaborationLogoPath.or(z.literal("")),
  websiteUrl: z.string().url().refine((value) => value.startsWith("https://")).or(z.literal("")),
  publicationApproved: z.literal(true),
});

export type CollaborationOrganizationValues = z.infer<typeof collaborationOrganizationSchema>;
