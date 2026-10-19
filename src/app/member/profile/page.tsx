import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberProfileForm } from "@/components/member/member-profile-form";
import { StatusBadge } from "@/components/member/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { UserCircle } from "lucide-react";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import {
  designationLabels,
  goalLabels,
  membershipStatusMeta,
} from "@/lib/content/member-taxonomy";

export const metadata = { title: "Profile" };

export default async function MemberProfilePage() {
  const ctx = await getMemberContext();
  const res = await memberServices.getProfile();

  if (!res.ok) {
    return (
      <>
        <MemberPageHeader title="Profile" />
        <EmptyState icon={UserCircle} title="Profile unavailable." description={res.error.message} />
      </>
    );
  }

  const profile = res.data;
  const statusMeta = membershipStatusMeta[profile.membership.status];

  return (
    <>
      <MemberPageHeader
        title="My profile"
        description="Manage your personal, startup and public-directory information."
        action={<StatusBadge label={statusMeta.label} tone={statusMeta.tone} />}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {profile.designations.map((d) => (
          <span key={d} className="rounded-full bg-brand-purple px-2.5 py-0.5 text-xs font-medium text-brand-ink">
            {designationLabels[d]}
          </span>
        ))}
        {profile.goals.map((g) => (
          <span key={g} className="rounded-full bg-brand-blue px-2.5 py-0.5 text-xs font-medium text-brand-ink">
            {goalLabels[g]}
          </span>
        ))}
      </div>

      <MemberProfileForm profile={profile} isDemo={ctx.mode === "preview"} />
    </>
  );
}
