import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How CSC Circle processes, protects, and respects your personal data under the DPDP Act 2023.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal & Privacy" title="Privacy Policy" />
      <section className="py-14">
        <Container className="mx-auto flex max-w-3xl flex-col gap-6 text-brand-secondary">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-4">
            <span className="text-sm font-medium text-brand-muted">Effective Date: November 22, 2026</span>
            <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
              DPDP Act 2023 Compliant
            </span>
          </div>

          <p className="text-base leading-relaxed">
            Coimbatore Startup Community (CSC), in technical partnership with Logic Intelligence Technologies (LIT),
            operates the CSC Circle digital platform (<span className="font-mono text-xs">{siteConfig.url}</span>).
            We are committed to transparent, lawful, and secure data processing in compliance with the{" "}
            <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of India and applicable information technology rules.
          </p>

          {/* Section: Data Principles */}
          <div className="rounded-2xl border border-brand-border bg-brand-cloud/40 p-5">
            <h2 className="text-base font-bold text-brand-ink">Our Core Data Principles</h2>
            <ul className="mt-3 grid gap-2.5 text-sm sm:grid-cols-3">
              <li className="rounded-xl bg-brand-white p-3 shadow-2xs ring-1 ring-brand-border/60">
                <strong className="block text-brand-ink">1. Purpose Limitation</strong>
                Data is collected solely for membership, event passes, and verified startup collaboration.
              </li>
              <li className="rounded-xl bg-brand-white p-3 shadow-2xs ring-1 ring-brand-border/60">
                <strong className="block text-brand-ink">2. Data Minimization</strong>
                We only ask for details required to verify your identity and deliver community services.
              </li>
              <li className="rounded-xl bg-brand-white p-3 shadow-2xs ring-1 ring-brand-border/60">
                <strong className="block text-brand-ink">3. Consent & Control</strong>
                You retain complete rights to access, correct, or request the deletion of your personal records.
              </li>
            </ul>
          </div>

          {/* Section: Data Inventory Table */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">Data Inventory: What We Collect</h2>
          <div className="overflow-x-auto rounded-2xl border border-brand-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-cloud font-semibold text-brand-ink">
                <tr>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Data Elements</th>
                  <th className="p-3.5">Purpose & Legal Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                <tr>
                  <td className="p-3.5 font-medium text-brand-ink">Account &amp; Profile</td>
                  <td className="p-3.5">Full name, email address, phone, professional role, city, bio, skills, and optional portrait photo (stored in Supabase Storage).</td>
                  <td className="p-3.5">User authentication, issuing digital membership ID cards, and automatic public listing in the CSC Member Directory for active members. Your WhatsApp number remains private unless you explicitly opt in.</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-brand-ink">Startup Submissions</td>
                  <td className="p-3.5">Startup name, domain, industry sector, stage, summary, logo, and verified founder affiliation.</td>
                  <td className="p-3.5">Listing in the CSC Founder Directory following editorial moderation.</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-brand-ink">Events & Attendance</td>
                  <td className="p-3.5">Event registration ID, cryptographic QR token, check-in timestamp, and session link access.</td>
                  <td className="p-3.5">Issuing non-transferable event passes and verifying automated entry into virtual sessions (e.g., Google Meet).</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-brand-ink">Financial Records</td>
                  <td className="p-3.5">Order ID, workshop fee, UPI transaction reference (UTR), reconciliation status. (No raw card details stored).</td>
                  <td className="p-3.5">Verifying paid event registrations and financial accounting under Indian tax law.</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-brand-ink">Technical & Security</td>
                  <td className="p-3.5">Client IP (anonymized for rate limits), user-agent header, authentication session tokens.</td>
                  <td className="p-3.5">Rate limiting, protecting against brute-force attacks, and maintaining platform audit logs.</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section: Automated Processing */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">Automated Verification & Processing</h2>
          <p>
            When you claim an official CSC Digital Membership Card, your details undergo automated eligibility checks.
            Approved claims automatically issue an encrypted digital membership ID within 5 minutes.
            If your claim cannot be verified automatically, it is routed to human community administrators for manual review.
            You have the right to request a manual human review if you believe an automated outcome was made in error.
          </p>

          {/* Section: Cryptographic Passes */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">Event Pass & QR Token Privacy</h2>
          <p>
            QR passes generated by CSC Circle carry opaque, cryptographically signed hash tokens. The QR code itself does not
            expose raw email addresses, passwords, or personal telephone numbers to third-party scanners. When scanned at the
            automated check-in portal, our server verifies the signature before redirecting confirmed attendees into conference rooms.
          </p>

          {/* Section: Sub-Processors */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">Authorized Service Providers (Sub-Processors)</h2>
          <p>We work with trusted infrastructure partners to deliver secure services:</p>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li><strong>Supabase Inc.</strong>: Hosted PostgreSQL database with strict Row-Level Security (RLS) and authentication management.</li>
            <li><strong>Vercel Inc.</strong>: Global edge network hosting, automated SSL/TLS encryption, and serverless compute runtimes.</li>
            <li><strong>Upstash Inc.</strong>: High-speed Redis for distributed sliding-window rate limiting, DDoS mitigation, and edge caching.</li>
            <li><strong>Google Workspace (Gmail SMTP & Google OAuth)</strong>: Authenticated sign-in and transactional email notifications.</li>
          </ul>

          {/* Section: Retention */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">Data Retention & Deletion</h2>
          <p>
            Active member profiles are maintained for the duration of your community participation.
            You may request account closure and data deletion at any time. Financial transaction records (UPI UTRs and order IDs)
            are retained for 7 years in compliance with statutory audit regulations under Indian tax law.
            Unlisted survey records are reviewed periodically and purged when community evaluation is complete.
          </p>

          {/* Section: Your Legal Rights */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">Your Rights Under DPDP Act 2023</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-brand-border p-4">
              <strong className="block text-brand-ink">Right to Access & Summary</strong>
              Request a full summary of personal data processed by CSC Circle.
            </div>
            <div className="rounded-xl border border-brand-border p-4">
              <strong className="block text-brand-ink">Right to Correction & Erasure</strong>
              Update inaccurate profile details or request deletion of personal records.
            </div>
            <div className="rounded-xl border border-brand-border p-4">
              <strong className="block text-brand-ink">Right to Grievance Redressal</strong>
              File an official complaint with our Grievance Officer if concerns arise.
            </div>
            <div className="rounded-xl border border-brand-border p-4">
              <strong className="block text-brand-ink">Right to Nominate</strong>
              Nominate an authorized individual to exercise your rights in event of incapacity.
            </div>
          </div>

          {/* Section: Grievance Officer */}
          <div className="mt-4 rounded-2xl border-2 border-brand-accent/30 bg-brand-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-brand-ink">Official Grievance Redressal Officer</h2>
            <p className="mt-1 text-sm">
              In accordance with the Information Technology Act 2000 and the DPDP Act 2023, the designated Grievance Officer for CSC Circle is:
            </p>
            <div className="mt-3 space-y-1 text-sm font-medium text-brand-ink">
              <p><strong>Designation:</strong> Data Grievance & Compliance Officer</p>
              <p><strong>Entity:</strong> Coimbatore Startup Community (CSC) &amp; Logic Intelligence Technologies (LIT)</p>
              <p><strong>Jurisdiction:</strong> Coimbatore, Tamil Nadu 641001, India</p>
              <p>
                <strong>Primary Email:</strong>{" "}
                <a href="mailto:coimbatorestartupcommunity@gmail.com" className="text-brand-accent underline">
                  coimbatorestartupcommunity@gmail.com
                </a>
              </p>
              <p>
                <strong>Alternative Desk:</strong>{" "}
                <a href={`mailto:${siteConfig.social.email}`} className="text-brand-accent underline">
                  {siteConfig.social.email}
                </a>
              </p>
            </div>
            <p className="mt-3 text-xs text-brand-muted">
              We acknowledge all formal grievance inquiries within 48 hours and commit to resolution within 30 calendar days.
            </p>
          </div>

          <div className="border-t border-brand-border pt-4 text-xs text-brand-muted">
            For technical security architecture and vulnerability disclosures, visit our{" "}
            <Link href="/security" className="font-semibold text-brand-accent underline">Security Practices</Link> page.
          </div>
        </Container>
      </section>
    </>
  );
}
