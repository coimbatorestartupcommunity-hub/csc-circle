import Image from "next/image";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import type { ResourceRecord } from "@/types/cms";
import { cmsImageUrl } from "@/lib/services/cms-public";

const TYPE_LABELS: Record<ResourceRecord["resourceType"], string> = {
  document: "PDF Document",
  guide: "Guide",
  presentation: "Presentation",
  link: "Link",
  article: "Article",
  template: "Template",
  video: "Video",
};

export function resourceFormatLabel(r: ResourceRecord): string {
  if (r.resourceType === "document" && r.documentMime !== "application/pdf") return "Document";
  return TYPE_LABELS[r.resourceType] ?? "Resource";
}

export function resourceMetaLine(r: ResourceRecord): string | null {
  const parts: string[] = [resourceFormatLabel(r)];
  if (typeof r.pageCount === "number") parts.push(`${r.pageCount} pages`);
  else if (r.description) {
    const minutes = Math.max(1, Math.round(r.description.split(/\s+/).length / 200));
    parts.push(`${minutes} min read`);
  }
  if (r.language) parts.push(r.language);
  return parts.join(" · ");
}

export function formatResourceDate(value: string | null): string | null {
  if (!value) return null;
  const dateOnly = value.slice(0, 10);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? new Date(`${dateOnly}T00:00:00+05:30`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
}

/** Uniform public card used by the Resources listing and Related Resources. */
export function ResourceCard({ resource }: { resource: ResourceRecord }) {
  const cover = cmsImageUrl(resource.coverImagePath);
  const publisher = resource.sourceOrganization || resource.author;
  const date = formatResourceDate(resource.publicationDate ?? resource.publishedAt);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-white transition-shadow hover:shadow-md">
      <Link
        href={`/resources/${resource.slug}`}
        className="relative block aspect-[5/3] w-full overflow-hidden bg-brand-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
        aria-label={`View details: ${resource.title}`}
      >
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-brand-muted">
            <FileText className="size-10" aria-hidden />
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-semibold tracking-wide text-brand-accent uppercase">{resource.category}</p>
        <h2 className="line-clamp-2 text-base leading-snug font-bold text-brand-ink">
          <Link
            href={`/resources/${resource.slug}`}
            className="rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink hover:underline hover:decoration-brand-accent/50 hover:underline-offset-4"
          >
            {resource.title}
          </Link>
        </h2>
        {resource.summary ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-brand-secondary">{resource.summary}</p>
        ) : null}
        {resourceMetaLine(resource) ? (
          <p className="text-xs font-medium text-brand-muted">{resourceMetaLine(resource)}</p>
        ) : null}
        {(publisher || date) ? (
          <p className="text-xs text-brand-muted">
            {[publisher, date].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <div className="mt-auto flex items-center gap-2 pt-3">
          <Link
            href={`/resources/${resource.slug}`}
            className="inline-flex h-9 items-center rounded-lg bg-brand-ink px-4 text-sm font-semibold text-brand-white hover:bg-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
          >
            View Details
          </Link>
          {resource.documentPath ? (
            <a
              href={`/api/resources/${resource.slug}/download`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-border px-4 text-sm font-semibold text-brand-ink hover:bg-brand-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
              aria-label={`Download ${resource.title}`}
            >
              <Download className="size-4" aria-hidden /> Download
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
