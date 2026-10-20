import { NextResponse } from "next/server";
import { getMemberContext } from "@/lib/services/member/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return new NextResponse(null, { status: 401 });
  const { memberId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return new NextResponse(null, { status: 404 });
  const sb = await createClient();
  const { data: visible } = await sb.rpc("get_discoverable_member", { p_member_id: memberId });
  if (!visible?.[0]?.has_photo) return new NextResponse(null, { status: 404 });
  const admin = createAdminClient();
  const [{ data: profile }, { data: membership }] = await Promise.all([
    admin.from("profiles").select("portrait_path,consent").eq("id", memberId).maybeSingle(),
    admin.from("memberships").select("status").eq("user_id", memberId).maybeSingle(),
  ]);
  const consent = profile?.consent as Record<string, unknown> | null;
  if (!profile?.portrait_path || membership?.status !== "active" || consent?.communityProfileVisible !== true || consent?.showProfilePhotoToMembers !== true) return new NextResponse(null, { status: 404 });
  const { data, error } = await admin.storage.from("member-portraits").download(profile.portrait_path);
  if (error || !data) return new NextResponse(null, { status: 404 });
  return new NextResponse(data, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline; filename=member-profile.webp" } });
}
