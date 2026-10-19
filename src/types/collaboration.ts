/** Collaborations module domain types (public, read side). */

export type CollaborationStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export interface CollaborationOrganization {
  id: string;
  name: string;
  slug: string;
  organizationType: string;
  description?: string;
  logoPath?: string;
  websiteUrl?: string;
}

export interface CollaborationPartner {
  role?: string;
  order: number;
  organization: CollaborationOrganization;
}

export interface CollaborationMedia {
  id: string;
  path: string;
  type: string;
  alt?: string;
  caption?: string;
  order: number;
}

export interface CollaborationHighlight {
  icon: string;
  title: string;
  body: string;
}

export interface Collaboration {
  id: string;
  slug: string;
  title: string;
  tagline?: string;
  summary?: string;
  story?: string;
  category: string;
  status: CollaborationStatus;
  featuredImagePath?: string;
  highlights: CollaborationHighlight[];
  eventId?: string;
  eventDate?: string;
  venueName?: string;
  venueAddress?: string;
  seoTitle?: string;
  metaDescription?: string;
  publishedAt?: string;
  partners: CollaborationPartner[];
  media: CollaborationMedia[];
}
