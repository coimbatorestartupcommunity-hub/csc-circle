export type PublicationStatus = "draft" | "pending" | "published" | "archived";

export const RESOURCE_TYPES = ["document", "guide", "presentation", "link", "article", "template", "video"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_CATEGORIES = [
  "Startup Planning",
  "MVP & Product Development",
  "Pitching",
  "Technology",
  "Business Operations",
  "Learning Materials",
  "Community Resources",
] as const;

export const OPPORTUNITY_CATEGORIES = [
  "Startup Collaborations",
  "Mentorship",
  "Volunteering",
  "Community Programs",
  "Workshops & Challenges",
  "Partnership Opportunities",
  "Founder Opportunities",
] as const;

export type ParticipationMode = "onsite" | "remote" | "hybrid";

export const UPDATE_CATEGORIES = [
  "Community News", "Event Highlights", "Startup Achievements", "Founder Spotlight",
  "Community Milestones", "Collaborations", "Announcements", "Workshops & Learning", "Other",
] as const;

export interface UpdateGalleryImage {
  path: string;
  alt: string;
  caption?: string | null;
  attribution?: string | null;
}

export interface CommunityUpdateRecord {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  featured: boolean;
  coverImagePath: string | null;
  coverImageAlt: string | null;
  gallery: UpdateGalleryImage[];
  author: string | null;
  source: string | null;
  publicationConsent: boolean;
  relatedEventId: string | null;
  relatedCollaborationId: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  status: PublicationStatus;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface ResourceRecord {
  id: string;
  slug: string;
  title: string;
  category: string;
  resourceType: ResourceType;
  summary: string | null;
  description: string | null;
  tags: string[];
  audience: string | null;
  coverImagePath: string | null;
  documentPath: string | null;
  documentFilename: string | null;
  documentMime: string | null;
  documentSize: number | null;
  externalUrl: string | null;
  sourceName: string | null;
  sourceOrganization: string | null;
  sourceUrl: string | null;
  author: string | null;
  license: string | null;
  attribution: string | null;
  publicationConsent: boolean;
  seoTitle: string | null;
  metaDescription: string | null;
  status: PublicationStatus;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface OpportunityRecord {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  description: string | null;
  organization: string | null;
  audience: string | null;
  eligibility: string | null;
  skills: string | null;
  location: string | null;
  participationMode: ParticipationMode | null;
  startsOn: string | null;
  deadline: string | null;
  endsOn: string | null;
  applicationUrl: string | null;
  applicationInstructions: string | null;
  contact: string | null;
  bannerPath: string | null;
  orgLogoPath: string | null;
  source: string | null;
  organizationVerified: boolean;
  publicationConsent: boolean;
  seoTitle: string | null;
  metaDescription: string | null;
  status: PublicationStatus;
  publishedAt: string | null;
  updatedAt: string | null;
}
