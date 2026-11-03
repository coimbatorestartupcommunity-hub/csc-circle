"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Activity, Loader2, Play, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface ReconciliationHealthSnapshot {
  pendingOrders: number;
  processingOrders: number;
  reconciledOrders: number;
  authenticatedEvidence: number;
  unmatchedEvidence: number;
  ambiguousEvidence: number;
  recentFailures: { id: string; reason: string; at: string }[];
  workerStatus: string;
  lastSyncCompletedAt?: string;
  lastError?: string;
}

interface ImapCheckResult {
  ok: boolean;
  message: string;
  mailbox?: { name: string; total_messages: number };
  worker?: { last_uid: number; uid_validity: number; uid_validity_aligned: boolean; backlog_estimate: number };
  error?: string;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "ok" | "info" }) {
  const color =
    tone === "warn" && value > 0
      ? "text-amber-700"
      : tone === "ok"
        ? "text-emerald-700"
        : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2">
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
    </div>
  );
}

/**
 * CSC Payment Reconciliation Health: admin-only operational view of the
 * bank-alert ingestion pipeline. Counts come from Supabase; the iCloud
 * connection check dials IMAP on demand via the secured imap-health route
 * (admin session authorized, read-only, no credentials leave the server).
 */
export function ReconciliationHealthPanel({ initial }: { initial: ReconciliationHealthSnapshot }) {
  const router = useRouter();
  const [checking, setChecking] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [imap, setImap] = React.useState<ImapCheckResult | null>(null);

  const checkConnection = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/internal/payments/imap-health", { cache: "no-store" });
      const data = (await res.json()) as ImapCheckResult;
      setImap(data);
      if (data.ok) toast.success("iCloud IMAP reachable; mailbox selected read-only.");
      else toast.error(data.error || data.message || "iCloud IMAP check failed.");
    } catch {
      toast.error("Could not reach the health endpoint.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <section aria-label="CSC Payment Reconciliation Health" className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-teal-600" />
          <h2 className="text-sm font-bold text-slate-900">CSC Payment Reconciliation Health</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={checkConnection} disabled={checking || running} className="gap-2">
            {checking ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
            {checking ? "Checking…" : "Check iCloud Connection"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              setRunning(true);
              try {
                const res = await fetch("/api/admin/payments/reconcile-now", { method: "POST", cache: "no-store" });
                const data = (await res.json()) as { ok?: boolean; error?: string } & Record<string, unknown>;
                if (res.ok) {
                  toast.success("Reconciliation run finished; counts refresh below.");
                  router.refresh();
                } else {
                  toast.error(typeof data.error === "string" ? data.error : "Reconciliation run failed.");
                }
              } catch {
                toast.error("Could not start the reconciliation run.");
              } finally {
                setRunning(false);
              }
            }}
            disabled={checking || running}
            className="gap-2"
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {running ? "Running…" : "Run Reconciliation Now"}
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Orders pending" value={initial.pendingOrders} tone="info" />
        <Stat label="Orders processing" value={initial.processingOrders} tone="warn" />
        <Stat label="Orders reconciled" value={initial.reconciledOrders} tone="ok" />
        <Stat label="Authenticated evidence" value={initial.authenticatedEvidence} tone="ok" />
        <Stat label="Unmatched credits" value={initial.unmatchedEvidence} tone="warn" />
        <Stat label="Ambiguous credits" value={initial.ambiguousEvidence} tone="warn" />
      </div>

      {initial.lastError ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Worker last error: {initial.lastError}
        </p>
      ) : null}

      {imap ? (
        <div className="mt-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
          <span className={`font-semibold ${imap.ok ? "text-emerald-700" : "text-rose-700"}`}>
            {imap.ok ? "iCloud connected" : "iCloud check failed"}
          </span>
          {" — "}
          {imap.message}
          {imap.mailbox ? ` Mailbox: ${imap.mailbox.name} (${imap.mailbox.total_messages} messages).` : ""}
          {imap.worker && typeof imap.worker.backlog_estimate === "number"
            ? ` Backlog estimate: ${imap.worker.backlog_estimate}. UIDVALIDITY ${imap.worker.uid_validity_aligned ? "aligned" : "MISALIGNED"}.`
            : ""}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-slate-400">
          Live mailbox state appears after running the connection check. Scheduled reconciliation itself runs through the external worker lease, not this panel.
        </p>
      )}

      {initial.recentFailures.length > 0 ? (
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-slate-700">Recent processing failures</h3>
          <ul className="mt-1 space-y-1">
            {initial.recentFailures.map((f) => (
              <li key={f.id} className="rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600">
                <span className="font-mono">{f.id.slice(0, 8)}</span> — {f.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
