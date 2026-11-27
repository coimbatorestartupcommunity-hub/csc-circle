import type { Metadata } from "next";
import Link from "next/link";
import {
  QrCode,
  Video,
  Clock,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Ticket,
  Smartphone,
  CalendarDays,
  Users,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { FeaturedEventNotices } from "@/components/events/featured-event-notices";
import { EventsClient } from "@/components/events/events-client";
import { EventProposalForm } from "@/components/events/event-proposal-form";
import { getPublicEvents } from "@/lib/services/public-data";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Events & Booking — CSC Circle",
  description:
    "Discover CSC Circle founder meetups, pitch sessions, workshops and live Google Meet check-ins across Coimbatore's entrepreneurial ecosystem.",
  alternates: { canonical: "/events" },
  openGraph: {
    title: "Events & Booking · CSC Circle",
    description:
      "Real conversations. Real connections. Real opportunities — CSC Circle events in Coimbatore.",
    url: `${siteConfig.url}/events`,
  },
};

const entrySteps = [
  {
    step: "01",
    title: "1-Click RSVP",
    desc: "Free for verified CSC members. Select your seat in seconds.",
  },
  {
    step: "02",
    title: "Cryptographic Pass",
    desc: "Dynamic QR pass issued with instant Apple & Google Wallet export.",
  },
  {
    step: "03",
    title: "60-Min Virtual Gate",
    desc: "Online check-in unlocks 1h prior to session for instant Google Meet redirect.",
  },
  {
    step: "04",
    title: "Express Physical Check-in",
    desc: "Scan at venue kiosks across offline meetup corridors in < 1 second.",
  },
];

export default async function EventsPage() {
  const events = await getPublicEvents();

  return (
    <>
      <PageHero
        eyebrow="Events & Booking"
        title="Events & Community Gatherings"
        description="Discover CSC Circle meetups, pitch sessions, workshops, and opportunities to connect with Coimbatore's entrepreneurial community. All times in India Standard Time (IST)."
      />

      <section className="py-14 sm:py-16 lg:py-20">
        <Container className="flex flex-col gap-12">
          {/* Quick Actions & Pass Helper */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-white p-6 shadow-xs">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-cloud text-brand-ink">
                  <Video className="size-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Live Virtual Portal
                    </span>
                    <span className="text-xs text-brand-muted">Unlocks 1h Prior</span>
                  </div>
                  <h3 className="mt-1 text-base font-bold text-brand-ink">Google Meet Check-in Portal</h3>
                  <p className="mt-1 text-xs leading-relaxed text-brand-secondary">
                    Registered for an upcoming virtual session? Check in with your Pass Reference or scan your pass QR code for instant access into the Google Meet room.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-brand-border/60">
                <Link
                  href="/events/google-meet/check-in"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
                >
                  Go to virtual check-in <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border border-brand-border bg-brand-cloud/50 p-6 shadow-xs">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-white text-brand-ink ring-1 ring-brand-border">
                  <QrCode className="size-5" />
                </span>
                <div>
                  <span className="rounded-full bg-brand-white px-2.5 py-0.5 text-[11px] font-semibold text-brand-accent ring-1 ring-brand-border">
                    Ticketing &amp; Pass Policy
                  </span>
                  <h3 className="mt-1 text-base font-bold text-brand-ink">Pass Integrity &amp; 100% Refund Guarantee</h3>
                  <p className="mt-1 text-xs leading-relaxed text-brand-secondary">
                    Passes are cryptographically verified and non-transferable. For ticketed workshops, cancellations made 48 hours prior receive a 100% refund.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-brand-border/60">
                <Link
                  href="/terms#ticketing"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-secondary hover:text-brand-ink hover:underline"
                >
                  Read ticketing &amp; refund terms <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* 4-Step Entry Pipeline Card */}
          <div className="rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8 shadow-xs">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                  Seamless Access Pipeline
                </span>
                <h3 className="text-lg font-bold text-brand-ink mt-0.5">How CSC Event Entry Works</h3>
              </div>
              <span className="text-xs text-brand-muted">Automated QR Verification</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {entrySteps.map((s) => (
                <div key={s.step} className="rounded-2xl bg-brand-cloud/40 p-4 border border-brand-border/60">
                  <span className="font-mono text-xs font-bold text-brand-accent">{s.step}</span>
                  <h4 className="mt-1 text-sm font-bold text-brand-ink">{s.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-brand-secondary">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <FeaturedEventNotices />

          <div className="w-full space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-accent">
                Meet, learn, and build together
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-brand-ink sm:text-3xl">Upcoming Events</h2>
            </div>
            <EventsClient events={events} />
          </div>

          {/* Host or Organize an Event / Community Gathering Proposal Form */}
          <div
            id="host"
            className="mt-6 flex flex-col gap-6 rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-10 shadow-xs ring-1 ring-brand-border"
          >
            <div className="flex flex-col gap-2">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-cloud px-3 py-1 text-xs font-semibold text-brand-accent">
                <Sparkles className="size-3.5" /> Community Organizer &amp; Host Desk
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-brand-ink">
                Host an Event, Workshop, or Founder Gathering
              </h2>
              <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-brand-secondary">
                Are you a startup founder, community leader, or tech team looking to organize a meetup, hackathon, product demo, or virtual workshop? Propose your session below. Approved events receive ticketing pass generation, check-in infrastructure, and community broadcast outreach.
              </p>
            </div>

            <div className="border-t border-brand-border/60 pt-4">
              <EventProposalForm />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
