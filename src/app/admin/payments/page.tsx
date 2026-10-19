import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet, type ActionDef } from "@/components/admin/data-table";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Payments" };

const columns: Column[] = [
  { key: "reference", header: "Payment ref", type: "mono" },
  { key: "registrationReference", header: "Registration", type: "mono" },
  { key: "attendee", header: "Attendee" },
  { key: "event", header: "Event" },
  { key: "amount", header: "Amount", sortable: true },
  { key: "currency", header: "Currency" },
  { key: "method", header: "Method" },
  { key: "status", header: "Status", type: "statusPayment", sortable: true },
];

const facets: Facet[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "Awaiting payment", value: "awaiting_payment" },
      { label: "Pending verification", value: "pending_verification" },
      { label: "Verified", value: "verified" },
      { label: "Failed", value: "failed" },
      { label: "Refunded", value: "refunded" },
    ],
  },
];

export default async function AdminPaymentsPage() {
  const ctx = await getAdminContext();
  const res = await adminServices.listPayments();
  const rows = res.ok ? res.data : [];

  const actions: ActionDef[] | undefined = can(ctx, "payments.verify")
    ? [
        { label: "Verify", message: "Independent manual verification against securely-stored payment evidence (Phase 1). A screenshot alone is never settlement." },
        { label: "Reject", variant: "destructive", confirm: "Reject this payment?" },
      ]
    : undefined;

  return (
    <>
      <AdminPageHeader
        title="Payment review"
        description="Review paid-event registrations. Manual verification workflow; no gateway is connected without approval."
        isDemo={ctx.mode === "preview"}
      />
      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["reference", "registrationReference", "attendee", "event"]}
        actions={actions}
        emptyMessage={res.ok ? "No payments to review." : res.error.message}
      />
    </>
  );
}
