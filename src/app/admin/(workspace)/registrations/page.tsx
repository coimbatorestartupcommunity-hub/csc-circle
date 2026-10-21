import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet, type ActionDef } from "@/components/admin/data-table";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
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
  const ctx = await requireAdminPagePermission("registrations.read");
  const res = await adminServices.listRegistrations();
  const rows = res.ok ? res.data : [];
  const enquiries = await adminServices.listEnquiries();

  const actions: ActionDef[] | undefined = can(ctx, "registrations.approve")
    ? [
        { operation: ctx.mode === "live" ? { kind: "registration", decision: "confirmed" } : undefined, label: "Approve", message: "Approval checks capacity and any paid-event verification atomically. Free events and membership cards do not require payment.", visibleForStatuses: ["pending", "pending_review", "waitlisted"] },
        { operation: ctx.mode === "live" ? { kind: "registration", decision: "waitlisted" } : undefined, label: "Waitlist", visibleForStatuses: ["pending", "pending_review"] },
        { operation: ctx.mode === "live" ? { kind: "registration", decision: "cancelled" } : undefined, label: "Cancel", variant: "destructive", confirm: "Cancel this registration?", visibleForStatuses: ["pending", "pending_review", "pending_payment", "payment_verification", "confirmed", "waitlisted"] },
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
      <h2 className="mt-10 mb-3 text-xl font-semibold">Visitor RSVP enquiries</h2>
      <p className="mb-4 text-sm text-brand-secondary">Visitor enquiries await identity verification. They do not issue an official event pass. Members register through their signed-in account.</p>
      <DataTable rows={enquiries.ok ? enquiries.data : []} columns={[
        { key: "fullName", header: "Applicant" }, { key: "email", header: "Email" }, { key: "whatsapp", header: "WhatsApp" }, { key: "startup", header: "Startup" }, { key: "event", header: "Event" }, { key: "goal", header: "Objective" }, { key: "status", header: "Status" }, { key: "createdAt", header: "Submitted", type: "date" }
      ]} searchKeys={["fullName", "email", "event"]} emptyMessage={enquiries.ok ? "No visitor enquiries." : enquiries.error.message} />
    </>
  );
}
