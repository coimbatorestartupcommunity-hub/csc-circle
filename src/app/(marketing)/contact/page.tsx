import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Globe, LifeBuoy, ShieldCheck, CalendarDays } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { InstagramIcon, WhatsappIcon } from "@/components/common/brand-icons";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Contact CSC Circle",
  description:
    "Get in touch with the Coimbatore Startup Community — email, Instagram, and our WhatsApp community, plus guidance for account, event, and security questions.",
  alternates: { canonical: "/contact" },
};

const email = siteConfig.social.email;

export default function ContactPage() {
  const channels = [
    { icon: Mail, label: "Email", value: email, href: `mailto:${email}`, note: "Best for membership, account, and general questions." },
    { icon: InstagramIcon, label: "Instagram", value: "@coimbatorestartupcommunity", href: siteConfig.social.instagram, note: "Follow for community updates and announcements.", external: true },
    { icon: WhatsappIcon, label: "WhatsApp community", value: "Join the CSC community group", href: siteConfig.social.whatsapp, note: "Connect with other members and stay in the loop.", external: true },
    { icon: Globe, label: "Website", value: "csc.logicintelligencetechnologies.in", href: siteConfig.url, note: "Explore events, the founder directory, and more.", external: true },
  ];

  const helpTopics = [
    { icon: LifeBuoy, title: "Account or membership", body: <>For help with registration, your profile, membership status, or your digital card, email <a href={`mailto:${email}`} className="font-semibold text-brand-accent underline underline-offset-2">{email}</a> or check the <Link href="/help" className="font-semibold text-brand-accent underline underline-offset-2">Help &amp; FAQ</Link>.</> },
    { icon: CalendarDays, title: "Events", body: <>For questions about registering for an event, your registration status, or a confirmed pass, see the <Link href="/events" className="font-semibold text-brand-accent underline underline-offset-2">Events</Link> page or email us with the event name.</> },
    { icon: ShieldCheck, title: "Security concerns", body: <>To report suspicious activity or a security issue, email <a href={`mailto:${email}?subject=CSC%20Circle%20security%20report`} className="font-semibold text-brand-accent underline underline-offset-2">{email}</a>. See the <Link href="/security" className="font-semibold text-brand-accent underline underline-offset-2">Security</Link> page for details.</> },
  ];

  return (
    <>
      <PageHero
        eyebrow="Get in touch"
        title="Contact CSC Circle"
        description="We'd love to hear from you. Reach the Coimbatore Startup Community through any of the channels below."
      />
      <section className="py-14">
        <Container className="mx-auto flex max-w-4xl flex-col gap-10">
          <div className="grid gap-4 sm:grid-cols-2">
            {channels.map((c) => (
              <a
                key={c.label}
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex items-start gap-4 rounded-2xl border border-brand-border bg-brand-white p-5 transition-colors hover:bg-brand-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-purple/40 text-brand-ink">
                  <c.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-brand-ink">{c.label}</span>
                  <span className="mt-0.5 block text-sm font-medium break-words text-brand-accent">{c.value}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-brand-muted">{c.note}</span>
                </span>
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-brand-ink">What do you need help with?</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {helpTopics.map((t) => (
                <div key={t.title} className="flex flex-col gap-2 rounded-2xl bg-brand-cloud p-5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand-white text-brand-ink ring-1 ring-brand-border">
                    <t.icon className="size-4" aria-hidden="true" />
                  </span>
                  <h3 className="text-sm font-semibold text-brand-ink">{t.title}</h3>
                  <p className="text-sm leading-relaxed text-brand-secondary">{t.body}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-brand-muted">
            {siteConfig.legalName} · {siteConfig.city}, {siteConfig.region}. CSC Circle is a community-led initiative; we respond as the community team is available.
          </p>
        </Container>
      </section>
    </>
  );
}
