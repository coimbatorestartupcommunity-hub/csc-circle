import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Server, Cpu, FileCheck2, AlertCircle } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Security Practices & Responsible Disclosure",
  description: "Defense-in-depth architecture, infrastructure safeguards, and vulnerability disclosure SLA for CSC Circle.",
  alternates: { canonical: "/security" },
};

export default function SecurityPage() {
  const securityPillars = [
    {
      icon: ShieldCheck,
      title: "Edge & Reverse Proxy Shielding",
      body: "Protected behind Vercel Edge Anycast network with automated TLS 1.3 encryption, DDoS mitigation, and hardened Content Security Policy (CSP) headers blocking unauthorized script execution.",
    },
    {
      icon: Lock,
      title: "Row-Level Security (RLS)",
      body: "Database policies enforced directly in PostgreSQL. Authenticated users and public visitors are cryptographically quarantined from accessing private records of other community members.",
    },
    {
      icon: Server,
      title: "Distributed Rate Limiting",
      body: "Sub-millisecond sliding-window rate limiters backed by Upstash Redis and atomic Postgres RPCs protect all mutation, check-in, search, and payment endpoints against brute-force attacks.",
    },
    {
      icon: Cpu,
      title: "Circuit Breakers & Isolation",
      body: "Third-party APIs (payment reconciliation, email transport, external webhooks) are isolated behind bounded timeouts and automatic circuit breakers to prevent cascading service downtime.",
    },
  ];

  return (
    <>
      <PageHero eyebrow="Trust & Technical Security" title="Security at CSC Circle" />
      <section className="py-14">
        <Container className="mx-auto flex max-w-3xl flex-col gap-8 text-brand-secondary">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-4">
            <span className="text-sm font-medium text-brand-muted">Effective Date: November 22, 2026</span>
            <span className="rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
              Architecture &amp; Safety SLA
            </span>
          </div>

          <p className="text-base leading-relaxed">
            CSC Circle is engineered under the technical leadership of{" "}
            <strong>Logic Intelligence Technologies (LIT)</strong>. We treat community security and data privacy as fundamental
            engineering obligations, applying modern defense-in-depth principles across every tier of our stack.
          </p>

          {/* Section: Architectural Defense in Depth */}
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">Defense-in-Depth Architecture</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {securityPillars.map((pillar) => (
              <div key={pillar.title} className="flex flex-col gap-3 rounded-2xl border border-brand-border bg-brand-white p-5 shadow-2xs">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-purple/40 text-brand-ink ring-1 ring-brand-border">
                  <pillar.icon className="size-5" />
                </span>
                <h3 className="text-base font-semibold text-brand-ink">{pillar.title}</h3>
                <p className="text-sm leading-relaxed text-brand-secondary">{pillar.body}</p>
              </div>
            ))}
          </div>

          {/* Section: Member Security Guidelines */}
          <div className="rounded-2xl border border-brand-border bg-brand-cloud/40 p-6">
            <h2 className="text-lg font-bold text-brand-ink">Best Practices for Community Members</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <FileCheck2 className="size-4 shrink-0 text-brand-accent mt-0.5" />
                <span><strong>Unique Passwords &amp; OAuth:</strong> Use Google OAuth or strong, unique passwords for your CSC Circle account.</span>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck2 className="size-4 shrink-0 text-brand-accent mt-0.5" />
                <span><strong>Guard Digital Passes:</strong> Do not post full, unscanned QR passes on public social media before event sessions conclude.</span>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck2 className="size-4 shrink-0 text-brand-accent mt-0.5" />
                <span><strong>No Account Sharing:</strong> Membership IDs and digital event passes are non-transferable.</span>
              </li>
            </ul>
          </div>

          {/* Section: Responsible Disclosure SLA */}
          <div className="rounded-2xl border-2 border-brand-accent/30 bg-brand-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-brand-accent" />
              <h2 className="text-lg font-bold text-brand-ink">Responsible Vulnerability Disclosure Policy</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed">
              We welcome reports from independent security researchers and community builders who identify security vulnerabilities.
              If you discover a potential weakness, please report it responsibly so we can remediate it promptly.
            </p>

            <div className="mt-4 rounded-xl bg-brand-cloud p-4 text-xs space-y-1.5 text-brand-ink font-mono">
              <p><strong>Primary Security Inbox:</strong> coimbatorestartupcommunity@gmail.com</p>
              <p><strong>Technical Partner Desk:</strong> hello@logicintelligencetechnologies.in</p>
              <p><strong>Subject Line:</strong> [SECURITY VULNERABILITY REPORT] Brief Description</p>
            </div>

            <h3 className="mt-4 text-sm font-bold text-brand-ink">Our Committed Response Service Level Agreement (SLA):</h3>
            <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
              <li><strong>Initial Acknowledgment:</strong> Within 48 hours of receipt.</li>
              <li><strong>Triage &amp; Severity Assessment:</strong> Within 7 business days.</li>
              <li><strong>Remediation &amp; Notification:</strong> Scheduled according to severity (Critical: &lt; 24h; High: &lt; 72h).</li>
            </ul>

            <h3 className="mt-4 text-sm font-bold text-brand-ink">Safe-Harbor Commitment:</h3>
            <p className="mt-1 text-xs text-brand-muted leading-relaxed">
              CSC and LIT pledge not to initiate legal action against researchers who discover and report issues in good faith,
              avoid accessing or modifying private user data, and refrain from denial-of-service or destructive testing.
            </p>
          </div>

          <div className="border-t border-brand-border pt-4 text-xs text-brand-muted">
            For personal data handling practices, please refer to our{" "}
            <Link href="/privacy" className="font-semibold text-brand-accent underline">Privacy Policy</Link>{" "}
            and{" "}
            <Link href="/terms" className="font-semibold text-brand-accent underline">Terms of Use</Link>.
          </div>
        </Container>
      </section>
    </>
  );
}
