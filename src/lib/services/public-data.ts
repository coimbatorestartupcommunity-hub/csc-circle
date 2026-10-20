import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import type { Collaboration } from "@/types/collaboration";
import {
  USE_FIXTURES,
  startupFixtures,
  eventFixtures,
  testimonialFixtures,
} from "@/lib/services/fixtures";
import type {
  EventRecord,
  Startup,
  Testimonial,
  CollaborationIntent,
} from "@/types";

/**
 * Cached live reads of PUBLISHED public content from Supabase. These power the
 * public site so admin-published events/startups/reviews appear automatically.
 * Cached with a short cacheLife and tagged so a publish can revalidate via
 * updateTag("events" | "directory" | "reviews") in Phase 1.
 */

type Row = Record<string, unknown>;

function mapEvent(r: Row): EventRecord {
  return {
    id: String(r.id),
    slug: (r.slug as string) ?? String(r.id),
    title: (r.title as string) ?? "Event",
    category: (r.category as EventRecord["category"]) ?? "meetup",
    description: (r.description as string) ?? "",
    coverImage: (r.cover_image as string) ?? undefined,
    startsAt: (r.starts_at as string) ?? new Date().toISOString(),
    endsAt: (r.ends_at as string) ?? new Date().toISOString(),
    location: (r.location as string) ?? "",
    venue: (r.venue as string) ?? undefined,
    capacity: (r.capacity as number) ?? undefined,
    registrationDeadline: (r.registration_deadline as string) ?? undefined,
    status: "published",
    admission: (r.admission as EventRecord["admission"]) ?? "free",
    registrationState: (r.registration_state as EventRecord["registrationState"]) ?? "coming-soon",
    featured: !!r.featured,
  };
}

function mapStartup(r: Row): Startup {
  const founder = (r.founder as { id?: string; name?: string; role?: string; profileUrl?: string }) ?? {};
  return {
    id: String(r.id),
    slug: (r.slug as string) ?? String(r.id),
    name: (r.name as string) ?? "",
    logoUrl: (r.logo_url as string) ?? undefined,
    industry: (r.industry as string) ?? "other",
    description: (r.description as string) ?? "",
    collaboration: ((r.collaboration as string[]) ?? []) as CollaborationIntent[],
    website: (r.website as string) ?? undefined,
    founder: {
      id: founder.id ?? String(r.id),
      name: founder.name ?? "Founder",
      role: founder.role ?? "Founder",
      profileUrl: founder.profileUrl,
    },
    status: "published",
  };
}

function mapTestimonial(r: Row): Testimonial {
  return {
    id: String(r.id),
    name: (r.name as string) ?? "CSC Member",
    avatarUrl: (r.avatar_url as string) ?? undefined,
    designation: (r.designation as string) ?? "Community Member",
    quote: (r.review as string) ?? "",
    rating: (r.rating as number) ?? 5,
    createdAt: (r.created_at as string) ?? "",
    status: "published",
  };
}

export async function getLivePublishedEvents(): Promise<EventRecord[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  const sb = createAnonClient();
  if (!sb) return [];
  const { data } = await sb
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("starts_at", { ascending: true });
  return (data ?? []).map((r) => mapEvent(r as Row));
}

export async function getLivePublishedStartups(): Promise<Startup[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("directory");
  const sb = createAnonClient();
  if (!sb) return [];
  const { data } = await sb
    .from("directory_startups")
    .select("*")
    .eq("status", "published")
    .order("updated_at", { ascending: false });
  return (data ?? []).map((r) => mapStartup(r as Row));
}

export async function getLivePublishedTestimonials(): Promise<Testimonial[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("reviews");
  const sb = createAnonClient();
  if (!sb) return [];
  const { data } = await sb
    .from("public_testimonials")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => mapTestimonial(r as Row));
}

/* --- Merged reads: live content, with dev-only fixtures as a fallback ------ */

export async function getPublicStartups(): Promise<Startup[]> {
  const live = await getLivePublishedStartups();
  if (live.length > 0) return live;
  return USE_FIXTURES ? startupFixtures.filter((s) => s.status === "published") : [];
}

export async function getPublicFeaturedStartups(limit = 3): Promise<Startup[]> {
  return (await getPublicStartups()).slice(0, limit);
}

export async function getPublicEvents(): Promise<EventRecord[]> {
  const live = await getLivePublishedEvents();
  if (live.length > 0) return live;
  if (!USE_FIXTURES) return [];
  return eventFixtures
    .filter((e) => e.status === "published")
    .slice()
    .sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.startsAt.localeCompare(b.startsAt);
    });
}

export async function getPublicFeaturedEvent(): Promise<EventRecord | null> {
  const events = await getPublicEvents();
  return events.find((e) => e.featured) ?? events[0] ?? null;
}

export async function getPublicUpcomingEvents(limit = 3): Promise<EventRecord[]> {
  return (await getPublicEvents()).slice(0, limit);
}

export async function getPublicTestimonials(): Promise<Testimonial[]> {
  const live = await getLivePublishedTestimonials();
  if (live.length > 0) return live;
  if (!USE_FIXTURES) return [];
  return testimonialFixtures
    .filter((t) => t.status === "published" && t.rating >= 1 && t.rating <= 5)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* --- Collaborations -------------------------------------------------------- */

const COLLAB_SELECT =
  "*, collaboration_partners(participation_role, display_order, collaboration_organizations(*)), collaboration_media(*)";

function mapCollaboration(r: Row): Collaboration {
  const partners = ((r.collaboration_partners as Row[]) ?? [])
    .map((p) => {
      const org = (p.collaboration_organizations as Row) ?? {};
      return {
        role: (p.participation_role as string) ?? undefined,
        order: (p.display_order as number) ?? 0,
        organization: {
          id: String(org.id ?? ""),
          name: (org.name as string) ?? "",
          slug: (org.slug as string) ?? "",
          organizationType: (org.organization_type as string) ?? "community",
          description: (org.description as string) ?? undefined,
          logoPath: (org.logo_path as string) ?? undefined,
          websiteUrl: (org.website_url as string) ?? undefined,
        },
      };
    })
    .sort((a, b) => a.order - b.order);

  const media = ((r.collaboration_media as Row[]) ?? [])
    .map((m) => ({
      id: String(m.id),
      path: (m.media_path as string) ?? "",
      type: (m.media_type as string) ?? "image",
      alt: (m.alt_text as string) ?? undefined,
      caption: (m.caption as string) ?? undefined,
      order: (m.display_order as number) ?? 0,
    }))
    .sort((a, b) => a.order - b.order);

  return {
    id: String(r.id),
    slug: (r.slug as string) ?? "",
    title: (r.title as string) ?? "",
    tagline: (r.tagline as string) ?? undefined,
    summary: (r.summary as string) ?? undefined,
    story: (r.story as string) ?? undefined,
    category: (r.category as string) ?? "Collaboration",
    status: (r.status as Collaboration["status"]) ?? "completed",
    featuredImagePath: (r.featured_image_path as string) ?? undefined,
    highlights: (r.highlights as Collaboration["highlights"]) ?? [],
    eventId: (r.event_id as string) ?? undefined,
    eventDate: (r.event_date as string) ?? undefined,
    venueName: (r.venue_name as string) ?? undefined,
    venueAddress: (r.venue_address as string) ?? undefined,
    seoTitle: (r.seo_title as string) ?? undefined,
    metaDescription: (r.meta_description as string) ?? undefined,
    publishedAt: (r.published_at as string) ?? undefined,
    partners,
    media,
  };
}

export async function getPublicCollaborations(): Promise<Collaboration[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("collaborations");
  const sb = createAnonClient();
  if (!sb) return [];
  const { data } = await sb
    .from("collaborations")
    .select(COLLAB_SELECT)
    .eq("publication_status", "published")
    .order("published_at", { ascending: false });
  return (data ?? []).map((r) => mapCollaboration(r as Row));
}

export async function getCollaborationBySlug(
  slug: string,
): Promise<Collaboration | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("collaborations");
  const sb = createAnonClient();
  if (!sb) return null;
  const { data } = await sb
    .from("collaborations")
    .select(COLLAB_SELECT)
    .eq("publication_status", "published")
    .eq("slug", slug)
    .maybeSingle();
  return data ? mapCollaboration(data as Row) : null;
}
