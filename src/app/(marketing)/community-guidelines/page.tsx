import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, Video, MessageSquareX, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";

export const metadata: Metadata = {
  title: "Community Guidelines — Coimbatore Startup Community",
  description:
    "Standards of professional collaboration, virtual meeting etiquette, anti-spam policies, and our 3-stage escalation protocol for CSC Circle.",
  alternates: { canonical: "/community-guidelines" },
};

const guidelines = [
  {
    title: "1. Respectful & Inclusive Communication",
    body: "Treat fellow founders, developers, creators, and mentors with dignity. We maintain zero tolerance for harassment, personal insults, discriminatory language, or hostile discourse in any official forum, comment thread, or live event.",
  },
  {
    title: "2. Honest Representation & Information Integrity",
    body: "Provide accurate details regarding your startup, operational metrics, funding status, and team credentials. Do not misrepresent yourself as an officer, partner, or spokesperson of CSC or third-party organizations without explicit authorization.",
  },
  {
    title: "3. Virtual Google Meet & Workshop Etiquette",
    body: "When attending virtual sessions: keep microphones muted when not speaking; turn on video cameras when introducing yourself or pitching; keep chat commentary constructive; and respect meeting facilitators. Unsolicited screen sharing or disruption will result in instant room removal.",
  },
  {
    title: "4. Anti-Spam & Unsolicited Sales Restrictions",
    body: "CSC Circle is a founder collaboration space, not a broadcast lead generator. Do not blast unsolicited sales pitches, speculative cryptocurrency schemes, multi-level marketing campaigns, or generic cold pitches in community groups or member direct messages.",
  },
  {
    title: "5. Anti-Scraping & Directory Protection",
    body: "Scraping member directories, extracting founder emails, downloading member ID cards, or capturing profile data via automated scrapers, scripts, or headless bots is strictly prohibited. Violators trigger automated IP bans and legal enforcement.",
  },
  {
    title: "6. Intellectual Property & Confidentiality",
    body: "Respect proprietary technology, trade secrets, and pitch deck materials shared by other founders in trust. Never post or redistribute third-party code, pitch materials, or confidential customer metrics without documented consent.",
  },
  {
    title: "7. Authentic Event Registration & Pass Use",
    body: "Register for events only when genuinely planning to attend. Digital QR passes are issued to individual registered members and are strictly non-transferable. If unable to attend, cancel at least 48 hours prior to free up space for waitlisted founders.",
  },
  {
    title: "8. Platform Security & Ethical Disclosures",
    body: "Do not attempt to probe, bypass rate limiters, or test vulnerabilities against CSC Circle infrastructure. If you discover a potential vulnerability, submit an encrypted report directly to our security engineering team under safe harbor rules.",
  },
];

const escalationSteps = [
  {
    step: "Stage 1",
    title: "Formal Notice & Warning",
    description: "First-time minor infractions (e.g. promotional spam in open chat) result in a written warning from community moderators and deletion of the offending material.",
    icon: AlertTriangle,
    accent: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    step: "Stage 2",
    title: "30-Day Suspension & Pass Revocation",
    description: "Repeated misconduct or deliberate disruptions result in a 30-day suspension of member portal access, withdrawal of active event passes, and temporary directory delisting.",
    icon: ShieldAlert,
    accent: "text-rose-600 bg-rose-50 border-rose-200",
  },
  {
    step: "Stage 3",
    title: "Permanent ID Cancellation & Ban",
    description: "Severe violations (harassment, data scraping, credential abuse, fraudulent claims) lead to permanent revocation of the CSC Digital ID Card and an irreversible ecosystem ban.",
    icon: MessageSquareX,
    accent: "text-red-700 bg-red-100 border-red-300",
  },
];

export default function CommunityGuidelinesPage() {
  return (
    <>
      <PageHero
        eyebrow="Community Standards"
        title="Community Guidelines"
        description="Our shared code of conduct to ensure Coimbatore Startup Community remains an open, trusted, and high-impact environment for all builders."
      />

      <section className="py-14">
        <Container className="mx-auto flex max-w-3xl flex-col gap-12">
          {/* Intro callout */}
          <div className="rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8">
            <h2 className="text-base font-bold text-brand-ink">Building on Mutual Respect and Integrity</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-secondary">
              These guidelines apply across all CSC touchpoints — including digital portal interactions, WhatsApp discussion communities, virtual Google Meet workshops, and in-person hackathons. They operate in conjunction with our{" "}
              <Link href="/terms" className="font-semibold text-brand-accent underline underline-offset-2">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-brand-accent underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          {/* Guideline items */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">Core Principles</h2>
            <div className="flex flex-col gap-3">
              {guidelines.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-brand-border bg-brand-white p-5 shadow-xs"
                >
                  <h3 className="text-sm font-bold text-brand-ink">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-brand-secondary">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Escalation Framework */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-ink">3-Stage Escalation Protocol</h2>
              <p className="mt-0.5 text-xs text-brand-secondary">
                How our moderation team manages guideline infractions and maintains community safety.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {escalationSteps.map((s) => (
                <div
                  key={s.step}
                  className={`flex flex-col justify-between rounded-2xl border p-5 ${s.accent}`}
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">{s.step}</span>
                    <h3 className="text-sm font-bold text-brand-ink">{s.title}</h3>
                    <p className="text-xs leading-relaxed text-brand-secondary">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reporting Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-brand-cloud p-6 text-center sm:text-left">
            <div>
              <h3 className="text-sm font-bold text-brand-ink">Report a Concern or Guideline Infraction</h3>
              <p className="mt-0.5 text-xs text-brand-secondary">
                All reports are handled with strict confidentiality by community administrators.
              </p>
            </div>
            <a
              href="mailto:coimbatorestartup.csc@gmail.com?subject=Guideline%20Violation%20Report"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-ink px-4 py-2 text-xs font-semibold text-brand-white transition hover:bg-brand-ink/90"
            >
              <ShieldCheck className="size-3.5" /> Submit Confidential Report
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
