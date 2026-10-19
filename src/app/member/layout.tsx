import type { Metadata } from "next";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { MemberShell } from "@/components/member/member-shell";
import { MemberUnavailable } from "@/components/member/member-unavailable";
import { DemoBanner } from "@/components/member/demo-banner";
import { membershipStatusMeta } from "@/lib/content/member-taxonomy";

export const metadata: Metadata = {
  title: { default: "Member", template: "%s · CSC Circle Member" },
  robots: { index: false, follow: false },
};

// The member area reads the session on every request, so it blocks server-side.
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

  const profileRes = await memberServices.getProfile();
  const profile = profileRes.ok ? profileRes.data : null;
  const status = profile?.membership.status ?? "not_started";
  const meta = membershipStatusMeta[status];

  return (
    <>
      {ctx.mode === "preview" ? <DemoBanner /> : null}
      <MemberShell
        memberName={profile?.displayName || profile?.fullName || "Member"}
        avatarUrl={profile?.avatarUrl}
        statusLabel={meta.label}
        statusTone={meta.tone}
      >
        {children}
      </MemberShell>
    </>
  );
}
