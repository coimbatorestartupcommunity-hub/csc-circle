import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { CtaLink } from "@/components/common/cta-link";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { listResourcesAdmin } from "@/lib/admin/cms";

export const metadata = { title: "Resources" };
interface Row { id: string; title: string; category: string; resourceType: string; publicationStatus: string; updatedAt: string }

const columns: Column[] = [
  { key: "title", header: "Resource", sortable: true },
  { key: "category", header: "Category", type: "badge" },
  { key: "resourceType", header: "Type", type: "badge" },
  { key: "publicationStatus", header: "Publication", type: "statusPublication", sortable: true },
  { key: "updatedAt", header: "Updated", type: "date", sortable: true },
];
const facets: Facet[] = [{ key: "publicationStatus", label: "Publication", options: [{ label: "Published", value: "published" }, { label: "Draft", value: "draft" }, { label: "Archived", value: "archived" }] }];

export default async function AdminResourcesPage() {
  const ctx = await requireAdminPagePermission("content.manage");
  if (ctx.mode === "closed") return <AdminUnavailable />;
  if (ctx.mode === "forbidden" || !can(ctx, "content.manage")) return <AdminUnavailable forbidden />;

  let rows: Row[] = [];
  if (ctx.mode === "live") {
    const list = await listResourcesAdmin();
    rows = list.map((r) => ({ id: r.id, title: r.title, category: r.category, resourceType: r.resourceType, publicationStatus: r.status, updatedAt: r.updatedAt ?? "" }));
  }

  return (
    <>
      <AdminPageHeader
        title="Resources"
        description="Learning materials, guides and documents. Published resources appear on /resources automatically; when none are published the page shows Coming Soon."
        isDemo={ctx.mode === "preview"}
        action={<CtaLink href="/admin/resources/new" size="md">New resource</CtaLink>}
      />
      <DataTable rows={rows} columns={columns} facets={facets} searchKeys={["title", "category"]} rowHrefBase="/admin/resources" emptyMessage="No resources yet." />
    </>
  );
}
