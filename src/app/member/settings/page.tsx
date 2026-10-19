import Link from "next/link";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberSettingsForm } from "@/components/member/member-settings-form";
import { EmptyState } from "@/components/common/empty-state";
import { Settings } from "lucide-react";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";

export const metadata = { title: "Settings" };

export default async function MemberSettingsPage() {
  const ctx = await getMemberContext();
  const res = await memberServices.getProfile();

  if (!res.ok) {
    return (
      <>
        <MemberPageHeader title="Settings" />
        <EmptyState icon={Settings} title="Settings unavailable." description={res.error.message} />
      </>
    );
  }

  const profile = res.data;

  return (
    <>
      <MemberPageHeader
        title="Settings"
        description="Manage your account preferences and privacy."
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-3 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
          <h2 className="text-sm font-semibold text-brand-ink">Account</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-brand-muted">Email</dt>
              <dd className="font-medium text-brand-ink">{profile.email || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-brand-muted">Member number</dt>
              <dd className="font-mono text-brand-ink">
                {profile.membership.memberNumber ?? "Pending"}
              </dd>
            </div>
          </dl>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/member/profile"
              className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-3.5 py-2 text-sm font-medium text-brand-ink hover:bg-brand-cloud"
            >
              Edit profile
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-3.5 py-2 text-sm font-medium text-brand-ink hover:bg-brand-cloud"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <MemberSettingsForm profile={profile} isDemo={ctx.mode === "preview"} />
      </div>
    </>
  );
}
