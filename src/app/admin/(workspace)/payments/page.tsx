import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTable, type Column, type Facet, type ActionDef } from "@/components/admin/data-table";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { ShieldCheck, Mail, RefreshCw, Smartphone } from "lucide-react";

export const metadata = { title: "Payments & UPI Reconciliation" };

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
  const ctx = await requireAdminPagePermission("payments.verify");
  const [res, workerRes] = await Promise.all([
    adminServices.listPayments(),
    adminServices.getPaymentWorkerStatus(),
  ]);

  const rows = res.ok ? res.data : [];
  const worker = workerRes.ok ? workerRes.data : { status: "idle", lastSyncMessageCount: 0, lastSyncMatchedCount: 0 };

  const actions: ActionDef[] | undefined = can(ctx, "payments.verify")
    ? [
        {
          operation: ctx.mode === "live" ? { kind: "payment", decision: "verified" } : undefined,
          label: "Verify",
          message: "Independently verify this event payment against the settlement reference.",
          visibleForStatuses: ["pending_verification"],
        },
        {
          operation: ctx.mode === "live" ? { kind: "payment", decision: "rejected" } : undefined,
          label: "Reject",
          variant: "destructive",
          confirm: "Reject this event payment?",
          visibleForStatuses: ["pending_verification"],
        },
      ]
    : undefined;

  return (
    <>
      <AdminPageHeader
        title="Payment & UPI Reconciliation"
        description="Monitor automated Axis Bank UPI settlements and review pending event payments."
        isDemo={ctx.mode === "preview"}
      />

      {/* Operational Overview Bar */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Mail className="size-4 text-teal-600" />
            <span>Bank-Alert Mailbox</span>
          </div>
          <p className="mt-2 font-semibold text-slate-900 text-sm">vikash752008@icloud.com</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sender: alerts@axis.bank.in</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Smartphone className="size-4 text-teal-600" />
            <span>Receiving Account</span>
          </div>
          <p className="mt-2 font-semibold text-slate-900 text-sm">Axis Bank · XX1995</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Payee: S VIKASH (9342877474@ptyes)</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <RefreshCw className="size-4 text-teal-600" />
            <span>Reconciliation Engine</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-block size-2 rounded-full ${
                worker.status === "running"
                  ? "bg-amber-500 animate-pulse"
                  : worker.status === "error"
                  ? "bg-rose-500"
                  : "bg-emerald-500"
              }`}
            />
            <p className="font-semibold text-slate-900 text-sm capitalize">{worker.status || "Idle"}</p>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {worker.lastSyncCompletedAt
              ? `Last sync: ${new Date(worker.lastSyncCompletedAt).toLocaleTimeString("en-IN")}`
              : "Awaiting scheduler"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <ShieldCheck className="size-4 text-teal-600" />
            <span>Recent Sync Metrics</span>
          </div>
          <p className="mt-2 font-semibold text-slate-900 text-sm">
            {worker.lastSyncMatchedCount} matched / {worker.lastSyncMessageCount} alerts
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Automated fulfillment active</p>
        </div>
      </div>

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
