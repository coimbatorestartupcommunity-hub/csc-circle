import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDiscoverableMember } from "@/lib/services/member/discoverable";

export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return new NextResponse(null, { status: 404 });
  const member = await fetchDiscoverableMember(memberId);
  if (!member?.has_photo) return new NextResponse(null, { status: 404 });
  const admin = createAdminClient();
  const [{ data: profile }, { data: membership }] = await Promise.all([
    admin.from("profiles").select("portrait_path,avatar_url").eq("id", memberId).maybeSingle(),
    admin.from("memberships").select("status").eq("user_id", memberId).maybeSingle(),
  ]);
  if (membership?.status !== "active") return new NextResponse(null, { status: 404 });

  if (!profile?.portrait_path) {
    let avatarUrl = profile?.avatar_url?.trim() ?? "";
    if (!avatarUrl) {
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(memberId);
        const meta = authUser?.user?.user_metadata;
        avatarUrl = ((meta?.avatar_url as string) || (meta?.picture as string) || "").trim();
      } catch {
        // Ignore auth user lookup failure
      }
    }

    if (/^https:\/\//i.test(avatarUrl)) {
      try {
        const upstream = await fetch(avatarUrl, {
          cache: "force-cache",
          signal: AbortSignal.timeout(5000),
        });
        if (upstream.ok && upstream.body) {
          const contentType = upstream.headers.get("content-type") || "image/jpeg";
          const buffer = await upstream.arrayBuffer();
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
              "X-Content-Type-Options": "nosniff",
              "Content-Disposition": "inline; filename=member-avatar.jpg",
            },
          });
        }
      } catch {
        // Fall back to 307 redirect if fetch fails
      }

      return NextResponse.redirect(avatarUrl, {
        status: 307,
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }
    return new NextResponse(null, { status: 404 });
  }

  const etag = `W/"${Buffer.from(profile.portrait_path).toString("base64url")}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        "ETag": etag,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  const { data, error } = await admin.storage.from("member-portraits").download(profile.portrait_path);
  if (error || !data) return new NextResponse(null, { status: 404 });
  return new NextResponse(data, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "ETag": etag,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline; filename=member-profile.webp",
    },
  });
}
