import { createAnonClient } from "@/lib/supabase/anon";
import { authResponse } from "@/lib/auth/http";
import { isEventNoticeActive } from "@/lib/announcements/event-notice";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const db = createAnonClient();
    if (!db) return authResponse({ notices: [] });
    const client = db as unknown as SupabaseClient;
    const { data, error } = await client
      .from("event_notices")
      .select("id,title,message,button_label,banner_path,visible_from,visible_until,display_priority,status,deleted_at,events!inner(id,slug,title,starts_at,ends_at,venue,registration_state,status)")
      .eq("status", "published")
      .is("deleted_at", null)
      .eq("events.status", "published")
      .order("display_priority", { ascending: false })
      .order("visible_from", { ascending: true })
      .limit(6);
    if (error) return authResponse({ notices: [], error: "Featured event notices could not be loaded." }, 503);
    if (!data) return authResponse({ notices: [] });
    const now = Date.now();
    const notices = (data as Array<Record<string, unknown>>).filter((notice) => {
      const eventValue = notice.events;
      const event = (Array.isArray(eventValue) ? eventValue[0] : eventValue) as Record<string, unknown> | null;
      return !!event && Date.parse(String(event.ends_at)) > now && isEventNoticeActive({
        status: String(notice.status), eventStatus: String(event.status),
        deletedAt: notice.deleted_at ? String(notice.deleted_at) : null,
        startsAt: notice.visible_from ? String(notice.visible_from) : null,
        stopsAt: notice.visible_until ? String(notice.visible_until) : null,
      }, now);
    }).map((notice) => {
      const event = (Array.isArray(notice.events) ? notice.events[0] : notice.events) as Record<string, unknown>;
      return {
        id: String(notice.id), title: String(notice.title), message: String(notice.message), buttonLabel: String(notice.button_label),
        bannerUrl: notice.banner_path ? (String(notice.banner_path).startsWith("/") ? String(notice.banner_path) : `/api/announcements/banner?noticeId=${encodeURIComponent(String(notice.id))}`) : null,
        eventPath: `/events/${encodeURIComponent(String(event.slug))}`,
        eventTitle: String(event.title), eventStartsAt: String(event.starts_at), venue: event.venue ? String(event.venue) : null,
        registrationState: String(event.registration_state ?? "coming-soon"), priority: Number(notice.display_priority ?? 0),
        visibleUntil: notice.visible_until ? String(notice.visible_until) : null,
      };
    });
    return authResponse({ notices });
  } catch {
    return authResponse({ notices: [], error: "Featured event notices could not be loaded." }, 503);
  }
}
