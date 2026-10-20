import Link from "next/link";
import { CheckCircle2, ImagePlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { StartupForm } from "@/components/member/startup-form";
import { MemberDirectoryPhotoUpload } from "@/components/member/member-directory-photo-upload";
import { MemberPageHeader } from "@/components/member/member-page-header";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MemberUnavailable } from "@/components/member/member-unavailable";
import { Clock3, ExternalLink } from "lucide-react";
export const metadata = { title: "Submit a startup" };
export default async function Page() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live") return <MemberUnavailable />;
  const result = await memberServices.getProfile();
  if (!result.ok) return <EmptyState icon={ImagePlus} title="Your profile could not be loaded." description={result.error.message} />;
  const profile = result.data;
  const sb = await createClient();
  const { data: existingStartup, error: startupLookupError } = await sb
    .from("directory_startups")
    .select("id,name,slug,status,updated_at,industry,description,website,logo_url")
    .eq("user_id", ctx.user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const hasPublicConsent = profile.consent.directoryParticipation && profile.consent.displayNamePublicly && profile.consent.displayPhotoPublicly;
  const canSubmit = Boolean(profile.portraitPath && profile.directoryPhotoPath && hasPublicConsent && profile.displayName.trim());
  const existingLogoPath = typeof existingStartup?.logo_url === "string" && new RegExp(`^${ctx.user!.id}/[0-9a-f-]{36}-startup-logo\\.webp$`, "i").test(existingStartup.logo_url) ? existingStartup.logo_url : "";
  let existingLogoPreview = "";
  if (existingLogoPath) {
    try {
      const { data } = await createAdminClient().storage.from("member-portraits").createSignedUrl(existingLogoPath, 60 * 60);
      existingLogoPreview = data?.signedUrl ?? "";
    } catch { existingLogoPreview = ""; }
  }

  if (startupLookupError) return <EmptyState icon={ImagePlus} title="Your startup submission could not be checked." description="Refresh the page to try again. Your saved startup data has not been changed." />;

  if (existingStartup) {
    const published = existingStartup.status === "published";
    const statusLabel = published ? "Published in the Founder Directory" : existingStartup.status === "pending" ? "Awaiting CSC administrator review" : `Status: ${existingStartup.status}`;
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <MemberPageHeader title="Startup directory submission" description="Your submission status and next steps." />
        <section className="mx-auto w-full max-w-2xl rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-brand-border sm:p-9">
          <span className={`mx-auto flex size-14 items-center justify-center rounded-full ring-1 ${published ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-brand-purple text-brand-ink ring-brand-border"}`}>
            {published ? <ExternalLink className="size-6" aria-hidden="true" /> : <Clock3 className="size-6" aria-hidden="true" />}
          </span>
          <h2 className="mt-4 text-xl font-semibold text-brand-ink">{published ? "Your startup is published" : "Startup submitted"}</h2>
          <p className="mt-2 text-base font-medium text-brand-secondary">{existingStartup.name}</p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-brand-secondary">
            {published
              ? "Your approved startup is visible in the CSC Founder Directory."
              : existingStartup.status === "pending"
                ? "Your startup details have been submitted and are under active CSC administrator review. The form is closed while your submission is being reviewed."
                : "Your submission is saved. Please contact the CSC team if you need help with its current review status."}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-cloud px-4 py-2 text-sm font-medium text-brand-secondary">
            <ShieldCheck className="size-4" aria-hidden="true" /> {statusLabel}
          </div>
          {published ? <Button render={<Link href={`/directory/${existingStartup.slug}`} />} className="mx-auto mt-6">View directory listing</Button> : null}
        </section>
        {(["draft", "pending"] as string[]).includes(existingStartup.status) ? <details className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-6">
          <summary className="cursor-pointer font-semibold text-brand-ink marker:text-brand-accent">Edit startup details</summary>
          <p className="mt-2 text-sm leading-6 text-brand-secondary">Saving changes sends the listing back to CSC administrator review before it is displayed publicly.</p>
          <div className="mt-5">
            <StartupForm
              startupId={existingStartup.id}
              initialValues={{
                name: existingStartup.name,
                slug: existingStartup.slug,
                industry: existingStartup.industry ?? "",
                description: existingStartup.description ?? "",
                website: existingStartup.website ?? "",
                logoPath: existingLogoPath,
                consent: true,
              }}
              initialLogoUrl={existingLogoPreview}
            />
          </div>
        </details> : <p className="mx-auto max-w-2xl text-center text-sm text-brand-muted">Published or closed submissions can be edited by the CSC administrator. Contact the CSC team if a public detail needs correction.</p>}
      </div>
    );
  }

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
