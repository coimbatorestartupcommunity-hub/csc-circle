import "server-only";
import { connection } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";
export async function getPublicContent() {
  try {
    await connection();
    const sb = createAnonClient();
    if (!sb) return {};
    const now = Date.now();
    const { data, error } = await sb.from("content_blocks").select("key,value,visible_from,visible_until,deleted_at").eq("status", "published").is("deleted_at", null);
    if (error) return {};
    return Object.fromEntries((data ?? [])
      .filter((r) => (!r.visible_from || new Date(r.visible_from).getTime() <= now) && (!r.visible_until || new Date(r.visible_until).getTime() > now))
      .map((r) => [r.key, r.value]));
  }
  catch { return {}; }
}
