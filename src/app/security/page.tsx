import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Security",
  description: "Security practices and responsible vulnerability reporting for CSC Circle.",
  alternates: { canonical: "/security" },
};

export default function SecurityPage() {
  return (
    <>
      <PageHero eyebrow="Trust and safety" title="Security at CSC Circle" />
      <section className="py-14">
        <Container className="mx-auto flex max-w-2xl flex-col gap-4 text-brand-secondary">
          <p className="text-sm text-brand-muted">Last updated October 20, 2026.</p>
          <p>
            CSC Circle works to protect community accounts and information through
            safeguards appropriate to the service. Security is an ongoing
            responsibility; no internet service can promise that risk is
            eliminated entirely.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Account and data protection</h2>
          <p>
            Sign-in is handled by Supabase Auth. Private member and administrator
            operations require an authenticated session and server-side permission
            checks. Database access is restricted with Row-Level Security and
            access rules for the relevant records. Administrative changes are
            designed to be auditable. Credentials and server-only configuration
            are not intended to be exposed in the public website.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Use your account safely</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Use a unique, strong password and keep your recovery email secure.</li>
            <li>Sign out on shared devices and do not share sign-in or recovery links.</li>
            <li>Submit only information needed for the CSC service you are using.</li>
            <li>Contact CSC promptly if you suspect unauthorized account activity.</li>
          </ul>
          <h2 className="text-lg font-semibold text-brand-ink">Report a security concern</h2>
          <p>
            If you believe you have found a security weakness, contact{" "}
            <a
              href={`mailto:${siteConfig.social.email}?subject=CSC%20Circle%20security%20report`}
              className="font-medium text-brand-accent underline-offset-4 hover:underline"
            >
              {siteConfig.social.email}
            </a>{" "}
            with a brief description, the affected page or feature, and steps to
            reproduce. Please avoid accessing, changing, or downloading other
            people&apos;s information; do not conduct denial-of-service, social
            engineering, or destructive testing. Share only the minimum evidence
            needed to explain the issue. CSC will review the report and follow up
            when contact details are provided.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Related policies</h2>
          <p>
            Read the <Link href="/privacy" className="font-medium text-brand-accent underline-offset-4 hover:underline">Privacy Policy</Link>{" "}
            and <Link href="/terms" className="font-medium text-brand-accent underline-offset-4 hover:underline">Terms and Conditions</Link>
            for information about personal data and acceptable use.
          </p>
        </Container>
      </section>
    </>
  );
}
