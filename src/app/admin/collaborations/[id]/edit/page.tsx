import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { CollaborationEditor } from "@/components/admin/collaboration-editor";
import { can, getAdminContext } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit Collaboration" };

type Row = Record<string, unknown>;

export default async function EditCollaborationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getAdminContext();
  if (context.mode === "closed") return <AdminUnavailable />;
  if (context.mode === "forbidden" || !can(context, "content.manage")) return <AdminUnavailable forbidden />;
  if (context.mode !== "live") return <AdminUnavailable />;

  const supabase = await createClient();
  const [collabResult, orgResult, eventResult] = await Promise.all([
    supabase.from("collaborations").select("*, collaboration_partners(organization_id), collaboration_media(*)").eq("id", id).maybeSingle(),
    supabase.from("collaboration_organizations").select("id,name,slug,logo_path").eq("publication_status", "published").order("name"),
    supabase.from("events").select("id,title,starts_at").eq("status", "published").order("starts_at", { ascending: false }).limit(100),
  ]);
  if (collabResult.error || orgResult.error || eventResult.error) return <AdminUnavailable />;
  if (!collabResult.data) notFound();
  const row = collabResult.data as unknown as Row;
  const partners = (row.collaboration_partners as { organization_id: string }[] | null) ?? [];
  const media = (row.collaboration_media as { media_path: string; alt_text: string | null; caption: string | null; display_order: number }[] | null) ?? [];
  const eventDate = row.event_date as string | null;
  const eventDateParts = eventDate ? new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(eventDate)).reduce<Record<string, string>>((parts, part) => {
    if (part.type !== "literal") parts[part.type] = part.value;
    return parts;
  }, {}) : null;
  const initial = {
    id,
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    tagline: String(row.tagline ?? ""),
    summary: String(row.summary ?? ""),
    story: String(row.story ?? ""),
    category: String(row.category ?? "Community Collaboration"),
    status: String(row.status ?? "completed") as "upcoming" | "ongoing" | "completed" | "cancelled",
    publicationStatus: String(row.publication_status ?? "draft") as "draft" | "pending" | "published" | "archived",
    featuredImagePath: String(row.featured_image_path ?? ""),
    partnerIds: partners.map((partner) => partner.organization_id),
    eventId: String(row.event_id ?? ""),
    eventDate: eventDateParts ? `${eventDateParts.year}-${eventDateParts.month}-${eventDateParts.day}T${eventDateParts.hour}:${eventDateParts.minute}` : "",
    venueName: String(row.venue_name ?? ""),
    venueAddress: String(row.venue_address ?? ""),
    seoTitle: String(row.seo_title ?? ""),
    metaDescription: String(row.meta_description ?? ""),
    highlights: (row.highlights as { icon: string; title: string; body: string }[] | null) ?? [],
    media: media.sort((a, b) => a.display_order - b.display_order).map((item) => ({
      media_path: item.media_path,
      alt_text: item.alt_text ?? "",
      caption: item.caption ?? "",
      display_order: item.display_order,
    })),
  };

  return <>
    <AdminPageHeader title={`Edit ${initial.title}`} description="Changes persist to the CSC database and update the published collaboration after cache revalidation." />
    <CollaborationEditor
      initial={initial}
      organizations={(orgResult.data ?? []).map((org) => ({ id: org.id, name: org.name, slug: org.slug, logoPath: org.logo_path }))}
      events={(eventResult.data ?? []).map((event) => ({ id: event.id, title: event.title, startsAt: event.starts_at }))}
      mode="live"
    />
  </>;
}
