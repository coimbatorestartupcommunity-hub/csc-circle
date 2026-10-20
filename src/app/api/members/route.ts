import { NextResponse } from "next/server";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";
import { authResponse } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return authResponse({ error: "Sign in with an active CSC membership to view member profiles." }, 401);
  if (!rateLimit(`members-search:${ctx.user!.id}`, 60, 60_000).allowed) return authResponse({ error: "Search limit reached. Please wait a moment." }, 429);
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const offset = Math.max(0, Math.min(Number(url.searchParams.get("offset") ?? 0) || 0, 10000));
  const sb = await createClient();
  const { data, error } = await sb.rpc("list_discoverable_members", { p_search: search, p_limit: 30, p_offset: offset });
  if (error) return authResponse({ error: error.message.includes("membership") ? "An active CSC membership is required to view profiles." : "Member profiles could not be loaded." }, 403);
  return NextResponse.json({ members: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
