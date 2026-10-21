import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column } from "@/components/admin/data-table";
import { requireAdminPagePermission } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Audit logs" };

const columns: Column[] = [
  { key: "action", header: "Action", type: "mono", sortable: true },
  { key: "actorRole", header: "Actor role", type: "badge" },
  { key: "targetType", header: "Target" },
  { key: "targetId", header: "Target ID", type: "mono" },
  { key: "createdAt", header: "When", type: "date", sortable: true },
];

export default async function AdminAuditLogsPage() {
  const ctx = await requireAdminPagePermission("audit.read");
  const res = await adminServices.listAudit();
  const rows = res.ok ? res.data : [];

  return (
    <>
      <AdminPageHeader
        title="Admin audit logs"
        description="Append-only record of privileged actions. Audit records cannot be altered; passwords, tokens and payment evidence are never logged."
        isDemo={ctx.mode === "preview"}
      />
      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={["action", "targetType", "targetId"]}
        emptyMessage={res.ok ? "No audit events." : res.error.message}
      />
    </>
  );
}
