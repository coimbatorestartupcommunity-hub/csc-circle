import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { CollaborationEditor } from "@/components/admin/collaboration-editor";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New Collaboration" };

export default async function NewCollaborationPage() {
  const context = await requireAdminPagePermission("content.manage");
  if (context.mode === "closed") return <AdminUnavailable />;
  if (context.mode === "forbidden" || !can(context, "content.manage")) return <AdminUnavailable forbidden />;

  let organizations: { id: string; name: string; slug: string; logoPath?: string | null; organizationType?: string; description?: string | null; websiteUrl?: string | null }[] = [];
  let events: { id: string; title: string; startsAt: string }[] = [];
  if (context.mode === "live") {
    const supabase = await createClient();
    const [orgs, eventRows] = await Promise.all([
      supabase.from("collaboration_organizations").select("id,name,slug,logo_path,organization_type,description,website_url").eq("publication_status", "published").order("name"),
      supabase.from("events").select("id,title,starts_at").eq("status", "published").order("starts_at", { ascending: false }).limit(100),
    ]);
    if (orgs.error || eventRows.error) return <AdminUnavailable />;
    organizations = (orgs.data ?? []).map((org) => ({ id: org.id, name: org.name, slug: org.slug, logoPath: org.logo_path, organizationType: org.organization_type, description: org.description, websiteUrl: org.website_url }));
    events = (eventRows.data ?? []).map((event) => ({ id: event.id, title: event.title, startsAt: event.starts_at }));
  }

  return <>
    <AdminPageHeader title="New collaboration" description="Create a reusable collaboration story. Save as draft until the details and media are approved." isDemo={context.mode === "preview"} />
    <CollaborationEditor organizations={organizations} events={events} mode={context.mode} />
  </>;
}
