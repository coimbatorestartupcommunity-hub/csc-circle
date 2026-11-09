import type { Metadata } from "next";
import Image from "next/image";
import { BrandLogo } from "@/components/layout/brand-logo";
import { siteConfig } from "@/lib/content/site";
import { SurveyForm } from "./survey-form";

const surveyTitle = "CSC Circle — Member Information Form";
const surveyDescription =
  "Tell us about yourself and your journey: share who you are, what you're building, and how CSC Circle can support your entrepreneurial journey.";

export const metadata: Metadata = {
  title: "Member Information Form",
  description: surveyDescription,
  alternates: { canonical: "/survey/member-onboarding" },
  openGraph: {
    title: surveyTitle,
    description: surveyDescription,
    url: "/survey/member-onboarding",
    type: "website",
    images: [
      {
        url: `${siteConfig.url}/og/survey-member-onboarding.png`,
        width: 2560,
        height: 902,
        alt: "CSC Circle — join our member survey",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: surveyTitle,
    description: surveyDescription,
    images: [`${siteConfig.url}/og/survey-member-onboarding.png`],
  },
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default function MemberOnboardingSurveyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(145deg,#f8f7ff_0%,#ffffff_45%,#eef6ff_100%)] px-4 py-7 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-brand-purple/35 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute right-[-8rem] bottom-[-8rem] size-96 rounded-full bg-blue-100/80 blur-3xl" aria-hidden />
      <div className="relative mx-auto w-full max-w-3xl">
        <header className="mb-5 flex justify-center sm:mb-7">
          <BrandLogo href="/" markSize={48} />
        </header>
        <section className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-[0_24px_80px_-32px_rgba(65,51,126,0.35)] backdrop-blur sm:p-9 lg:p-10">
          <div className="mb-7 border-b border-brand-border pb-7 text-center sm:mb-8 sm:pb-8">
            <Image
              src="/og/survey-member-onboarding.png"
              alt="CSC Circle — join our member survey"
              width={2560}
              height={902}
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="h-auto w-full rounded-2xl ring-1 ring-brand-border"
            />
            <p className="mt-6 text-xs font-bold tracking-[0.16em] text-brand-accent uppercase">Coimbatore Startup Community</p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl lg:text-4xl">
              CSC Circle — Member Information Form
            </h1>
            <p className="mt-3 text-lg font-semibold text-brand-ink sm:text-xl">
              Tell Us About Yourself &amp; Your Journey
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-brand-secondary sm:text-base sm:leading-7">
              We want to understand who you are, what you&apos;re building, and how CSC Circle can support your entrepreneurial journey. Complete this short form to help us identify relevant connections, learning opportunities, and community activities.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 font-medium text-brand-muted">
              Estimated completion time: 3–4 minutes
            </p>
          </div>
          <SurveyForm />
        </section>
        <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-5 text-brand-muted">
          Submission does not guarantee funding, partnership, membership approval, or participation in a CSC program.
        </p>
      </div>
    </main>
  );
}
