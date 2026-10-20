import type { Metadata } from "next";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { FeaturedEventNotices } from "@/components/events/featured-event-notices";
import { EventsClient } from "@/components/events/events-client";
import { getPublicEvents } from "@/lib/services/public-data";
import { siteConfig } from "@/lib/content/site";

export const metadata: Metadata = {
  title: "Events & Booking",
  description:
    "Discover CSC Circle meetups, pitch sessions, workshops and opportunities to connect with Coimbatore's entrepreneurial community. All times in India Standard Time.",
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
        title="Events & Booking"
        description="Discover CSC Circle meetups, pitch sessions, workshops, and opportunities to connect with Coimbatore's entrepreneurial community."
      />
      <section className="py-14 sm:py-16 lg:py-20">
        <Container className="flex flex-col gap-10">
          <FeaturedEventNotices />
          <div className="w-full space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-accent">Meet, learn, and build together</p>
              <h2 className="mt-1 text-2xl font-semibold text-brand-ink sm:text-3xl">Upcoming Events</h2>
            </div>
          <EventsClient events={events} />
          </div>
        </Container>
      </section>
    </>
  );
}
