"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { cn } from "cn";
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
  const isEventPassApproval = ["imported_registration", "paid_registration", "registration"].includes(operation?.kind ?? "") && operation?.decision === "confirmed";
  const displayDetails = Object.entries(details ?? {}).filter(([key, value]) =>
    value !== null &&
    value !== undefined &&
    value !== "" &&
    !["id", "user_id", "owner_id", "kind"].includes(key) &&
    !(key === "reviewer" && details?.reviewerName),
  ).slice(0, 12);
  const detailLabel = (key: string) => ({
    applicantName: "Applicant name",
    fullName: "Full name",
    email: "Email address",
    linkedAccountEmail: "Account email",
    whatsapp: "WhatsApp number",
    applicantType: "Applicant type",
    designation: "Designation",
    startup: "Startup",
    reference: "Reference",
    submittedAt: "Submitted",
    declarationAccurate: "Accuracy declaration",
    status: "Current status",
    reviewer: "Reviewer",
    reviewerName: "Reviewer",
    kindLabel: "Review type",
    targetTitle: "Activity / Target",
    rating: "Rating",
    excerpt: "Review comments",
    startupName: "Startup name",
    directorySlug: "Directory slug",
    description: "Submitted description",
    website: "Website",
    collaboration: "Collaboration interests",
    submitted: "Submitted",
    currentStatus: "Current status",
    publicListingConsent: "Public listing consent",
    consentRecorded: "Consent recorded",
  }[key] ?? key.replace(/([A-Z])/g, " $1").replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase()));
  const detailValue = (value: unknown, key?: string) => {
    if (key === "rating") return `${value}★`;
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
        <DialogContent
          className={cn(
            "w-[calc(100%-1.25rem)] rounded-[2rem] border border-white/80 bg-white/92 p-0 shadow-[0_25px_60px_-15px_rgba(20,25,45,0.25)] ring-1 ring-black/5 backdrop-blur-2xl",
            isMembershipApproval || isStartupApproval
              ? "max-h-[min(85dvh,740px)] max-w-5xl sm:max-w-5xl overflow-hidden"
              : "max-h-[min(88dvh,780px)] max-w-2xl sm:max-w-2xl overflow-y-auto",
          )}
        >
          <div className="p-5 sm:p-7">
            <DialogHeader className="pr-10 text-left">
              <div className={`mb-3 flex size-12 items-center justify-center rounded-2xl shadow-xs ring-1 ring-white/70 ${result === "success" ? "bg-emerald-50 text-emerald-700" : result === "error" ? "bg-red-50 text-red-700" : "bg-brand-purple/40 text-brand-ink"}`}>
                {result === "success" ? <Check className="size-6" /> : result === "error" ? <CircleAlert className="size-6" /> : <CircleAlert className="size-6" />}
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-brand-ink">{result === "success" ? isEventPassApproval ? "Registration approved" : "Action recorded" : result === "error" ? "Action needs attention" : label}</DialogTitle>
              <DialogDescription className="mt-1.5 text-xs sm:text-sm leading-relaxed text-brand-secondary">{result === "success" ? isEventPassApproval ? "Approval is saved and the pass email is queued. The recipient should sign in with the registration email, then open Member → My Events to view and download the event pass. To request a CSC membership ID, they can choose Digital ID in the member menu, complete and submit the required information, and wait for manual review. They will be notified after approval and can then download the Digital ID." : "The decision was saved and the record has been updated." : result === "error" ? failureMessage || "The action could not be completed. Review the current record status and try again." : isMembershipApproval ? "Membership cards are free. Approving confirms this account and activates its CSC membership card; no payment is required." : isStartupApproval ? "Review the founder-submitted details below. Publishing makes this startup visible in the CSC Founder Directory." : confirm ?? message ?? "Review the submitted information before continuing."}</DialogDescription>
            </DialogHeader>
            {result === null && <>
              {displayDetails.length > 0 && <dl className={`mt-5 grid gap-2.5 rounded-2xl bg-brand-cloud/60 p-3 ring-1 ring-brand-border/70 backdrop-blur-xs ${isMembershipApproval || isStartupApproval ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"}`}>
                {displayDetails.map(([key, value]) => <div key={key} className="min-w-0 rounded-xl border border-white/80 bg-white/85 p-2.5 shadow-xs ring-1 ring-brand-border/40 backdrop-blur-md"><dt className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">{detailLabel(key)}</dt><dd className="mt-1 break-words text-xs sm:text-sm font-medium text-brand-ink">{detailValue(value, key)}</dd></div>)}
              </dl>}
              {operation && <div className="mt-4 grid gap-1.5"><label htmlFor="admin-action-reason" className="text-xs sm:text-sm font-medium text-brand-ink">{isMembershipApproval ? "Internal approval note" : operation.kind === "payment" ? "Independent settlement reference" : "Review reason"} {reasonRequired ? <span className="text-red-700">(required)</span> : <span className="font-normal text-brand-muted">(optional)</span>}</label><Textarea id="admin-action-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={isMembershipApproval ? 2 : 3} className="rounded-xl border border-brand-border/80 bg-white/90 text-sm focus:border-brand-ink focus:ring-2 focus:ring-brand-ink/10" placeholder={reasonRequired ? "Enter at least 5 characters for the audit record…" : "Add an optional note for the audit record…"} aria-invalid={reasonRequired && reason.trim().length > 0 && reason.trim().length < 5} />{!isMembershipApproval && <p className="text-[11px] text-brand-muted">This note is attached to the privileged action for audit.</p>}</div>}
              {!operation && message && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-xs sm:text-sm text-amber-900">{message}</p>}
            </>}
            {result === "success" && <div className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-900"><Check className="mt-0.5 size-5 shrink-0" /><span>{isEventPassApproval ? "The pass is available in My Events, and its confirmation email is queued for delivery." : "Successfully submitted and confirmed."}</span></div>}
            {saving && <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm text-brand-muted"><LoaderCircle className="size-4 animate-spin" />Recording your decision…</div>}
          </div>
          <DialogFooter className="sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 rounded-b-[2rem] border-t border-brand-border/60 bg-white/85 px-5 py-3.5 backdrop-blur-xl">
            {result === "success" ? <Button type="button" className="w-full sm:w-auto min-h-10 rounded-xl px-6 text-sm font-medium" onClick={() => { setOpen(false); router.refresh(); }}>Done</Button> : <>
              <Button type="button" variant="outline" className="w-full sm:w-auto min-h-10 rounded-xl text-sm font-medium" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="button" variant={variant === "destructive" ? "destructive" : "default"} className="w-full sm:w-auto min-h-10 rounded-xl px-6 text-sm font-medium" disabled={saving || (!operation && result !== "error") || (!result && reasonRequired && reason.trim().length < 5)} onClick={result === "error" ? () => setOpen(false) : onConfirm}>{saving ? "Saving…" : result === "error" ? "Close" : `Confirm ${label.toLowerCase()}`}</Button>
            </>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
