import type { Metadata } from "next";
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
          <p className="text-sm text-brand-muted">
            This policy is being finalised. The summary below describes how your
            information is intended to be handled.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">What we collect</h2>
          <p>
            When you sign in and complete your profile, we collect the
            information you provide — such as your name, contact details, and
            startup information — to operate your membership and community
            participation.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">How it&apos;s used</h2>
          <p>
            Your information is used to manage your membership, communicate about
            events, and — only with your explicit consent — display selected
            details publicly (for example, in the founder directory or
            testimonials). You control these choices in your member settings.
          </p>
          <h2 className="text-lg font-semibold text-brand-ink">Your control</h2>
          <p>
            You can update your details and privacy preferences at any time from
            your member profile and settings. For data requests, contact{" "}
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
