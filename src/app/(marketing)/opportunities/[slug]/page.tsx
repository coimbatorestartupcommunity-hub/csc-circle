import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Building2 } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { getPublishedOpportunity, cmsImageUrl } from "@/lib/services/cms-public";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const o = await getPublishedOpportunity(slug);
  if (!o) return { title: "Opportunity", robots: { index: false, follow: false } };
  return {
    title: o.seoTitle || o.title,
    description: o.metaDescription || o.summary || undefined,
    alternates: { canonical: `/opportunities/${o.slug}` },
    openGraph: { title: o.title, description: o.summary || undefined, url: `/opportunities/${o.slug}` },
  };
}

const fmtDate = (value: string | null) => {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
};

async function OpportunityDetailContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const o = await getPublishedOpportunity(slug);
  if (!o) notFound();
  const banner = cmsImageUrl(o.bannerPath);
  const logo = cmsImageUrl(o.orgLogoPath);
  const details: [string, string | null][] = [
    ["Organization", o.organization],
    ["Location", o.location],
    ["Mode", o.participationMode],
    ["Audience", o.audience],
    ["Starts", fmtDate(o.startsOn)],
    ["Apply by", fmtDate(o.deadline)],
    ["Ends", fmtDate(o.endsOn)],
  ];

  return (
    <>
      <PageHero eyebrow={o.category} title={o.title} description={o.summary || undefined} />
      <section className="py-14">
        <Container className="mx-auto flex max-w-3xl flex-col gap-6">
          <Link href="/opportunities" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent"><ArrowLeft className="size-4" /> Back to opportunities</Link>
          {banner ? (
            <div className="relative aspect-[5/3] w-full overflow-hidden rounded-2xl bg-brand-cloud ring-1 ring-brand-border">
              <Image src={banner} alt={o.title} fill unoptimized sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
            </div>
          ) : null}

          <div className="grid gap-3 rounded-2xl bg-brand-cloud p-5 sm:grid-cols-2">
            {logo ? <div className="sm:col-span-2 flex items-center gap-2"><Image src={logo} alt="" width={28} height={28} unoptimized className="size-7 rounded-full object-contain ring-1 ring-brand-border" /><span className="text-sm font-semibold text-brand-ink">{o.organization}</span></div> : null}
            {details.filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="text-sm"><span className="font-semibold text-brand-ink">{label}: </span><span className="capitalize text-brand-secondary">{value}</span></div>
            ))}
          </div>

          {o.description ? <div className="whitespace-pre-line text-sm leading-relaxed text-brand-secondary">{o.description}</div> : null}
          {o.eligibility ? <div><h2 className="text-sm font-bold text-brand-ink">Eligibility</h2><p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-brand-secondary">{o.eligibility}</p></div> : null}
          {o.skills ? <div><h2 className="text-sm font-bold text-brand-ink">Skills &amp; requirements</h2><p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-brand-secondary">{o.skills}</p></div> : null}
          {o.applicationInstructions ? <div><h2 className="text-sm font-bold text-brand-ink">How to apply</h2><p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-brand-secondary">{o.applicationInstructions}</p></div> : null}

          <div className="flex flex-wrap gap-3">
            {o.applicationUrl ? (
              <a href={o.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-5 py-2.5 text-sm font-semibold text-brand-white hover:bg-brand-accent">
                Apply now <ExternalLink className="size-4" />
              </a>
            ) : null}
            {o.contact ? <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-cloud px-5 py-2.5 text-sm text-brand-secondary"><Building2 className="size-4" aria-hidden /> {o.contact}</span> : null}
          </div>
          {o.source ? <p className="text-xs text-brand-muted">Source: {o.source}</p> : null}
        </Container>
      </section>
    </>
  );
}

export default function OpportunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<section aria-busy="true" className="py-20"><Container className="max-w-3xl"><p className="text-sm text-brand-muted">Loading opportunity…</p></Container></section>}><OpportunityDetailContent params={params} /></Suspense>;
}
