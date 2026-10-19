/**
 * Events data provider. Serves development fixtures when enabled; Phase 1
 * replaces the body with Supabase queries. Signatures stay stable.
 */

import type { EventRecord } from "@/types";
import { eventFixtures, USE_FIXTURES } from "@/lib/services/fixtures";

/** Published events, featured first then chronological. */
export function getPublishedEvents(): EventRecord[] {
  const source = USE_FIXTURES ? eventFixtures : [];
  return source
    .filter((e) => e.status === "published")
    .slice()
    .sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.startsAt.localeCompare(b.startsAt);
    });
}

export function getFeaturedEvent(): EventRecord | null {
  const events = getPublishedEvents();
  return events.find((e) => e.featured) ?? events[0] ?? null;
}

/** Next N published events for the Home page. */
export function getUpcomingEvents(limit = 3): EventRecord[] {
  return getPublishedEvents().slice(0, limit);
}

export function getEventBySlug(slug: string): EventRecord | null {
  return getPublishedEvents().find((e) => e.slug === slug) ?? null;
}
