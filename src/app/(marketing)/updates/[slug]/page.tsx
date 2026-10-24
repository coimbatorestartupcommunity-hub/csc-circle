import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { cmsImageUrl, getPublishedUpdate } from "@/lib/services/cms-public";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const update = await getPublishedUpdate(slug);
  if (!update) return { title: "Update", robots: { index: false, follow: false } };
  return {
    title: update.seoTitle || update.title,
    description: update.metaDescription || update.summary,
    alternates: { canonical: `/updates/${update.slug}` },
    openGraph: { title: update.title, description: update.summary, url: `/updates/${update.slug}`, images: update.coverImagePath ? [cmsImageUrl(update.coverImagePath)!] : undefined },
  };
}

async function UpdateDetailContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const update = await getPublishedUpdate(slug);
  if (!update) notFound();
  const date = update.publishedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date(update.publishedAt)) : null;
  return <>
    <PageHero eyebrow={update.category} title={update.title} description={update.summary} />
    <article className="py-10 sm:py-14"><Container className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/updates" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-brand-accent"><ArrowLeft className="size-4" aria-hidden="true" />All updates</Link>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-muted">{date ? <time dateTime={update.publishedAt ?? undefined}>{date}</time> : null}{update.author ? <span>By {update.author}</span> : null}</div>
      {update.coverImagePath ? <div className="relative aspect-[5/3] w-full overflow-hidden rounded-2xl bg-brand-cloud"><Image src={cmsImageUrl(update.coverImagePath)!} alt={update.coverImageAlt || ""} fill unoptimized sizes="(max-width: 768px) 100vw, 768px" className="object-cover" /></div> : null}
      <div className="whitespace-pre-line break-words text-base leading-8 text-brand-secondary">{update.body}</div>
      {update.source ? <p className="border-t border-brand-border pt-4 text-sm text-brand-muted">Source: {update.source}</p> : null}
      {update.gallery.length ? <section aria-label="Update photographs" className="grid gap-4 sm:grid-cols-2">{update.gallery.map((image) => <figure key={image.path} className="overflow-hidden rounded-2xl border border-brand-border bg-white"><div className="relative aspect-[5/3] bg-brand-cloud"><Image src={cmsImageUrl(image.path)!} alt={image.alt} fill unoptimized sizes="(max-width: 768px) 100vw, 380px" className="object-cover" /></div>{image.caption || image.attribution ? <figcaption className="p-3 text-xs text-brand-muted">{image.caption}{image.attribution ? <span>{image.caption ? " · " : ""}{image.attribution}</span> : null}</figcaption> : null}</figure>)}</section> : null}
    </Container></article>
  </>;
}

export default function UpdateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<section aria-busy="true" className="py-16"><Container className="max-w-3xl"><p className="text-sm text-brand-muted">Loading update…</p></Container></section>}><UpdateDetailContent params={params} /></Suspense>;
}
