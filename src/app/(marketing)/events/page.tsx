import type { Metadata } from "next";
import Link from "next/link";
import { QrCode, Video, Clock, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { FeaturedEventNotices } from "@/components/events/featured-event-notices";
import { EventsClient } from "@/components/events/events-client";
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
        <Container className="flex flex-col gap-10">
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
                      Live Portal
                    </span>
                    <span className="text-xs text-brand-muted">Opens 1h Prior</span>
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
                    Ticketing & Pass Policy
                  </span>
                  <h3 className="mt-1 text-base font-bold text-brand-ink">Pass Integrity & Refund Guarantee</h3>
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
                  Read ticketing & refund terms <ArrowRight className="size-3" />
                </Link>
              </div>
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
        </Container>
      </section>
    </>
  );
}
