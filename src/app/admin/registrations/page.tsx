import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet, type ActionDef } from "@/components/admin/data-table";
import { getAdminContext, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";

export const metadata = { title: "Registrations" };

const columns: Column[] = [
  { key: "reference", header: "Reference", type: "mono", sortable: true },
  { key: "eventTitle", header: "Event" },
  { key: "memberName", header: "Attendee" },
  { key: "createdAt", header: "Submitted", type: "date", sortable: true },
  { key: "payment", header: "Payment", type: "badge" },
  { key: "status", header: "Status", type: "statusRegistration", sortable: true },
  { key: "attendance", header: "Attendance", type: "badge" },
];

const facets: Facet[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Pending review", value: "pending_review" },
      { label: "Pending payment", value: "pending_payment" },
      { label: "Confirmed", value: "confirmed" },
      { label: "Waitlisted", value: "waitlisted" },
      { label: "Cancelled", value: "cancelled" },
      { label: "Checked in", value: "checked_in" },
    ],
  },
];

export default async function AdminRegistrationsPage() {
  const ctx = await getAdminContext();
  const res = await adminServices.listRegistrations();
  const rows = res.ok ? res.data : [];

  const actions: ActionDef[] | undefined = can(ctx, "registrations.approve")
    ? [
        { label: "Approve", message: "Approval checks capacity + paid-event payment verification atomically (Phase 1). Paid events cannot be confirmed before verified payment." },
        { label: "Waitlist" },
        { label: "Cancel", variant: "destructive", confirm: "Cancel this registration?" },
      ]
    : undefined;

  return (
    <>
      <AdminPageHeader
        title="Registration management"
        description="Approve, waitlist and manage event RSVPs. Capacity and payment rules are enforced by the backend."
        isDemo={ctx.mode === "preview"}
      />
      <DataTable
        rows={rows}
        columns={columns}
        facets={facets}
        searchKeys={["reference", "eventTitle", "memberName"]}
        rowHrefBase="/admin/registrations"
        actions={actions}
        emptyMessage={res.ok ? "No registrations." : res.error.message}
      />
    </>
  );
}
