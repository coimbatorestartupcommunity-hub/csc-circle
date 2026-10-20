import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How CSC Circle handles your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <section className="py-14">
        <Container className="mx-auto flex max-w-2xl flex-col gap-4 text-brand-secondary">
          <p className="text-sm text-brand-muted">Last updated October 20, 2026.</p>
          <p>
            Coimbatore Startup Community (CSC) operates CSC Circle to support
            community membership, startup discovery, events, consultations,
            and related community services. This policy explains the personal
            information the platform may process when you use those services.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">What we collect</h2>
          <p>
            Depending on the service you use, this can include account and
            profile details, contact information, startup and membership
            application information, event registrations, consultation
            requests, reviews, consent choices, and basic operational records
            needed to protect the platform. Google sign-in returns account
            identifiers and profile information allowed by the permissions you
            approve. Do not submit passwords, payment card details, or unrelated
            sensitive information in free-text fields.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">How it&apos;s used</h2>
          <p>
            CSC uses information to authenticate accounts, review membership
            claims, manage event registrations and attendance, respond to
            consultations, moderate reviews, provide requested notifications,
            and secure and maintain the service. Selected profile, startup, or
            review details are shown publicly only where the relevant feature
            and your visibility choices permit it. Operational messages may be
            sent when needed to complete a request or communicate an account or
            event status.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Service providers and retention</h2>
          <p>
            CSC Circle uses Supabase for authentication and database services,
            Vercel for application hosting, and Gmail SMTP for configured
            transactional email. These providers process information as needed
            to provide their services. CSC retains records for as long as they
            are needed to operate the community, meet legitimate recordkeeping
            needs, resolve disputes, and protect the service, subject to
            applicable law.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Your control</h2>
          <p>
            You may update profile information and available privacy choices in
            your account. You may also ask CSC to access, correct, or delete
            information, subject to identity checks, operational needs, and
            applicable law. Contact{" "}
            <a
              href={`mailto:${siteConfig.social.email}`}
              className="font-medium text-brand-accent underline-offset-4 hover:underline"
            >
              {siteConfig.social.email}
            </a>
            . For security concerns, see the{" "}
            <Link href="/security" className="font-medium text-brand-accent underline-offset-4 hover:underline">Security page</Link>.
          </p>
        </Container>
      </section>
    </>
  );
}
