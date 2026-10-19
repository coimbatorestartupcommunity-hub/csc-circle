import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type ActionDef } from "@/components/admin/data-table";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Content" };

const columns: Column[] = [
  { key: "label", header: "Content", sortable: true },
  { key: "key", header: "Key", type: "mono" },
  { key: "value", header: "Value" },
  { key: "status", header: "Status", type: "statusPublication", sortable: true },
  { key: "updatedAt", header: "Updated", type: "date", sortable: true },
];

export default async function AdminContentPage() {
  const ctx = await getAdminContext();
  const res = await adminServices.listContent();
  const rows = res.ok ? res.data.map((c) => ({ ...c, id: c.key })) : [];

  const actions: ActionDef[] | undefined = can(ctx, "content.manage")
    ? [
        { label: "Edit", message: "Structured fields only (no raw HTML). Preview-before-publish + audit in Phase 1." },
        { label: "Publish" },
      ]
    : undefined;

  return (
    <>
      <AdminPageHeader
        title="Website content management"
        description="Edit approved public content with a save/publish workflow. Structured fields only — no unsafe markup."
        isDemo={ctx.mode === "preview"}
      />
      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={["label", "key"]}
        actions={actions}
        emptyMessage={res.ok ? "No content blocks." : res.error.message}
      />
    </>
  );
}
