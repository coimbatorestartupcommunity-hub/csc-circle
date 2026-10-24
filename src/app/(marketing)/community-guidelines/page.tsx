import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description:
    "How members of the Coimbatore Startup Community are expected to communicate, collaborate, and participate respectfully.",
  alternates: { canonical: "/community-guidelines" },
};

const sections: { title: string; body: string }[] = [
  { title: "Respectful communication", body: "Treat every member with courtesy and respect. Keep conversations constructive, and disagree without personal attacks, hostility, or demeaning language." },
  { title: "Professional collaboration", body: "Engage openly and in good faith. Share knowledge generously, give helpful feedback, and support fellow founders and builders." },
  { title: "Accurate member information", body: "Provide truthful details about yourself. Do not misrepresent your identity, role, or affiliations." },
  { title: "Startup information integrity", body: "Share accurate information about your startup. Only submit details and media you have the right to share, and do not publish misleading claims." },
  { title: "Event participation", body: "Follow the guidance provided for each event, register honestly, and respect capacity limits, organizers, and other attendees." },
  { title: "Privacy and confidentiality", body: "Respect the privacy of other members. Do not share someone else's personal information, private messages, or non-public details without their consent." },
  { title: "Appropriate use of communication channels", body: "Use official community channels for their intended purpose. Avoid spam, repeated unsolicited promotion, and off-topic or disruptive content." },
  { title: "No harassment or impersonation", body: "Harassment, threats, discrimination, and impersonation of any person or organization are not allowed in the community." },
  { title: "No unauthorized account access", body: "Your account is personal. Do not attempt to access another member's account, and keep your own credentials secure." },
  { title: "Reporting community concerns", body: "If you see behavior that breaks these guidelines, report it to the CSC team so it can be reviewed." },
  { title: "Moderation and administrator decisions", body: "CSC administrators may review content and take appropriate action to keep the community safe and welcoming. These guidelines complement the Terms of Use." },
];

export default function CommunityGuidelinesPage() {
  return (
    <>
      <PageHero
        eyebrow="Community"
        title="Community Guidelines"
        description="CSC Circle is built on trust and collaboration. These guidelines describe how we expect members to participate."
      />
      <section className="py-14">
        <Container className="mx-auto flex max-w-2xl flex-col gap-6">
          <p className="text-sm leading-relaxed text-brand-secondary">
            These guidelines help keep the Coimbatore Startup Community respectful, safe, and useful for everyone. They
            complement — and do not replace — our{" "}
            <Link href="/terms" className="font-semibold text-brand-accent underline underline-offset-2">Terms of Use</Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-brand-accent underline underline-offset-2">Privacy Policy</Link>.
          </p>
          <ol className="flex flex-col gap-4">
            {sections.map((s, index) => (
              <li key={s.title} className="flex gap-4 rounded-2xl border border-brand-border bg-brand-white p-5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-purple/40 text-sm font-bold text-brand-ink">
                  {index + 1}
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-brand-ink">{s.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-brand-secondary">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="rounded-2xl bg-brand-cloud p-5 text-center text-sm text-brand-secondary">
            Questions about these guidelines? Visit the{" "}
            <Link href="/help" className="font-semibold text-brand-accent underline underline-offset-2">Help &amp; FAQ</Link>{" "}
            or{" "}
            <Link href="/contact" className="font-semibold text-brand-accent underline underline-offset-2">Contact</Link> the community team.
          </p>
        </Container>
      </section>
    </>
  );
}
