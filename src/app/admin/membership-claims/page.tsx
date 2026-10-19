import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type ActionDef } from "@/components/admin/data-table";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Membership claims" };

const columns: Column[] = [
  { key: "applicantName", header: "Applicant", sortable: true },
  { key: "reference", header: "Reference", type: "mono" },
  { key: "applicantType", header: "Type", type: "badge" },
  { key: "startup", header: "Startup" },
  { key: "submittedAt", header: "Submitted", type: "date", sortable: true },
  { key: "status", header: "Status", type: "statusMembership", sortable: true },
  { key: "reviewer", header: "Reviewer" },
];

export default async function ClaimsPage() {
  const ctx = await getAdminContext();
  const res = await adminServices.listClaims();
  const rows = res.ok ? res.data : [];

  const actions: ActionDef[] | undefined = can(ctx, "members.approve")
    ? [
        { label: "Approve", message: "Transitions the claim toward Approved → Active via trusted issuance (Phase 1)." },
        { label: "Reject", variant: "destructive", confirm: "Reject this membership claim?" },
      ]
    : undefined;

  return (
    <>
      <AdminPageHeader
        title="Membership claim review"
        description="Review and decide on CSC membership applications."
        isDemo={ctx.mode === "preview"}
      />
      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={["applicantName", "reference", "startup"]}
        actions={actions}
        emptyMessage={res.ok ? "No claims to review." : res.error.message}
      />
    </>
  );
}
