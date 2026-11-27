import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Server,
  Cpu,
  FileCheck2,
  AlertCircle,
  KeyRound,
  Fingerprint,
  Layers,
  ArrowRight,
  Shield,
} from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Security Architecture & Responsible Disclosure — CSC Circle",
  description:
    "Defense-in-depth architecture, cryptographic pass validation, Row-Level Security, and our responsible vulnerability disclosure SLA.",
  alternates: { canonical: "/security" },
};

export default function SecurityPage() {
  const securityPillars = [
    {
      icon: Lock,
      title: "PostgreSQL Row-Level Security (RLS)",
      body: "Database policies enforced natively in PostgreSQL. Authenticated users and public queries are mathematically quarantined from accessing private records of other community members.",
    },
    {
      icon: Fingerprint,
      title: "Cryptographic Pass Verification",
      body: "Digital IDs and event passes carry opaque SHA-256 HMAC digital signatures. QR codes never expose plain email addresses or database primary keys to public scanners.",
    },
    {
      icon: Layers,
      title: "Edge Shielding & Hardened CSP",
      body: "Protected behind Vercel Anycast edge proxy with automated TLS 1.3 encryption, DDoS mitigation, and a strict Content Security Policy restricting cross-site script execution.",
    },
    {
      icon: Server,
      title: "Distributed Anti-Abuse Rate Limiting",
      body: "Sub-millisecond sliding-window rate limiters backed by Upstash Redis and atomic Postgres RPCs protect all mutation, check-in, search, and OTP endpoints against automated brute-force attacks.",
    },
    {
      icon: KeyRound,
      title: "Zero Raw Password Custody",
      body: "Authentication delegates directly to Google OAuth SSO and tokenized passwordless email sessions. CSC never stores, hashes, or has access to raw user passwords.",
    },
    {
      icon: Cpu,
      title: "Circuit Breakers & API Isolation",
      body: "External services (MSG91 WhatsApp Cloud API, payment reconciliation, transactional mailers) are isolated behind bounded timeouts and automatic circuit breakers to prevent cascading outages.",
    },
  ];

  return (
    <>
      <PageHero eyebrow="Trust & Technical Architecture" title="Security at CSC Circle" />
      <section className="py-14 sm:py-16">
        <Container className="mx-auto flex max-w-4xl flex-col gap-12 text-brand-secondary">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-4">
            <span className="text-sm font-medium text-brand-muted">Effective Date: November 28, 2026</span>
            <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
              Audited Defense-in-Depth
            </span>
          </div>

          <p className="text-base leading-relaxed">
            CSC Circle is engineered under the technical stewardship of{" "}
            <strong>Logic Intelligence Technologies (LIT)</strong>. We treat community security and data privacy as fundamental
            engineering obligations, applying modern defense-in-depth principles across every tier of our infrastructure.
          </p>

          {/* Section: Architectural Defense in Depth */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                Architectural Safeguards
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">
                6-Pillar Defense-in-Depth Architecture
              </h2>
              <p className="mt-0.5 text-xs text-brand-secondary">
                Comprehensive security controls protecting member profiles, passes, and community directories.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {securityPillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="flex flex-col gap-3 rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs"
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-cloud text-brand-ink">
                    <pillar.icon className="size-5" />
                  </span>
                  <h3 className="text-base font-bold text-brand-ink">{pillar.title}</h3>
                  <p className="text-xs leading-relaxed text-brand-secondary">{pillar.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Member Security Guidelines */}
          <div className="rounded-3xl border border-brand-border bg-brand-cloud/40 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-brand-ink">Best Practices for Community Members</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-2xl bg-brand-white p-4 shadow-2xs">
                <FileCheck2 className="size-4 text-brand-accent mb-2" />
                <strong className="block text-brand-ink text-sm">OAuth Authentication</strong>
                <p className="mt-1 text-brand-secondary">
                  Always use verified Google OAuth or secure email magic links to sign in. Never share your authenticated session.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-white p-4 shadow-2xs">
                <ShieldCheck className="size-4 text-brand-accent mb-2" />
                <strong className="block text-brand-ink text-sm">Guard Digital Passes</strong>
                <p className="mt-1 text-brand-secondary">
                  Do not post un-redacted QR codes or pass references on public social media before event sessions conclude.
                </p>
              </div>
              <div className="rounded-2xl bg-brand-white p-4 shadow-2xs">
                <AlertCircle className="size-4 text-brand-accent mb-2" />
                <strong className="block text-brand-ink text-sm">Strict Anti-Scraping</strong>
                <p className="mt-1 text-brand-secondary">
                  Automated scraping of founder contacts violates our Terms and triggers automated IP and account bans.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Responsible Disclosure SLA */}
          <div className="rounded-3xl border-2 border-brand-accent/30 bg-brand-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Shield className="size-6 text-brand-accent" />
              <h2 className="text-xl font-bold text-brand-ink">Responsible Vulnerability Disclosure Program</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed">
              We welcome collaboration with independent security researchers, ethical hackers, and community builders.
              If you identify a security vulnerability across our web platform, APIs, or mobile wallet integrations, please
              report it responsibly under our Safe Harbor terms.
            </p>

            <div className="mt-4 rounded-2xl bg-brand-cloud p-4 text-xs font-mono space-y-1 text-brand-ink">
              <p><strong>Primary Security Desk:</strong> hello@logicintelligencetechnologies.in</p>
              <p><strong>CTO Direct Desk:</strong> coimbatorestartup.tech@gmail.com</p>
              <p><strong>Subject Format:</strong> [SECURITY VULNERABILITY REPORT] &lt;Brief Component Name&gt;</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-xl border border-brand-border p-3">
                <strong className="block text-brand-ink">Initial Response</strong>
                <p className="text-brand-accent font-semibold mt-0.5">&lt; 24 hours</p>
                <p className="text-[11px] text-brand-muted mt-1">Written confirmation of report receipt.</p>
              </div>
              <div className="rounded-xl border border-brand-border p-3">
                <strong className="block text-brand-ink">Severity Triage</strong>
                <p className="text-brand-accent font-semibold mt-0.5">&lt; 48 hours</p>
                <p className="text-[11px] text-brand-muted mt-1">CVSS impact assessment and reproduction.</p>
              </div>
              <div className="rounded-xl border border-brand-border p-3">
                <strong className="block text-brand-ink">Remediation SLA</strong>
                <p className="text-brand-accent font-semibold mt-0.5">&lt; 24h Critical / &lt; 72h High</p>
                <p className="text-[11px] text-brand-muted mt-1">Emergency patch rollouts via CI/CD pipeline.</p>
              </div>
            </div>

            <div className="mt-5 border-t border-brand-border/60 pt-4 text-xs leading-relaxed">
              <strong className="text-brand-ink">Safe-Harbor Commitment:</strong>
              <p className="mt-1 text-brand-secondary">
                CSC and Logic Intelligence Technologies pledge not to initiate legal action against researchers who report
                vulnerabilities in good faith, avoid privacy violations or destruction of data, and refrain from denial-of-service
                (DDoS) testing against production endpoints.
              </p>
            </div>
          </div>

          <div className="border-t border-brand-border pt-4 text-xs text-brand-muted">
            For personal data rights and grievance contacts, refer to our{" "}
            <Link href="/privacy" className="font-semibold text-brand-accent underline">Privacy Policy</Link>{" "}
            and{" "}
            <Link href="/terms" className="font-semibold text-brand-accent underline">Terms of Use</Link>.
          </div>
        </Container>
      </section>
    </>
  );
}
