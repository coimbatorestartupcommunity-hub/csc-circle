"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceAuthBadge } from "./evidence-auth-badge";
import type { EnrichedAdminPaymentRow } from "@/types/admin-payments";
import { ShieldCheck, AlertCircle, Ban } from "lucide-react";

export function ManualReconciliationModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: {
  order: EnrichedAdminPaymentRow;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const defaultEvidenceId =
    order.evidenceId || order.candidateEvidences?.[0]?.id || "";
  const [selectedEvidenceOverride, setSelectedEvidenceOverride] =
    React.useState<string | null>(null);
  const selectedEvidenceId = selectedEvidenceOverride ?? defaultEvidenceId;

  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const selectedEvidence =
    (order.candidateEvidences || []).find((e) => e.id === selectedEvidenceId) ||
    order.evidence;

  const isBlocked =
    selectedEvidence?.authStatus === "untrusted" ||
    selectedEvidence?.authStatus === "forged";
  const canSubmit =
    Boolean(selectedEvidenceId) &&
    notes.trim().length >= 5 &&
    !isBlocked &&
    !submitting;

  async function handleReconcile() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/payments/manual-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          evidenceId: selectedEvidenceId,
          notes: notes.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "Manual reconciliation failed.");
        return;
      }

      toast.success("Payment reconciled and tickets issued atomically.");
      onSuccess();
      onClose();
    } catch {
      toast.error("Network error during manual settlement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !submitting && !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-teal-600" />
            Guarded Manual Payment Reconciliation
          </DialogTitle>
          <DialogDescription>
            Review independent bank proof and manually authorize order settlement under settlement
            source <code className="font-mono text-slate-800">admin_manual</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Order Summary */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-1">
            <div className="flex justify-between font-medium">
              <span>
                Order Reference:{" "}
                <strong className="font-mono text-slate-900">{order.reference}</strong>
              </span>
              <span>
                Amount: <strong className="text-emerald-700">₹{order.amount.toFixed(2)}</strong>
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>
                Attendee: {order.attendee} {order.email ? `(${order.email})` : ""}
              </span>
              <span>
                Claimed UTR: <span className="font-mono">{order.claimedUtr || "None"}</span>
              </span>
            </div>
          </div>

          {/* Evidence Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-900">
              Select Bank Credit Evidence
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Available unlinked bank credits matching amount ₹{order.amount.toFixed(2)}:
            </p>

            {order.candidateEvidences && order.candidateEvidences.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {order.candidateEvidences.map((ev) => (
                  <label
                    key={ev.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      selectedEvidenceId === ev.id
                        ? "border-teal-500 bg-teal-50/40"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="evidence"
                      value={ev.id}
                      checked={selectedEvidenceId === ev.id}
                      onChange={() => setSelectedEvidenceOverride(ev.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-slate-900">
                          UTR: {ev.utr}
                        </span>
                        <EvidenceAuthBadge status={ev.authStatus} />
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-1">
                        {ev.transactionInfoRaw}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(ev.transactionTime).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            ) : order.evidence ? (
              <div className="p-3 rounded-xl border border-teal-500 bg-teal-50/40 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-slate-900">
                    Linked UTR: {order.evidence.utr}
                  </span>
                  <EvidenceAuthBadge status={order.evidence.authStatus} />
                </div>
                <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">
                  {order.evidence.transactionInfoRaw}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                No unmatched bank credits found for this exact amount (₹{order.amount.toFixed(2)}).
              </div>
            )}
          </div>

          {/* Selected Evidence Security Warning */}
          {isBlocked && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
              <Ban className="size-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold">Settlement Blocked: Untrusted or Forged Evidence</p>
                <p className="text-[11px] mt-0.5">
                  This evidence failed cryptographic email authentication. Manual fulfillment is
                  permanently rejected to prevent unauthorized override.
                </p>
              </div>
            </div>
          )}

          {selectedEvidence?.authStatus === "needs_review" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold">Manual Bank Statement Verification Required</p>
                <p className="text-[11px] mt-0.5">
                  This bank credit alert is in &lsquo;needs_review&rsquo; state. Confirm you have
                  verified the transaction directly on the bank portal before proceeding.
                </p>
              </div>
            </div>
          )}

          {/* Mandatory Audit Rationale */}
          <div>
            <label className="text-xs font-semibold text-slate-900">
              Audit Settlement Rationale <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 mb-1">
              Provide verifiable reason for manual attribution (min 5 characters). Logged
              immutably in event audit history.
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified payer identity in Axis Bank corporate netbanking; customer had typo in order reference."
              className="h-20 text-xs"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Must be at least 5 characters</span>
              <span className={notes.trim().length >= 5 ? "text-teal-600 font-medium" : ""}>
                {notes.trim().length} / 5
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleReconcile}
            disabled={!canSubmit}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {submitting ? "Settling Atomically..." : "Authorize & Issue Passes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
