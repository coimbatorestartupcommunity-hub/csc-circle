"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function StartupRevisionActions({ revisionId }: { revisionId: string }) {
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function decide(decision: "approved" | "rejected") {
    if (decision === "rejected" && reason.trim().length < 5) {
      toast.error("Add a short reason so the owner knows what to update.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/startup-revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId, decision, reason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not review startup changes.");
      toast.success(decision === "approved" ? "Startup changes approved and published." : "Startup changes rejected.");
      router.push("/admin/startups/revisions");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not review startup changes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-brand-border bg-white p-4 sm:p-5">
      <label htmlFor="revision-reason" className="text-sm font-medium text-brand-ink">Rejection feedback</label>
      <textarea id="revision-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} placeholder="Explain what needs to be corrected before approval." className="mt-2 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/40" />
      <p className="mt-1 text-xs text-brand-muted">Required when rejecting a revision.</p>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" disabled={busy || reason.trim().length < 5} onClick={() => void decide("rejected")} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Reject Changes</button>
        <button type="button" disabled={busy} onClick={() => void decide("approved")} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-ink px-5 py-2 text-sm font-semibold text-white hover:bg-brand-secondary disabled:opacity-50">{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Approve & Publish</button>
      </div>
    </section>
  );
}
