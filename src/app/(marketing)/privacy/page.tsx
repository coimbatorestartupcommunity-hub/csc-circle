import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Privacy Policy — DPDP Act 2023 Compliance & Data Protection",
  description: "How CSC Circle processes, protects, and respects your personal data under the Digital Personal Data Protection (DPDP) Act 2023.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal & Privacy Governance" title="Privacy Policy" />
      <section className="py-14 sm:py-16">
        <Container className="mx-auto flex max-w-4xl flex-col gap-8 text-brand-secondary">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-4">
            <span className="text-sm font-medium text-brand-muted">Effective Date: November 28, 2026</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              DPDP Act 2023 Compliant
            </span>
          </div>

          <p className="text-base leading-relaxed">
            Coimbatore Startup Community (&ldquo;CSC&rdquo;), operating in technical stewardship with{" "}
            <strong>Logic Intelligence Technologies (LIT)</strong>, administers the CSC Circle platform (
            <span className="font-mono text-xs">{siteConfig.url}</span>). We are dedicated to transparent, lawful, and
            ethical data handling in strict compliance with the{" "}
            <strong>Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;)</strong> of India and the Information
            Technology Act, 2000.
          </p>

          {/* Section: Fiduciary and Processor Roles */}
          <div className="rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-brand-ink">Institutional Roles Under the DPDP Act</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 text-xs leading-relaxed">
              <div className="rounded-2xl bg-brand-cloud/40 p-4">
                <span className="font-bold text-brand-ink block text-sm">Data Fiduciary</span>
                <p className="mt-1 font-semibold text-brand-accent">Coimbatore Startup Community (CSC)</p>
                <p className="mt-1 text-brand-secondary">
                  Determines the lawful purposes, community guidelines, and processing scopes for membership IDs, event
                  passes, and founder directory services.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-cloud/40 p-4">
                <span className="font-bold text-brand-ink block text-sm">Data Processor &amp; Technology Partner</span>
                <p className="mt-1 font-semibold text-brand-accent">Logic Intelligence Technologies (LIT)</p>
                <p className="mt-1 text-brand-secondary">
                  Architects the platform infrastructure, manages encrypted databases, runs automated cryptographic
                  verification pipelines, and enforces security safeguards.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Core Principles */}
          <div className="rounded-3xl border border-brand-border bg-brand-cloud/40 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-brand-ink">Our Core Data Principles</h2>
            <ul className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
              <li className="rounded-2xl bg-brand-white p-4 shadow-2xs ring-1 ring-brand-border/60">
                <strong className="block text-brand-ink text-sm">1. Purpose Limitation</strong>
                Data is gathered exclusively for membership authentication, digital event passes, and verified startup matchmaking.
              </li>
              <li className="rounded-2xl bg-brand-white p-4 shadow-2xs ring-1 ring-brand-border/60">
                <strong className="block text-brand-ink text-sm">2. Data Minimization</strong>
                We collect only details necessary to verify your identity. Sensitive phone numbers remain strictly private by default.
              </li>
              <li className="rounded-2xl bg-brand-white p-4 shadow-2xs ring-1 ring-brand-border/60">
                <strong className="block text-brand-ink text-sm">3. Absolute Control</strong>
                You retain complete statutory rights to access, correct, export, or permanently erase your profile records anytime.
              </li>
            </ul>
          </div>

          {/* Section: Data Inventory */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">Data Inventory: What We Process</h2>
            <div className="overflow-x-auto rounded-3xl border border-brand-border bg-brand-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-cloud/70 font-semibold text-brand-ink border-b border-brand-border">
                  <tr>
                    <th className="p-4">Category</th>
                    <th className="p-4">Data Elements Processed</th>
                    <th className="p-4">Lawful Purpose &amp; Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  <tr>
                    <td className="p-4 font-bold text-brand-ink">Account &amp; Digital ID</td>
                    <td className="p-4">Full name, email address, WhatsApp number, city, professional role, bio, and optional portrait photo.</td>
                    <td className="p-4">Account authentication, generating 5-minute cryptographic digital membership IDs, and public listing in the Member Directory. Phone numbers are private unless explicitly toggled public.</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-brand-ink">WhatsApp Concierge</td>
                    <td className="p-4">Inbound phone number, incoming query text, and timestamp processed via our MSG91 enterprise cloud gateway.</td>
                    <td className="p-4">Automated delivery of event reminders, ticket QR lookups, verification notices, and AI concierge assistance. Never used for marketing blasts.</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-brand-ink">Startup Directory</td>
                    <td className="p-4">Startup name, domain, industry sector, stage, summary, logo, and founder affiliation.</td>
                    <td className="p-4">Publishing in the curated CSC Startup Directory following community editorial moderation.</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-brand-ink">Event Ticketing</td>
                    <td className="p-4">Event registration ID, cryptographic pass QR token, check-in timestamp, and session admittance.</td>
                    <td className="p-4">Issuing non-transferable passes, Apple/Google Wallet sync, and unlocking the 1-hour pre-session Google Meet virtual gate.</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-brand-ink">Financial &amp; UTR</td>
                    <td className="p-4">Order reference, workshop registration fee, UPI UTR reference, payment reconciliation status.</td>
                    <td className="p-4">Reconciling paid masterclass seats and maintaining mandatory tax accounting records under Indian law. (Zero raw card data stored).</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-brand-ink">Technical &amp; Telemetry</td>
                    <td className="p-4">Client IP address (anonymized for rate-limiting), browser user-agent, session cookies.</td>
                    <td className="p-4">DDoS mitigation, brute-force defense, anti-scraping enforcement, and audit logs.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Sub-Processors */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">Authorized Service Providers (Sub-Processors)</h2>
            <p className="text-xs">We partner with audited infrastructure providers to ensure high security and reliability:</p>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-brand-border bg-brand-white p-4 shadow-xs">
                <strong className="block text-brand-ink text-sm">Supabase Inc.</strong>
                <p className="mt-1 text-brand-secondary">
                  Hosted PostgreSQL database with Row-Level Security (RLS), encrypted object storage, and secure authentication.
                </p>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-white p-4 shadow-xs">
                <strong className="block text-brand-ink text-sm">Walkover Technologies Pvt Ltd (MSG91)</strong>
                <p className="mt-1 text-brand-secondary">
                  Enterprise WhatsApp Cloud API provider for hotline (+91 75500 67712), pass delivery, and verification SMS/WhatsApp.
                </p>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-white p-4 shadow-xs">
                <strong className="block text-brand-ink text-sm">Vercel Inc.</strong>
                <p className="mt-1 text-brand-secondary">
                  Global Anycast edge network hosting, automated TLS 1.3 encryption, and serverless compute runtime.
                </p>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-white p-4 shadow-xs">
                <strong className="block text-brand-ink text-sm">Upstash Inc.</strong>
                <p className="mt-1 text-brand-secondary">
                  Sub-millisecond Redis for sliding-window rate limiting, anti-scraping shields, and edge defense.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Rights under DPDP Act */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">Your Rights Under the DPDP Act 2023</h2>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-brand-border bg-brand-white p-4 shadow-xs">
                <strong className="block text-brand-ink text-sm">Right to Access &amp; Summary</strong>
                <p className="mt-1 text-brand-secondary">Request a full summary of personal data being processed by CSC Circle.</p>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-white p-4 shadow-xs">
                <strong className="block text-brand-ink text-sm">Right to Correction &amp; Erasure</strong>
                <p className="mt-1 text-brand-secondary">Update inaccurate profile details or request complete erasure of personal records.</p>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-white p-4 shadow-xs">
                <strong className="block text-brand-ink text-sm">Right to Grievance Redressal</strong>
                <p className="mt-1 text-brand-secondary">File an inquiry or complaint with our Data Grievance Officer for rapid resolution.</p>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-white p-4 shadow-xs">
                <strong className="block text-brand-ink text-sm">Right to Nominate</strong>
                <p className="mt-1 text-brand-secondary">Nominate an individual to exercise data rights in the event of death or incapacity.</p>
              </div>
            </div>
          </div>

          {/* Section: Data Retention */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">Data Retention &amp; Deletion Schedule</h2>
            <p className="text-xs leading-relaxed">
              Member profile data is maintained for the duration of your active community participation. Upon submitting an
              account erasure request, profile records and uploaded portraits are permanently purged within 30 calendar days.
              Transaction records (UPI UTR references and invoice records) are retained for 7 years to comply with statutory
              audit obligations under Indian tax legislation.
            </p>
          </div>

          {/* Section: Grievance Officer */}
          <div className="rounded-3xl border-2 border-brand-accent/30 bg-brand-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-brand-ink">Designated Data Grievance Officer</h2>
            <p className="mt-1 text-xs">
              In accordance with Section 12 of the DPDP Act 2023 and the Information Technology Act 2000, our Grievance Officer is:
            </p>
            <div className="mt-4 space-y-1.5 text-xs font-medium text-brand-ink">
              <p><strong>Designation:</strong> Data Grievance &amp; Regulatory Compliance Officer</p>
              <p><strong>Entities:</strong> Coimbatore Startup Community (CSC) &amp; Logic Intelligence Technologies (LIT)</p>
              <p><strong>Jurisdiction:</strong> Coimbatore, Tamil Nadu 641001, India</p>
              <p>
                <strong>Compliance Email:</strong>{" "}
                <a href="mailto:coimbatorestartupcommunity@gmail.com" className="text-brand-accent underline">
                  coimbatorestartupcommunity@gmail.com
                </a>
              </p>
              <p>
                <strong>Technical Partner Desk:</strong>{" "}
                <a href="mailto:hello@logicintelligencetechnologies.in" className="text-brand-accent underline">
                  hello@logicintelligencetechnologies.in
                </a>
              </p>
            </div>
            <p className="mt-4 text-[11px] text-brand-muted">
              We commit to acknowledging formal grievance inquiries within 24–48 hours and resolving all matters within 30 calendar days.
            </p>
          </div>

          <div className="border-t border-brand-border pt-4 text-xs text-brand-muted">
            For technical infrastructure security and cryptographic protection details, visit our{" "}
            <Link href="/security" className="font-semibold text-brand-accent underline">Security Practices</Link> page.
          </div>
        </Container>
      </section>
    </>
  );
}
