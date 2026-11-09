import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceDetailContent } from "./detail-content";
import { getPublishedResource, cmsImageUrl } from "@/lib/services/cms-public";
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

// The existence check runs before any Suspense boundary so missing or
// unpublished slugs return a real 404 status instead of a 200 shell.
export default async function ResourceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = await getPublishedResource(slug);
  if (!resource) notFound();
  return <ResourceDetailContent resource={resource} />;
}
