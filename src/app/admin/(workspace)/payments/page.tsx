import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdminPagePermission, can } from "@/lib/admin/gate";
import { adminServices } from "@/lib/admin/services";
import { AdminPaymentsClient } from "@/components/admin/payments/admin-payments-client";
import { PaymentTestPanel } from "@/components/admin/payments/payment-test-panel";
import { ShieldCheck, Mail, RefreshCw, Smartphone } from "lucide-react";

export const metadata = { title: "Payments & UPI Reconciliation" };

export default async function AdminPaymentsPage() {
  const ctx = await requireAdminPagePermission("payments.verify");
  const [res, workerRes] = await Promise.all([
    adminServices.listPayments(),
    adminServices.getPaymentWorkerStatus(),
  ]);

  const rows = res.ok ? res.data : [];
  const worker = workerRes.ok
    ? workerRes.data
    : { status: "idle", lastSyncMessageCount: 0, lastSyncMatchedCount: 0 };

  const canVerify = can(ctx, "payments.verify") || can(ctx, "registrations.approve");

  return (
    <>
      <AdminPageHeader
        title="Payment & UPI Reconciliation"
        description="Review bank evidence, inspect cryptographic auth provenance, reconcile UPI payments, and monitor the payment worker."
        isDemo={ctx.mode === "preview"}
      />

      {/* Internal QA Payment Test & Automated Cleanup Panel */}
      <PaymentTestPanel />

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
            <p className="font-semibold text-slate-900 text-sm capitalize">
              {worker.status || "Idle"}
            </p>
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
          <p className="text-[11px] text-slate-400 mt-0.5">
            {process.env.CSC_PAYMENT_AUTO_CONFIRM === "true"
              ? "Automatic confirmation enabled"
              : "Manual confirmation required"}
          </p>
        </div>
      </div>

      {/* Enriched Payment Table Client Component with Audit Timeline & Manual Reconciliation */}
      <AdminPaymentsClient initialRows={rows} canVerify={canVerify} />
    </>
  );
}
