import type { Metadata } from "next";
import Link from "next/link";
import {
  Mail,
  Globe,
  LifeBuoy,
  ShieldCheck,
  CalendarDays,
  Sparkles,
  Clock,
  MapPin,
  Building2,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  PhoneCall,
  Users,
} from "lucide-react";
import { PageHero } from "@/components/common/page-hero";
import { Container } from "@/components/common/container";
import { CircularSocialIcon } from "@/components/common/brand-icons";
import { siteConfig } from "@/lib/content/site";
import { ConsultationForm } from "@/components/events/rsvp-form";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact CSC Circle — 7 Leadership Desks, WhatsApp & Support",
  description:
    "Direct communication channels for all 7 leadership desks, the 5 official community WhatsApp circles, response SLAs, and founder guidance request portal for Coimbatore Startup Community.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const leadershipDesks = siteConfig.leadershipDesks;

  const whatsappCircles = [
    {
      name: "CSC Announcement",
      badge: "Official Broadcast",
      desc: "Zero-noise, admin-only verified alerts for flagship summits, state partnerships (StartupTN / Startup India), and pass releases.",
      url: siteConfig.social.whatsappCircles.announcements.url,
      accent: "border-blue-200 bg-blue-50/50 text-blue-900",
    },
    {
      name: "CSC Circle",
      badge: "Main Community Hub",
      desc: "Peer founder networking, active product showcases, UI/UX critiques, founder matchmaking, and ecosystem discussions.",
      url: siteConfig.social.whatsappCircles.circle.url,
      accent: "border-purple-200 bg-purple-50/50 text-purple-900",
    },
    {
      name: "CSC Mind Sprint",
      badge: "Innovation & Growth",
      desc: "Daily engineering sprints (Monday Logic), product teardowns, Build-in-Public sprints, hackathons, and student fellowships.",
      url: siteConfig.social.whatsappCircles.mindSprint.url,
      accent: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
    },
    {
      name: "CSC Business Network",
      badge: "Enterprise & Alliances",
      desc: "Commercial B2B matchmaking, corporate pilots, connecting traditional manufacturing leaders with tech startups & angel syndicates.",
      url: siteConfig.social.whatsappCircles.businessNetwork.url,
      accent: "border-amber-200 bg-amber-50/50 text-amber-900",
    },
    {
      name: "CSC Opportunities",
      badge: "Grants & Capital Radar",
      desc: "Direct intelligence on non-dilutive seed grants: TANSEED (up to ₹15L), SISFS (up to ₹50L), BIRAC, and top accelerator cohorts.",
      url: siteConfig.social.whatsappCircles.opportunities.url,
      accent: "border-rose-200 bg-rose-50/50 text-rose-900",
    },
  ];

  const socialChannels = [
    {
      network: "whatsapp" as const,
      label: "Official Community Hub",
      value: "CSC WhatsApp Network",
      href: siteConfig.social.whatsapp,
      note: "Join active founders and builders across our primary WhatsApp community network.",
    },
    {
      network: "ai_agent" as const,
      label: "24/7 WhatsApp AI Hotline",
      value: siteConfig.social.whatsappAgentPhone,
      href: siteConfig.social.whatsappAgent,
      note: "Enterprise AI hotline powered by Logic Intelligence Technologies (LIT) for instant answers on events, digital IDs, and ecosystem guidance.",
    },
    {
      network: "linkedin" as const,
      label: "Official LinkedIn Profile",
      value: "Coimbatore Startup Community",
      href: siteConfig.social.linkedin,
      note: "Connect with leadership, founder updates, grant results, and ecosystem press releases.",
    },
    {
      network: "instagram" as const,
      label: "Instagram Community",
      value: "@coimbatorestartupcommunity",
      href: siteConfig.social.instagram,
      note: "Follow for announcements, live meetup coverage, and founder video highlights.",
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Direct Desks & Guidance"
        title="Contact CSC Circle"
        description="Connect with our 7 specialized leadership desks for rapid assistance, join the 5 official community WhatsApp circles, or request a 1:1 founder consultation."
      />

      <section className="py-14 sm:py-16">
        <Container className="mx-auto flex max-w-5xl flex-col gap-14">
          {/* 7 Leadership Desks */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                  Executive Leadership Governance
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">
                  7 Core Leadership Portfolios
                </h2>
                <p className="mt-0.5 text-xs text-brand-secondary">
                  Direct communication channels mapped to each leadership desk for accountability and fast SLAs.
                </p>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <Clock className="size-3.5" /> 24–48h SLA Commitment
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {leadershipDesks.map((desk) => (
                <div
                  key={desk.role}
                  className="flex w-full flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs transition hover:border-brand-ink/20 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] max-w-sm"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-fit rounded-full bg-brand-cloud px-2.5 py-0.5 text-[11px] font-semibold text-brand-accent">
                        {desk.badge}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-brand-muted">
                        <Clock className="size-3" /> {desk.sla}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-brand-ink">{desk.title}</h3>
                      <p className="text-xs font-semibold text-brand-accent mt-0.5">
                        {desk.leader} · <span className="font-normal text-brand-secondary">{desk.role}</span>
                      </p>
                      <p className="text-[11px] text-brand-muted italic">{desk.affiliation}</p>
                    </div>

                    <p className="text-xs leading-relaxed text-brand-secondary mt-1">{desk.focus}</p>
                  </div>

                  <div className="mt-5 flex flex-col gap-1.5 border-t border-brand-border/60 pt-4">
                    <a
                      href={`mailto:${desk.email}`}
                      className="text-xs font-semibold text-brand-accent hover:underline break-all"
                    >
                      {desk.email}
                    </a>
                    {desk.altEmail && (
                      <a
                        href={`mailto:${desk.altEmail}`}
                        className="text-[11px] font-medium text-brand-secondary hover:underline break-all"
                      >
                        {desk.altEmail}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5 Official Community WhatsApp Circles */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
                  Ecosystem Community Circles
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink">
                  5 Official WhatsApp Community Groups
                </h2>
                <p className="mt-0.5 text-xs text-brand-secondary">
                  Curated, noise-free channels tailored for every facet of your entrepreneurial journey.
                </p>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-brand-cloud px-3.5 py-1 text-xs font-semibold text-brand-ink">
                <Users className="size-3.5 text-brand-accent" /> Active Founder Circles
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {whatsappCircles.map((circle) => (
                <a
                  key={circle.name}
                  href={circle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex w-full flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs transition hover:border-brand-ink/20 hover:shadow-md sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)] max-w-sm"
                >
                  <div className="flex flex-col gap-2">
                    <span className={`w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${circle.accent}`}>
                      {circle.badge}
                    </span>
                    <h3 className="text-base font-bold text-brand-ink group-hover:text-brand-accent transition-colors">
                      {circle.name}
                    </h3>
                    <p className="text-xs leading-relaxed text-brand-secondary">{circle.desc}</p>
                  </div>
                  <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-brand-accent border-t border-brand-border/60 pt-3">
                    Join via WhatsApp <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* 24/7 WhatsApp Concierge Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-3xl border-2 border-emerald-500/20 bg-emerald-50/40 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <PhoneCall className="size-6" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-800">
                  Powered by Logic Intelligence Technologies (LIT)
                </span>
                <h3 className="mt-1 text-lg font-bold text-brand-ink">
                  Instant WhatsApp Concierge: {siteConfig.social.whatsappAgentPhone}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-brand-secondary max-w-xl">
                  Connect 24/7 for instant answers on upcoming meetups, digital membership verification, Apple/Google Wallet pass lookups, and ecosystem routing.
                </p>
              </div>
            </div>
            <a
              href={siteConfig.social.whatsappAgent}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <MessageSquare className="size-4" /> Message on WhatsApp &rarr;
            </a>
          </div>

          {/* Quick Contact & Interactive Inquiry Form */}
          <div
            id="inquiry"
            className="flex flex-col gap-6 rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-10 shadow-xs ring-1 ring-brand-border"
          >
            <div className="flex flex-col gap-2">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <MessageSquare className="size-3.5 text-emerald-600" /> Instant Inquiry Desk
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-brand-ink">Send Us an Inquiry</h2>
              <p className="text-sm leading-relaxed text-brand-secondary">
                Have a question about our community, memberships, startup partnerships, or ecosystem initiatives? Send your message below and receive an immediate acknowledgement via WhatsApp.
              </p>
            </div>
            <ContactForm />
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          {/* Regional Hub & Planned Liaisons */}
          <div className="flex flex-col gap-6 rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-cloud text-brand-ink">
                  <MapPin className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-brand-ink">
                    Regional Ecosystem Corridors &amp; Planned Liaisons
                  </h3>
                  <p className="text-xs text-brand-secondary">
                    Physical presence and institutional partner desks are under active dialogue and planned for rollout soon across Coimbatore.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                <Clock className="size-3.5" /> Upcoming Expansion · Planned Soon
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-2 text-xs text-brand-secondary border-t border-brand-border/60">
              <div className="flex flex-col justify-between rounded-2xl border border-dashed border-brand-border bg-brand-cloud/40 p-4">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="block font-bold text-brand-ink">MSME &amp; Industrial Liaison</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Planned Soon
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed">
                    CODISSIA Trade Fair Complex Corridor, Avinashi Road, Coimbatore 641014
                  </p>
                </div>
                <p className="mt-3 text-[11px] text-brand-muted italic">
                  Institutional MoU in progress. Physical desk planned for rollout soon.
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-dashed border-brand-border bg-brand-cloud/40 p-4">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="block font-bold text-brand-ink">IT &amp; DeepTech Hub Liaison</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Planned Soon
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed">
                    TIDEL Park Coimbatore Corridor, Civil Aerodrome Post, Coimbatore 641014
                  </p>
                </div>
                <p className="mt-3 text-[11px] text-brand-muted italic">
                  Tech ecosystem coordination desk in active preparation.
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-dashed border-brand-border bg-brand-cloud/40 p-4">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="block font-bold text-brand-ink">Academic Innovation Liaison</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Planned Soon
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed">
                    Peelamedu &amp; Saravanampatti Technology Incubation Corridors
                  </p>
                </div>
                <p className="mt-3 text-[11px] text-brand-muted italic">
                  University incubation network alignment in progress.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-2 text-xs text-brand-secondary border-t border-brand-border/60">
              <div>
                <span className="block font-semibold text-brand-ink">Operating Headquarters</span>
                <p className="mt-0.5">Coimbatore, Tamil Nadu 641001, India (Digital Secretariat)</p>
              </div>
              <div>
                <span className="block font-semibold text-brand-ink">Platform Technology Partner</span>
                <p className="mt-0.5">Logic Intelligence Technologies (LIT)</p>
              </div>
              <div>
                <span className="block font-semibold text-brand-ink">Hours of Operation</span>
                <p className="mt-0.5">Monday – Saturday: 9:00 AM – 6:30 PM IST</p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
