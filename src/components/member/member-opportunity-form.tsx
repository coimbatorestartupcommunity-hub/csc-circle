"use client";

import * as React from "react";
import { Send, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const categories = [
  "Co-Founder Search",
  "Core Team & Engineering",
  "Startup Grant & Funding",
  "Hackathon & Challenge",
  "Founder Fellowship",
  "Strategic Partnership",
];

export function MemberOpportunityForm({ userEmail = "" }: { userEmail?: string }) {
  const [busy, setBusy] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState(categories[0]);
  const [organization, setOrganization] = React.useState("");
  const [mode, setMode] = React.useState("Hybrid · Coimbatore");
  const [contactEmail, setContactEmail] = React.useState(userEmail);
  const [deadline, setDeadline] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [description, setDescription] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !organization.trim() || !summary.trim() || !description.trim() || !contactEmail.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/member/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          organization: organization.trim(),
          participationMode: mode,
          contact: contactEmail.trim(),
          deadline: deadline || null,
          summary: summary.trim(),
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit opportunity. Please try again.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 sm:p-10 text-center shadow-xs">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="mt-4 text-xl font-bold tracking-tight text-emerald-950 sm:text-2xl">
          Opportunity Submitted for Moderation!
        </h3>
        <p className="mt-2 max-w-lg text-xs sm:text-sm leading-relaxed text-emerald-800">
          Your opportunity has been received by the CSC administration desk. It will be reviewed and published to the live Opportunities board within <strong>24 hours</strong>.
        </p>
        <p className="mt-2 text-xs font-medium text-emerald-900">
          Applicants will reach out directly to: <span className="font-mono font-semibold">{contactEmail}</span>
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSubmitted(false);
            setTitle("");
            setSummary("");
            setDescription("");
          }}
          className="mt-6 rounded-xl text-xs font-semibold"
        >
          Submit Another Opportunity
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 max-w-full flex-col gap-5 text-sm">
      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-900">
          {error}
        </div>
      )}

      <div className="grid min-w-0 max-w-full gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="opp-title" className="text-xs font-semibold text-brand-ink">
            Opportunity Title <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="opp-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border-brand-border text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opp-cat" className="text-xs font-semibold text-brand-ink">
            Opportunity Category <span className="text-rose-500">*</span>
          </Label>
          <select
            id="opp-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-white p-3 text-sm text-brand-ink focus:outline-hidden focus:ring-2 focus:ring-brand-ink"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opp-org" className="text-xs font-semibold text-brand-ink">
            Startup / Organization Name <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="opp-org"
            required
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="rounded-xl border-brand-border text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opp-mode" className="text-xs font-semibold text-brand-ink">
            Location &amp; Work Mode <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="opp-mode"
            required
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="rounded-xl border-brand-border text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="opp-contact" className="text-xs font-semibold text-brand-ink">
            Direct Contact Email for Applicants <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="opp-contact"
            type="email"
            required
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="rounded-xl border-brand-border text-sm"
          />
          <p className="text-[11px] text-brand-muted">
            Interested candidates will email this address directly.
          </p>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="opp-deadline" className="text-xs font-semibold text-brand-ink">
            Application Deadline (Optional)
          </Label>
          <Input
            id="opp-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-xl border-brand-border text-sm"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2 min-w-0 max-w-full">
          <Label htmlFor="opp-summary" className="text-sm font-semibold text-brand-ink">
            Short Summary (1–2 sentences) <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="opp-summary"
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="rounded-xl border-brand-border text-sm min-w-0 max-w-full w-full"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2 min-w-0 max-w-full">
          <Label htmlFor="opp-desc" className="text-sm font-semibold text-brand-ink">
            Detailed Description, Expectations &amp; Equity/Compensation <span className="text-rose-500">*</span>
          </Label>
          <textarea
            id="opp-desc"
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-w-0 max-w-full w-full resize-y break-words rounded-2xl border border-brand-border bg-white p-3.5 sm:p-4 text-xs sm:text-sm text-brand-ink focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-brand-border/60 pt-5 min-w-0 max-w-full">
        <span className="text-xs text-brand-muted">
          All submissions are subject to the 24-hour community moderation standard.
        </span>
        <Button
          type="submit"
          disabled={busy}
          className="w-full sm:w-auto sm:min-w-[240px] min-h-12 gap-2.5 rounded-2xl bg-brand-ink px-6 sm:px-8 py-3.5 text-sm sm:text-base font-bold text-white shadow-md transition hover:bg-brand-ink/90 hover:shadow-lg disabled:opacity-50 cursor-pointer"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Submitting Opportunity…
            </>
          ) : (
            <>
              <Send className="size-4" /> Submit Opportunity
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
