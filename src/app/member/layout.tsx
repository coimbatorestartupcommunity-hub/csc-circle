import type { Metadata } from "next";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { createClient } from "@/lib/supabase/server";
import { MemberShell } from "@/components/member/member-shell";
import { MemberUnavailable } from "@/components/member/member-unavailable";
import { DemoBanner } from "@/components/member/demo-banner";
import { membershipStatusMeta } from "@/lib/content/member-taxonomy";

export const metadata: Metadata = {
  title: { default: "Member", template: "%s · CSC Circle Member" },
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getMemberContext();

  // Production, unauthenticated — never render member content.
  if (ctx.mode === "closed") {
    return <MemberUnavailable />;
  }

  const [profileRes, ownAdminRole] = await Promise.all([
    memberServices.getProfile(),
    ctx.mode === "live"
      ? createClient().then((supabase) => supabase.from("admin_roles").select("role").eq("user_id", ctx.user!.id).limit(1).maybeSingle())
      : Promise.resolve(null),
  ]);
  const profile = profileRes.ok ? profileRes.data : null;
  // This is only a convenience link. The self-read policy limits the query to
  // the signed-in user's own role rows; all admin pages enforce their own
  // server-side permission checks independently.
  const isAdmin = ownAdminRole !== null && !ownAdminRole.error && Boolean(ownAdminRole.data);
  const status = profile?.membership.status ?? "not_started";
  const meta = membershipStatusMeta[status];
  const memberNumber = profile?.membership.memberNumber;

  return (
    <>
      {ctx.mode === "preview" ? <DemoBanner /> : null}
      <MemberShell
        memberName={profile?.displayName || profile?.fullName || "Member"}
        avatarUrl={profile?.portraitUrl ?? profile?.avatarUrl}
        statusLabel={meta.label}
        statusTone={meta.tone}
        accountHref={isAdmin ? "/admin" : "/member"}
        accountLabel={isAdmin ? "Admin Dashboard" : memberNumber ? `Member #${memberNumber}` : "Member"}
      >
        {children}
      </MemberShell>
    </>
  );
}
