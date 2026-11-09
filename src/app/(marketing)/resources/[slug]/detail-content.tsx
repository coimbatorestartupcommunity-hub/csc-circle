import Image from "next/image";
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
import type { ResourceRecord } from "@/types/cms";
import { listPublishedResources, cmsImageUrl } from "@/lib/services/cms-public";
import { siteConfig } from "@/lib/content/site";

function structuredData(r: ResourceRecord) {
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

export async function ResourceDetailContent({ resource: r }: { resource: ResourceRecord }) {
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
        <Container className="mx-auto flex max-w-3xl flex-col gap-8">
          <ResourceBackLink />
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
          <RelatedResources resources={[...related, ...fallback]} />
          <ResourceInfoPanel resource={r} />
        </Container>
      </section>
    </>
  );
}
