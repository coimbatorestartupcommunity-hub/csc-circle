import type { Metadata } from "next";
import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  ShieldCheck,
  Mail,
  HelpCircle,
  Sparkles,
  PhoneCall,
  Users,
  Wallet,
  FileCheck2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Help & FAQ — Coimbatore Startup Community",
  description:
    "Comprehensive answers covering official WhatsApp circles, 24/7 hotline powered by Logic Intelligence Technologies (LIT), digital membership IDs, Apple/Google Wallet cards, event check-in, legal agreements, and platform security.",
  alternates: { canonical: "/help" },
};

interface FAQItem {
  q: string;
  a: React.ReactNode;
}

interface FAQCategory {
  category: string;
  description: string;
  items: FAQItem[];
}

const faq: FAQCategory[] = [
  {
    category: "WhatsApp AI Concierge (LIT) & 5 Community Circles",
    description: "24/7 AI hotline (+91 75500 67712), enterprise cloud routing powered by Logic Intelligence Technologies (LIT), and the 5 official community circles.",
    items: [
      {
        q: "What is the official 24/7 WhatsApp Hotline (+91 75500 67712)?",
        a: (
          <>
            CSC Circle operates an enterprise AI hotline on{" "}
            <strong>+91 75500 67712</strong> powered by Logic Intelligence Technologies (LIT) cloud infrastructure. It provides instant 24/7 support
            for verifying digital membership status, retrieving active event pass QR codes, finding virtual Google Meet
            links, and answering questions in both English and Tamil. You can message anytime at{" "}
            <a
              href={siteConfig.social.whatsappAgent}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-accent underline underline-offset-2"
            >
              wa.me/917550067712
            </a>
            .
          </>
        ),
      },
      {
        q: "What are the 5 Official WhatsApp Community Circles and how do I join?",
        a: (
          <div className="flex flex-col gap-2">
            <p>
              To maintain high signal and eliminate spam, CSC maintains 5 dedicated WhatsApp circles, each with a strict scope:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-brand-secondary">
              <li>
                <strong>1. CSC Announcement:</strong> Admin-only, zero-noise broadcast for flagship summits, StartupTN &amp; Startup India alerts, and pass rollouts.
              </li>
              <li>
                <strong>2. CSC Circle:</strong> Main founder network for introductions, peer discussions, product showcases, UI/UX critiques, and founder matchmaking.
              </li>
              <li>
                <strong>3. CSC Mind Sprint:</strong> Innovation &amp; build hub featuring daily engineering challenges (Monday Logic), product teardowns, Build-in-Public sprints, and hackathons.
              </li>
              <li>
                <strong>4. CSC Business Network:</strong> B2B enterprise matchmaking, connecting traditional Coimbatore manufacturing (foundries, pumps, textiles) with tech startups and angel syndicates.
              </li>
              <li>
                <strong>5. CSC Opportunities:</strong> Capital radar delivering verified alerts on non-dilutive grants (TANSEED ₹15L, SISFS ₹50L, BIRAC) and top accelerator cohorts.
              </li>
            </ul>
            <p className="mt-1">
              All 5 groups are accessible directly from our{" "}
              <Link href="/contact" className="font-semibold text-brand-accent underline underline-offset-2">
                Contact &amp; Circles directory
              </Link>
              .
            </p>
          </div>
        ),
      },
      {
        q: "Is my WhatsApp phone number kept private?",
        a: "Yes. In compliance with the DPDP Act 2023, your telephone number is strictly private by default. It is never displayed on the public member directory unless you explicitly toggle phone visibility in your profile privacy settings. Inbound hotline messages are encrypted and processed solely for requested services.",
      },
    ],
  },
  {
    category: "Digital Membership ID & Multi-Platform Wallets",
    description: "Automated 5-minute cryptographic issuance, Apple Wallet (.pkpass), and Google Wallet integration.",
    items: [
      {
        q: "How does the automated 5-minute membership issuance pipeline work?",
        a: "Membership ID claims are processed via an automated cryptographic pipeline. When you sign in with Google or email and submit your profile details, our system validates the record, assigns your unique sequential Founding Member serial number, signs the record with an SHA-256 seal, and mints your active Digital ID automatically within 5 minutes.",
      },
      {
        q: "Can I add my CSC Membership Card to Apple Wallet and Google Wallet?",
        a: (
          <>
            Yes! Once your membership is approved, visit your{" "}
            <Link href="/profile/id-card" className="font-semibold text-brand-accent underline underline-offset-2">
              Digital ID Card
            </Link>{" "}
            dashboard. You can download an official <strong>Apple Wallet (.pkpass)</strong> file for your iPhone / Apple Watch or click <strong>Save to Google Wallet</strong> on Android devices for one-tap offline NFC/QR access.
          </>
        ),
      },
      {
        q: "How do ecosystem partners and venues verify my CSC Digital ID?",
        a: "Each digital card displays a secure cryptographic QR code. Scanning the QR code resolves to our public verification endpoint (/verify/member/[id]), confirming active membership status, name, and validity without exposing private personal credentials.",
      },
      {
        q: "Can I transfer my Digital ID to a team member or co-founder?",
        a: "No. Digital IDs are strictly non-transferable and permanently bound to the authenticated individual's account. Lending or transferring digital passes results in immediate revocation under our Community Guidelines.",
      },
      {
        q: "What should I do if my name, startup, or designation needs an update?",
        a: (
          <>
            You can update your display profile directly from your member dashboard. If your core verified data requires re-minting, email{" "}
            <a
              href="mailto:coimbatorestartup.tech@gmail.com?subject=ID%20Card%20Update%20Request"
              className="font-semibold text-brand-accent underline underline-offset-2"
            >
              coimbatorestartup.tech@gmail.com
            </a>{" "}
            with your registered account details.
          </>
        ),
      },
    ],
  },
  {
    category: "Event Passes, Check-In & Google Meet Portal",
    description: "Ticketing passes, the 1-hour pre-session virtual gate, and 100% refund guarantee.",
    items: [
      {
        q: "How does the virtual Google Meet check-in process work?",
        a: (
          <>
            For virtual events, the automated check-in portal unlocks on the{" "}
            <Link href="/events/google-meet/check-in" className="font-semibold text-brand-accent underline underline-offset-2">
              Virtual Check-in page
            </Link>{" "}
            exactly <strong>1 hour before session start</strong> (e.g., at 2:00 PM IST for a 3:00 PM session). Attendees can scan their pass QR code or type their Pass Reference / email to be automatically validated and redirected into the private Google Meet session.
          </>
        ),
      },
      {
        q: "Do I need to sign in to browse events or join the live check-in portal?",
        a: (
          <>
            No. Browsing the{" "}
            <Link href="/events" className="font-semibold text-brand-accent underline underline-offset-2">
              Events calendar
            </Link>{" "}
            and accessing the check-in gate are open. Authenticated sign-in is required only when reserving a ticketed pass.
          </>
        ),
      },
      {
        q: "What is the cancellation and refund policy for paid workshops?",
        a: "For ticketed masterclasses with fees, cancellation requests submitted up to 48 hours before session start qualify for a 100% refund. If CSC reschedules or cancels an event, full refunds are automatically dispatched within 5 to 7 business days to the originating UPI/bank account.",
      },
      {
        q: "How do express physical check-in kiosks work at in-person meetups?",
        a: "At offline venues (such as CODISSIA or TIDEL Park), present your digital pass QR code from your phone screen or Apple/Google Wallet. Kiosks verify the signature in under 1 second for express admission.",
      },
    ],
  },
  {
    category: "Digital Agreements & Legal Execution",
    description: "Leadership Charters, Speaker MoUs, and digital signatures under Section 10A IT Act 2000.",
    items: [
      {
        q: "Are digital agreements on CSC Circle legally binding under Indian Law?",
        a: "Yes. Digital agreements (such as Executive Leadership Charters, Speaker Memorandums of Understanding, and Partnership Agreements) executed on CSC Circle are legally binding electronic records governed by Section 10A of the Information Technology Act 2000 and the Indian Contract Act 1872. Each agreement is cryptographically timestamped and sealed with an SHA-256 integrity hash.",
      },
      {
        q: "Who is required to execute a digital agreement on the platform?",
        a: "Executive council leaders, invited speakers, institutional co-hosts, and strategic corporate partners execute formal charters before programs commence to ensure mutual alignment, confidentiality, and fiduciary accountability.",
      },
    ],
  },
  {
    category: "1:1 Founder Guidance & Consultations",
    description: "Booking advice sessions with senior founders, mentors, and technology architects.",
    items: [
      {
        q: "Who qualifies for a 1:1 Founder Guidance session?",
        a: (
          <>
            Any registered CSC member actively validating an MVP or scaling a venture can request guidance. Submit your request via the{" "}
            <Link href="/contact#consultation" className="font-semibold text-brand-accent underline underline-offset-2">
              Founder Consultation Form
            </Link>{" "}
            specifying your current stage, domain, and specific technical or business bottlenecks.
          </>
        ),
      },
      {
        q: "What topics can be covered during consultations?",
        a: "Consultations cover software & AI architecture, tech stack selection, go-to-market strategies, TANSEED/grant applications, and angel investor pitch deck reviews.",
      },
      {
        q: "What is the response SLA for consultation requests?",
        a: "Our advisory committee reviews consultation briefs weekly and responds within 48 to 72 business hours to schedule a 30-minute virtual advisory session.",
      },
    ],
  },
  {
    category: "Startup Directory & Moderation",
    description: "Showcasing your venture, submission requirements, and moderation guidelines.",
    items: [
      {
        q: "How do I list my startup in the CSC Directory?",
        a: (
          <>
            Registered members can submit their company via the member portal. Provide your venture name, website, sector, stage, and founder details. Submissions undergo 24-hour community moderation before appearing in the public{" "}
            <Link href="/directory" className="font-semibold text-brand-accent underline underline-offset-2">
              Startup Directory
            </Link>
            .
          </>
        ),
      },
      {
        q: "What criteria must a startup meet for approval?",
        a: "Startups must represent an active venture, prototype, or tech-enabled business. Speculative crypto schemes, multi-level marketing (MLM), and deceptive listings are permanently rejected.",
      },
    ],
  },
  {
    category: "Security, Privacy & Data Rights",
    description: "DPDP compliance, data protection, sub-processors, and vulnerability disclosures.",
    items: [
      {
        q: "How does CSC protect personal information under the Indian DPDP Act 2023?",
        a: (
          <>
            CSC enforces PostgreSQL Row-Level Security (RLS), role-based privilege isolation, and strict purpose limitation. Contact numbers are never publicly scraped. Read our comprehensive{" "}
            <Link href="/privacy" className="font-semibold text-brand-accent underline underline-offset-2">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/security" className="font-semibold text-brand-accent underline underline-offset-2">
              Security Practices
            </Link>
            .
          </>
        ),
      },
      {
        q: "Who should security researchers contact regarding vulnerabilities?",
        a: (
          <>
            Send responsible disclosure reports to{" "}
            <a
              href="mailto:hello@logicintelligencetechnologies.in?subject=Security%20Vulnerability%20Report"
              className="font-semibold text-brand-accent underline underline-offset-2"
            >
              hello@logicintelligencetechnologies.in
            </a>
            . We acknowledge valid reports within 24 hours under our Safe Harbor commitment.
          </>
        ),
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHero
        eyebrow="Knowledge Base & FAQ"
        title="Help & FAQ"
        description="Comprehensive answers covering official WhatsApp circles, 24/7 hotline powered by Logic Intelligence Technologies (LIT), digital membership IDs, Apple/Google Wallet cards, event check-in, legal agreements, and platform security."
      />
      <section className="py-14 sm:py-16">
        <Container className="mx-auto flex max-w-4xl flex-col gap-12">
          {/* Quick Support Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-50/50 p-6 shadow-xs">
            <div className="flex items-center gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <PhoneCall className="size-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-brand-ink">
                  Need Immediate Help? Message Our 24/7 Hotline
                </h3>
                <p className="text-xs text-brand-secondary">
                  Instant automated support on WhatsApp at {siteConfig.social.whatsappAgentPhone} powered by Logic Intelligence Technologies (LIT).
                </p>
              </div>
            </div>
            <a
              href={siteConfig.social.whatsappAgent}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              Chat on WhatsApp &rarr;
            </a>
          </div>

          {/* Accordion FAQ Groups */}
          {faq.map((group) => (
            <div key={group.category} className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-brand-ink">{group.category}</h2>
                <p className="mt-1 text-xs text-brand-secondary">{group.description}</p>
              </div>
              <div className="flex flex-col gap-3">
                {group.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-2xl border border-brand-border bg-brand-white p-5 transition-colors open:bg-brand-cloud/40"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-brand-ink [&::-webkit-details-marker]:hidden">
                      <span>{item.q}</span>
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0 text-brand-muted transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <div className="mt-3 text-sm leading-relaxed text-brand-secondary">{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          ))}

          {/* Segmented Help Desks and Guidance */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-cloud text-brand-ink">
                <Mail className="size-4" />
              </span>
              <h3 className="text-base font-bold text-brand-ink">7 Core Leadership Desks</h3>
              <p className="text-xs leading-relaxed text-brand-secondary">
                Connect directly with our 7 specialized executive desks covering President, Partnerships, CEO, CTO, Community, Operations, and Brand.
              </p>
              <Link
                href="/contact"
                className="mt-2 inline-flex items-center text-xs font-semibold text-brand-accent hover:underline"
              >
                View all leadership desks &rarr;
              </Link>
            </div>

            <div className="flex flex-col gap-2 rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-cloud text-brand-ink">
                <Sparkles className="size-4" />
              </span>
              <h3 className="text-base font-bold text-brand-ink">Request Founder Consultation</h3>
              <p className="text-xs leading-relaxed text-brand-secondary">
                Need customized guidance on your tech stack, MVP roadmap, or TANSEED grant applications? Request a 1:1 advisory slot.
              </p>
              <Link
                href="/contact#consultation"
                className="mt-2 inline-flex items-center text-xs font-semibold text-brand-accent hover:underline"
              >
                Submit consultation form &rarr;
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
