import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limitCheck = rateLimit(`members-search:${ip}`, 60, 60_000);
  if (!limitCheck.allowed) {
    return rateLimitResponse("Search limit reached. Please wait a moment.", limitCheck, 60);
  }
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const offset = Math.max(0, Math.min(Number(url.searchParams.get("offset") ?? 0) || 0, 10000));
  const sb = await createClient();
  const { data, error } = await sb.rpc("list_discoverable_members", { p_search: search, p_limit: 30, p_offset: offset });
  if (error) {
    return NextResponse.json({ error: "Member profiles could not be loaded." }, { status: 503 });
  }
  return NextResponse.json(
    { members: data ?? [] },
    {
      headers: {
        "Cache-Control": search
          ? "public, max-age=30, stale-while-revalidate=120"
          : "public, max-age=120, stale-while-revalidate=600",
      },
    }
  );
}
