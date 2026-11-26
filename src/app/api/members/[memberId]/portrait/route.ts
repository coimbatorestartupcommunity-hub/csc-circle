import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return new NextResponse(null, { status: 404 });
  const sb = await createClient();
  const { data: visible } = await sb.rpc("get_discoverable_member", { p_member_id: memberId });
  if (!visible?.[0]?.has_photo) return new NextResponse(null, { status: 404 });
  const admin = createAdminClient();
  const [{ data: profile }, { data: membership }] = await Promise.all([
    admin.from("profiles").select("portrait_path").eq("id", memberId).maybeSingle(),
    admin.from("memberships").select("status").eq("user_id", memberId).maybeSingle(),
  ]);
  if (!profile?.portrait_path || membership?.status !== "active") return new NextResponse(null, { status: 404 });

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
