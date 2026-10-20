import { z } from "zod";
import { createAnonClient } from "@/lib/supabase/anon";
import { authResponse } from "@/lib/auth/http";

const noticeSchema = z.object({
  title: z.string().max(100),
  message: z.string().max(500),
  actionLabel: z.string().max(40),
  eventPath: z.string().regex(/^\/events(?:\/[a-z0-9-]+)?(?:\?[a-zA-Z0-9_=&%-]*)?$/),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET() {
  try {
    const db = createAnonClient();
    if (!db) return authResponse({ notice: null });
    const { data, error } = await db.from("content_blocks").select("value,updated_at").eq("key", "homepage.event_notice").eq("status", "published").maybeSingle();
    if (error || !data) return authResponse({ notice: null });
    const parsed = noticeSchema.safeParse(JSON.parse(data.value));
    if (!parsed.success || (parsed.data.expiresAt && new Date(parsed.data.expiresAt) <= new Date())) return authResponse({ notice: null });
    return authResponse({ notice: { ...parsed.data, id: data.updated_at } });
  } catch { return authResponse({ notice: null }); }
}
