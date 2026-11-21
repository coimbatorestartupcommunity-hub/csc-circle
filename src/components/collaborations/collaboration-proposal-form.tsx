"use client";

import * as React from "react";
import { Handshake, Send, CheckCircle2, Loader2, Sparkles, Building2, Globe, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const categories = [
  "Technology Business Incubator / Accelerator",
  "Academic & University Innovation Partner",
  "Venture Capital & Angel Syndicate",
  "Corporate Innovation & Enterprise Sponsor",
  "Ecosystem Community & Media Co-host",
  "Hardware Maker Space & Prototyping Lab",
  "Other Strategic Collaboration",
];

export function CollaborationProposalForm() {
  const [busy, setBusy] = React.useState(false);
  const [submittedRef, setSubmittedRef] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [orgName, setOrgName] = React.useState("");
  const [repName, setRepName] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [category, setCategory] = React.useState(categories[0]);
  const [reason, setReason] = React.useState("");
  const [benefits, setBenefits] = React.useState("");
  const [supportRequested, setSupportRequested] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim() || !repName.trim() || !email.trim() || !phone.trim() || !reason.trim() || !benefits.trim()) {
      setError("Please fill in all mandatory fields so our team can evaluate your proposal.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/collaborations/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName.trim(),
          representativeName: repName.trim(),
          designation: designation.trim() || "Lead Representative",
          email: email.trim(),
          phone: phone.trim(),
          website: website.trim() || null,
          category,
          reason: reason.trim(),
          benefits: benefits.trim(),
          supportRequested: supportRequested.trim() || "Joint community initiative",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit collaboration proposal. Please try again.");
      }

      setSubmittedRef(data.referenceCode || "COL-CONFIRMED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  if (submittedRef) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 sm:p-10 text-center shadow-xs">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
          <CheckCircle2 className="size-7" />
        </span>
        <span className="mt-4 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-mono font-semibold text-emerald-800">
          Ref: {submittedRef}
        </span>
        <h3 className="mt-3 text-xl font-bold tracking-tight text-emerald-950 sm:text-2xl">
          Collaboration Proposal Received!
        </h3>
        <p className="mt-2 max-w-lg text-xs sm:text-sm leading-relaxed text-emerald-800">
          Thank you for proposing a partnership with the Coimbatore Startup Community. Your request has been queued in our administrative workspace. Our strategic partnership team will review your objectives and contact you within <strong>24–48 business hours</strong>.
        </p>
        <div className="mt-4 rounded-2xl bg-white/80 p-4 text-xs text-emerald-900 ring-1 ring-emerald-200">
          Direct questions or urgent inquiries? Reach our General Community Desk at{" "}
          <a href="mailto:coimbatorestartup.csc@gmail.com" className="font-semibold underline">
            coimbatorestartup.csc@gmail.com
          </a>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSubmittedRef(null);
            setOrgName("");
            setRepName("");
            setReason("");
            setBenefits("");
            setSupportRequested("");
          }}
          className="mt-6 text-xs font-semibold"
        >
          Submit Another Proposal
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-full overflow-hidden">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-900 break-words">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 w-full min-w-0 max-w-full">
        <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
          <Label htmlFor="collab-org" className="text-xs font-semibold text-brand-ink">
            Organization or Entity Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="collab-org"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g. Coimbatore Innovation Hub"
            required
            className="rounded-xl border-brand-border text-sm min-w-0 max-w-full w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
          <Label htmlFor="collab-rep" className="text-xs font-semibold text-brand-ink">
            Your Full Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="collab-rep"
            value={repName}
            onChange={(e) => setRepName(e.target.value)}
            placeholder="e.g. Dr. Rajesh Kumar"
            required
            className="rounded-xl border-brand-border text-sm min-w-0 max-w-full w-full"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 w-full min-w-0 max-w-full">
        <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
          <Label htmlFor="collab-desig" className="text-xs font-semibold text-brand-ink">
            Designation / Role
          </Label>
          <Input
            id="collab-desig"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="e.g. Incubation Director"
            className="rounded-xl border-brand-border text-sm min-w-0 max-w-full w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
          <Label htmlFor="collab-email" className="text-xs font-semibold text-brand-ink">
            Official Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="collab-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="partner@institution.org"
            required
            className="rounded-xl border-brand-border text-sm min-w-0 max-w-full w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
          <Label htmlFor="collab-phone" className="text-xs font-semibold text-brand-ink">
            Phone / WhatsApp Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="collab-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            required
            className="rounded-xl border-brand-border text-sm min-w-0 max-w-full w-full"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 w-full min-w-0 max-w-full">
        <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
          <Label htmlFor="collab-category" className="text-xs font-semibold text-brand-ink">
            Collaboration Nature <span className="text-red-500">*</span>
          </Label>
          <select
            id="collab-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-brand-border bg-white p-3 text-sm text-brand-ink focus:outline-brand-ink min-w-0 max-w-full w-full"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
          <Label htmlFor="collab-web" className="text-xs font-semibold text-brand-ink">
            Website or LinkedIn URL
          </Label>
          <Input
            id="collab-web"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.org"
            className="rounded-xl border-brand-border text-sm min-w-0 max-w-full w-full"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 min-w-0 max-w-full">
        <Label htmlFor="collab-reason" className="text-sm font-semibold text-brand-ink">
          Collaboration Rationale &amp; Objectives <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="collab-reason"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Host joint hackathon or mentorship track for hardware startups"
          required
          className="min-w-0 max-w-full w-full resize-y break-words rounded-2xl border border-brand-border p-3.5 sm:p-4 text-xs sm:text-sm text-brand-ink placeholder:text-xs sm:placeholder:text-sm placeholder:text-brand-muted/70 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2 min-w-0 max-w-full">
        <Label htmlFor="collab-benefits" className="text-sm font-semibold text-brand-ink">
          Benefits &amp; Value to Coimbatore Founders <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="collab-benefits"
          rows={4}
          value={benefits}
          onChange={(e) => setBenefits(e.target.value)}
          placeholder="e.g. Grant funding, lab access, and direct industry mentor hours"
          required
          className="min-w-0 max-w-full w-full resize-y break-words rounded-2xl border border-brand-border p-3.5 sm:p-4 text-xs sm:text-sm text-brand-ink placeholder:text-xs sm:placeholder:text-sm placeholder:text-brand-muted/70 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2 min-w-0 max-w-full">
        <Label htmlFor="collab-support" className="text-sm font-semibold text-brand-ink">
          Support Requested from CSC Circle
        </Label>
        <textarea
          id="collab-support"
          rows={3}
          value={supportRequested}
          onChange={(e) => setSupportRequested(e.target.value)}
          placeholder="e.g. Ticketing, digital pass check-in, and community promotion"
          className="min-w-0 max-w-full w-full resize-y break-words rounded-2xl border border-brand-border p-3.5 sm:p-4 text-xs sm:text-sm text-brand-ink placeholder:text-xs sm:placeholder:text-sm placeholder:text-brand-muted/70 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:outline-none"
        />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-brand-border/60 pt-5 min-w-0 max-w-full">
        <span className="text-xs text-brand-muted">
          All proposals are securely reviewed by CSC leadership within 24–48 hours.
        </span>
        <Button
          type="submit"
          disabled={busy}
          className="w-full sm:w-auto sm:min-w-[240px] min-h-12 gap-2.5 rounded-2xl bg-brand-ink px-6 sm:px-8 py-3.5 text-sm sm:text-base font-bold text-white shadow-md transition hover:bg-brand-ink/90 hover:shadow-lg disabled:opacity-50 cursor-pointer"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Submitting Proposal…
            </>
          ) : (
            <>
              <Send className="size-4" /> Submit Collaboration Proposal
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
