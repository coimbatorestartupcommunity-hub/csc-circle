import Link from "next/link";
import { CheckCircle2, ImagePlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { StartupForm } from "@/components/member/startup-form";
import { MemberDirectoryPhotoUpload } from "@/components/member/member-directory-photo-upload";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { MemberUnavailable } from "@/components/member/member-unavailable";
export const metadata = { title: "Submit a startup" };
export default async function Page() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  const result = await memberServices.getProfile();
  if (!result.ok) return <EmptyState icon={ImagePlus} title="Your profile could not be loaded." description={result.error.message} />;
  const profile = result.data;
  const hasPublicConsent = profile.consent.directoryParticipation && profile.consent.displayNamePublicly && profile.consent.displayPhotoPublicly;
  const canSubmit = Boolean(profile.portraitPath && profile.directoryPhotoPath && hasPublicConsent && profile.displayName.trim());

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <MemberPageHeader title="Complete Directory Profile Setup" description="Add a dedicated 4:3 founder photo, then submit your startup for CSC review. Your 4:5 profile and Digital ID portrait remain unchanged." />
      <MemberDirectoryPhotoUpload savedPhotoUrl={profile.directoryPhotoUrl} />
      {!profile.portraitPath ? (
        <section className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-5 text-center ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-sm leading-6 text-brand-secondary">A separate 4:5 profile portrait is required for your member identity. Save it on your Profile page; the directory photo above will remain separate.</p>
          <Button render={<Link href="/member/profile#profile-portrait" />} variant="outline" className="shrink-0">Set up 4:5 profile portrait</Button>
        </section>
      ) : null}
      {!hasPublicConsent ? (
        <section className="flex flex-col gap-3 rounded-2xl bg-brand-cloud p-5 text-center ring-1 ring-brand-border sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-sm leading-6 text-brand-secondary">Before a listing can be reviewed, enable directory participation and consent to showing your public name and founder photo.</p>
          <Button render={<Link href="/member/settings" />} variant="outline" className="shrink-0"><ShieldCheck className="size-4" /> Review privacy settings</Button>
        </section>
      ) : null}
      {canSubmit ? (
        <div>
          <div className="mb-6 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-purple text-brand-ink"><CheckCircle2 className="size-5" aria-hidden /></span>
            <h2 className="mt-3 text-xl font-semibold text-brand-ink">Startup details</h2>
            <p className="mt-2 text-sm leading-6 text-brand-muted">Your submission will appear in the public Founder Directory after an authorized CSC administrator approves it.</p>
          </div>
          <StartupForm />
        </div>
      ) : (
        <section className="rounded-2xl bg-brand-cloud p-5 text-center ring-1 ring-brand-border">
          <p className="text-sm font-medium text-brand-secondary">Complete the founder photo, profile and privacy steps above to unlock startup submission.</p>
        </section>
      )}
    </div>
  );
}
