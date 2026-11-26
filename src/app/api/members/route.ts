import { NextResponse } from "next/server";
import { fetchDiscoverableMembers } from "@/lib/services/member/discoverable";
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
  const pageSize = 50;

  try {
    const members = await fetchDiscoverableMembers({
      search,
      limit: pageSize,
      offset,
    });

    return NextResponse.json(
      { members, hasMore: members.length >= pageSize },
      {
        headers: {
          "Cache-Control": search
            ? "public, max-age=30, stale-while-revalidate=120"
            : "public, max-age=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("[api/members] Failed to load discoverable members:", err);
    return NextResponse.json({ members: [], hasMore: false });
  }
}
