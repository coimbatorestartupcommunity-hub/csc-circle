import Link from "next/link";
import { FileText, Rocket, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberProfileForm } from "@/components/member/member-profile-form";
import { MemberPortraitUpload } from "@/components/member/member-portrait-upload";
import { DirectorySetupButton } from "@/components/member/directory-setup-button";
import { StatusBadge } from "@/components/member/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { designationLabels, membershipStatusMeta } from "@/lib/content/member-taxonomy";

export const metadata = { title: "Profile" };

export default async function MemberProfilePage() {
  const ctx = await getMemberContext();
  const result = await memberServices.getProfile();
  if (!result.ok) return <EmptyState icon={UserCircle} title="Profile unavailable." description={result.error.message} />;
  const profile = result.data;
  const status = membershipStatusMeta[profile.membership.status];
  const directoryReady = !!profile.portraitPath && !!profile.directoryPhotoPath && profile.consent.directoryParticipation && profile.consent.displayNamePublicly && profile.consent.displayPhotoPublicly;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <MemberPortraitUpload key={profile.id} portraitUrl={profile.portraitUrl} directoryPhotoUrl={profile.directoryPhotoUrl} />
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand-accent uppercase">CSC Circle Member Profile</p>
        <h1 className="text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">{profile.displayName || profile.fullName || "Your profile"}</h1>
        <p className="text-sm text-brand-muted">Manage your personal, professional and community information.</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <StatusBadge label={status.label} tone={status.tone} />
          {profile.membership.memberNumber ? <span className="rounded-full bg-brand-cloud px-3 py-1 font-mono text-xs text-brand-secondary">{profile.membership.memberNumber}</span> : null}
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {profile.designations.map((designation) => <span key={designation} className="rounded-full bg-brand-purple px-3 py-1 text-xs font-medium text-brand-ink">{designationLabels[designation]}</span>)}
        </div>
      </header>

      <MemberProfileForm key={profile.id} profile={profile} isDemo={ctx.mode === "preview"} />

      {!(["claim_submitted", "pending_verification", "approved", "active"].includes(profile.membership.status)) ? (
        <section className="flex flex-col gap-3 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-semibold text-brand-ink">Apply for CSC membership</h2>
            <p className="mt-1 text-sm text-brand-muted">Your website account is ready. Submit a separate claim for community membership review.</p>
          </div>
          <Button variant="outline" render={<Link href="/member/claim" />} className="w-full shrink-0 sm:w-auto">Review membership claim</Button>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-semibold text-brand-ink">Build your professional profile</h2>
          <p className="mt-1 text-sm text-brand-muted">Keep resume information separate and choose what to include in an ATS-friendly PDF.</p>
        </div>
        <Button render={<Link href="/member/resume" />} className="w-full shrink-0 gap-2 sm:w-auto"><FileText className="size-4" /> Create My Resume</Button>
      </section>

      <div className="flex justify-center">
        {directoryReady ? (
          <Button render={<Link href="/member/startup" />} className="w-full gap-2 sm:w-auto"><Rocket className="size-4" /> Submit a Startup to the Directory</Button>
        ) : (
          <DirectorySetupButton />
        )}
      </div>
    </div>
  );
}
