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
      .select("id,title,message,button_label,banner_path,visible_from,visible_until,display_priority,status,deleted_at,completed_at,events!inner(id,slug,title,starts_at,ends_at,venue,registration_state,status)")
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
      return !!event && (!!notice.completed_at || Date.parse(String(event.ends_at)) > now) && isEventNoticeActive({
        status: String(notice.status), eventStatus: String(event.status),
        deletedAt: notice.deleted_at ? String(notice.deleted_at) : null,
        startsAt: notice.visible_from ? String(notice.visible_from) : null,
        stopsAt: !notice.completed_at && notice.visible_until ? String(notice.visible_until) : null,
      }, now);
    }).map((notice) => {
      const event = (Array.isArray(notice.events) ? notice.events[0] : notice.events) as Record<string, unknown>;
      const isJointMeeting =
        event.slug === "csc-joint-online-meeting" ||
        event.id === "948bfc48-c627-4b06-a665-5c2cd8226505" ||
        String(event.title).includes("Joint Online Meeting");

      const eventStartsAt = isJointMeeting ? "2026-11-22T15:00:00+05:30" : String(event.starts_at);
      const title = isJointMeeting
        ? "CSC Joint Online Meeting · Introductions, Startup Showcases & Founder Networking"
        : String(notice.title);
      const message = isJointMeeting
        ? "Join Coimbatore's founders, builders, and ecosystem leaders on Google Meet on Sunday, Nov 22, 2026 (3:00 PM – 5:00 PM IST). Every attendee will be introduced to showcase their business, background, and vision. Network directly, exchange contacts, and discover potential co-founders and collaborators. Check-in unlocks at 2:00 PM IST."
        : String(notice.message);
      const buttonLabel = notice.completed_at
        ? "Completed · View event"
        : (isJointMeeting ? "Register Free Now" : String(notice.button_label));
      const venue = isJointMeeting ? "Online via Google Meet" : (event.venue ? String(event.venue) : null);
      const registrationState = isJointMeeting ? "open" : String(event.registration_state ?? "open");

      return {
        id: String(notice.id),
        title,
        message,
        buttonLabel,
        bannerUrl: notice.banner_path ? `/api/announcements/banner?noticeId=${encodeURIComponent(String(notice.id))}` : null,
        eventPath: `/events/${encodeURIComponent(String(event.slug))}`,
        eventTitle: String(event.title),
        eventStartsAt,
        venue,
        registrationState,
        priority: Number(notice.display_priority ?? 100),
        visibleUntil: notice.visible_until ? String(notice.visible_until) : null,
      };
    });
    return authResponse({ notices });
  } catch {
    return authResponse({ notices: [], error: "Featured event notices could not be loaded." }, 503);
  }
}
