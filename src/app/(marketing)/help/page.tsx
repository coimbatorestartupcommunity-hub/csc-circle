import type { Metadata } from "next";
import * as React from "react";
import Link from "next/link";
import { ChevronDown, ShieldCheck, Mail, HelpCircle, Sparkles } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Answers to common questions about CSC Circle — digital membership IDs, Google Meet check-in, event passes, founder consultations, security, and getting support.",
  alternates: { canonical: "/help" },
};

const email = siteConfig.social.email;

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
    category: "General CSC & Ecosystem",
    description: "Learn about the mission, eligibility, and community structure of Coimbatore Startup Community.",
    items: [
      {
        q: "What is CSC Circle?",
        a: "CSC Circle is the official digital platform of the Coimbatore Startup Community (CSC) — an independent founder-first initiative uniting entrepreneurs, early builders, innovators, and mentors across Coimbatore and Tamil Nadu to collaborate, accelerate growth, and showcase ventures.",
      },
      {
        q: "Who can participate in CSC Circle?",
        a: "CSC welcomes early-stage founders, bootstrapped creators, student builders, technical engineers, and ecosystem partners. Whether you run an established venture or are validating your first MVP, CSC offers community support, mentorship, and peer collaboration.",
      },
      {
        q: "Do I need a registered entity (Pvt Ltd, LLP) to join?",
        a: "No. You do not need a registered legal entity to join the community or attend open events. Anyone actively conceptualizing, building, or mentoring a venture can register for a member profile and access community resources.",
      },
      {
        q: "Where can members find official CSC updates and programs?",
        a: (
          <>
            Official updates are posted across the{" "}
            <Link href="/events" className="font-semibold text-brand-accent underline underline-offset-2">
              Events
            </Link>{" "}
            schedule, curated in{" "}
            <Link href="/resources" className="font-semibold text-brand-accent underline underline-offset-2">
              Resources
            </Link>
            , announced on{" "}
            <Link href="/updates" className="font-semibold text-brand-accent underline underline-offset-2">
              Updates
            </Link>
            , and broadcast across our official WhatsApp, LinkedIn, and Instagram channels.
          </>
        ),
      },
    ],
  },
  {
    category: "Digital Membership ID & Cards",
    description: "Understanding issuance, automated verification, lost cards, and ID privileges.",
    items: [
      {
        q: "How does the digital membership ID card approval pipeline work?",
        a: "Membership ID claims are processed via an automated 5-minute cryptographic verification pipeline. Upon submitting your profile details and verifying your account via Google Auth, your cryptographic ID card hash is minted and ready automatically after 5 minutes.",
      },
      {
        q: "Where do I access or view my Digital Membership ID?",
        a: (
          <>
            Sign in to your account and navigate to{" "}
            <Link href="/member/id-card" className="font-semibold text-brand-accent underline underline-offset-2">
              Digital ID Card
            </Link>
            . You can view your real-time verified badge, verification QR token, issue date, and member tier anytime.
          </>
        ),
      },
      {
        q: "Can I transfer my Digital Membership ID to a co-founder or colleague?",
        a: "No. Digital IDs are strictly non-transferable, bound to the verified individual's authenticated email and cryptographic public record. Lending or transferring digital passes results in immediate ID revocation.",
      },
      {
        q: "How do ecosystem partners verify my CSC Digital ID?",
        a: "Each digital card displays a secure verification QR code and unique member slug. Scanning the QR code resolves to our public verification endpoint (e.g. /verify/member/[id]), confirming active membership status, name, and validity without exposing private contact credentials.",
      },
      {
        q: "What should I do if my name, startup, or designation is wrong on the ID?",
        a: (
          <>
            You can update your display profile from the member dashboard. If your core verified data requires
            re-minting, email{" "}
            <a
              href="mailto:coimbatorestartup.csc@gmail.com?subject=ID%20Card%20Update%20Request"
              className="font-semibold text-brand-accent underline underline-offset-2"
            >
              coimbatorestartup.csc@gmail.com
            </a>{" "}
            with your registered account details.
          </>
        ),
      },
    ],
  },
  {
    category: "Event Passes & Google Meet Check-In",
    description: "RSVPs, QR access passes, refund terms, and virtual meeting access.",
    items: [
      {
        q: "Do I need to sign in to browse events or join the live check-in portal?",
        a: (
          <>
            No. Browsing the{" "}
            <Link href="/events" className="font-semibold text-brand-accent underline underline-offset-2">
              Events calendar
            </Link>
            , viewing agendas, and accessing the{" "}
            <Link href="/events/google-meet/check-in" className="font-semibold text-brand-accent underline underline-offset-2">
              Google Meet Check-in portal
            </Link>{" "}
            are publicly open. Signing in with Google Auth is required only to confirm your reserved pass and claim a ticket.
          </>
        ),
      },
      {
        q: "How does the virtual Google Meet check-in process work?",
        a: (
          <>
            Online check-in opens on the{" "}
            <Link href="/events/google-meet/check-in" className="font-semibold text-brand-accent underline underline-offset-2">
              Check-in page
            </Link>{" "}
            exactly <strong>1 hour before session kickoff</strong> (e.g., at 2:00 PM IST for a 3:00 PM session). You can scan or upload your pass QR code or type your Pass Reference / registered email. Once verified, you are automatically redirected into the private Google Meet session.
          </>
        ),
      },
      {
        q: "What happens if I lose my digital event pass or QR code?",
        a: (
          <>
            Sign in to your member account to view your active passes under &ldquo;My Events&rdquo;. Alternatively, enter your registered email address on the{" "}
            <Link href="/events/google-meet/check-in" className="font-semibold text-brand-accent underline underline-offset-2">
              Check-in portal
            </Link>{" "}
            to look up your active registration instantly.
          </>
        ),
      },
      {
        q: "What is the cancellation and refund policy for paid workshops?",
        a: "For ticketed events with fees, cancellation requests submitted up to 48 hours before session start qualify for a 100% refund (minus payment processing charges). If CSC cancels or reschedules an event, full refunds are issued automatically within 7 business days to the originating UPI or bank account.",
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
            Registered CSC members and regional startup founders building active products are eligible. Fill out the request form on our{" "}
            <Link href="/contact" className="font-semibold text-brand-accent underline underline-offset-2">
              Contact Page
            </Link>{" "}
            specifying your current development stage, domain, and primary bottlenecks.
          </>
        ),
      },
      {
        q: "What topics can be covered during the consultation?",
        a: "Sessions cover product architecture, tech stack selection, go-to-market strategies, TANSEED/government grant navigation, pitch deck reviews, and founder co-founder alignment.",
      },
      {
        q: "What is the typical response SLA for consultation requests?",
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
            Registered members can submit their company via the member portal. Provide your venture name, website, industry sector, stage, and founder team. Submissions undergo community moderation before appearing in the public{" "}
            <Link href="/directory" className="font-semibold text-brand-accent underline underline-offset-2">
              Startup Directory
            </Link>
            .
          </>
        ),
      },
      {
        q: "What criteria must a startup meet for approval?",
        a: "Startups must represent a legitimate venture, prototype, or tech-enabled business with clear contact credentials. Spam submissions, speculative cryptocurrency schemes, and deceptive listings are permanently rejected.",
      },
      {
        q: "Can I update my startup pitch, logo, or hiring status later?",
        a: "Yes. From your member dashboard, you can update your pitch deck link, company description, hiring status, and key achievements at any time. Substantive changes are re-reviewed within 24 hours.",
      },
    ],
  },
  {
    category: "Security, Privacy & Data Rights",
    description: "DPDP compliance, data protection, sub-processors, and vulnerability disclosures.",
    items: [
      {
        q: "How does CSC protect member personal information under Indian DPDP Act 2023?",
        a: (
          <>
            CSC implements Row-Level Security (RLS), role-based privilege isolation, and strict purpose limitation. Personal contact details (phone, email) are never publicly exposed on member directory profiles. Read our comprehensive{" "}
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
            . We acknowledge valid reports within 48 hours and triage within 7 business days under safe harbor principles.
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
        description="Comprehensive answers covering membership IDs, event check-in, founder consultations, startup directory moderation, and platform security."
      />
      <section className="py-14">
        <Container className="mx-auto flex max-w-4xl flex-col gap-12">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-cloud text-brand-ink">
                <Mail className="size-4" />
              </span>
              <h3 className="text-base font-bold text-brand-ink">Segmented Department Desks</h3>
              <p className="text-xs leading-relaxed text-brand-secondary">
                Reach our team across dedicated inboxes for membership, event passes, or technical platform architecture. Committed 24–48h SLA.
              </p>
              <Link
                href="/contact"
                className="mt-2 inline-flex items-center text-xs font-semibold text-brand-accent hover:underline"
              >
                View all department contacts &rarr;
              </Link>
            </div>

            <div className="flex flex-col gap-2 rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-cloud text-brand-ink">
                <Sparkles className="size-4" />
              </span>
              <h3 className="text-base font-bold text-brand-ink">Request Founder Consultation</h3>
              <p className="text-xs leading-relaxed text-brand-secondary">
                Need customized guidance on your tech stack, MVP roadmap, or early grant applications? Request a 1:1 advisory slot.
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
