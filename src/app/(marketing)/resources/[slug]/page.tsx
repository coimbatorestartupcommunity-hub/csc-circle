import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { Container } from "@/components/common/container";
import { CtaLink } from "@/components/common/cta-link";
import { ResourceContentRenderer, ResourceSectionHeading } from "@/components/cms/resource-content-renderer";
import {
  RelatedResources,
  ResourceAttribution,
  ResourceBackLink,
  ResourceHero,
  ResourceInfoPanel,
  ResourceTags,
  ResourceTopics,
} from "@/components/cms/resource-detail";
import { getPublishedResource, listPublishedResources, cmsImageUrl } from "@/lib/services/cms-public";
import { siteConfig } from "@/lib/content/site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await getPublishedResource(slug);
  if (!r) return { title: "Resource", robots: { index: false, follow: false } };
  const cover = cmsImageUrl(r.coverImagePath);
  const absoluteCover = cover ? `${siteConfig.url}${cover}` : null;
  const description = r.metaDescription || r.summary || undefined;
  return {
    title: r.seoTitle || r.title,
    description,
    alternates: { canonical: `/resources/${r.slug}` },
    openGraph: {
      title: r.title,
      description,
      url: `/resources/${r.slug}`,
      type: "article",
      ...(absoluteCover ? { images: [{ url: absoluteCover, alt: r.title }] } : {}),
      ...(r.publicationDate ? { publishedTime: r.publicationDate } : {}),
    },
    twitter: {
      card: absoluteCover ? "summary_large_image" : "summary",
      title: r.title,
      description,
      ...(absoluteCover ? { images: [absoluteCover] } : {}),
    },
  };
}

function structuredData(r: NonNullable<Awaited<ReturnType<typeof getPublishedResource>>>) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: r.title,
    description: r.summary || undefined,
    url: `${siteConfig.url}/resources/${r.slug}`,
    inLanguage: r.language || undefined,
    datePublished: r.publicationDate || r.publishedAt || undefined,
    dateModified: r.updatedAt || undefined,
    author: r.author || r.sourceOrganization
      ? { "@type": "Organization", name: r.author || r.sourceOrganization }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: siteConfig.legalName,
      url: siteConfig.url,
    },
  };
}

export async function ResourceDetailContent({ resource: r }: { resource: NonNullable<Awaited<ReturnType<typeof getPublishedResource>>> }) {
  const cover = cmsImageUrl(r.coverImagePath);
  const hasDownload = r.resourceType !== "link" && !!r.documentPath;
  const isExternal = (r.resourceType === "link" || r.resourceType === "video") && !!r.externalUrl;
  const all = await listPublishedResources();
  const related = (all ?? [])
    .filter((item) => item.slug !== r.slug && item.category === r.category)
    .slice(0, 2);
  const fallback = related.length < 2
    ? (all ?? []).filter((item) => item.slug !== r.slug && item.category !== r.category).slice(0, 2 - related.length)
    : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(r)) }}
      />
      <section className="border-b border-brand-border bg-brand-white">
        <Container className="mx-auto max-w-3xl py-14 sm:py-16">
          <ResourceHero resource={r} />
        </Container>
      </section>
      <section className="bg-brand-white py-12 sm:py-14">
        <Container className="mx-auto flex max-w-5xl flex-col gap-8">
          <ResourceBackLink />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-10">
              {cover ? (
                <figure className="overflow-hidden rounded-2xl bg-brand-cloud ring-1 ring-brand-border">
                  <div className="relative aspect-[5/3] w-full">
                    <Image
                      src={cover}
                      alt={`${r.title} cover`}
                      fill
                      unoptimized
                      sizes="(max-width: 1024px) 100vw, 640px"
                      className="object-contain"
                      priority
                    />
                  </div>
                </figure>
              ) : null}
              {(hasDownload || isExternal) && (
                <div className="flex flex-wrap gap-3">
                  {hasDownload ? (
                    <CtaLink href={`/api/resources/${r.slug}/download`} size="md" arrow={false}>
                      <Download className="size-4" aria-hidden /> Download {r.documentFilename ? "PDF" : "resource"}
                    </CtaLink>
                  ) : null}
                  {isExternal && r.externalUrl ? (
                    <a
                      href={r.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-ink px-5 text-sm font-medium text-brand-white hover:bg-brand-accent h-10"
                    >
                      Open resource <ExternalLink className="size-4" aria-hidden />
                    </a>
                  ) : null}
                </div>
              )}
              {r.description ? (
                <section aria-labelledby="resource-about" className="flex flex-col gap-4">
                  <ResourceSectionHeading>
                    <span id="resource-about">About This Resource</span>
                  </ResourceSectionHeading>
                  <ResourceContentRenderer content={r.description} />
                </section>
              ) : null}
              <ResourceTopics topics={r.topics} />
              {r.audience ? (
                <section aria-labelledby="resource-audience" className="flex flex-col gap-3">
                  <ResourceSectionHeading>
                    <span id="resource-audience">Who Should Read This?</span>
                  </ResourceSectionHeading>
                  <p className="whitespace-pre-line text-[16px] leading-[1.8] text-brand-secondary">{r.audience}</p>
                </section>
              ) : null}
              <ResourceTags tags={r.tags} />
              <ResourceAttribution resource={r} />
            </div>
            <ResourceInfoPanel resource={r} />
          </div>
          <RelatedResources resources={[...related, ...fallback]} />
        </Container>
      </section>
    </>
  );
}

// The existence check runs before any Suspense boundary so missing or
// unpublished slugs return a real 404 status instead of a 200 shell.
export default async function ResourceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = await getPublishedResource(slug);
  if (!resource) notFound();
  return <ResourceDetailContent resource={resource} />;
}
