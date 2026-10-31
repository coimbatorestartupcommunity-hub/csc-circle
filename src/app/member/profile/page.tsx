import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, Rocket, ShieldCheck, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberProfileForm } from "@/components/member/member-profile-form";
import { MemberPortraitUpload } from "@/components/member/member-portrait-upload";
import { DirectorySetupButton } from "@/components/member/directory-setup-button";
import { StatusBadge } from "@/components/member/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { getMemberContext } from "@/lib/services/member/context";
import { memberServices } from "@/lib/services/member/services";
import { designationLabels, membershipStatusMeta } from "@/lib/content/member-taxonomy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CommunityProfileSharing } from "@/components/member/community-profile-sharing";
import { MemberProfileReviewsSection } from "@/components/member/member-profile-reviews";
import { roleLabels, type AdminRole } from "@/lib/admin/permissions";

export const metadata = { title: "Profile" };

export default async function MemberProfilePage() {
  const ctx = await getMemberContext();
  const userId = ctx.user?.id;
  const isLive = ctx.mode === "live" && Boolean(userId);

  const [result, startupsCountRes, memberRolesRes, reviewsRes, attendanceRes] = await Promise.all([
    memberServices.getProfile(),
    isLive ? createAdminClient().from("directory_startups").select("id", { count: "exact", head: true }).eq("user_id", userId!).neq("status", "archived") : Promise.resolve({ count: 0 }),
    isLive ? createClient().then((sb) => sb.from("admin_roles").select("role").eq("user_id", userId!)) : Promise.resolve({ data: [] }),
    memberServices.listReviews(),
    isLive ? createClient().then((sb) => sb.from("event_registrations").select("event_id, events(id, title, ends_at, registration_state)").eq("user_id", userId!)) : Promise.resolve({ data: [] }),
  ]);

  if (!result.ok) return <EmptyState icon={UserCircle} title="Profile unavailable." description={result.error.message} />;
  const profile = result.data;
  const startupCount = startupsCountRes.count ?? 0;
  const roles = (memberRolesRes.data ?? []).map((entry) => entry.role as AdminRole).filter((role) => role in roleLabels);
  const status = membershipStatusMeta[profile.membership.status];
  const directoryReady = !!profile.portraitPath && !!profile.directoryPhotoPath && profile.consent.directoryParticipation && profile.consent.displayNamePublicly && profile.consent.displayPhotoPublicly;
  const completionCriteria = [
    Boolean(profile.fullName?.trim()),
    Boolean(profile.displayName?.trim()),
    Boolean(profile.whatsapp?.trim()),
    Boolean(profile.city?.trim()),
    Boolean(profile.portraitPath),
    Boolean(profile.designations?.length),
    Boolean(profile.startup?.name?.trim() || startupCount > 0),
  ];
  const completion = completionCriteria.filter(Boolean).length;
  const completionPercent = Math.min(100, Math.round((completion / 7) * 100));
  const identityEmail = ctx.user?.email || profile.email;
  const emailVerified = Boolean(ctx.user?.emailVerified);
  const reviews = reviewsRes.ok ? reviewsRes.data : [];
  const eligibleEvents = (attendanceRes.data ?? []).flatMap((row) => {
    const ev = row.events as { id: string; title: string; ends_at: string; registration_state: string } | null;
    if (!ev) return [];
    const hasConcluded = ev.registration_state === "completed" || Date.parse(ev.ends_at) <= Date.now();
    const alreadyReviewed = reviews.some((r) => r.eventId === ev.id);
    return hasConcluded && !alreadyReviewed ? [{ id: ev.id, title: ev.title }] : [];
  });

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-5 sm:gap-6">
      <MemberPortraitUpload key={profile.id} portraitUrl={profile.portraitUrl} directoryPhotoUrl={profile.directoryPhotoUrl} />
      <header className="flex min-w-0 flex-col items-center gap-2 text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-brand-accent uppercase">CSC Circle Member Profile</p>
        <h1 className="max-w-full break-words text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">{profile.fullName || profile.displayName || "Your profile"}</h1>
        {profile.displayName && profile.displayName !== profile.fullName ? <p className="break-words text-sm text-brand-secondary">Preferred name: {profile.displayName}</p> : null}
        <p className="max-w-2xl break-words text-sm text-brand-muted">Manage your personal, professional and community information.</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <StatusBadge label={status.label} tone={status.tone} />
          <span className="rounded-full bg-brand-cloud px-3 py-1 font-mono text-xs text-brand-secondary">{profile.membership.memberNumber ?? "CSC Member ID: Not Assigned"}</span>
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {profile.designations.map((designation) => <span key={designation} className="rounded-full bg-brand-purple px-3 py-1 text-xs font-medium text-brand-ink">{designationLabels[designation]}</span>)}
        </div>
        <p className="max-w-full break-all text-sm text-brand-muted">{identityEmail}{emailVerified ? " · Verified account" : " · Account email not verified"}</p>
        <Button variant="outline" render={<Link href="/member/settings#account-security" />} className="mt-1 gap-2"><ShieldCheck className="size-4" />Account Security</Button>
      </header>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-6">
        <h2 className="text-lg font-semibold text-brand-ink">Welcome to Your CSC Circle Member Profile</h2>
        <p className="mt-2 text-sm leading-6 text-brand-secondary">Your CSC member profile keeps your personal and professional information organized in one secure location. Your official CSC member ID, verified account identity, membership approval status and site permissions are controlled by CSC Circle.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-brand-ink">Profile completion</h3>
              {completionPercent >= 100 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                  Completed
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-brand-muted">
              {completionPercent >= 100
                ? "All required personal details, portrait photo, membership category and startup details are completed."
                : "Based on personal details, portrait photo, membership category and startup information."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {completionPercent >= 100 ? (
              <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
            ) : null}
            <span className={`text-lg font-bold tabular-nums ${completionPercent >= 100 ? "text-emerald-700" : "text-brand-ink"}`}>
              {completionPercent}%
            </span>
          </div>
        </div>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-cloud"
          role="progressbar"
          aria-label="Profile completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completionPercent}
        >
          <div
            className={`h-full rounded-full transition-[width] ${completionPercent >= 100 ? "bg-emerald-600" : "bg-brand-accent"}`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-6">
        <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-brand-muted" /><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold text-brand-ink">CSC-Verified Membership Details</h2><p className="mt-1 text-sm leading-6 text-brand-muted">Official membership information is controlled by CSC Circle.</p></div></div>
        <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">{[
          ["CSC Member ID", profile.membership.memberNumber ?? "Not Assigned"],
          ["Verified Account Email", emailVerified ? identityEmail : `${identityEmail} (not verified)`],
          ["CSC Membership Category", profile.designations.map((item) => designationLabels[item]).join(", ") || "Not selected"],
          ["Membership Status", status.label],
          ["CSC Role (private)", roles.length ? roles.map((role) => roleLabels[role]).join(", ") : "Community member"],
        ].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-brand-cloud/60 p-3"><dt className="text-xs font-medium text-brand-muted">{label} · CSC-managed</dt><dd className="mt-1 break-words text-sm font-semibold text-brand-ink">{value}</dd></div>)}</dl>
      </section>

      <MemberProfileForm key={profile.id} profile={profile} isDemo={ctx.mode === "preview"} />
      <section className="rounded-2xl border border-brand-border bg-brand-cloud/50 p-5 sm:p-6"><h2 className="text-lg font-semibold text-brand-ink">Private Information</h2><p className="mt-1 text-sm leading-6 text-brand-secondary">Your account email and mobile/WhatsApp information are stored for CSC account and member-support workflows. They are not included in the community directory by default. Public profile and contact-sharing permissions are managed separately.</p><p className="mt-2 text-xs text-brand-muted">Review account and privacy controls in <Link href="/member/settings" className="font-semibold text-brand-accent underline underline-offset-2">Settings</Link>.</p></section>

      {!(["claim_submitted", "pending_verification", "approved", "active"].includes(profile.membership.status)) ? (
        <section className="flex flex-col gap-3 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-semibold text-brand-ink">Apply for CSC membership</h2>
            <p className="mt-1 text-sm text-brand-muted">Your website account is ready. Submit a separate claim for community membership review.</p>
          </div>
          <Button variant="outline" render={<Link href="/member/claim" />} className="w-full shrink-0 sm:w-auto">Review membership claim</Button>
        </section>
      ) : null}

      <section className="flex flex-col gap-4 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-semibold text-brand-ink">My Startups</h2>
          <p className="mt-1 text-sm text-brand-muted">Manage up to four separate startup profiles. {startupCount} of 4 slots used.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button render={<Link href="/member/startups" />} className="w-full shrink-0 gap-2 sm:w-auto"><Rocket className="size-4" /> Manage My Startups <ArrowRight className="size-4" /></Button>
        </div>
      </section>

      <MemberProfileReviewsSection reviews={reviews} eligibleEvents={eligibleEvents} />

      <CommunityProfileSharing memberId={profile.id} portraitUrl={profile.portraitUrl} />

      <div className="flex justify-center">
        {directoryReady ? (
          <Button render={<Link href="/member/startups/new" />} className="w-full gap-2 sm:w-auto"><Rocket className="size-4" /> Add a Startup</Button>
        ) : (
          <DirectorySetupButton />
        )}
      </div>

    </div>
  );
}
