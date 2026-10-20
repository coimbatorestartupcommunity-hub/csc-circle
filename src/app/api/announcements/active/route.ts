import { createAnonClient } from "@/lib/supabase/anon";
import { authResponse } from "@/lib/auth/http";
import { eventNoticeSchema, isEventNoticeActive } from "@/lib/announcements/event-notice";

export async function GET() {
  try {
    const db = createAnonClient();
    if (!db) return authResponse({ notice: null });
    const { data, error } = await db.from("content_blocks").select("value,updated_at").eq("key", "homepage.event_notice").eq("status", "published").maybeSingle();
    if (error || !data) return authResponse({ notice: null });
    const parsed = eventNoticeSchema.safeParse(JSON.parse(data.value));
    if (!parsed.success || !isEventNoticeActive(parsed.data)) return authResponse({ notice: null });
    return authResponse({ notice: { title: parsed.data.title, message: parsed.data.message, actionLabel: parsed.data.actionLabel, eventPath: parsed.data.eventPath, bannerUrl: parsed.data.bannerPath ? "/api/announcements/banner" : null, id: data.updated_at } });
  } catch { return authResponse({ notice: null }); }
}
