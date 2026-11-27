import type { Metadata } from "next";
import Link from "next/link";
import {
  UserPlus,
  ClipboardList,
  Send,
  Clock,
  BadgeCheck,
  Compass,
  Wallet,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { CtaLink } from "@/components/common/cta-link";
import { siteConfig, routes } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "CSC Membership Guide — Automated 5-Min Issuance & Digital Passes",
  description:
    "Everything about CSC Circle membership — 5-minute automated cryptographic approval, Apple & Google Wallet passes, member benefits, and ecosystem responsibilities.",
  alternates: { canonical: "/membership" },
};

const audience = [
  "Early-Stage & Scaling Startup Founders",
  "Technical Co-Founders, Full-Stack & AI Engineers",
  "Idea-Stage Innovators & Aspiring Builders",
  "Hardware, Manufacturing & DeepTech Operators",
  "Established Business Owners & Industrial MSMEs",
  "Angel Investors, Syndicates & Ecosystem Enablers",
  "University Student Creators & Campus Ambassadors",
  "Seasoned Industry Mentors & Technology Architects",
];

const steps = [
  {
    icon: UserPlus,
    title: "1. Authenticate with Google / Email",
    body: "Sign in with your verified Google account or email address to initiate your secure membership claim.",
  },
  {
    icon: ClipboardList,
    title: "2. Complete Profile Claim",
    body: "Select your entrepreneurial track (Founder, Builder, Mentor, or Enabler), enter your venture details, and upload your optional portrait.",
  },
  {
    icon: Clock,
    title: "3. 5-Minute Cryptographic Minting",
    body: "Our automated pipeline generates your sequential Founding Member number and cryptographically seals your identity with an SHA-256 integrity token in under 5 minutes.",
  },
  {
    icon: BadgeCheck,
    title: "4. Instant Digital Card Activation",
    body: "Your CSC Digital ID Card is issued instantly and your verified profile is indexed in the public Coimbatore Startup Directory.",
  },
  {
    icon: Wallet,
    title: "5. Export to Apple & Google Wallet",
    body: "Sync your pass directly to Apple Wallet (.pkpass) or Google Wallet for offline NFC/QR access at all meetups and check-in kiosks.",
  },
  {
    icon: Compass,
    title: "6. Join the 5 WhatsApp Circles",
    body: "Receive automatic access to our 5 curated WhatsApp circles: Announcements, Circle, Mind Sprint, Business Network, and Opportunities.",
  },
];

const benefits = [
  {
    title: "Official Digital Membership ID",
    body: "Issued with a unique Founding Member serial number, exportable to Apple Wallet and Google Wallet with dynamic QR authentication.",
  },
  {
    title: "Express Event Admission",
    body: "Fast-track QR admission for all CSC physical meetups, pitch arenas, and virtual Google Meet sessions across Coimbatore.",
  },
  {
    title: "Verified Founder Directory Listing",
    body: "Showcase your venture publicly to regional investors, corporate enablers, and potential co-founders with privacy-first contact controls.",
  },
  {
    title: "5 Curated WhatsApp Community Circles",
    body: "Engage in noise-free circles for peer feedback, daily engineering sprints (Mind Sprint), B2B matchmaking, and capital intelligence.",
  },
  {
    title: "1:1 Founder Guidance & Tech Clinics",
    body: "Book 30-minute advisory sessions covering software architecture, MVP roadmaps, and investor pitch deck reviews with seasoned mentors.",
  },
  {
    title: "Non-Dilutive Grant Radar (TANSEED / SISFS)",
    body: "Receive priority guidance and eligibility screenings for Tamil Nadu Startup Seed Grant (TANSEED ₹15L) and Startup India SISFS (₹50L).",
  },
];

const responsibilities = [
  "Provide true, accurate, and up-to-date information regarding your startup and credentials.",
  "Adhere strictly to the No-Cold-DM rule; never scrape directories or send unsolicited commercial pitches.",
  "Embrace the 'Give-First' spirit by contributing constructive peer feedback and mentorship.",
  "Never lend, transfer, or screenshot your cryptographic digital pass for third-party use.",
  "Respect proprietary data, cap tables, and unreleased prototypes shared during private founder roundtables.",
  "Uphold the highest standards of professional conduct across all 5 WhatsApp circles and live events.",
];

export default function MembershipPage() {
  return (
    <>
      <PageHero
        eyebrow="Membership Architecture"
        title="CSC Membership Guide"
        description="How membership works at Coimbatore Startup Community — from creating your account to receiving your 5-minute cryptographic digital ID card."
      />
      <section className="py-14 sm:py-16">
        <Container className="mx-auto flex max-w-4xl flex-col gap-14">
          {/* Overview Callout */}
          <div className="flex flex-col gap-4 rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                100% Free Lifetime Membership
              </span>
              <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
                Automated 5-Min Issuance
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">
              An Open, Founder-First Infrastructure for Coimbatore
            </h2>
            <p className="text-sm leading-relaxed text-brand-secondary">
              CSC membership connects you to Coimbatore Startup Community&apos;s digital platform and ecosystem initiatives — a
              verified member profile, cryptographic digital membership ID, the founder directory, express event passes, and
              our 5 curated WhatsApp circles. Membership is completely free for all founders, builders, and ecosystem leaders.
            </p>
          </div>

          {/* Registration Pipeline Steps */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Automated 5-Minute Pipeline
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">
                How Your Digital Pass is Issued
              </h2>
              <p className="mt-0.5 text-xs text-brand-secondary">
                From initial sign-in to Apple/Google Wallet synchronization in 6 simple steps.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((s, idx) => (
                <div
                  key={s.title}
                  className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs"
                >
                  <div className="flex flex-col gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-cloud text-brand-ink">
                      <s.icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-brand-ink">{s.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-brand-secondary">{s.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Who Can Participate */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Inclusivity &amp; Diversity
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">Who Can Participate?</h2>
              <p className="mt-0.5 text-xs text-brand-secondary">
                CSC is an open, non-exclusionary community. You do not need a registered entity (Pvt Ltd or LLP) to join.
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {audience.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-brand-border bg-brand-white p-3.5 shadow-xs"
                >
                  <span className="flex size-2 rounded-full bg-brand-accent shrink-0" />
                  <span className="text-xs font-semibold text-brand-ink">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Member Benefits */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Ecosystem Privileges
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">What Your Membership Unlocks</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((b) => (
                <div
                  key={b.title}
                  className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs"
                >
                  <div>
                    <h3 className="text-sm font-bold text-brand-ink">{b.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-brand-secondary">{b.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Member Responsibilities */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Ethical Stewardship
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">Member Responsibilities</h2>
              <p className="mt-0.5 text-xs text-brand-secondary">
                Maintaining high trust and psychological safety requires active accountability from every member.
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {responsibilities.map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-white p-4 shadow-xs"
                >
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                  <p className="text-xs leading-relaxed text-brand-secondary">{r}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ready to Join CTA */}
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-brand-cloud p-8 text-center sm:p-12">
            <span className="rounded-full bg-brand-white px-3.5 py-1 text-xs font-semibold text-brand-accent shadow-2xs">
              <Sparkles className="inline size-3.5 mr-1" /> Join Coimbatore&apos;s Founder Movement
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-ink">
              Ready to Claim Your Digital Membership Pass?
            </h2>
            <p className="max-w-md text-xs sm:text-sm text-brand-secondary">
              Create your account in seconds. Your digital membership card is cryptographically issued within 5 minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              <CtaLink href={routes.join} size="md">
                Claim Free Membership
              </CtaLink>
              <Link
                href="/members"
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-white px-5 py-2.5 text-xs font-semibold text-brand-ink shadow-2xs hover:bg-brand-cloud transition"
              >
                Explore Member Directory &rarr;
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
