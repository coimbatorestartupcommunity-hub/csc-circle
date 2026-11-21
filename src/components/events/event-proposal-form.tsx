"use client";

import * as React from "react";
import { CalendarRange, Send, CheckCircle2, Loader2, Sparkles, MapPin, Video, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const eventCategories = [
  "Founder Masterclass & Deep Dive",
  "Hands-on Technical / Product Workshop",
  "Demo Day & Investor Pitch Session",
  "Closed-Door Founder Roundtable",
  "Open Community Networking Mixer",
  "Hackathon & Prototype Sprint",
  "Student Innovation Showcase",
];

const eventFormats = [
  "In-Person · Coimbatore",
  "Virtual · Google Meet (Check-in Portal)",
  "Hybrid (In-Person + Live Stream)",
];

export function EventProposalForm() {
  const [busy, setBusy] = React.useState(false);
  const [submittedRef, setSubmittedRef] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [organizerName, setOrganizerName] = React.useState("");
  const [organization, setOrganization] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState(eventCategories[0]);
  const [format, setFormat] = React.useState(eventFormats[0]);
  const [proposedDate, setProposedDate] = React.useState("");
  const [capacity, setCapacity] = React.useState("50");
  const [venue, setVenue] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [supportRequested, setSupportRequested] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organizerName.trim() || !email.trim() || !phone.trim() || !title.trim() || !description.trim()) {
      setError("Please fill in all required event details.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/events/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizerName: organizerName.trim(),
          organization: organization.trim() || "Independent Community Host",
          email: email.trim(),
          phone: phone.trim(),
          title: title.trim(),
          category,
          format,
          proposedDate: proposedDate || null,
          capacity: capacity || "50",
          venue: venue.trim() || (format.includes("Virtual") ? "Online (Google Meet)" : "Coimbatore Hub TBA"),
          description: description.trim(),
          supportRequested: supportRequested.trim() || "Ticketing, promotion & community reach",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit event proposal. Please try again.");
      }

      setSubmittedRef(data.referenceCode || "EVT-CONFIRMED");
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
          Event Proposal Submitted!
        </h3>
        <p className="mt-2 max-w-lg text-xs sm:text-sm leading-relaxed text-emerald-800">
          Your event proposal has been queued for review by the CSC Events &amp; Program Committee. If approved, our team will assist you with scheduling, venue coordination, pass issuance, and broadcast promotion across our network.
        </p>
        <div className="mt-4 rounded-2xl bg-white/80 p-4 text-xs text-emerald-900 ring-1 ring-emerald-200">
          Questions or date urgency? Reach the Events Desk directly at{" "}
          <a href="mailto:coimbatorestartupcommunity@gmail.com" className="font-semibold underline">
            coimbatorestartupcommunity@gmail.com
          </a>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSubmittedRef(null);
            setTitle("");
            setDescription("");
            setSupportRequested("");
          }}
          className="mt-6 text-xs font-semibold"
        >
          Propose Another Event
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-900">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="evt-org-name" className="text-xs font-semibold text-brand-ink">
            Organizer / Host Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="evt-org-name"
            value={organizerName}
            onChange={(e) => setOrganizerName(e.target.value)}
            placeholder="e.g. Senthil Nathan"
            required
            className="rounded-xl border-brand-border text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="evt-company" className="text-xs font-semibold text-brand-ink">
            Organization or Startup Affiliation
          </Label>
          <Input
            id="evt-company"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. TechSprint Labs / Independent Host"
            className="rounded-xl border-brand-border text-xs"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="evt-email" className="text-xs font-semibold text-brand-ink">
            Contact Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="evt-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. organizer@startup.in"
            required
            className="rounded-xl border-brand-border text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="evt-phone" className="text-xs font-semibold text-brand-ink">
            Phone / WhatsApp Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="evt-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +91 98765 43210"
            required
            className="rounded-xl border-brand-border text-xs"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="evt-title" className="text-xs font-semibold text-brand-ink">
          Proposed Event Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="evt-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Zero to One: Scaling AI Infrastructure from Coimbatore"
          required
          className="rounded-xl border-brand-border text-xs"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="evt-category" className="text-xs font-semibold text-brand-ink">
            Format Category <span className="text-red-500">*</span>
          </Label>
          <select
            id="evt-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-brand-border bg-white p-2.5 text-xs text-brand-ink focus:outline-brand-ink"
          >
            {eventCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="evt-format" className="text-xs font-semibold text-brand-ink">
            Mode / Venue Type <span className="text-red-500">*</span>
          </Label>
          <select
            id="evt-format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="rounded-xl border border-brand-border bg-white p-2.5 text-xs text-brand-ink focus:outline-brand-ink"
          >
            {eventFormats.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="evt-capacity" className="text-xs font-semibold text-brand-ink">
            Expected Capacity
          </Label>
          <Input
            id="evt-capacity"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="e.g. 50"
            className="rounded-xl border-brand-border text-xs"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="evt-date" className="text-xs font-semibold text-brand-ink">
            Preferred Date &amp; Time Window
          </Label>
          <Input
            id="evt-date"
            type="text"
            value={proposedDate}
            onChange={(e) => setProposedDate(e.target.value)}
            placeholder="e.g. Mid December 2026, Saturday 4:00 PM IST"
            className="rounded-xl border-brand-border text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="evt-venue" className="text-xs font-semibold text-brand-ink">
            Proposed Location / Venue Address
          </Label>
          <Input
            id="evt-venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g. PSG-STEP Auditorium, Avinashi Rd or Google Meet"
            className="rounded-xl border-brand-border text-xs"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="evt-desc" className="text-xs font-semibold text-brand-ink">
          Event Outline, Agenda &amp; Target Audience <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="evt-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the session outline, learning takeaways, speaker profiles, and whether it caters to seed-stage founders, engineers, or early ideators."
          required
          className="rounded-2xl border border-brand-border p-3 text-xs text-brand-ink placeholder:text-brand-muted focus:outline-brand-ink"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="evt-support" className="text-xs font-semibold text-brand-ink">
          Support Requested from CSC Circle
        </Label>
        <textarea
          id="evt-support"
          rows={2}
          value={supportRequested}
          onChange={(e) => setSupportRequested(e.target.value)}
          placeholder="What do you need from us? (e.g. Venue partnership, digital pass issuance, WhatsApp broadcast promotion, audio/visual setup, speaker curation)."
          className="rounded-2xl border border-brand-border p-3 text-xs text-brand-ink placeholder:text-brand-muted focus:outline-brand-ink"
        />
      </div>

      <div className="mt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-brand-border/60 pt-4">
        <span className="text-[11px] text-brand-muted">
          All proposals are evaluated by CSC Events desk within 24–48 hours.
        </span>
        <Button
          type="submit"
          disabled={busy}
          className="w-full sm:w-auto min-w-[200px] gap-2 rounded-xl bg-brand-ink px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-ink/90 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Submitting Event…
            </>
          ) : (
            <>
              <Send className="size-4" /> Submit Event Proposal
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
