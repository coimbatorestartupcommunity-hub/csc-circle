"use client";

import * as React from "react";
import Link from "next/link";
import { FlaskConical, ExternalLink, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TestStatus {
  active: boolean;
  event: {
    id: string;
    slug: string;
    title: string;
    status: string;
    registrationState: string;
    priceMinor: number;
    testRunId?: string;
    expiresAt?: string;
    testUrl: string;
    adminEditUrl: string;
  } | null;
  metrics?: {
    orders: number;
    paidRegistrations: number;
    issuedPasses: number;
  };
}

export function PaymentTestPanel() {
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [data, setData] = React.useState<TestStatus | null>(null);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/testing/payment-test", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    fetch("/api/admin/testing/payment-test", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (active) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleLaunch() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/testing/payment-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || "Could not create test event.");
      toast.success("₹1.00 payment test event created and ready for checkout.");
      void fetchStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to launch test event.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCleanup() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/testing/payment-test", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalPurge: true }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || "Could not complete cleanup.");
      toast.success("Test event completed and ALL QA history purged.");
      void fetchStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cleanup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTotalPurgeAll() {
    if (!confirm("Delete ALL QA payment test history everywhere (payments, orders, registrations, passes, events) ? This cannot be undone. Genuine financial audit records will be preserved.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/testing/payment-test", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purgeAll: true }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || "Total purge failed.");
      toast.success(`Total QA purge complete: ${result.purgedEvents} events purged.`);
      void fetchStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Total purge failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <FlaskConical className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-amber-950 text-sm">
                Internal QA Payment Test &amp; Automated Cleanup
              </h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                data?.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
              }`}>
                {data?.active ? "Active Test Run" : "Idle"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-amber-900/80">
              {data?.active
                ? `Test event active at ₹1.00 INR (${data.metrics?.orders ?? 0} orders, ${data.metrics?.paidRegistrations ?? 0} verified registrations, ${data.metrics?.issuedPasses ?? 0} passes).`
                : "Create a controlled ₹1.00 paid test event to verify end-to-end UPI checkout, dynamic QR, and admission passes."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data?.active && data.event ? (
            <>
              <Link
                href={data.event.testUrl}
                target="_blank"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 text-xs font-medium text-amber-950 shadow-2xs hover:bg-amber-100/50"
              >
                <span>Open Test Checkout</span>
                <ExternalLink className="size-3" />
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void handleCleanup()}
                className="h-9 gap-1.5 border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Delete All QA History
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void handleTotalPurgeAll()}
                className="h-9 gap-1.5 border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Purge All QA Everywhere
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void handleLaunch()}
                className="h-9 gap-1.5 bg-amber-800 text-white hover:bg-amber-900"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                Launch ₹1.00 Test Event
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void handleTotalPurgeAll()}
                className="h-9 gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Clean All QA History
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
