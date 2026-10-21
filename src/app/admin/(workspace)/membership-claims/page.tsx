import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type ActionDef } from "@/components/admin/data-table";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Membership claims" };

const columns: Column[] = [
  { key: "applicantName", header: "Applicant", sortable: true },
  { key: "email", header: "Account email" },
  { key: "whatsapp", header: "WhatsApp" },
  { key: "reference", header: "Reference", type: "mono" },
  { key: "applicantType", header: "Type", type: "badge" },
  { key: "designation", header: "Designation" },
  { key: "startup", header: "Startup" },
  { key: "submittedAt", header: "Submitted", type: "date", sortable: true },
  { key: "status", header: "Status", type: "statusMembership", sortable: true },
  { key: "reviewer", header: "Reviewer" },
];

export default async function ClaimsPage() {
  const ctx = await requireAdminPagePermission("members.approve");
  const res = await adminServices.listClaims();
  const rows = res.ok ? res.data : [];

  const actions: ActionDef[] | undefined = can(ctx, "members.approve")
    ? [
        { label: "Verify", operation: ctx.mode === "live" ? { kind: "claim", decision: "pending_verification" } : undefined, visibleForStatuses: ["claim_submitted"] },
        { operation: ctx.mode === "live" ? { kind: "claim", decision: "active" } : undefined, label: "Approve", message: "Membership cards are free. Review the applicant details and approve membership without requesting payment.", visibleForStatuses: ["claim_submitted", "pending_verification"] },
        { operation: ctx.mode === "live" ? { kind: "claim", decision: "rejected" } : undefined, label: "Reject", variant: "destructive", confirm: "Reject this membership claim?", visibleForStatuses: ["claim_submitted", "pending_verification"] },
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
