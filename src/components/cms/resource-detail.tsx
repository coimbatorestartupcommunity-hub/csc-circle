import type * as React from "react";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import type { ResourceRecord } from "@/types/cms";
import { Eyebrow } from "@/components/common/section";
import { ResourceSectionHeading } from "@/components/cms/resource-content-renderer";
import { ResourceCard, formatResourceDate, resourceFormatLabel, resourceMetaLine } from "@/components/cms/resource-card";

function formatBytes(value: number | null): string | null {
  if (typeof value !== "number" || value <= 0) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/** Centered publication hero: category, title, subtitle, metadata. */
export function ResourceHero({ resource }: { resource: ResourceRecord }) {
  const date = formatResourceDate(resource.publicationDate ?? resource.publishedAt);
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Eyebrow>{resource.category}</Eyebrow>
      <h1 className="max-w-3xl text-[30px] leading-[1.12] font-extrabold tracking-tight text-balance text-brand-ink sm:text-[40px] lg:text-[52px]">
        {resource.title}
      </h1>
      {resource.summary ? (
        <p className="max-w-2xl text-[16px] leading-relaxed text-pretty text-brand-secondary sm:text-[18px]">
          {resource.summary}
        </p>
      ) : null}
      <p className="text-sm font-medium text-brand-muted">
        {[resourceMetaLine(resource), date].filter(Boolean).join("  |  ")}
      </p>
    </div>
  );
}

export function ResourceBackLink() {
  return (
    <Link
      href="/resources"
      className="inline-flex w-fit items-center gap-1.5 rounded text-sm font-semibold text-brand-accent hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
    >
      <ArrowLeft className="size-4" aria-hidden /> Back to resources
    </Link>
  );
}

/** Sticky facts panel for larger screens. Only present metadata is shown. */
export function ResourceInfoPanel({ resource }: { resource: ResourceRecord }) {
  const rows: [string, string][] = [
    ["Category", resource.category],
    ["Format", resourceFormatLabel(resource)],
    ...(resource.sourceOrganization ? [["Publisher", resource.sourceOrganization] as [string, string]] : []),
    ...(resource.author ? [["Author", resource.author] as [string, string]] : []),
    ...(resource.language ? [["Language", resource.language] as [string, string]] : []),
    ...(typeof resource.pageCount === "number" ? [["Pages", String(resource.pageCount)] as [string, string]] : []),
  ];
  const published = formatResourceDate(resource.publicationDate);
  const updated = formatResourceDate(resource.updatedAt);
  if (published) rows.push(["Published", published]);
  if (updated && updated !== published) rows.push(["Last updated", updated]);
  const hasDownload = resource.resourceType !== "link" && !!resource.documentPath;
  const isExternal = (resource.resourceType === "link" || resource.resourceType === "video") && !!resource.externalUrl;
  return (
    <aside aria-label="Resource information" className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-white p-6 lg:sticky lg:top-24">
      <h2 className="text-base font-bold text-brand-ink">{resource.title}</h2>
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-brand-muted">{label}</dt>
            <dd className="text-right font-medium text-brand-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {hasDownload ? (
        <a
          href={`/api/resources/${resource.slug}/download`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 text-sm font-semibold text-brand-white hover:bg-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
        >
          <Download className="size-4" aria-hidden /> Download {resource.documentFilename ? "" : "PDF"}
          <span className="sr-only">{resource.title}</span>
        </a>
      ) : null}
      {isExternal && resource.externalUrl ? (
        <a
          href={resource.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 text-sm font-semibold text-brand-white hover:bg-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
        >
          Open resource <ExternalLink className="size-4" aria-hidden />
        </a>
      ) : null}
      {resource.documentFilename || formatBytes(resource.documentSize) ? (
        <p className="text-xs leading-relaxed text-brand-muted">
          {[resource.documentFilename, formatBytes(resource.documentSize)].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </aside>
  );
}

/** What-you-will-learn cards from explicit publisher-structured topics. */
export function ResourceTopics({ topics }: { topics: ResourceRecord["topics"] }) {
  if (!topics.length) return null;
  return (
    <section aria-labelledby="resource-topics" className="flex flex-col gap-4">
      <ResourceSectionHeading>
        <span id="resource-topics">What You Will Learn</span>
      </ResourceSectionHeading>
      <ol className="flex flex-col gap-3">
        {topics.map((topic, index) => (
          <li key={`${topic.title}-${index}`} className="rounded-2xl border border-brand-border bg-brand-white p-5">
            <p className="text-xs font-bold tracking-widest text-brand-accent">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-1 text-[20px] leading-snug font-bold text-brand-ink">{topic.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-brand-secondary">{topic.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Structured source and attribution (never one merged paragraph). */
export function ResourceAttribution({ resource }: { resource: ResourceRecord }) {
  const rows: [string, React.ReactNode][] = [];
  if (resource.sourceOrganization) rows.push(["Publishing organization", resource.sourceOrganization]);
  if (resource.author) rows.push(["Author", resource.author]);
  if (resource.sourceUrl) {
    rows.push(["Source", (
      <a
        key="source"
        href={resource.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="break-words text-brand-accent underline underline-offset-2 hover:underline-offset-4 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-brand-accent"
      >
        {resource.sourceUrl}
      </a>
    )]);
  }
  if (resource.license) rows.push(["License / usage rights", resource.license]);
  if (!rows.length && !resource.attribution) return null;
  return (
    <section aria-labelledby="resource-attribution" className="flex flex-col gap-3 rounded-2xl bg-brand-cloud p-6">
      <h2 id="resource-attribution" className="text-xs font-bold tracking-widest text-brand-muted uppercase">
        Source &amp; attribution
      </h2>
      {rows.length ? (
        <dl className="flex flex-col gap-2 text-sm leading-relaxed text-brand-secondary">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="inline font-semibold text-brand-ink">{label}: </dt>
              <dd className="inline">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {resource.attribution ? <p className="text-sm leading-relaxed text-brand-secondary">{resource.attribution}</p> : null}
    </section>
  );
}

export function ResourceTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <ul aria-label="Tags" className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <li key={tag} className="rounded-full bg-brand-cloud px-3.5 py-1.5 text-xs font-semibold text-brand-secondary ring-1 ring-brand-border">
          {tag}
        </li>
      ))}
    </ul>
  );
}

export function ResourceEmpty({ title }: { title: string }) {
  return (
    <span className="flex size-full min-h-40 items-center justify-center text-brand-muted">
      <FileText className="size-10" aria-hidden />
      <span className="sr-only">{title}</span>
    </span>
  );
}

export function RelatedResources({ resources }: { resources: ResourceRecord[] }) {
  if (!resources.length) return null;
  return (
    <section aria-labelledby="related-resources" className="flex flex-col gap-4">
      <ResourceSectionHeading>
        <span id="related-resources">Related Resources</span>
      </ResourceSectionHeading>
      <div className="grid gap-6 sm:grid-cols-2">
        {resources.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
      </div>
    </section>
  );
}
