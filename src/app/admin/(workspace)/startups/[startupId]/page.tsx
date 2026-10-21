import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ActionButton } from "@/components/admin/action-button";
import { StatusBadge } from "@/components/member/status-badge";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { publicationStatusMeta } from "@/lib/admin/status-meta";
import { displayHost, formatEventDate } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Startup detail" };

export default async function AdminStartupDetail({
  params,
}: {
  params: Promise<{ startupId: string }>;
}) {
  const { startupId } = await params;
  const ctx = await requireAdminPagePermission("directory.manage");
  const res = await adminServices.getStartup(startupId);

  if (!res.ok) {
    return (
      <>
        <AdminPageHeader title="Startup" isDemo={ctx.mode === "preview"} />
        <p className="text-brand-muted">{res.error.message}</p>
      </>
    );
  }
  const s = res.data;
  const startupDetails = s.details ?? {};
  const privateDetails = s.privateDetails ?? {};
  const logoUrl = s.logoPath && !/^https?:\/\//i.test(s.logoPath) ? (await createAdminClient().storage.from("member-portraits").createSignedUrl(s.logoPath, 900)).data?.signedUrl : s.logoPath;
  const meta = publicationStatusMeta[s.status];
  const host = displayHost(s.website);

  return (
    <>
      <Link href="/admin/startups" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
        <ArrowLeft className="size-4" /> Back to startups
      </Link>
      <AdminPageHeader
        title={s.name}
        description={`Founder: ${s.founder}`}
        isDemo={ctx.mode === "preview"}
        action={<StatusBadge label={meta.label} tone={meta.tone} />}
      />

      <div className="flex flex-col gap-4 rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
        {logoUrl ? <div className="relative mx-auto flex h-28 w-full max-w-xs items-center justify-center overflow-hidden rounded-2xl bg-white p-3 ring-1 ring-brand-border"><Image src={logoUrl} alt={`${s.name} company logo`} fill unoptimized sizes="320px" className="object-contain p-3" /></div> : null}
        {ctx.mode === "live" ? (
          <div className="relative mx-auto aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-2xl bg-brand-cloud ring-1 ring-brand-border">
            <Image src={`/api/admin/startups/${encodeURIComponent(startupId)}/photo`} alt={`Founder photo for ${s.name}`} fill unoptimized sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
          </div>
        ) : null}
        <dl className="grid gap-3 sm:grid-cols-2">
          <Field label="Directory slug" value={s.slug || "—"} />
          <Field label="Industry" value={s.industry} />
          <Field label="Website" value={host ?? (typeof privateDetails.website === "string" ? privateDetails.website : "—")} />
          <Field label="Collaboration" value={s.collaboration.join(", ") || "—"} />
          <Field label="Public listing consent" value={s.publicationConsent ? "Confirmed at submission" : "Not recorded"} />
          <Field label="Consent recorded" value={s.publicationConsentAt ? formatEventDate(s.publicationConsentAt) : "—"} />
          <Field label="Submitted" value={s.submittedAt ? formatEventDate(s.submittedAt) : "—"} />
          <Field label="Updated" value={formatEventDate(s.updatedAt)} />
        </dl>
        <section className="rounded-2xl bg-brand-cloud p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-brand-ink">Submitted description</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-brand-secondary">{s.description || "No description was provided."}</p>
        </section>
        <section className="rounded-2xl bg-brand-cloud p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-brand-ink">Company and founder information</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="City" value={String(startupDetails.city ?? "—")} />
            <Field label="Category" value={String(startupDetails.category ?? "—")} />
            <Field label="Startup stage" value={String(startupDetails.stage ?? "—")} />
            <Field label="Founded" value={String(startupDetails.yearFounded ?? "—")} />
            <Field label="Support email" value={String(privateDetails.supportEmail ?? "—")} />
            <Field label="Additional support email" value={String(privateDetails.additionalSupportEmail ?? "—")} />
            <Field label="Company email" value={String(privateDetails.companyEmail ?? "—")} />
            <Field label="Company mobile" value={String(privateDetails.companyMobile ?? "—")} />
            <Field label="Company WhatsApp" value={String(privateDetails.companyWhatsapp ?? "—")} />
            <Field label="Founder designation" value={String(startupDetails.founderRole ?? "Founder")} />
            <Field label="Founder mobile" value={String(privateDetails.founderMobile ?? "—")} />
            <Field label="Founder WhatsApp" value={String(privateDetails.founderWhatsapp ?? "—")} />
            <Field label="Founder email" value={String(privateDetails.founderEmail ?? "—")} />
            <Field label="Founder portfolio" value={String(startupDetails.founderWebsite ?? "—")} />
            <Field label="Founder LinkedIn" value={String(startupDetails.founderLinkedin ?? "—")} />
          </dl>
        </section>
        {([["What we do", "whatWeDo"], ["How we work", "howWeWork"], ["Mission", "mission"], ["Vision", "vision"], ["Problems solved", "problemsSolved"], ["Who we serve", "targetAudience"], ["Our approach", "approach"], ["Founder description", "founderDescription"]] as const).map(([label, key]) => typeof startupDetails[key] === "string" && startupDetails[key] ? <section key={key} className="rounded-2xl bg-brand-cloud p-4 sm:p-5"><h2 className="text-sm font-semibold text-brand-ink">{label}</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-brand-secondary">{startupDetails[key] as string}</p></section> : null)}
        {(["coreSkills", "technologies", "technicalExpertise", "services", "capabilities", "industriesServed", "collaboration", "partnershipOpportunities", "mentorshipInterests", "fundingInterests", "founderSkills"] as const).some((key) => Array.isArray(startupDetails[key]) && (startupDetails[key] as unknown[]).length) ? <section className="rounded-2xl bg-brand-cloud p-4 sm:p-5"><h2 className="text-sm font-semibold text-brand-ink">Skills and opportunities</h2><div className="mt-3 flex flex-col gap-2">{(["coreSkills", "technologies", "technicalExpertise", "services", "capabilities", "industriesServed", "collaboration", "partnershipOpportunities", "mentorshipInterests", "fundingInterests", "founderSkills"] as const).map((key) => Array.isArray(startupDetails[key]) && (startupDetails[key] as unknown[]).length ? <p key={key} className="text-sm text-brand-secondary"><span className="font-medium text-brand-ink">{key.replaceAll(/([A-Z])/g, " $1")}: </span>{(startupDetails[key] as string[]).join(", ")}</p> : null)}</div></section> : null}
        {can(ctx, "directory.manage") ? (
          <div className="flex flex-wrap gap-2 border-t border-brand-border pt-4">
            {(s.status === "pending" || s.status === "draft") && <ActionButton
              operation={ctx.mode === "live" ? { kind: "startup", target: startupId, decision: "published" } : undefined}
              label="Approve & publish"
              message="Review the founder-submitted details below. Approval makes this listing visible in the public Founder Directory."
              details={{
                startupName: s.name,
                founder: s.founder,
                directorySlug: s.slug,
                industry: s.industry,
                description: s.description,
                city: String(startupDetails.city ?? "Not provided"),
                tagline: String(startupDetails.tagline ?? "Not provided"),
                whatWeDo: String(startupDetails.whatWeDo ?? "Not provided"),
                supportEmail: String(privateDetails.supportEmail ?? "Not provided"),
                additionalSupportEmail: String(privateDetails.additionalSupportEmail ?? "Not provided"),
                companyEmail: String(privateDetails.companyEmail ?? "Not provided"),
                companyMobile: String(privateDetails.companyMobile ?? "Not provided"),
                companyWhatsapp: String(privateDetails.companyWhatsapp ?? "Not provided"),
                founderEmail: String(privateDetails.founderEmail ?? "Not provided"),
                founderMobile: String(privateDetails.founderMobile ?? "Not provided"),
                founderWhatsapp: String(privateDetails.founderWhatsapp ?? "Not provided"),
                website: s.website ?? "Not provided",
                collaboration: s.collaboration.length ? s.collaboration.join(", ") : "Not provided",
                publicListingConsent: s.publicationConsent ? "Confirmed" : "Not recorded (older submission)",
                consentRecorded: s.publicationConsentAt ? formatEventDate(s.publicationConsentAt) : "Not available",
                submitted: s.submittedAt ? formatEventDate(s.submittedAt) : "Unknown",
                currentStatus: meta.label,
              }}
            />}
            {(s.status === "pending" || s.status === "draft") && <ActionButton operation={ctx.mode === "live" ? { kind: "startup", target: startupId, decision: "archived" } : undefined} label="Cancel submission" variant="destructive" confirm="Cancel this startup submission and keep it out of the public directory?" />}
            {s.status === "published" && <ActionButton operation={ctx.mode === "live" ? { kind: "startup", target: startupId, decision: "archived" } : undefined} label="Unpublish" variant="destructive" confirm="Unpublish this listing from the public directory?" />}
            {s.status === "archived" && <ActionButton operation={ctx.mode === "live" ? { kind: "startup", target: startupId, decision: "pending" } : undefined} label="Return to review" confirm="Return this startup to the pending review queue?" />}
          </div>
        ) : null}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs tracking-wide text-brand-muted uppercase">{label}</dt>
      <dd className="text-sm text-brand-ink">{value}</dd>
    </div>
  );
}
