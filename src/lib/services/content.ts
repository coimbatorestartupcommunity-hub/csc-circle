import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
export async function getPublicContent() {
  "use cache";
  cacheLife("minutes"); cacheTag("content");
  try { const sb = createAnonClient(); if (!sb) return {}; const { data, error } = await sb.from("content_blocks").select("key,value").eq("status", "published"); return error ? {} : Object.fromEntries((data ?? []).map(r => [r.key, r.value])); }
  catch { return {}; }
}
