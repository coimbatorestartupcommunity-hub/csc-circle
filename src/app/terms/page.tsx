import type { Metadata } from "next";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of Use for the CSC Circle community platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms of Use" />
      <section className="py-14">
        <Container className="prose-brand mx-auto flex max-w-2xl flex-col gap-4 text-brand-secondary">
          <p className="text-sm text-brand-muted">
            These terms are being finalised. The summary below describes how the
            CSC Circle platform is intended to be used.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Using the platform</h2>
          <p>
            CSC Circle is a community platform for Coimbatore&apos;s founders and
            builders. By creating an account or participating, you agree to use
            the platform respectfully and lawfully, and to provide accurate
            information about yourself and your startup.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Membership</h2>
          <p>
            Membership and event participation are subject to review and
            approval by CSC administrators. Membership may be suspended or
            revoked for conduct that harms the community.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Contact</h2>
          <p>
            Questions about these terms can be sent to{" "}
            <a
              href={`mailto:${siteConfig.social.email}`}
              className="font-medium text-brand-accent underline-offset-4 hover:underline"
            >
              {siteConfig.social.email}
            </a>
            .
          </p>
        </Container>
      </section>
    </>
  );
}
