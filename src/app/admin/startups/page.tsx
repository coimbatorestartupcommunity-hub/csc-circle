import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type ActionDef, type Column, type Facet } from "@/components/admin/data-table";
import { can, getAdminContext } from "@/lib/admin/gate";
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
  const actions: ActionDef[] | undefined = can(ctx, "directory.manage")
    ? [
        { label: "Approve & publish", operation: ctx.mode === "live" ? { kind: "startup", decision: "published" } : undefined, message: "Review the founder-submitted information before publishing this startup.", visibleForStatuses: ["pending", "draft"] },
        { label: "Cancel submission", operation: ctx.mode === "live" ? { kind: "startup", decision: "archived" } : undefined, variant: "destructive", confirm: "Cancel this startup submission and keep it out of the public directory?", visibleForStatuses: ["pending", "draft"] },
        { label: "Unpublish", operation: ctx.mode === "live" ? { kind: "startup", decision: "archived" } : undefined, variant: "destructive", confirm: "Unpublish this startup from the public directory?", visibleForStatuses: ["published"] },
        { label: "Return to review", operation: ctx.mode === "live" ? { kind: "startup", decision: "pending" } : undefined, confirm: "Return this archived startup to the pending review queue?", visibleForStatuses: ["archived"] },
      ]
    : undefined;

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
        actions={actions}
        emptyMessage={res.ok ? "No startups submitted." : res.error.message}
      />
    </>
  );
}
