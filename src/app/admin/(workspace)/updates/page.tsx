import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { CtaLink } from "@/components/common/cta-link";
import { can, requireAdminPagePermission } from "@/lib/admin/gate";
import { listCommunityUpdatesAdmin } from "@/lib/admin/cms";

export const metadata = { title: "Updates & Highlights" };
type Row = { id: string; title: string; category: string; publicationStatus: string; featured: string; publishedAt: string; updatedAt: string };
const columns: Column[] = [
  { key: "title", header: "Update", sortable: true }, { key: "category", header: "Category", type: "badge" },
  { key: "publicationStatus", header: "Status", type: "statusPublication", sortable: true },
  { key: "featured", header: "Featured", type: "badge" }, { key: "publishedAt", header: "Published", type: "date", sortable: true },
  { key: "updatedAt", header: "Updated", type: "date", sortable: true },
];
const facets: Facet[] = [{ key: "publicationStatus", label: "Status", options: [{ label: "Published", value: "published" }, { label: "Draft", value: "draft" }, { label: "Archived", value: "archived" }] }];

export default async function AdminUpdatesPage() {
  const context = await requireAdminPagePermission("content.manage");
  if (context.mode === "closed") return <AdminUnavailable />;
  if (context.mode === "forbidden" || !can(context, "content.manage")) return <AdminUnavailable forbidden />;
  const updates = context.mode === "live" ? await listCommunityUpdatesAdmin() : [];
  const rows: Row[] = updates.map((update) => ({ id: update.id, title: update.title, category: update.category, publicationStatus: update.status, featured: update.featured ? "Yes" : "No", publishedAt: update.publishedAt ?? "", updatedAt: update.updatedAt ?? "" }));
  return <><AdminPageHeader title="Updates & Highlights" description="Prepare approved CSC stories, event highlights and announcements. Drafts remain private until published." isDemo={context.mode === "preview"} action={<CtaLink href="/admin/updates/new" size="md">New update</CtaLink>} /><DataTable rows={rows} columns={columns} facets={facets} searchKeys={["title", "category"]} rowHrefBase="/admin/updates" emptyMessage="No updates yet." /></>;
}
