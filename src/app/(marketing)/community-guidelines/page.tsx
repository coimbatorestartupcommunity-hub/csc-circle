import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldAlert,
  Video,
  MessageSquareX,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Users,
  Ban,
  HeartHandshake,
  Lock,
  ArrowRight,
} from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Community Guidelines & WhatsApp Rules — Coimbatore Startup Community",
  description:
    "Standards of founder mutualism, 5 WhatsApp community rules, virtual meeting etiquette, anti-spam policies, and our 3-stage escalation protocol for CSC Circle.",
  alternates: { canonical: "/community-guidelines" },
};

const whatsappCircleRules = [
  {
    name: "1. CSC Announcement (Broadcast Only)",
    charter: "Admin-only, zero-noise verified alerts.",
    rules: "Broadcast channel reserved for flagship summit announcements, StartupTN / Startup India partnerships, policy advisories, and pass releases. No chatter or promotional broadcasting permitted.",
  },
  {
    name: "2. CSC Circle (Main Community Hub)",
    charter: "Peer founder networking & collaboration.",
    rules: "Encouraged: introductions, product demos, UI/UX critiques, architecture teardowns, and asking for peer advice. Prohibited: commercial flyers, discount links, MLM schemes, and unverified news.",
  },
  {
    name: "3. CSC Mind Sprint (Innovation & Growth)",
    charter: "Daily engineering sprints & hackathons.",
    rules: "Dedicated to technical builders: Monday Logic puzzles, Tuesday product teardowns, Wednesday Build-in-Public sprints, Thursday tech challenges, and weekend hackathons. Strictly engineering and product focused.",
  },
  {
    name: "4. CSC Business Network (Enterprise & Capital)",
    charter: "Commercial B2B matchmaking & alliances.",
    rules: "Connecting traditional manufacturing enterprises (foundries, pumps, textiles, auto-components) with modern software startups and angel syndicates. Requires verified company details before sharing commercial RFPs.",
  },
  {
    name: "5. CSC Opportunities (Grants & Calls)",
    charter: "Capital intelligence & non-dilutive radar.",
    rules: "Curated updates on TANSEED (up to ₹15L), SISFS (up to ₹50L), BIRAC, NIDHI-PRAYAS, and tier-1 accelerator cohorts. All third-party grants must cite primary government or accelerator URLs.",
  },
];

const guidelines = [
  {
    title: "1. Respectful, Inclusive & Constructive Discourse",
    body: "Treat fellow founders, developers, creators, and mentors with dignity. We maintain zero tolerance for harassment, ad-hominem personal insults, discriminatory language, or hostile commentary in any official forum, WhatsApp circle, or live event.",
  },
  {
    title: "2. Strict No-Cold-DM & Anti-Solicitation Policy",
    body: "Extracting member phone numbers or directories to send unsolicited sales pitches, marketing flyers, recruitment spam, or private cold DMs without prior public discussion and consent is strictly prohibited and triggers an immediate permanent ecosystem ban.",
  },
  {
    title: "3. Give-First & Founder Mutualism Ethos",
    body: "CSC Circle operates on mutual founder solidarity. When asking for investor introductions, code reviews, or pilot testing, founders are expected to contribute feedback, advice, or mentorship to peer builders. We grow together.",
  },
  {
    title: "4. Honest Representation & Information Integrity",
    body: "Provide accurate details regarding your startup metrics, active funding, and team credentials. Do not misrepresent yourself as an officer, trustee, or official spokesperson of CSC or third-party institutions without written authority.",
  },
  {
    title: "5. Virtual Google Meet & Workshop Etiquette",
    body: "Keep microphones muted when not speaking; turn on video cameras when introducing yourself or pitching; keep chat commentary constructive; and respect moderators. Unsolicited screen sharing or trolling results in instant room removal.",
  },
  {
    title: "6. Anti-Scraping & Directory Protection",
    body: "Scraping member directories, extracting founder emails, downloading member ID cards, or capturing profile data via automated scrapers, scripts, or headless bots is strictly prohibited. Violators trigger automated IP bans and legal enforcement under the IT Act 2000.",
  },
  {
    title: "7. Intellectual Property & Confidentiality",
    body: "Respect proprietary technology, trade secrets, and pitch decks shared in good faith during private masterminds. Never post or redistribute third-party codebases, financial cap tables, or proprietary customer metrics without documented consent.",
  },
  {
    title: "8. Authentic Event Registration & Pass Stewardship",
    body: "Register for events only when genuinely intending to attend. Digital QR passes are non-transferable. If you cannot attend, cancel at least 48 hours in advance to release your reserved slot to waitlisted founders.",
  },
  {
    title: "9. Non-Poaching & Ethical Talent Sourcing",
    body: "While members may share genuine job openings in the CSC Opportunities circle, aggressively poaching key engineers or co-founders from early-stage peer ventures within CSC groups is strictly prohibited.",
  },
  {
    title: "10. Platform Security & Ethical Disclosures",
    body: "Do not attempt to probe, bypass rate limiters, or test vulnerabilities against CSC Circle infrastructure. If you identify a potential vulnerability, submit an encrypted report directly to our security engineering team under safe harbor rules.",
  },
];

const escalationSteps = [
  {
    step: "Stage 1",
    title: "Formal Notice & Message Deletion",
    description:
      "First-time minor infractions (such as commercial flyers or unformatted spam in community circles) result in immediate deletion of offending material and an official written warning from community moderators.",
    accent: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    step: "Stage 2",
    title: "30-Day Suspension & Pass Revocation",
    description:
      "Repeated misconduct, persistent promotional posting, or disruptive meeting behavior results in a 30-day mute across all 5 WhatsApp circles, withdrawal of active event passes, and temporary directory delisting.",
    accent: "text-rose-700 bg-rose-50 border-rose-200",
  },
  {
    step: "Stage 3",
    title: "Permanent ID Invalidation & Ban",
    description:
      "Severe violations (such as unsolicited private cold DMs, directory scraping, harassment, or fraudulent claims) result in permanent cancellation of the CSC Digital ID Card, removal from all groups, and an irreversible ban.",
    accent: "text-red-800 bg-red-100 border-red-300",
  },
];

export default function CommunityGuidelinesPage() {
  return (
    <>
      <PageHero
        eyebrow="Community Standards"
        title="Community Guidelines"
        description="Our shared code of conduct and 5 WhatsApp circle rules to ensure Coimbatore Startup Community remains an open, trusted, and high-impact environment for all builders."
      />

      <section className="py-14 sm:py-16">
        <Container className="mx-auto flex max-w-4xl flex-col gap-14">
          {/* Intro callout */}
          <div className="rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold text-brand-ink">Building on Mutual Respect, Integrity &amp; Trust</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-secondary">
              These guidelines apply across all CSC touchpoints — including our digital platform, the 5 official WhatsApp
              community circles, virtual Google Meet workshops, and in-person founder meetups across Coimbatore. They operate
              in conjunction with our{" "}
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

          {/* 5 WhatsApp Circle Guidelines */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                WhatsApp Ecosystem Scopes
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">
                Specific Charters for the 5 Official WhatsApp Groups
              </h2>
              <p className="mt-0.5 text-xs text-brand-secondary">
                Every member is expected to adhere to the designated scope of each group to preserve high signal.
              </p>
            </div>

            <div className="grid gap-4">
              {whatsappCircleRules.map((circle) => (
                <div
                  key={circle.name}
                  className="rounded-2xl border border-brand-border bg-brand-white p-5 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-brand-ink">{circle.name}</h3>
                    <span className="text-[11px] font-semibold text-brand-accent">{circle.charter}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-brand-secondary">{circle.rules}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Core Principles */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Foundational Code of Conduct
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">Core Ecosystem Principles</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Moderation Enforcement
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">
                3-Stage Escalation Protocol
              </h2>
              <p className="mt-0.5 text-xs text-brand-secondary">
                How our moderation desk manages guideline infractions and protects community safety.
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
              <h3 className="text-sm font-bold text-brand-ink">Report a Concern or Guideline Violation</h3>
              <p className="mt-0.5 text-xs text-brand-secondary">
                All reports are handled with strict confidentiality by the Community Engagement &amp; Member Welfare Desk.
              </p>
            </div>
            <a
              href="mailto:coimbatorestartup.community@gmail.com?subject=Confidential%20Guideline%20Violation%20Report"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-ink px-5 py-2.5 text-xs font-semibold text-brand-white transition hover:bg-brand-ink/90"
            >
              <ShieldCheck className="size-3.5" /> Submit Confidential Report
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
