"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * Admin action control. Every decision is reviewed in a centered modal and
 * persisted only through the trusted server-side admin action endpoint.
 */
export function ActionButton({
  label,
  message,
  confirm,
  variant = "outline",
  size = "sm",
  disabled,
  operation,
  details,
}: {
  label: string;
  message?: string;
  confirm?: string;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "xs" | "lg";
  disabled?: boolean;
  operation?: { kind: string; target: string; decision: string };
  details?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [result, setResult] = React.useState<"success" | "error" | null>(null);
  const [failureMessage, setFailureMessage] = React.useState("");
  const isMembershipApproval = operation?.kind === "claim" && operation.decision === "active";
  const reasonRequired = operation?.kind === "payment" || ["rejected", "suspended", "revoked", "cancelled"].includes(operation?.decision ?? "") || (operation?.kind === "startup" && operation.decision === "archived");
  const isStartupApproval = operation?.kind === "startup" && operation.decision === "published";
  const displayDetails = Object.entries(details ?? {}).filter(([key, value]) =>
    value !== null && value !== undefined && value !== "" && !["id", "user_id", "owner_id"].includes(key),
  ).slice(0, 12);
  const detailLabel = (key: string) => ({ applicantName: "Applicant name", fullName: "Full name", email: "Email address", linkedAccountEmail: "Account email", whatsapp: "WhatsApp number", applicantType: "Applicant type", designation: "Designation", startup: "Startup", reference: "Reference", submittedAt: "Submitted", declarationAccurate: "Accuracy declaration", status: "Current status", reviewer: "Reviewer", startupName: "Startup name", directorySlug: "Directory slug", description: "Submitted description", website: "Website", collaboration: "Collaboration interests", submitted: "Submitted", currentStatus: "Current status", publicListingConsent: "Public listing consent", consentRecorded: "Consent recorded" }[key] ?? key.replace(/([A-Z])/g, " $1").replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()));
  const detailValue = (value: unknown) => {
    if (typeof value === "boolean") return value ? "Confirmed" : "Not confirmed";
    if (typeof value === "string" && /^[a-z]+(?:_[a-z]+)+$/.test(value)) return value.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
    return Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value);
  };
  function openDialog() {
    setReason(""); setResult(null); setFailureMessage(""); setOpen(true);
  }
  async function onConfirm() {
    if (!operation) { setOpen(false); toast.info(message ?? "This operation is unavailable. No changes were saved."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...operation, reason }) });
      const data = await res.json();
      if (!res.ok || !data.ok) { const error = data.error ?? "Action was not saved."; setFailureMessage(error); setResult("error"); toast.error(error); return; }
      setResult("success");
      window.setTimeout(() => { setOpen(false); router.refresh(); }, 850);
    } catch { const error = "Could not connect. Verify the record before retrying."; setFailureMessage(error); setResult("error"); toast.error(error); }
    finally { setSaving(false); }
  }
  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={openDialog} disabled={disabled || saving}>{label}</Button>
      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className={isMembershipApproval || isStartupApproval ? "max-h-[min(82dvh,700px)] max-w-5xl sm:max-w-5xl overflow-hidden rounded-3xl border-0 p-0 shadow-2xl" : "max-h-[min(86dvh,760px)] max-w-2xl sm:max-w-2xl overflow-y-auto rounded-3xl border-0 p-0 shadow-2xl"}>
          <div className="p-6 sm:p-8">
            <DialogHeader className="pr-8">
              <div className={`mb-1 flex size-12 items-center justify-center rounded-2xl ${result === "success" ? "bg-emerald-50 text-emerald-700" : result === "error" ? "bg-red-50 text-red-700" : "bg-brand-purple text-brand-ink"}`}>
                {result === "success" ? <Check className="size-6" /> : result === "error" ? <CircleAlert className="size-6" /> : <CircleAlert className="size-6" />}
              </div>
              <DialogTitle className="text-xl font-semibold">{result === "success" ? "Action recorded" : result === "error" ? "Action needs attention" : label}</DialogTitle>
              <DialogDescription>{result === "success" ? "The decision was saved and the record has been updated." : result === "error" ? failureMessage || "The action could not be completed. Review the current record status and try again." : isMembershipApproval ? "Membership cards are free. Approving confirms this account and activates its CSC membership card; no payment is required." : isStartupApproval ? "Review the founder-submitted details below. Publishing makes this startup visible in the CSC Founder Directory." : confirm ?? message ?? "Review the submitted information before continuing."}</DialogDescription>
            </DialogHeader>
            {result === null && <>
              {displayDetails.length > 0 && <dl className={`mt-5 grid gap-x-5 gap-y-3 rounded-2xl bg-brand-cloud p-4 ${isMembershipApproval || isStartupApproval ? "sm:grid-cols-3 xl:grid-cols-4" : "sm:grid-cols-2"}`}>
                {displayDetails.map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-xs font-medium text-brand-muted">{detailLabel(key)}</dt><dd className="mt-1 break-words text-sm text-brand-ink">{detailValue(value)}</dd></div>)}
              </dl>}
              {operation && <div className="mt-4 grid gap-2"><label htmlFor="admin-action-reason" className="text-sm font-medium">{isMembershipApproval ? "Internal approval note" : operation.kind === "payment" ? "Independent settlement reference" : "Review reason"} {reasonRequired ? <span className="text-red-700">(required)</span> : <span className="font-normal text-brand-muted">(optional)</span>}</label><Textarea id="admin-action-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={isMembershipApproval ? 2 : 3} placeholder={reasonRequired ? "Enter at least 5 characters for the audit record…" : "Add an optional note for the audit record…"} aria-invalid={reasonRequired && reason.trim().length > 0 && reason.trim().length < 5} />{!isMembershipApproval && <p className="text-xs text-brand-muted">This note is attached to the privileged action for audit.</p>}</div>}
              {!operation && message && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{message}</p>}
            </>}
            {result === "success" && <div className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900"><Check className="size-5 shrink-0" />Successfully submitted and confirmed.</div>}
            {saving && <div className="mt-4 flex items-center gap-2 text-sm text-brand-muted"><LoaderCircle className="size-4 animate-spin" />Recording your decision…</div>}
          </div>
          <DialogFooter className="rounded-b-3xl sm:flex-row">
            {result === "success" ? <Button type="button" className="w-full" onClick={() => { setOpen(false); router.refresh(); }}>Done</Button> : <>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="button" variant={variant === "destructive" ? "destructive" : "default"} disabled={saving || (!operation && result !== "error") || (!result && reasonRequired && reason.trim().length < 5)} onClick={result === "error" ? () => setOpen(false) : onConfirm}>{saving ? "Saving…" : result === "error" ? "Close" : `Confirm ${label.toLowerCase()}`}</Button>
            </>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
