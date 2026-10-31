import { NextResponse } from "next/server";
import { getAuthUser, createClient } from "@/lib/supabase/server";
import { rolePermissions } from "@/lib/admin/permissions";

function googlePicture(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !/(^|\.)googleusercontent\.com$/i.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ authenticated: false }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  try {
    const db = await createClient();
    const [{ data: profile }, { data: membership }, { data: roles, error: roleError }] = await Promise.all([
      db.from("profiles").select("full_name,display_name,avatar_url,portrait_path").eq("id", user.id).maybeSingle(),
      db.from("memberships").select("status,member_number").eq("user_id", user.id).maybeSingle(),
      db.from("admin_roles").select("role").eq("user_id", user.id),
    ]);
    const activeAccount = !membership || !["suspended", "revoked", "rejected"].includes(membership.status);
    const activeAdmin = !roleError && activeAccount && (roles ?? []).some(({ role }) => role in rolePermissions);
    const portraitUrl = profile?.portrait_path ? "/api/member/portrait" : null;
    const metadata = user.user_metadata ?? {};
    const googleUrl = googlePicture(metadata.avatar_url) ?? googlePicture(metadata.picture);
    const status = membership?.status ?? "not_started";
    const statusLabels: Record<string, string> = {
      not_started: "Membership not claimed",
      profile_incomplete: "Profile incomplete",
      claim_submitted: "Claim pending",
      pending_verification: "Under review",
      approved: "Approved",
      active: "Active member",
      rejected: "Rejected",
      suspended: "Suspended",
      revoked: "Revoked",
      expired: "Expired",
    };
    return NextResponse.json({
      authenticated: true,
      name: profile?.display_name || profile?.full_name || metadata.name || user.email || "Member",
      avatarUrl: portraitUrl ?? googleUrl,
      isAdmin: activeAdmin,
      accountHref: activeAdmin ? "/admin" : "/member",
      accountLabel: activeAdmin ? "Admin Dashboard" : (membership?.member_number ? `Member #${membership.member_number}` : "Member Page"),
      membershipLabel: statusLabels[status] ?? "Membership status unavailable",
      memberNumber: membership?.member_number ?? null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    // A failed role lookup must never create an admin action in the header.
    const metadata = user.user_metadata ?? {};
    return NextResponse.json({
      authenticated: true,
      name: metadata.name || user.email || "Member",
      avatarUrl: googlePicture(metadata.avatar_url) ?? googlePicture(metadata.picture),
      isAdmin: false,
      accountHref: "/member",
      accountLabel: "Member Page",
      membershipLabel: "Membership status unavailable",
      memberNumber: null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
