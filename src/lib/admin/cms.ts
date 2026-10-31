import "server-only";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CommunityUpdateSaveValues, ResourceSaveValues, OpportunitySaveValues } from "@/lib/validations/cms";
import type { CommunityUpdateRecord, OpportunityRecord, ResourceRecord, UpdateGalleryImage } from "@/types/cms";

type Row = Record<string, unknown>;
type Action = "publish" | "unpublish" | "archive" | "delete";

// The admin (service-role) client is used only inside routes/pages that have
// already verified getAdminContext + can(context, "content.manage").
function db() {
  return createAdminClient() as unknown as {
    from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
}

async function validPrivateCmsImage(path: unknown): Promise<boolean> {
  if (typeof path !== "string" || !/^(resource-media|opportunity-media|updates-media)\/[0-9a-f-]{36}\.webp$/i.test(path)) return false;
  try {
    const { data, error } = await createAdminClient().storage.from("member-portraits").download(path);
    if (error || !data) return false;
    const header = new Uint8Array(await data.slice(0, 12).arrayBuffer());
    return new TextDecoder().decode(header.slice(0, 4)) === "RIFF" && new TextDecoder().decode(header.slice(8, 12)) === "WEBP";
  } catch { return false; }
}

async function audit(action: string, actorId: string | null, targetType: string, targetId: string, after: Record<string, unknown>) {
  try {
    await db().from("audit_logs").insert({ action, actor_id: actorId, target_type: targetType, target_id: targetId, after, correlation_id: randomUUID() });
  } catch { /* audit must never block the operation */ }
}

/* -------------------------------- Resources -------------------------------- */

function resourceRow(v: ResourceSaveValues, userId: string) {
  return {
    slug: v.slug, title: v.title, category: v.category, resource_type: v.resourceType,
    summary: v.summary, description: v.description, tags: v.tags, audience: v.audience,
    cover_image_path: v.coverImagePath, document_path: v.documentPath, document_filename: v.documentFilename,
    document_mime: v.documentMime, document_size: v.documentSize ?? null, external_url: v.externalUrl,
    source_name: v.sourceName, source_organization: v.sourceOrganization, source_url: v.sourceUrl,
    author: v.author, license: v.license, attribution: v.attribution, publication_consent: v.publicationConsent,
    seo_title: v.seoTitle, meta_description: v.metaDescription, updated_by: userId,
  };
}

export async function saveResource(v: ResourceSaveValues, userId: string): Promise<{ id: string; slug: string } | { error: string }> {
  const row = resourceRow(v, userId);
  if (v.id) {
    const { data, error } = await db().from("resources").update(row).eq("id", v.id).select("id,slug").maybeSingle();
    if (error || !data) return { error: error?.code === "23505" ? "A resource with this slug already exists." : "The resource could not be saved." };
    await audit("resource.updated", userId, "resource", data.id, { slug: data.slug });
    return { id: data.id, slug: data.slug };
  }
  const { data, error } = await db().from("resources").insert({ ...row, created_by: userId }).select("id,slug").maybeSingle();
  if (error || !data) return { error: error?.code === "23505" ? "A resource with this slug already exists." : "The resource could not be created." };
  await audit("resource.created", userId, "resource", data.id, { slug: data.slug });
  return { id: data.id, slug: data.slug };
}

export async function setResourceStatus(id: string, action: Action, userId: string): Promise<{ ok: true; wasFirst: boolean; slug: string } | { error: string }> {
  if (action === "delete") {
    const { data: existing } = await db().from("resources").select("slug").eq("id", id).neq("publication_status", "published").maybeSingle();
    if (!existing) return { error: "Only non-published resources can be deleted." };
    const { error } = await db().from("resources").delete().eq("id", id).neq("publication_status", "published");
    if (error) return { error: "Only non-published resources can be deleted." };
    await audit("resource.deleted", userId, "resource", id, {});
    return { ok: true, wasFirst: false, slug: existing.slug };
  }
  const { data: resource } = await db().from("resources").select("slug,title,summary,description,resource_type,document_path,document_mime,document_size,external_url,publication_consent,attribution,author,source_organization").eq("id", id).maybeSingle();
  if (!resource) return { error: "Resource not found." };
  if (action === "publish") {
    const issues: string[] = [];
    if (String(resource.title ?? "").trim().length < 3 || String(resource.summary ?? "").trim().length < 5 || String(resource.description ?? "").trim().length < 20) issues.push("Add a title, short summary and detailed description.");
    if (!resource.publication_consent) issues.push("Confirm that CSC Circle has permission to publish this resource.");
    if (![resource.attribution, resource.author, resource.source_organization].some((value) => typeof value === "string" && value.trim())) issues.push("Add the resource author, source organization or attribution.");
    const needsUrl = resource.resource_type === "link" || resource.resource_type === "video";
    if (needsUrl ? !/^https?:\/\//i.test(String(resource.external_url ?? "")) : !(resource.document_path && resource.document_mime === "application/pdf" && Number(resource.document_size) > 0)) {
      issues.push(needsUrl ? "Add a valid HTTP or HTTPS resource URL." : "Upload a valid PDF document before publishing.");
    }
    if (issues.length) return { error: issues.join(" ") };
    if (resource.cover_image_path && !(await validPrivateCmsImage(resource.cover_image_path))) return { error: "The uploaded cover image is unavailable. Upload it again before publishing." };
    if (resource.document_path && String(resource.document_path).startsWith("resource-docs/")) {
      const { data: file, error: fileError } = await createAdminClient().storage.from("member-portraits").download(String(resource.document_path));
      if (fileError || !file) return { error: "The uploaded document is no longer available. Upload it again before publishing." };
      const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (new TextDecoder().decode(header) !== "%PDF-") return { error: "The uploaded document is not a valid PDF." };
    }
  }
  const patch =
    action === "publish" ? { publication_status: "published", published_at: new Date().toISOString(), archived_at: null, updated_by: userId }
    : action === "unpublish" ? { publication_status: "draft", published_at: null, updated_by: userId }
    : { publication_status: "archived", archived_at: new Date().toISOString(), updated_by: userId };
  let wasFirst = false;
  if (action === "publish") {
    const { count } = await db().from("resources").select("id", { count: "exact", head: true }).eq("publication_status", "published");
    wasFirst = (count ?? 0) === 0;
  }
  const { data, error } = await db().from("resources").update(patch).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: "The resource status could not be updated." };
  await audit(`resource.${action}`, userId, "resource", id, {});
  return { ok: true, wasFirst, slug: String(resource.slug) };
}

/* ------------------------------ Opportunities ------------------------------ */

function opportunityRow(v: OpportunitySaveValues, userId: string) {
  return {
    slug: v.slug, title: v.title, category: v.category, summary: v.summary, description: v.description,
    organization: v.organization, audience: v.audience, eligibility: v.eligibility, skills: v.skills,
    location: v.location, participation_mode: v.participationMode, starts_on: v.startsOn, deadline: v.deadline,
    ends_on: v.endsOn, application_url: v.applicationUrl, application_instructions: v.applicationInstructions,
    contact: v.contact, banner_path: v.bannerPath, org_logo_path: v.orgLogoPath, source: v.source,
    organization_verified: v.organizationVerified, publication_consent: v.publicationConsent,
    seo_title: v.seoTitle, meta_description: v.metaDescription, updated_by: userId,
  };
}

export async function saveOpportunity(v: OpportunitySaveValues, userId: string): Promise<{ id: string; slug: string } | { error: string }> {
  const row = opportunityRow(v, userId);
  if (v.id) {
    const { data, error } = await db().from("opportunities").update(row).eq("id", v.id).select("id,slug").maybeSingle();
    if (error || !data) return { error: error?.code === "23505" ? "An opportunity with this slug already exists." : "The opportunity could not be saved." };
    await audit("opportunity.updated", userId, "opportunity", data.id, { slug: data.slug });
    return { id: data.id, slug: data.slug };
  }
  const { data, error } = await db().from("opportunities").insert({ ...row, created_by: userId }).select("id,slug").maybeSingle();
  if (error || !data) return { error: error?.code === "23505" ? "An opportunity with this slug already exists." : "The opportunity could not be created." };
  await audit("opportunity.created", userId, "opportunity", data.id, { slug: data.slug });
  return { id: data.id, slug: data.slug };
}

export async function setOpportunityStatus(id: string, action: Action, userId: string): Promise<{ ok: true; wasFirst: boolean; slug: string } | { error: string }> {
  if (action === "delete") {
    const { data: existing } = await db().from("opportunities").select("slug").eq("id", id).neq("publication_status", "published").maybeSingle();
    if (!existing) return { error: "Only non-published opportunities can be deleted." };
    const { error } = await db().from("opportunities").delete().eq("id", id).neq("publication_status", "published");
    if (error) return { error: "Only non-published opportunities can be deleted." };
    await audit("opportunity.deleted", userId, "opportunity", id, {});
    return { ok: true, wasFirst: false, slug: existing.slug };
  }
  const { data: opportunity } = await db().from("opportunities").select("slug,title,summary,description,organization,source,organization_verified,publication_consent,application_url,application_instructions,contact,deadline,starts_on,ends_on,banner_path,org_logo_path").eq("id", id).maybeSingle();
  if (!opportunity) return { error: "Opportunity not found." };
  if (action === "publish") {
    const issues: string[] = [];
    if (String(opportunity.title ?? "").trim().length < 3 || String(opportunity.summary ?? "").trim().length < 5 || String(opportunity.description ?? "").trim().length < 20) issues.push("Add a title, short summary and detailed description.");
    if (!String(opportunity.organization ?? "").trim() || !String(opportunity.source ?? "").trim()) issues.push("Add the organization and its verified source.");
    if (!opportunity.organization_verified) issues.push("Confirm that the organization and opportunity have been verified.");
    if (!opportunity.publication_consent) issues.push("Confirm permission to publish this opportunity.");
    if (!opportunity.application_url && !opportunity.application_instructions && !opportunity.contact) issues.push("Add an application link, instructions or authorized contact.");
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    if (opportunity.deadline && String(opportunity.deadline) < today) issues.push("This opportunity has expired and cannot be published as active.");
    if (opportunity.starts_on && opportunity.ends_on && String(opportunity.ends_on) < String(opportunity.starts_on)) issues.push("The end date cannot be earlier than the start date.");
    if (issues.length) return { error: issues.join(" ") };
    const mediaPaths = [opportunity.banner_path, opportunity.org_logo_path].filter(Boolean);
    if (mediaPaths.length && !(await Promise.all(mediaPaths.map(validPrivateCmsImage))).every(Boolean)) return { error: "One or more uploaded images are unavailable. Upload them again before publishing." };
  }
  const patch =
    action === "publish" ? { publication_status: "published", published_at: new Date().toISOString(), archived_at: null, updated_by: userId }
    : action === "unpublish" ? { publication_status: "draft", published_at: null, updated_by: userId }
    : { publication_status: "archived", archived_at: new Date().toISOString(), updated_by: userId };
  let wasFirst = false;
  if (action === "publish") {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const { count } = await db().from("opportunities").select("id", { count: "exact", head: true }).eq("publication_status", "published").or(`deadline.is.null,deadline.gte.${today}`);
    wasFirst = (count ?? 0) === 0;
  }
  const { data, error } = await db().from("opportunities").update(patch).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: "The opportunity status could not be updated." };
  await audit(`opportunity.${action}`, userId, "opportunity", id, {});
  return { ok: true, wasFirst, slug: String(opportunity.slug) };
}

/* ------------------------------- Admin reads ------------------------------- */

const s = (v: unknown) => (typeof v === "string" && v.length ? v : null);

export async function listResourcesAdmin(): Promise<ResourceRecord[]> {
  const { data } = await db().from("resources").select("*").order("updated_at", { ascending: false }).limit(200);
  return ((data as Row[]) ?? []).map(mapResourceAdmin);
}
export async function getResourceAdmin(id: string): Promise<ResourceRecord | null> {
  const { data } = await db().from("resources").select("*").eq("id", id).maybeSingle();
  return data ? mapResourceAdmin(data as Row) : null;
}
export async function listOpportunitiesAdmin(): Promise<OpportunityRecord[]> {
  const { data } = await db().from("opportunities").select("*").order("updated_at", { ascending: false }).limit(200);
  return ((data as Row[]) ?? []).map(mapOpportunityAdmin);
}
export async function getOpportunityAdmin(id: string): Promise<OpportunityRecord | null> {
  const { data } = await db().from("opportunities").select("*").eq("id", id).maybeSingle();
  return data ? mapOpportunityAdmin(data as Row) : null;
}

function updateRow(v: CommunityUpdateSaveValues, userId: string) {
  return {
    slug: v.slug, title: v.title, category: v.category, summary: v.summary, body: v.body,
    featured: v.featured, cover_image_path: v.coverImagePath, cover_image_alt: v.coverImageAlt, gallery: v.gallery,
    author: v.author, source: v.source, publication_consent: v.publicationConsent,
    related_event_id: v.relatedEventId, related_collaboration_id: v.relatedCollaborationId,
    seo_title: v.seoTitle, meta_description: v.metaDescription, updated_by: userId,
  };
}

export async function saveCommunityUpdate(v: CommunityUpdateSaveValues, userId: string): Promise<{ id: string; slug: string } | { error: string }> {
  const media = [v.coverImagePath, ...v.gallery.map((image) => image.path)].filter(Boolean);
  if (media.length && !(await Promise.all(media.map(validPrivateCmsImage))).every(Boolean)) {
    return { error: "One or more uploaded images are unavailable. Upload them again before saving." };
  }
  const row = updateRow(v, userId);
  if (v.id) {
    const { data, error } = await db().from("community_updates").update(row).eq("id", v.id).select("id,slug").maybeSingle();
    if (error || !data) return { error: error?.code === "23505" ? "An update with this slug already exists." : "The update could not be saved." };
    await audit("community_update.updated", userId, "community_update", data.id, { slug: data.slug });
    return { id: data.id, slug: data.slug };
  }
  const { data, error } = await db().from("community_updates").insert({ ...row, created_by: userId }).select("id,slug").maybeSingle();
  if (error || !data) return { error: error?.code === "23505" ? "An update with this slug already exists." : "The update could not be created." };
  await audit("community_update.created", userId, "community_update", data.id, { slug: data.slug });
  return { id: data.id, slug: data.slug };
}

export async function setCommunityUpdateStatus(id: string, action: Action, userId: string): Promise<{ ok: true; wasFirst: boolean; slug: string } | { error: string }> {
  if (action === "delete") {
    const { data: existing } = await db().from("community_updates").select("slug").eq("id", id).neq("publication_status", "published").maybeSingle();
    if (!existing) return { error: "Only unpublished updates can be deleted." };
    const { error } = await db().from("community_updates").delete().eq("id", id).neq("publication_status", "published");
    if (error) return { error: "The unpublished update could not be deleted." };
    await audit("community_update.deleted", userId, "community_update", id, {});
    return { ok: true, wasFirst: false, slug: existing.slug };
  }
    const { data: update } = await db().from("community_updates").select("slug,title,summary,body,publication_consent,cover_image_path,gallery").eq("id", id).maybeSingle();
  if (!update) return { error: "Update not found." };
  if (action === "publish") {
    if (String(update.title ?? "").trim().length < 3 || String(update.summary ?? "").trim().length < 5 || String(update.body ?? "").trim().length < 20) return { error: "Add a title, short summary and article before publishing." };
    if (!update.publication_consent) return { error: "Confirm publication permission before publishing." };
    const gallery = Array.isArray(update.gallery) ? update.gallery as UpdateGalleryImage[] : [];
    const media = [update.cover_image_path, ...gallery.map((image) => image.path)].filter(Boolean);
    if (media.length && !(await Promise.all(media.map(validPrivateCmsImage))).every(Boolean)) return { error: "One or more uploaded images are unavailable. Upload them again before publishing." };
  }
  const patch = action === "publish"
    ? { publication_status: "published", published_at: new Date().toISOString(), archived_at: null, updated_by: userId }
    : action === "unpublish"
      ? { publication_status: "draft", published_at: null, updated_by: userId }
      : { publication_status: "archived", archived_at: new Date().toISOString(), updated_by: userId };
  let wasFirst = false;
  if (action === "publish") {
    const { count } = await db().from("community_updates").select("id", { count: "exact", head: true }).eq("publication_status", "published");
    wasFirst = (count ?? 0) === 0;
  }
  const { data, error } = await db().from("community_updates").update(patch).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: "The update status could not be changed." };
  await audit(`community_update.${action}`, userId, "community_update", id, {});
  return { ok: true, wasFirst, slug: String(update.slug) };
}

export async function listCommunityUpdatesAdmin(): Promise<CommunityUpdateRecord[]> {
  const { data } = await db().from("community_updates").select("*").order("updated_at", { ascending: false }).limit(200);
  return ((data as Row[]) ?? []).map(mapCommunityUpdateAdmin);
}

export async function getCommunityUpdateAdmin(id: string): Promise<CommunityUpdateRecord | null> {
  const { data } = await db().from("community_updates").select("*").eq("id", id).maybeSingle();
  return data ? mapCommunityUpdateAdmin(data as Row) : null;
}

function mapCommunityUpdateAdmin(r: Row): CommunityUpdateRecord {
  const gallery = Array.isArray(r.gallery) ? r.gallery.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : [];
  return {
    id: String(r.id), slug: String(r.slug), title: String(r.title ?? ""), category: String(r.category ?? "Community News"),
    summary: String(r.summary ?? ""), body: String(r.body ?? ""), featured: r.featured === true,
    coverImagePath: s(r.cover_image_path), coverImageAlt: s(r.cover_image_alt),
    gallery: gallery.filter((item) => typeof item.path === "string" && typeof item.alt === "string").map((item) => ({
      path: String(item.path), alt: String(item.alt), caption: s(item.caption), attribution: s(item.attribution),
    })),
    author: s(r.author), source: s(r.source), publicationConsent: Boolean(r.publication_consent),
    relatedEventId: s(r.related_event_id), relatedCollaborationId: s(r.related_collaboration_id),
    seoTitle: s(r.seo_title), metaDescription: s(r.meta_description),
    status: (s(r.publication_status) as CommunityUpdateRecord["status"]) ?? "draft",
    completedAt: s(r.completed_at),
    publishedAt: s(r.published_at), updatedAt: s(r.updated_at),
  };
}

function mapResourceAdmin(r: Row): ResourceRecord {
  return {
    id: String(r.id), slug: String(r.slug), title: String(r.title ?? ""), category: String(r.category ?? ""),
    resourceType: (s(r.resource_type) as ResourceRecord["resourceType"]) ?? "document", summary: s(r.summary), description: s(r.description),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [], audience: s(r.audience), coverImagePath: s(r.cover_image_path),
    documentPath: s(r.document_path), documentFilename: s(r.document_filename), documentMime: s(r.document_mime),
    documentSize: typeof r.document_size === "number" ? r.document_size : null, externalUrl: s(r.external_url),
    sourceName: s(r.source_name), sourceOrganization: s(r.source_organization), sourceUrl: s(r.source_url), author: s(r.author),
    license: s(r.license), attribution: s(r.attribution), publicationConsent: Boolean(r.publication_consent),
    seoTitle: s(r.seo_title), metaDescription: s(r.meta_description), status: (s(r.publication_status) as ResourceRecord["status"]) ?? "draft",
    publishedAt: s(r.published_at), updatedAt: s(r.updated_at),
  };
}
function mapOpportunityAdmin(r: Row): OpportunityRecord {
  return {
    id: String(r.id), slug: String(r.slug), title: String(r.title ?? ""), category: String(r.category ?? ""), summary: s(r.summary),
    description: s(r.description), organization: s(r.organization), audience: s(r.audience), eligibility: s(r.eligibility), skills: s(r.skills),
    location: s(r.location), participationMode: (s(r.participation_mode) as OpportunityRecord["participationMode"]) ?? null,
    startsOn: s(r.starts_on), deadline: s(r.deadline), endsOn: s(r.ends_on), applicationUrl: s(r.application_url),
    applicationInstructions: s(r.application_instructions), contact: s(r.contact), bannerPath: s(r.banner_path), orgLogoPath: s(r.org_logo_path),
    source: s(r.source), organizationVerified: Boolean(r.organization_verified), publicationConsent: Boolean(r.publication_consent),
    seoTitle: s(r.seo_title), metaDescription: s(r.meta_description), status: (s(r.publication_status) as OpportunityRecord["status"]) ?? "draft",
    publishedAt: s(r.published_at), updatedAt: s(r.updated_at),
  };
}
