import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import type { CommunityUpdateRecord, OpportunityRecord, ResourceRecord, UpdateGalleryImage } from "@/types/cms";

/** Anon client WITHOUT the generated Database generic so the new CMS tables are
 *  queryable before types are regenerated. RLS restricts anon reads to published. */
function anon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

type Row = Record<string, unknown>;
const str = (v: unknown): string | null => (typeof v === "string" && v.length ? v : null);
const indiaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

// Deliberately exclude audit data and private storage/administrative fields
// from anonymous Supabase reads. Media and downloads are served by routes that
// re-check the record's current publication state.
const RESOURCE_PUBLIC_FIELDS = "id,slug,title,category,resource_type,summary,description,tags,audience,cover_image_path,document_path,document_filename,document_mime,external_url,source_name,source_organization,source_url,author,license,attribution,seo_title,meta_description,publication_status,published_at,updated_at";
const OPPORTUNITY_PUBLIC_FIELDS = "id,slug,title,category,summary,description,organization,audience,eligibility,skills,location,participation_mode,starts_on,deadline,ends_on,application_url,application_instructions,contact,banner_path,org_logo_path,source,seo_title,meta_description,publication_status,published_at,updated_at";
const UPDATE_PUBLIC_FIELDS = "id,slug,title,category,summary,body,featured,cover_image_path,cover_image_alt,gallery,author,source,related_event_id,related_collaboration_id,seo_title,meta_description,publication_status,published_at,updated_at";

/** Build the public serving URL for a CMS media object (image stored privately). */
export function cmsImageUrl(path: string | null | undefined): string | null {
  return path ? `/api/cms/image?path=${encodeURIComponent(path)}` : null;
}

function mapResource(r: Row): ResourceRecord {
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title ?? "Resource"),
    category: String(r.category ?? "Learning Materials"),
    resourceType: (str(r.resource_type) as ResourceRecord["resourceType"]) ?? "document",
    summary: str(r.summary),
    description: str(r.description),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    audience: str(r.audience),
    coverImagePath: str(r.cover_image_path),
    documentPath: str(r.document_path),
    documentFilename: str(r.document_filename),
    documentMime: str(r.document_mime),
    documentSize: typeof r.document_size === "number" ? r.document_size : null,
    externalUrl: str(r.external_url),
    sourceName: str(r.source_name),
    sourceOrganization: str(r.source_organization),
    sourceUrl: str(r.source_url),
    author: str(r.author),
    license: str(r.license),
    attribution: str(r.attribution),
    publicationConsent: Boolean(r.publication_consent),
    seoTitle: str(r.seo_title),
    metaDescription: str(r.meta_description),
    status: (str(r.publication_status) as ResourceRecord["status"]) ?? "draft",
    publishedAt: str(r.published_at),
    updatedAt: str(r.updated_at),
  };
}

function mapOpportunity(r: Row): OpportunityRecord {
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title ?? "Opportunity"),
    category: String(r.category ?? "Community Programs"),
    summary: str(r.summary),
    description: str(r.description),
    organization: str(r.organization),
    audience: str(r.audience),
    eligibility: str(r.eligibility),
    skills: str(r.skills),
    location: str(r.location),
    participationMode: (str(r.participation_mode) as OpportunityRecord["participationMode"]) ?? null,
    startsOn: str(r.starts_on),
    deadline: str(r.deadline),
    endsOn: str(r.ends_on),
    applicationUrl: str(r.application_url),
    applicationInstructions: str(r.application_instructions),
    contact: str(r.contact),
    bannerPath: str(r.banner_path),
    orgLogoPath: str(r.org_logo_path),
    source: str(r.source),
    organizationVerified: Boolean(r.organization_verified),
    publicationConsent: Boolean(r.publication_consent),
    seoTitle: str(r.seo_title),
    metaDescription: str(r.meta_description),
    status: (str(r.publication_status) as OpportunityRecord["status"]) ?? "draft",
    publishedAt: str(r.published_at),
    updatedAt: str(r.updated_at),
  };
}

export async function listPublishedResources(): Promise<ResourceRecord[] | null> {
  await connection();
  const db = anon();
  if (!db) return null;
  try {
    const { data, error } = await db.from("resources").select(RESOURCE_PUBLIC_FIELDS).eq("publication_status", "published").order("published_at", { ascending: false }).limit(60);
    if (error || !data) return null;
    return (data as Row[]).map(mapResource);
  } catch { return null; }
}

export async function getPublishedResource(slug: string): Promise<ResourceRecord | null> {
  await connection();
  const db = anon();
  if (!db) return null;
  try {
    const { data, error } = await db.from("resources").select(RESOURCE_PUBLIC_FIELDS).eq("slug", slug).eq("publication_status", "published").maybeSingle();
    if (error || !data) return null;
    return mapResource(data as Row);
  } catch { return null; }
}

/** Published and not past its deadline (expired opportunities are not "active"). */
export async function listPublishedOpportunities(): Promise<OpportunityRecord[] | null> {
  await connection();
  const db = anon();
  if (!db) return null;
  try {
    const today = indiaToday();
    const { data, error } = await db.from("opportunities").select(OPPORTUNITY_PUBLIC_FIELDS).eq("publication_status", "published").or(`deadline.is.null,deadline.gte.${today}`).order("deadline", { ascending: true, nullsFirst: false }).limit(60);
    if (error || !data) return null;
    return (data as Row[]).map(mapOpportunity);
  } catch { return null; }
}

export async function getPublishedOpportunity(slug: string): Promise<OpportunityRecord | null> {
  await connection();
  const db = anon();
  if (!db) return null;
  try {
    const today = indiaToday();
    const { data, error } = await db.from("opportunities").select(OPPORTUNITY_PUBLIC_FIELDS).eq("slug", slug).eq("publication_status", "published").or(`deadline.is.null,deadline.gte.${today}`).maybeSingle();
    if (error || !data) return null;
    return mapOpportunity(data as Row);
  } catch { return null; }
}

function mapUpdate(row: Row): CommunityUpdateRecord {
  const gallery = Array.isArray(row.gallery) ? row.gallery.filter((image): image is UpdateGalleryImage => {
    if (!image || typeof image !== "object") return false;
    const value = image as Record<string, unknown>;
    return typeof value.path === "string" && /^updates-media\/[0-9a-f-]{36}\.webp$/i.test(value.path)
      && typeof value.alt === "string" && value.alt.trim().length > 0;
  }).map((image) => ({
    path: image.path,
    alt: image.alt,
    caption: typeof image.caption === "string" ? image.caption : null,
    attribution: typeof image.attribution === "string" ? image.attribution : null,
  })) : [];

  return {
    id: String(row.id), slug: String(row.slug), title: String(row.title ?? "Community update"),
    category: String(row.category ?? "Community News"), summary: String(row.summary ?? ""),
    body: String(row.body ?? ""), featured: row.featured === true,
    coverImagePath: str(row.cover_image_path), coverImageAlt: str(row.cover_image_alt), gallery,
    author: str(row.author), source: str(row.source), publicationConsent: true,
    relatedEventId: str(row.related_event_id), relatedCollaborationId: str(row.related_collaboration_id),
    seoTitle: str(row.seo_title), metaDescription: str(row.meta_description),
    status: (str(row.publication_status) as CommunityUpdateRecord["status"]) ?? "draft",
    publishedAt: str(row.published_at), updatedAt: str(row.updated_at),
  };
}

export async function listPublishedUpdates(limit = 30): Promise<CommunityUpdateRecord[] | null> {
  await connection();
  const db = anon();
  if (!db) return null;
  try {
    const { data, error } = await db.from("community_updates").select(UPDATE_PUBLIC_FIELDS)
      .eq("publication_status", "published").order("featured", { ascending: false })
      .order("published_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 60));
    if (error || !data) return null;
    return (data as Row[]).map(mapUpdate);
  } catch { return null; }
}

export async function getPublishedUpdate(slug: string): Promise<CommunityUpdateRecord | null> {
  await connection();
  const db = anon();
  if (!db) return null;
  try {
    const { data, error } = await db.from("community_updates").select(UPDATE_PUBLIC_FIELDS)
      .eq("slug", slug).eq("publication_status", "published").maybeSingle();
    if (error || !data) return null;
    return mapUpdate(data as Row);
  } catch { return null; }
}
