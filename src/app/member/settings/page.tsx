import { ChangePasswordForm } from "@/components/auth/change-password-form";
import Link from "next/link";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { MemberSettingsForm } from "@/components/member/member-settings-form";
import { EmptyState } from "@/components/common/empty-state";
import { Settings } from "lucide-react";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { MemberIdCard } from "@/components/member/member-id-card";
import { brandAssets, siteConfig } from "@/lib/content/site";
import Image from "next/image";
import { membershipStatusMeta } from "@/lib/content/member-taxonomy";
import { Button } from "@/components/ui/button";

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
  const cardRes = await memberServices.getCard();

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

        <MemberSettingsForm key={profile.id} profile={profile} isDemo={ctx.mode === "preview"} />
      </div>
      <section className="mt-6 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-6">
        <div className="mb-5">
          <h2 className="font-semibold text-brand-ink">Membership card</h2>
          <p className="mt-1 text-sm text-brand-muted">Your CSC card appears here when membership is active and your 4:5 portrait is saved.</p>
        </div>
        {cardRes.ok ? (
          <div className="mx-auto w-full max-w-sm"><MemberIdCard card={cardRes.data} isDemo={ctx.mode === "preview"} /></div>
        ) : (
          <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-brand-border">
            <div className="flex aspect-[4/5] flex-col items-center justify-center gap-4 bg-gradient-to-br from-brand-purple via-brand-blue to-brand-lilac p-6 text-center">
              <Image src={brandAssets.cscIcon} alt="CSC Circle" width={64} height={64} className="rounded-full bg-white/90 p-1" />
              <p className="text-sm font-bold text-brand-ink">{siteConfig.legalName}</p>
              <div className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-brand-muted">Not issued</div>
              <p className="text-xs text-brand-secondary">{membershipStatusMeta[profile.membership.status].label}</p>
              {!profile.portraitPath ? <p className="text-xs text-brand-secondary">Add your 4:5 portrait in Profile to complete your card details.</p> : null}
            </div>
          </div>
        )}
        {!cardRes.ok ? <div className="mt-4 flex justify-center"><Button variant="outline" render={<Link href={profile.portraitPath ? "/member/claim" : "/member/profile#profile-portrait"} />}>{profile.portraitPath ? "Review membership claim" : "Add profile portrait"}</Button></div> : null}
      </section>
      {ctx.mode === "live" ? <ChangePasswordForm /> : null}
    </>
  );
}
