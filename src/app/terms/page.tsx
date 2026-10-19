import type { Metadata } from "next";
import Link from "next/link";
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
          <p className="text-sm text-brand-muted">Last updated October 20, 2026.</p>
          <p>
            These Terms and Conditions govern your use of CSC Circle, operated
            by Coimbatore Startup Community (CSC). By using the website or
            creating an account, you agree to these terms. If you do not agree,
            discontinue use of the service.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Using the platform</h2>
          <p>
            CSC Circle is a community platform for Coimbatore&apos;s founders and
            builders. By creating an account or participating, you agree to use
            the platform respectfully and lawfully, and to provide accurate
            information about yourself and your startup. You are responsible for
            keeping your account credentials secure and for activity performed
            through your account.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Membership</h2>
          <p>
            Membership and event participation are subject to review and
            approval by CSC administrators. Membership may be suspended or
            revoked for material violations of these terms, unsafe conduct, or
            misuse of community services. Creating a website account does not
            itself grant CSC membership or an active membership credential.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Submissions and community conduct</h2>
          <p>
            You retain responsibility for content you submit and must have the
            rights and permissions needed to share it. Do not submit unlawful,
            misleading, abusive, infringing, or malicious content, or attempt to
            access another person&apos;s account or private information. CSC may
            review, restrict, or remove submissions that violate these terms or
            create a safety or legal concern.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Events and payments</h2>
          <p>
            Event descriptions, capacity, registration deadlines, and any
            applicable payment instructions are shown with the relevant event.
            A registration is confirmed only when CSC&apos;s stated approval and
            payment requirements are satisfied. Refunds, cancellations, and
            changes follow the policy shown for that event or communicated by
            CSC. Do not rely on a pending registration as a confirmed place.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Availability and changes</h2>
          <p>
            CSC may update or temporarily suspend parts of the platform for
            maintenance, security, or operational reasons. We may revise these
            terms by publishing an updated version here. Continued use after
            the effective date means you accept the revised terms.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Privacy</h2>
          <p>
            Our handling of personal information is described in the{" "}
            <Link href="/privacy" className="font-medium text-brand-accent underline-offset-4 hover:underline">Privacy Policy</Link>.
            Please review it before submitting personal information.
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
