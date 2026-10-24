import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { CtaLink } from "@/components/common/cta-link";
import { getPublishedResource, cmsImageUrl } from "@/lib/services/cms-public";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await getPublishedResource(slug);
  if (!r) return { title: "Resource", robots: { index: false, follow: false } };
  return {
    title: r.seoTitle || r.title,
    description: r.metaDescription || r.summary || undefined,
    alternates: { canonical: `/resources/${r.slug}` },
    openGraph: { title: r.title, description: r.summary || undefined, url: `/resources/${r.slug}` },
  };
}

async function ResourceDetailContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getPublishedResource(slug);
  if (!r) notFound();
  const cover = cmsImageUrl(r.coverImagePath);
  const hasDownload = r.resourceType !== "link" && !!r.documentPath;

  return (
    <>
      <PageHero eyebrow={r.category} title={r.title} description={r.summary || undefined} />
      <section className="py-14">
        <Container className="mx-auto flex max-w-3xl flex-col gap-6">
          <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent"><ArrowLeft className="size-4" /> Back to resources</Link>
          {cover ? (
            <div className="relative aspect-[5/3] w-full overflow-hidden rounded-2xl bg-brand-cloud ring-1 ring-brand-border">
              <Image src={cover} alt={r.title} fill unoptimized sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
            </div>
          ) : null}
          {r.description ? <div className="whitespace-pre-line text-sm leading-relaxed text-brand-secondary">{r.description}</div> : null}

          <div className="flex flex-wrap gap-3">
            {hasDownload ? (
              <CtaLink href={`/api/resources/${r.slug}/download`} size="md" arrow={false}><Download className="size-4" /> Download</CtaLink>
            ) : null}
          {(r.resourceType === "link" || r.resourceType === "video") && r.externalUrl ? (
              <a href={r.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-5 py-2.5 text-sm font-semibold text-brand-white hover:bg-brand-accent">
                Open resource <ExternalLink className="size-4" />
              </a>
            ) : null}
          </div>

          {(r.sourceOrganization || r.sourceName || r.author || r.attribution || r.license) ? (
            <div className="rounded-2xl bg-brand-cloud p-5 text-sm text-brand-secondary">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Source &amp; attribution</p>
              <dl className="mt-2 flex flex-col gap-1">
                {r.sourceOrganization ? <div><dt className="inline font-semibold text-brand-ink">Organization: </dt><dd className="inline">{r.sourceOrganization}</dd></div> : null}
                {r.author ? <div><dt className="inline font-semibold text-brand-ink">Author: </dt><dd className="inline">{r.author}</dd></div> : null}
                {r.sourceUrl ? <div><dt className="inline font-semibold text-brand-ink">Source: </dt><dd className="inline"><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-accent underline underline-offset-2 break-words">{r.sourceUrl}</a></dd></div> : null}
                {r.license ? <div><dt className="inline font-semibold text-brand-ink">License: </dt><dd className="inline">{r.license}</dd></div> : null}
                {r.attribution ? <p className="mt-1">{r.attribution}</p> : null}
              </dl>
            </div>
          ) : null}
        </Container>
      </section>
    </>
  );
}

export default function ResourceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<section aria-busy="true" className="py-20"><Container className="max-w-3xl"><p className="text-sm text-brand-muted">Loading resource…</p></Container></section>}><ResourceDetailContent params={params} /></Suspense>;
}
