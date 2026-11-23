"use client";

import * as React from "react";
import {
  FileText,
  Send,
  CheckCircle2,
  Loader2,
  Sparkles,
  Building2,
  Globe,
  Mail,
  Phone,
  User,
  X,
  BookOpen,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const categories = [
  "Government Grants & Subsidies",
  "Legal & Founder Agreements",
  "Pitch Deck & Fundraising",
  "Incubation & Co-working Directory",
  "Tech Architecture & Cloud",
  "Financial Modeling & Valuation",
  "Hiring & Culture Playbooks",
  "Other Founder Playbook",
];

const resourceTypes = [
  { label: "Guide / Article", value: "guide" },
  { label: "Document / PDF", value: "document" },
  { label: "Template / Spreadsheet", value: "template" },
  { label: "Tool / Software", value: "tool" },
];

export function ResourceSubmissionModal({
  triggerClassName,
}: {
  triggerClassName?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ||
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand-ink px-6 py-2.5 text-xs font-semibold text-brand-white shadow-xs transition hover:bg-brand-ink/90 focus-visible:outline-2 focus-visible:outline-brand-ink"
        }
      >
        <FileText className="size-3.5" /> Submit a Founder Playbook
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl border border-brand-border/80 bg-brand-white p-6 sm:p-8 shadow-2xl transition-all max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full bg-brand-cloud text-brand-secondary transition hover:bg-brand-border/50 hover:text-brand-ink"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>

            <ResourceSubmissionForm onSuccess={() => {}} onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

export function ResourceSubmissionForm({
  onSuccess,
  onClose,
}: {
  onSuccess?: () => void;
  onClose?: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [submittedRef, setSubmittedRef] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState(categories[0]);
  const [resourceType, setResourceType] = React.useState(resourceTypes[0].value);
  const [summary, setSummary] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [externalUrl, setExternalUrl] = React.useState("");
  const [contributorName, setContributorName] = React.useState("");
  const [startup, setStartup] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !title.trim() ||
      !summary.trim() ||
      !details.trim() ||
      !contributorName.trim() ||
      !email.trim() ||
      !phone.trim()
    ) {
      setError("Please fill in all mandatory fields so our editorial board can review your submission.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/resources/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          resourceType,
          summary: summary.trim(),
          details: details.trim(),
          externalUrl: externalUrl.trim() || null,
          contributorName: contributorName.trim(),
          startup: startup.trim() || "Independent Contributor",
          designation: designation.trim() || "Founder / Specialist",
          email: email.trim(),
          phone: phone.trim(),
          website_trap_field: honeypot,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit resource playbook. Please try again.");
      }

      setSubmittedRef(data.referenceCode || "RES-CONFIRMED");
      if (onSuccess) onSuccess();
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
          Founder Playbook Submitted!
        </h3>
        <p className="mt-2 max-w-lg text-xs sm:text-sm leading-relaxed text-emerald-800">
          Thank you for sharing your expertise with the Coimbatore Startup Community. Your playbook has been submitted to the editorial queue. Once verified by CSC mentors, it will be published live on the ecosystem resource hub.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSubmittedRef(null);
              setTitle("");
              setSummary("");
              setDetails("");
              setExternalUrl("");
              if (onClose) onClose();
            }}
            className="rounded-full border-emerald-300 text-emerald-900 hover:bg-emerald-100"
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-purple text-brand-accent">
          <BookOpen className="size-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-brand-ink sm:text-xl">
            Contribute a Playbook or Template
          </h3>
          <p className="text-xs text-brand-secondary">
            Share templates, blueprints, and guides with 500+ Coimbatore founders.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Invisible honeypot anti-spam */}
      <input
        type="text"
        name="website_trap_field"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="res-title" className="text-xs font-semibold text-brand-ink">
            Resource / Playbook Title *
          </Label>
          <Input
            id="res-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-xl border-brand-border text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="res-cat" className="text-xs font-semibold text-brand-ink">
            Category *
          </Label>
          <select
            id="res-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs text-brand-ink focus:border-brand-accent focus:outline-hidden"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="res-type" className="text-xs font-semibold text-brand-ink">
            Resource Format *
          </Label>
          <select
            id="res-type"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-xs text-brand-ink focus:border-brand-accent focus:outline-hidden"
          >
            {resourceTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="res-summary" className="text-xs font-semibold text-brand-ink">
            Brief Summary (1–2 sentences) *
          </Label>
          <Input
            id="res-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
            className="rounded-xl border-brand-border text-xs"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="res-details" className="text-xs font-semibold text-brand-ink">
            Playbook Content / Checklist Details *
          </Label>
          <textarea
            id="res-details"
            rows={5}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            required
            className="w-full rounded-xl border border-brand-border bg-white p-3 text-xs leading-relaxed text-brand-ink focus:border-brand-accent focus:outline-hidden"
          />
          <p className="text-[11px] text-brand-muted">
            Tip: Standalone section titles ending in a colon (e.g. &apos;Key Highlights:&apos;) will automatically format into bold headings.
          </p>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="res-url" className="text-xs font-semibold text-brand-ink">
            Download / External Document Link (Optional)
          </Label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-2.5 size-3.5 text-brand-muted" />
            <Input
              id="res-url"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="rounded-xl border-brand-border pl-8 text-xs"
            />
          </div>
        </div>

        {/* Contributor Information */}
        <div className="space-y-1.5">
          <Label htmlFor="res-author" className="text-xs font-semibold text-brand-ink">
            Your Name *
          </Label>
          <Input
            id="res-author"
            value={contributorName}
            onChange={(e) => setContributorName(e.target.value)}
            required
            className="rounded-xl border-brand-border text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="res-startup" className="text-xs font-semibold text-brand-ink">
            Startup / Organization
          </Label>
          <Input
            id="res-startup"
            value={startup}
            onChange={(e) => setStartup(e.target.value)}
            className="rounded-xl border-brand-border text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="res-email" className="text-xs font-semibold text-brand-ink">
            Email Address *
          </Label>
          <Input
            id="res-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl border-brand-border text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="res-phone" className="text-xs font-semibold text-brand-ink">
            Contact Number *
          </Label>
          <Input
            id="res-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="rounded-xl border-brand-border text-xs"
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-3 border-t border-brand-border/60 pt-4">
        {onClose && (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-full text-xs"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-brand-accent px-6 text-xs font-semibold text-white hover:bg-brand-accent/90"
        >
          {busy ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send className="size-3.5" /> Submit for Review
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
