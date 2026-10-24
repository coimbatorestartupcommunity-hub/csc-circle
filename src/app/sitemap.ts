import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/content/site";
import { getPublicCollaborations } from "@/lib/services/public-data";
import { listPublishedUpdates, listPublishedResources, listPublishedOpportunities } from "@/lib/services/cms-public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/directory`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/events`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/collaborations`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/updates`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/membership`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/resources`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/opportunities`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/help`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, lastModified, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/community-guidelines`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/security`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Published collaboration detail pages (never drafts / admin routes).
  let collaborationRoutes: MetadataRoute.Sitemap = [];
  try {
    const collaborations = await getPublicCollaborations();
    collaborationRoutes = collaborations.map((c) => ({
      url: `${base}/collaborations/${c.slug}`,
      lastModified: c.publishedAt ? new Date(c.publishedAt) : lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // If the data source is unavailable at build, ship the static routes only.
  }

  const cmsRoutes: MetadataRoute.Sitemap = [];
  try {
    const [updates, resources, opportunities] = await Promise.all([
      listPublishedUpdates(60), listPublishedResources(), listPublishedOpportunities(),
    ]);
    for (const item of updates ?? []) cmsRoutes.push({ url: `${base}/updates/${item.slug}`, lastModified: item.publishedAt ? new Date(item.publishedAt) : lastModified, changeFrequency: "monthly", priority: 0.6 });
    for (const item of resources ?? []) cmsRoutes.push({ url: `${base}/resources/${item.slug}`, lastModified: item.publishedAt ? new Date(item.publishedAt) : lastModified, changeFrequency: "monthly", priority: 0.5 });
    for (const item of opportunities ?? []) cmsRoutes.push({ url: `${base}/opportunities/${item.slug}`, lastModified: item.publishedAt ? new Date(item.publishedAt) : lastModified, changeFrequency: "weekly", priority: 0.5 });
  } catch {
    // Static routes remain available while the CMS data source is unavailable.
  }

  return [...staticRoutes, ...collaborationRoutes, ...cmsRoutes];
}
