import { ChangePasswordForm } from "@/components/auth/change-password-form";
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

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <section className="flex h-full flex-col rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
            <h2 className="text-sm font-semibold text-brand-ink">Account</h2>
            <dl className="mt-5 flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-brand-muted">Email</dt>
              <dd className="min-w-0 break-all text-right font-medium text-brand-ink">{profile.email || "—"}</dd>
            </div>
            </dl>
            <div className="mt-auto flex flex-wrap gap-2 pt-6">
              <Link
                href="/member/profile"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-border px-4 text-sm font-medium text-brand-ink transition hover:bg-brand-cloud focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Edit profile
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-border px-4 text-sm font-medium text-brand-ink transition hover:bg-brand-cloud focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </section>

          <MemberSettingsForm key={profile.id} profile={profile} isDemo={ctx.mode === "preview"} />
        </div>

        {ctx.mode === "live" ? <ChangePasswordForm /> : null}
      </div>
    </>
  );
}
