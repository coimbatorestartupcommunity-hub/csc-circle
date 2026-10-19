import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet } from "@/components/admin/data-table";
import { getAdminContext } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Startups" };

const columns: Column[] = [
  { key: "name", header: "Startup", sortable: true },
  { key: "founder", header: "Founder" },
  { key: "industry", header: "Industry", type: "badge" },
  { key: "collaboration", header: "Collaboration", type: "list" },
  { key: "status", header: "Status", type: "statusPublication", sortable: true },
  { key: "updatedAt", header: "Updated", type: "date", sortable: true },
];

const facets: Facet[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "Published", value: "published" },
      { label: "Pending", value: "pending" },
      { label: "Draft", value: "draft" },
      { label: "Archived", value: "archived" },
    ],
  },
];

export default async function AdminStartupsPage() {
  const ctx = await getAdminContext();
  const res = await adminServices.listStartups();
  const rows = res.ok ? res.data : [];

  return (
    <>
      <AdminPageHeader
        title="Startup directory management"
        description="Review, approve and manage directory submissions."
        isDemo={ctx.mode === "preview"}
      />
      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["name", "founder", "industry"]}
        rowHrefBase="/admin/startups"
        emptyMessage={res.ok ? "No startups submitted." : res.error.message}
      />
    </>
  );
}
