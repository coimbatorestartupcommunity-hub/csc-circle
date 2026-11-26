import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, ClipboardList, Send, Clock, BadgeCheck, Compass } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { CtaLink } from "@/components/common/cta-link";
import { siteConfig, routes } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "CSC Membership Guide",
  description:
    "Everything about CSC Circle membership — who can participate, how registration and review work, your digital membership card, and member responsibilities.",
  alternates: { canonical: "/membership" },
};

const email = siteConfig.social.email;

const audience = [
  "Founders & Startup Founders",
  "Co-Founders & Startup Members",
  "Idea-Stage Persons & Aspiring Builders",
  "Entrepreneurs & Business Innovators",
  "Business Persons & Established Business Members",
  "Angel Investors, VCs & Capital Enablers",
  "Industry Mentors & Ecosystem Advisors",
  "Technical Innovators, Full-Stack & AI Engineers",
  "Hardware, Manufacturing & DeepTech Operators",
  "Early-Stage Venture Operators & Growth Leads",
];

const steps = [
  { icon: UserPlus, title: "Create an account", body: "Sign up with a verified Google or email account to get started." },
  { icon: ClipboardList, title: "Complete the claim form", body: "On your first login, a full-screen membership claim form appears. Fill in your details and optionally upload a profile photo." },
  { icon: Send, title: "Submit your claim", body: "Submit your membership claim to unlock the platform. Membership is 100% free for all founders, creators, and builders." },
  { icon: Clock, title: "Automatic 5-minute approval", body: "Your claim undergoes automated verification and is automatically approved within 5 minutes." },
  { icon: BadgeCheck, title: "Instant digital card activation", body: "Once approved, your digital membership ID is issued immediately and your profile is listed in the public Member Directory." },
  { icon: Compass, title: "Explore the community", body: "Browse the founder directory, register for events, and collaborate with founders across Coimbatore." },
];

const benefits = [
  { title: "Official Digital Membership ID", body: "Issued with a unique Founding Member serial number, exportable to Apple Wallet and Google Wallet." },
  { title: "Mandatory Event Express Pass", body: "Fast-track QR admission for all CSC physical meetups, founder dinners, and pitch arenas across Coimbatore." },
  { title: "Verified Founder Directory", body: "Showcase your venture publicly to regional investors, corporate enablers, and potential co-founders." },
  { title: "Grant & Funding Endorsement", body: "Priority recommendation letters and eligibility screening for TANSEED (₹15L) and SISFS (₹50L) seed grants." },
  { title: "Founder Consultations & Clinics", body: "Direct access to book 1-on-1 strategy, architecture, and pitch clinics with CSC advisors." },
  { title: "Community Notification Radar", body: "Receive real-time, high-priority notifications on new grant cohorts, event passes, and platform milestones." },
];

const responsibilities = [
  "Provide accurate information about yourself and your startup.",
  "Keep your account secure and do not share your login.",
  "Respect other members and communicate professionally.",
  "Do not impersonate another person or organization.",
  "Submit only information you have permission to share.",
  "Follow CSC's event and community guidelines.",
];

export default function MembershipPage() {
  return (
    <>
      <PageHero
        eyebrow="Membership"
        title="CSC Membership Guide"
        description="How membership works at the Coimbatore Startup Community — from creating an account to receiving your digital membership card."
      />
      <section className="py-14">
        <Container className="mx-auto flex max-w-3xl flex-col gap-12">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-brand-ink">What is CSC membership?</h2>
            <p className="text-sm leading-relaxed text-brand-secondary">
              CSC membership connects you to the Coimbatore Startup Community&apos;s platform activities and member
              services — a member profile, a digital membership card, the founder directory, and event registration.
              Membership is 100% free and claims are automatically approved within 5 minutes so members can quickly connect and participate.
            </p>
            <p className="rounded-xl bg-brand-cloud p-4 text-sm leading-relaxed text-brand-secondary">
              A CSC member-information survey is not a membership application. Survey responses help the team understand
              the community, but they do not create an account, change membership status, or issue a membership card.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-brand-ink">Who can participate?</h2>
            <p className="text-sm leading-relaxed text-brand-secondary">
              CSC is an open, non-exclusionary community. You are welcome if you are one of the following, or simply
              want to be part of Coimbatore&apos;s startup ecosystem:
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {audience.map((a) => (
                <li key={a} className="flex items-center gap-2 rounded-xl bg-brand-cloud px-4 py-2.5 text-sm text-brand-ink">
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-brand-accent" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-brand-ink">What your membership gives you</h2>
            <p className="text-sm leading-relaxed text-brand-secondary">
              Once your membership is approved, you unlock the member side of CSC Circle. Membership gives you:
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {benefits.map((b) => (
                <li key={b.title} className="rounded-2xl border border-brand-border bg-brand-white p-4">
                  <h3 className="text-sm font-semibold text-brand-ink">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-brand-secondary">{b.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-brand-ink">How registration works</h2>
            <ol className="grid gap-4 sm:grid-cols-2">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-3 rounded-2xl border border-brand-border bg-brand-white p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-purple/40 text-brand-ink">
                    <s.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-brand-muted">Step {i + 1}</p>
                    <h3 className="text-sm font-semibold text-brand-ink">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-brand-secondary">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-brand-muted">
              Membership is reviewed before approval, so creating an account does not grant instant membership or an
              automatically issued card.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-brand-ink">What your application status means</h2>
            <ul className="flex flex-col gap-2">
              <li className="flex gap-2 text-sm leading-relaxed text-brand-secondary">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-accent" />
                <span><strong className="font-semibold text-brand-ink">Pending</strong> — your application has been received and is waiting to be reviewed by CSC administrators.</span>
              </li>
              <li className="flex gap-2 text-sm leading-relaxed text-brand-secondary">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-accent" />
                <span><strong className="font-semibold text-brand-ink">Needs more information</strong> — the team has asked for additional or corrected details before the review can continue. Update what was requested and resubmit.</span>
              </li>
              <li className="flex gap-2 text-sm leading-relaxed text-brand-secondary">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-accent" />
                <span><strong className="font-semibold text-brand-ink">Approved</strong> — your membership is active, your digital card is issued, and member features are unlocked.</span>
              </li>
            </ul>
            <p className="text-xs text-brand-muted">
              You can check your current status any time by signing in. Review is carried out by people, so it is not instant.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-brand-ink">Your digital membership card</h2>
            <p className="text-sm leading-relaxed text-brand-secondary">
              After your membership is approved, a digital membership card becomes available in your account. It
              represents your place in the community and can be viewed and downloaded any time you are signed in. If any
              details on your card are incorrect, update your profile where possible or email{" "}
              <a href={`mailto:${email}`} className="font-semibold text-brand-accent underline underline-offset-2">{email}</a>.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-brand-ink">Member responsibilities</h2>
            <ul className="flex flex-col gap-2">
              {responsibilities.map((r) => (
                <li key={r} className="flex gap-2 text-sm leading-relaxed text-brand-secondary">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-accent" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-brand-ink">Staying connected</h2>
            <p className="text-sm leading-relaxed text-brand-secondary">
              Beyond your member account, CSC Circle keeps the community informed through sections anyone can read:{" "}
              <Link href="/updates" className="font-semibold text-brand-accent underline underline-offset-2">Updates</Link>{" "}
              for community news and highlights,{" "}
              <Link href="/resources" className="font-semibold text-brand-accent underline underline-offset-2">Resources</Link>{" "}
              for curated material the CSC team publishes, and{" "}
              <Link href="/opportunities" className="font-semibold text-brand-accent underline underline-offset-2">Opportunities</Link>{" "}
              for openings shared with the community. New content appears in these sections as the team publishes it.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-brand-ink">Problems with your application?</h2>
            <p className="text-sm leading-relaxed text-brand-secondary">
              If registration, verification, profile access, or your membership card does not work as expected, check
              the{" "}
              <Link href="/help" className="font-semibold text-brand-accent underline underline-offset-2">Help &amp; FAQ</Link>{" "}
              first. If you still need help, email{" "}
              <a href={`mailto:${email}`} className="font-semibold text-brand-accent underline underline-offset-2">{email}</a>{" "}
              and describe what you were trying to do and what happened.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-3xl bg-brand-cloud p-8 text-center">
            <h2 className="text-lg font-bold text-brand-ink">Ready to join CSC Circle?</h2>
            <p className="max-w-md text-sm text-brand-secondary">
              Create your account and complete your membership details to get started.
            </p>
            <CtaLink href={routes.join} size="md" className="mt-1">Join the Community</CtaLink>
          </div>
        </Container>
      </section>
    </>
  );
}
