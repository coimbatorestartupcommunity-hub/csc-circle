/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StartupRevisionActions } from "@/components/admin/startup-revision-actions";
import { getAdminContext } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Review Startup Changes" };

type Bag = Record<string, unknown>;
const labels: Record<string, string> = {
  name: "Startup name", slug: "Directory URL", industry: "Industry", description: "Description", website: "Website",
  logo_url: "Company logo", directory_image_path: "Directory image", founder: "Founder details", details: "Startup details",
  supportEmail: "Support email", additionalSupportEmail: "Additional support email", companyEmail: "Company email",
  companyMobile: "Company mobile", companyWhatsapp: "Company WhatsApp", founderMobile: "Founder mobile",
  founderWhatsapp: "Founder WhatsApp", founderEmail: "Founder email", founderWebsite: "Founder website",
};

function text(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? item : JSON.stringify(item)).join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function Compare({ title, current, proposed }: { title: string; current: Bag; proposed: Bag }) {
  const keys = [...new Set([...Object.keys(current), ...Object.keys(proposed)])];
  return <section className="overflow-hidden rounded-2xl border border-brand-border bg-white">
    <h2 className="border-b border-brand-border bg-brand-cloud px-4 py-3 text-sm font-semibold text-brand-ink">{title}</h2>
    <div className="divide-y divide-brand-border">
      {keys.map((key) => {
        const before = text(current[key]);
        const after = text(proposed[key]);
        const changed = before !== after;
        return <div key={key} className="grid gap-2 p-4 md:grid-cols-[minmax(10rem,0.7fr)_1fr_1fr] md:gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{labels[key] ?? key.replaceAll(/([A-Z])/g, " $1")}</h3>
          <div className="min-w-0"><p className="mb-1 text-[11px] uppercase tracking-wide text-brand-muted">Current published</p><p className="whitespace-pre-wrap break-words text-sm text-brand-secondary">{before}</p></div>
          <div className={changed ? "min-w-0 rounded-lg bg-amber-50 p-2" : "min-w-0"}><p className="mb-1 text-[11px] uppercase tracking-wide text-brand-muted">Proposed</p><p className="whitespace-pre-wrap break-words text-sm text-brand-secondary">{after}</p></div>
        </div>;
      })}
    </div>
  </section>;
}

async function signedImage(admin: ReturnType<typeof createAdminClient>, path: unknown) {
  if (typeof path !== "string" || !path) return null;
  const { data } = await admin.storage.from("member-portraits").createSignedUrl(path, 900);
  return data?.signedUrl ?? null;
}

export default async function StartupRevisionDetailPage({ params }: { params: Promise<{ revisionId: string }> }) {
  const { revisionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(revisionId)) notFound();
  const ctx = await getAdminContext();
  if (ctx.mode !== "live" || !ctx.permissions.has("directory.manage")) {
    return <><AdminPageHeader title="Startup revision" /><p className="rounded-2xl border border-brand-border bg-white p-5 text-sm text-brand-muted">A live administrator with startup directory permission is required to view revisions.</p></>;
  }

  const admin = createAdminClient();
  const { data: revision } = await admin.from("directory_startup_revisions").select("*").eq("id", revisionId).maybeSingle();
  if (!revision || revision.status !== "pending") notFound();
  const [{ data: startup }, { data: privateDetails }] = await Promise.all([
    admin.from("directory_startups").select("*").eq("id", revision.startup_id).maybeSingle(),
    admin.from("directory_startup_private_details").select("details").eq("startup_id", revision.startup_id).maybeSingle(),
  ]);
  if (!startup || startup.status !== "published") notFound();

  const proposed = revision.proposed_data as Bag;
  const proposedPrivate = revision.proposed_private_details as Bag;
  const currentDetails = startup.details as Bag;
  const currentPrivate = (privateDetails?.details ?? {}) as Bag;
  const [currentImage, proposedImage, currentLogo, proposedLogo] = await Promise.all([
    signedImage(admin, startup.directory_image_path), signedImage(admin, proposed.directory_image_path),
    signedImage(admin, startup.logo_url), signedImage(admin, proposed.logo_url),
  ]);
  const currentPublic: Bag = { name: startup.name, slug: startup.slug, industry: startup.industry, description: startup.description, website: startup.website, details: currentDetails };
  const proposedPublic: Bag = { name: proposed.name, slug: proposed.slug, industry: proposed.industry, description: proposed.description, website: proposed.website, details: proposed.details };

  return <>
    <Link href="/admin/startups/revisions" className="mb-3 inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink"><ArrowLeft className="size-4" />Pending changes</Link>
    <AdminPageHeader title={`Review changes: ${startup.name}`} description="The current listing remains public until you approve this revision." />
    <div className="mb-5 grid gap-4 lg:grid-cols-2">
      {[{ label: "Current published image", src: currentImage }, { label: "Proposed image", src: proposedImage }].map((image) => <figure key={image.label} className="min-w-0 rounded-2xl border border-brand-border bg-white p-3"><figcaption className="mb-2 text-xs font-semibold text-brand-muted">{image.label}</figcaption>{image.src ? <img src={image.src} alt={image.label} className="aspect-[4/3] w-full rounded-xl object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-brand-cloud text-sm text-brand-muted">No image</div>}</figure>)}
      {[{ label: "Current published logo", src: currentLogo }, { label: "Proposed logo", src: proposedLogo }].map((image) => <figure key={image.label} className="flex min-w-0 items-center gap-4 rounded-2xl border border-brand-border bg-white p-3"><figcaption className="w-40 shrink-0 text-xs font-semibold text-brand-muted">{image.label}</figcaption>{image.src ? <img src={image.src} alt={image.label} className="size-20 rounded-xl border border-brand-border object-contain p-2" /> : <span className="text-sm text-brand-muted">No logo</span>}</figure>)}
    </div>
    <div className="mb-5 grid gap-5">
      <Compare title="Public directory information" current={currentPublic} proposed={proposedPublic} />
      <Compare title="Company and founder contact details" current={currentPrivate} proposed={proposedPrivate} />
    </div>
    <StartupRevisionActions revisionId={revision.id} />
  </>;
}
