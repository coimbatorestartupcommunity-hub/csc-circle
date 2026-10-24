import type { Metadata } from "next";
import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Answers to common questions about CSC Circle — membership, accounts, startups, events, security, and getting support.",
  alternates: { canonical: "/help" },
};

const email = siteConfig.social.email;

const faq: { category: string; items: { q: string; a: React.ReactNode }[] }[] = [
  {
    category: "General CSC",
    items: [
      { q: "What is CSC Circle?", a: "CSC Circle is the online platform of the Coimbatore Startup Community (CSC) — a founder-focused community that brings entrepreneurs, builders, creators, students and professionals together to connect, build and grow." },
      { q: "Who can join CSC?", a: "CSC welcomes startup founders, aspiring entrepreneurs, students, builders and creators, professionals, and mentors or ecosystem collaborators who want to take part in the community." },
      { q: "Is CSC Circle only for registered startup founders?", a: "No. You do not need a registered company to participate. The community is open to founders and to anyone building, learning, or contributing to Coimbatore's startup ecosystem." },
      { q: "How can a student or aspiring entrepreneur participate?", a: "Create an account, complete your profile, and explore the events and founder directory. You can take part in community activities while you build toward your own venture." },
      { q: "Where can members find official CSC activities?", a: <>Upcoming activities are published on the <Link href="/events" className="font-semibold text-brand-accent underline underline-offset-2">Events</Link> page, and community work is showcased under <Link href="/collaborations" className="font-semibold text-brand-accent underline underline-offset-2">Collaborations</Link>.</> },
    ],
  },
  {
    category: "Account & membership",
    items: [
      { q: "How do I create an account?", a: <>Choose <Link href="/signup" className="font-semibold text-brand-accent underline underline-offset-2">Join the Community</Link>, sign up with a verified email account, then complete your membership details.</> },
      { q: "Why is my membership application pending?", a: "Membership applications are reviewed by CSC administrators. A pending status means your application has been received and is awaiting review. You can check its current status any time by signing in." },
      { q: "How do I update my profile?", a: "Sign in and open your member profile, where you can keep your details current. Some changes may be reviewed before they appear publicly." },
      { q: "When does my membership card become available?", a: "A digital membership card becomes available after your membership is approved by CSC administrators. You can view and download it from your account once it is issued." },
      { q: "What should I do if my account information is incorrect?", a: <>Update it from your profile where possible. If something cannot be corrected, email <a href={`mailto:${email}`} className="font-semibold text-brand-accent underline underline-offset-2">{email}</a> with the details.</> },
    ],
  },
  {
    category: "Startups",
    items: [
      { q: "How do I submit my startup?", a: "Sign in, open your member startups area, and provide accurate details about your startup. Your submission is sent to the CSC team for review." },
      { q: "Why is my startup not publicly visible yet?", a: "Startup listings appear publicly only after they are reviewed, approved, and published. Submitting a startup does not publish it automatically." },
      { q: "Can I update my startup information?", a: "Yes. You can edit your startup and submit the changes. Updates may go through review before the public listing changes." },
      { q: "What happens if revisions are requested?", a: "If the review team requests changes, update the requested details and resubmit. Once approved, the updated information is published where applicable." },
    ],
  },
  {
    category: "Events",
    items: [
      { q: "How do I register for a CSC event?", a: <>Open the <Link href="/events" className="font-semibold text-brand-accent underline underline-offset-2">Events</Link> page, view the event details, sign in when prompted, and submit your registration.</> },
      { q: "Does submitting a registration guarantee a seat?", a: "No. Submitting a registration records your interest. A seat is confirmed only when CSC confirms your registration, which can depend on event capacity." },
      { q: "What does waitlisted mean?", a: "If an event is full, you may be added to a waitlist. A place is not reserved unless CSC later confirms your registration." },
      { q: "Where do I find a confirmed event pass?", a: "When your registration is confirmed and a pass is available for the event, you can access it from your account under your events." },
      { q: "What happens if event information changes?", a: "If details change, the updated information is shown on the event and communicated through your account notifications where applicable. Review the latest details before attending." },
    ],
  },
  {
    category: "Security & privacy",
    items: [
      { q: "How does CSC protect private account information?", a: <>CSC uses authenticated access and database-level access controls so members see only what they are permitted to. See the <Link href="/security" className="font-semibold text-brand-accent underline underline-offset-2">Security</Link> page for more.</> },
      { q: "Can I share my login with another person?", a: "No. Your account is personal. Keep your credentials private and do not let anyone else sign in as you." },
      { q: "How do I report suspicious activity?", a: <>Email <a href={`mailto:${email}?subject=CSC%20Circle%20security%20report`} className="font-semibold text-brand-accent underline underline-offset-2">{email}</a> with a clear description of what you noticed.</> },
      { q: "Where can I read the Privacy Policy and Terms?", a: <>See the <Link href="/privacy" className="font-semibold text-brand-accent underline underline-offset-2">Privacy Policy</Link> and <Link href="/terms" className="font-semibold text-brand-accent underline underline-offset-2">Terms of Use</Link>.</> },
    ],
  },
  {
    category: "Support",
    items: [
      { q: "How do I contact CSC?", a: <>Email <a href={`mailto:${email}`} className="font-semibold text-brand-accent underline underline-offset-2">{email}</a>, or see the <Link href="/contact" className="font-semibold text-brand-accent underline underline-offset-2">Contact</Link> page for all the ways to reach the community.</> },
      { q: "What information should I provide when reporting a website issue?", a: "Describe what you were trying to do, what happened, the page or feature involved, and the device or browser you used. Screenshots help us understand the issue faster." },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHero
        eyebrow="Help Center"
        title="Help & FAQ"
        description="Answers to the most common questions about CSC Circle. If you need more help, you can always reach the community directly."
      />
      <section className="py-14">
        <Container className="mx-auto flex max-w-3xl flex-col gap-10">
          {faq.map((group) => (
            <div key={group.category} className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-brand-ink">{group.category}</h2>
              <div className="flex flex-col gap-3">
                {group.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-2xl border border-brand-border bg-brand-white p-5 transition-colors open:bg-brand-cloud/50"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-brand-ink [&::-webkit-details-marker]:hidden">
                      <span>{item.q}</span>
                      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-brand-muted transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 text-sm leading-relaxed text-brand-secondary">{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          ))}
          <p className="rounded-2xl bg-brand-cloud p-5 text-center text-sm text-brand-secondary">
            Still need help? Email{" "}
            <a href={`mailto:${email}`} className="font-semibold text-brand-accent underline underline-offset-2">{email}</a>{" "}
            or visit the{" "}
            <Link href="/contact" className="font-semibold text-brand-accent underline underline-offset-2">Contact</Link> page.
          </p>
        </Container>
      </section>
    </>
  );
}
