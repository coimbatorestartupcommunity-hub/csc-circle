import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable } from "@/components/admin/data-table";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { GoogleFormImport } from "@/components/admin/google-form-import";

export const metadata = { title: "Paid event registrations" };

export default async function PaidEventRegistrationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const ctx = await requireAdminPagePermission("registrations.read");
  const client = createAdminClient();
  const [{ data: event }, { data: records, error }, { data: imported }] = await Promise.all([
    client.from("events").select("id,title").eq("id", eventId).maybeSingle(),
    client.from("paid_event_registrations").select("id,full_name,email,whatsapp,attendee_count,total_amount_paid,upi_transaction_ref,status,created_at").eq("event_id", eventId).order("created_at", { ascending: false }),
    client.from("event_registrations").select("id,reference,attendee_name,source_email,status,created_at").eq("event_id", eventId).eq("source", "google_form_import").order("created_at", { ascending: false }),
  ]);
  const { data: importMetadata } = imported?.length ? await client.from("event_registration_import_metadata").select("registration_id,metadata").in("registration_id", imported.map((row) => row.id)) : { data: [] };
  if (!event) return <p className="text-brand-muted">Event not found.</p>;
  const rows = (records ?? []).map((row) => ({
    id: row.id, name: row.full_name, contact: `${row.email} · ${row.whatsapp}`,
    attendees: row.attendee_count, amount: `₹${Number(row.total_amount_paid).toLocaleString("en-IN")}`,
    txnRef: row.upi_transaction_ref, status: row.status,
    proof: { href: `/api/admin/events/registrations/proof?registration=${row.id}`, label: "View proof" },
    createdAt: row.created_at,
  }));
  const metadataById = new Map((importMetadata ?? []).map((item) => [item.registration_id, item.metadata as Record<string, unknown>]));
  const importedRows = (imported ?? []).map((row) => {
    const info = metadataById.get(row.id) ?? {};
    const driveUrl = typeof info.paymentScreenshotDriveUrl === "string" && info.paymentScreenshotDriveUrl.startsWith("https://") ? info.paymentScreenshotDriveUrl : "";
    return { id: row.id, name: row.attendee_name ?? "Name unavailable", contact: row.source_email ?? "Email unavailable", attendees: Number(info.attendeeCount ?? 1), amount: typeof info.amountPaid === "number" ? `₹${info.amountPaid.toLocaleString("en-IN")}` : "—", txnRef: typeof info.transactionRef === "string" ? info.transactionRef : "—", proof: driveUrl ? { href: driveUrl, label: "Google Drive proof" } : "Not provided", status: row.status, createdAt: row.created_at };
  });
  return <div className="flex flex-col gap-5">
    <Link href={`/admin/events/${eventId}`} className="inline-flex min-h-9 w-fit items-center gap-2 text-sm text-brand-muted hover:text-brand-ink"><ArrowLeft className="size-4" />Back to event</Link>
    <AdminPageHeader title="Registrations" description={event.title} isDemo={ctx.mode === "preview"} action={<Link href={`/api/admin/events/registrations/export?event=${eventId}`} className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-medium text-brand-ink"><Download className="size-4" />Export CSV</Link>} />
    {can(ctx, "registrations.approve") ? <GoogleFormImport eventId={eventId} /> : null}
    {importedRows.length > 0 ? <section className="grid gap-3"><h2 className="text-lg font-semibold text-brand-ink">Google Form imports</h2><DataTable rows={importedRows} columns={[{ key: "name", header: "Name", sortable: true }, { key: "contact", header: "Contact" }, { key: "attendees", header: "Attendees" }, { key: "amount", header: "Amount paid" }, { key: "txnRef", header: "UPI transaction reference" }, { key: "proof", header: "Payment screenshot", type: "link" }, { key: "status", header: "Status", type: "badge" }, { key: "createdAt", header: "Form submitted", type: "date" }]} searchKeys={["name", "contact", "txnRef"]} actions={can(ctx, "registrations.approve") ? [{ operation: ctx.mode === "live" ? { kind: "imported_registration", decision: "confirmed" } : undefined, label: "Approve and issue pass", message: "Confirm the recorded payment. This issues a member-portal pass and queues the pass email.", visibleForStatuses: ["pending_review"] }, { operation: ctx.mode === "live" ? { kind: "resend_event_pass", decision: "resend" } : undefined, label: "Resend pass", message: "Queue another event pass email for this attendee.", visibleForStatuses: ["confirmed"] }] : undefined} /></section> : null}
    <DataTable rows={rows} columns={[{ key: "name", header: "Name", sortable: true }, { key: "contact", header: "Contact" }, { key: "attendees", header: "Attendees", sortable: true }, { key: "amount", header: "Amount" }, { key: "txnRef", header: "UPI transaction ref" }, { key: "proof", header: "Payment proof", type: "link" }, { key: "status", header: "Status", type: "badge" }, { key: "createdAt", header: "Submitted", type: "date" }]} searchKeys={["name", "contact", "txnRef"]} emptyMessage={error ? "Registrations could not be loaded." : "No paid registrations yet."} actions={can(ctx, "registrations.approve") ? [{ operation: ctx.mode === "live" ? { kind: "paid_registration", decision: "confirmed" } : undefined, label: "Approve", message: "Confirm this payment and registration.", visibleForStatuses: ["pending_verification"] }, { operation: ctx.mode === "live" ? { kind: "paid_registration", decision: "rejected" } : undefined, label: "Reject", variant: "destructive", message: "Reject this payment proof and include a note for the registrant.", visibleForStatuses: ["pending_verification"] }] : undefined} />
  </div>;
}
