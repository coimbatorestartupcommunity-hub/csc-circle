import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { AdminUnavailable } from "@/components/admin/admin-unavailable";
import { CtaLink } from "@/components/common/cta-link";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { listOpportunitiesAdmin } from "@/lib/admin/cms";

export const metadata = { title: "Opportunities" };
interface Row { id: string; title: string; organization: string; category: string; publicationStatus: string; deadline: string; updatedAt: string }

const columns: Column[] = [
  { key: "title", header: "Opportunity", sortable: true },
  { key: "organization", header: "Organization" },
  { key: "category", header: "Category", type: "badge" },
  { key: "publicationStatus", header: "Publication", type: "statusPublication", sortable: true },
  { key: "deadline", header: "Deadline", sortable: true },
  { key: "updatedAt", header: "Updated", type: "date", sortable: true },
];
const facets: Facet[] = [{ key: "publicationStatus", label: "Publication", options: [{ label: "Published", value: "published" }, { label: "Draft", value: "draft" }, { label: "Archived", value: "archived" }] }];

export default async function AdminOpportunitiesPage() {
  const ctx = await requireAdminPagePermission("content.manage");
  if (ctx.mode === "closed") return <AdminUnavailable />;
  if (ctx.mode === "forbidden" || !can(ctx, "content.manage")) return <AdminUnavailable forbidden />;

  let rows: Row[] = [];
  if (ctx.mode === "live") {
    const list = await listOpportunitiesAdmin();
    rows = list.map((o) => ({ id: o.id, title: o.title, organization: o.organization ?? "—", category: o.category, publicationStatus: o.status, deadline: o.deadline ?? "—", updatedAt: o.updatedAt ?? "" }));
  }

  return (
    <>
      <AdminPageHeader
        title="Opportunities"
        description="Verified startup opportunities. Published, non-expired opportunities appear on /opportunities automatically; when none are active the page shows Coming Soon."
        isDemo={ctx.mode === "preview"}
        action={<CtaLink href="/admin/opportunities/new" size="md">New opportunity</CtaLink>}
      />
      <DataTable rows={rows} columns={columns} facets={facets} searchKeys={["title", "organization", "category"]} rowHrefBase="/admin/opportunities" emptyMessage="No opportunities yet." />
    </>
  );
}
