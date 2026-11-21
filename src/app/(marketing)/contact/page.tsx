import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Globe, LifeBuoy, ShieldCheck, CalendarDays, Sparkles, Clock, MapPin, Building2, CheckCircle2 } from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { CircularSocialIcon } from "@/components/common/brand-icons";
import { siteConfig } from "@/lib/content/site";
import { ConsultationForm } from "@/components/events/rsvp-form";

export const metadata: Metadata = {
  title: "Contact CSC Circle — Department Desks & Support",
  description:
    "Direct communication channels, specialized department email desks, response SLAs, and founder guidance request portal for Coimbatore Startup Community.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const departments = [
    {
      role: "General & Membership Desk",
      email: "coimbatorestartup.csc@gmail.com",
      desc: "Membership card approval queries, onboarding assistance, community partnerships, and general inquiries.",
      sla: "Within 24 hours (Mon–Sat)",
      badge: "Community Desk",
    },
    {
      role: "Event Registrations & Passes",
      email: "coimbatorestartupcommunity@gmail.com",
      desc: "QR pass re-issuance, Google Meet check-in troubleshooting, speaker nominations, and workshop inquiries.",
      sla: "Within 12–24 hours (priority during event days)",
      badge: "Events Desk",
    },
    {
      role: "Technical & Platform Architecture",
      email: "hello@logicintelligencetechnologies.in",
      altEmail: "logicintelligencetechnologies@gmail.com",
      desc: "Security disclosures, API rate limit allowances, technical bugs, and platform infrastructure matters.",
      sla: "Within 48 hours (Security disclosures acknowledged in 48h)",
      badge: "Engineering Desk",
    },
  ];

  const socialChannels = [
    {
      network: "whatsapp" as const,
      label: "WhatsApp Community",
      value: "Official Broadcast Channel",
      href: siteConfig.social.whatsapp,
      note: "Instant broadcast alerts, event pass reminders, and updates.",
    },
    {
      network: "linkedin" as const,
      label: "LinkedIn Profile",
      value: "Coimbatore Startup Community",
      href: siteConfig.social.linkedin,
      note: "Connect with leadership, founder updates, and ecosystem news.",
    },
    {
      network: "instagram" as const,
      label: "Instagram Community",
      value: "@coimbatorestartupcommunity",
      href: siteConfig.social.instagram,
      note: "Follow for announcements, live coverage, and photo highlights.",
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Direct Desks & Guidance"
        title="Contact CSC Circle"
        description="Connect with our specialized team desks for rapid assistance, submit founder consultation requests, or join our community communication circles."
      />

      <section className="py-14">
        <Container className="mx-auto flex max-w-4xl flex-col gap-12">
          {/* Department Desks */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-brand-ink">Specialized Department Desks</h2>
                <p className="mt-0.5 text-xs text-brand-secondary">
                  Route your message directly to the appropriate team for fastest resolution.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <Clock className="size-3.5" /> 24–48h SLA Commitment
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {departments.map((dept) => (
                <div
                  key={dept.role}
                  className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs transition hover:border-brand-ink/20"
                >
                  <div className="flex flex-col gap-2">
                    <span className="w-fit rounded-full bg-brand-cloud px-2.5 py-0.5 text-[11px] font-semibold text-brand-accent">
                      {dept.badge}
                    </span>
                    <h3 className="text-base font-bold text-brand-ink">{dept.role}</h3>
                    <p className="text-xs leading-relaxed text-brand-secondary">{dept.desc}</p>
                  </div>
                  <div className="mt-5 flex flex-col gap-2 border-t border-brand-border/60 pt-4">
                    <a
                      href={`mailto:${dept.email}`}
                      className="text-xs font-semibold text-brand-accent hover:underline break-all"
                    >
                      {dept.email}
                    </a>
                    {dept.altEmail && (
                      <a
                        href={`mailto:${dept.altEmail}`}
                        className="text-xs font-medium text-brand-secondary hover:underline break-all"
                      >
                        {dept.altEmail}
                      </a>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-brand-muted">
                      <Clock className="size-3" /> {dept.sla}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Founder Guidance Consultation Form */}
          <div
            id="consultation"
            className="flex flex-col gap-6 rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-10 shadow-xs ring-1 ring-brand-border"
          >
            <div className="flex flex-col gap-2">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
                <Sparkles className="size-3.5" /> 1:1 Founder Guidance
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-brand-ink">Request a Founder Consultation</h2>
              <p className="text-sm leading-relaxed text-brand-secondary">
                Are you an early-stage founder navigating product architecture, technical validation, TANSEED grants, or investor pitch decks? Submit your details below. Our advisory committee evaluates requests weekly to schedule a complimentary 30-minute virtual guidance session.
              </p>
            </div>
            <ConsultationForm />
          </div>

          {/* Social & Real-time Channels */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight text-brand-ink">Community Circles & Channels</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {socialChannels.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between rounded-2xl border border-brand-border bg-brand-white p-5 transition hover:bg-brand-cloud hover:shadow-xs focus-visible:outline-2 focus-visible:outline-brand-ink"
                >
                  <div className="flex items-start gap-3">
                    <CircularSocialIcon network={c.network} size={42} className="group-hover:scale-105" />
                    <div>
                      <span className="block text-sm font-semibold text-brand-ink">{c.label}</span>
                      <span className="mt-0.5 block text-xs font-medium text-brand-accent">{c.value}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-brand-secondary">{c.note}</p>
                </a>
              ))}
            </div>
          </div>

          {/* Regional Hub & Headquarters */}
          <div className="flex flex-col gap-4 rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-cloud text-brand-ink">
                <MapPin className="size-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-brand-ink">Regional Ecosystem Hub</h3>
                <p className="text-xs text-brand-secondary">
                  Coimbatore Startup Community operates across Coimbatore, Tamil Nadu, India.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 pt-2 text-xs text-brand-secondary border-t border-brand-border/60">
              <div>
                <span className="block font-semibold text-brand-ink">Headquarters Location</span>
                <p className="mt-1">Coimbatore, Tamil Nadu 641001, India</p>
              </div>
              <div>
                <span className="block font-semibold text-brand-ink">Platform Technology Partner</span>
                <p className="mt-1">Logic Intelligence Technologies</p>
              </div>
              <div>
                <span className="block font-semibold text-brand-ink">Hours of Operation</span>
                <p className="mt-1">Monday – Saturday: 9:00 AM – 6:30 PM IST</p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
