"use client";

import * as React from "react";
import { Sparkles, Calendar, Clock, Send, CheckCircle2, Loader2, Video, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const advisoryTracks = [
  {
    id: "ai-arch",
    title: "AI & Platform Engineering Architecture",
    host: "Logic Intelligence Technologies",
    desc: "1:1 technical review of cloud scaling, edge routing, model fine-tuning, and infrastructure cost optimization.",
  },
  {
    id: "tanseed-pitch",
    title: "TANSEED Grant Blueprint & Pitch Deck",
    host: "CSC Ecosystem Advisory",
    desc: "Refining grant narrative, unit economics, market size, and presentation flow for Tamil Nadu startup grants.",
  },
  {
    id: "b2b-gtm",
    title: "B2B Go-To-Market & Pilot Strategy",
    host: "CSC Founder-in-Residence",
    desc: "Enterprise client outreach, inbound lead funnel, and converting pilots into recurring contracts in Coimbatore.",
  },
  {
    id: "equity-legal",
    title: "Co-Founder Equity & Incorporation Structuring",
    host: "Legal & Governance Desk",
    desc: "Vesting schedules, cap table planning, shareholder agreements, and IP assignment for early-stage teams.",
  },
];

export function BookOfficeHours({
  userFullName,
  userEmail,
  userStartup,
}: {
  userFullName?: string;
  userEmail?: string;
  userStartup?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selectedTrack, setSelectedTrack] = React.useState(advisoryTracks[0].title);
  const [fullName, setFullName] = React.useState(userFullName || "");
  const [email, setEmail] = React.useState(userEmail || "");
  const [startup, setStartup] = React.useState(userStartup || "");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [challenge, setChallenge] = React.useState("");
  const [preferredSlot, setPreferredSlot] = React.useState("Next Tuesday · 4:00 PM IST");
  const [busy, setBusy] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !startup.trim() || !challenge.trim() || !whatsapp.trim()) {
      toast.error("Please fill in all mandatory fields.");
      return;
    }

    setBusy(true);
    try {
      const fullChallengeText = `[Advisory Track: ${selectedTrack}] [Preferred Slot: ${preferredSlot}]\n\nStartup Challenge / Agenda:\n${challenge.trim()}`;

      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          startup: startup.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          challenge: fullChallengeText,
          consent: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to schedule office hours.");
      }

      setSubmitted(true);
      toast.success("Office hours consultation request confirmed!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      {!open ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-brand-border bg-gradient-to-br from-brand-cloud/80 via-white to-brand-cloud/40 p-6 sm:p-7 shadow-xs">
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-ink text-white shadow-xs">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-brand-ink">
                Book 30-Minute Monthly Founder Office Hours
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-brand-secondary leading-relaxed">
                Connect 1:1 with seasoned engineering architects, seed investors, and mentors across Coimbatore.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-2xl bg-brand-ink px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-ink/90 cursor-pointer min-h-11"
          >
            Book Free Office Hours
          </Button>
        </div>
      ) : (
        <div className="rounded-3xl border border-brand-border bg-white p-6 sm:p-8 shadow-sm">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="size-7" />
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-brand-ink">
                Office Hours Request Confirmed!
              </h3>
              <p className="mt-2 max-w-md text-xs sm:text-sm text-brand-secondary leading-relaxed">
                Your 30-minute advisory slot for <strong>{selectedTrack}</strong> has been received. Our advisory desk will confirm your Google Meet calendar invite within 24 hours.
              </p>
              <Button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setOpen(false);
                }}
                className="mt-6 rounded-xl bg-brand-ink px-6 text-xs font-semibold text-white cursor-pointer"
              >
                Back to Consultations
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-cloud px-3 py-0.5 text-xs font-semibold text-brand-accent">
                    <Video className="size-3.5" /> 1:1 Founder Advisory
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-brand-ink">
                    Schedule Founder Office Hours
                  </h3>
                  <p className="text-xs text-brand-secondary">
                    30-minute private consultation via Google Meet with domain leads.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-2 text-brand-muted hover:bg-brand-cloud cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Advisory Track Selector */}
              <div className="flex flex-col gap-2.5">
                <Label className="text-xs font-semibold text-brand-ink">
                  Select Advisory Focus Track <span className="text-red-500">*</span>
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {advisoryTracks.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => setSelectedTrack(track.title)}
                      className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition ${
                        selectedTrack === track.title
                          ? "border-brand-ink bg-brand-cloud/60 ring-1 ring-brand-ink"
                          : "border-brand-border bg-white hover:bg-brand-cloud/30"
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-accent">
                          {track.host}
                        </span>
                        <h4 className="mt-1 text-xs font-bold text-brand-ink">{track.title}</h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-brand-secondary">
                          {track.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="oh-name" className="text-xs font-semibold text-brand-ink">
                    Your Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="oh-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Anand Kumar"
                    required
                    className="rounded-xl border-brand-border text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="oh-startup" className="text-xs font-semibold text-brand-ink">
                    Startup Name / Venture <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="oh-startup"
                    value={startup}
                    onChange={(e) => setStartup(e.target.value)}
                    placeholder="e.g. BuildFlow Technologies"
                    required
                    className="rounded-xl border-brand-border text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="oh-email" className="text-xs font-semibold text-brand-ink">
                    Google Meet Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="oh-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@example.com"
                    required
                    className="rounded-xl border-brand-border text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="oh-phone" className="text-xs font-semibold text-brand-ink">
                    WhatsApp Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="oh-phone"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                    className="rounded-xl border-brand-border text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="oh-slot" className="text-xs font-semibold text-brand-ink">
                  Preferred Time Slot Window
                </Label>
                <select
                  id="oh-slot"
                  value={preferredSlot}
                  onChange={(e) => setPreferredSlot(e.target.value)}
                  className="rounded-xl border border-brand-border bg-white p-3 text-sm text-brand-ink focus:outline-brand-ink"
                >
                  <option value="Next Tuesday · 4:00 PM IST">Next Tuesday · 4:00 PM IST</option>
                  <option value="Next Thursday · 5:30 PM IST">Next Thursday · 5:30 PM IST</option>
                  <option value="Next Saturday · 11:00 AM IST">Next Saturday · 11:00 AM IST</option>
                  <option value="Next Saturday · 3:00 PM IST">Next Saturday · 3:00 PM IST</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-0 max-w-full">
                <Label htmlFor="oh-challenge" className="text-xs font-semibold text-brand-ink">
                  Primary Challenge / Discussion Topic <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="oh-challenge"
                  rows={4}
                  value={challenge}
                  onChange={(e) => setChallenge(e.target.value)}
                  placeholder="e.g. Next.js deployment scaling, TANSEED deck review, or B2B pricing"
                  required
                  className="min-w-0 max-w-full w-full resize-y break-words rounded-2xl border border-brand-border p-3.5 sm:p-4 text-xs sm:text-sm text-brand-ink placeholder:text-xs sm:placeholder:text-sm placeholder:text-brand-muted/70 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:outline-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-brand-border/60 pt-4">
                <span className="text-xs text-brand-muted">
                  Calendar invites with Google Meet access are dispatched after slot review.
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={busy}
                    className="gap-2 rounded-xl bg-brand-ink px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-ink/90 cursor-pointer min-h-11"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Scheduling…
                      </>
                    ) : (
                      <>
                        <Send className="size-4" /> Confirm Booking Request
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
