import type { Metadata } from "next";
import { Container } from "@/components/common/container";
import { PageHero } from "@/components/common/page-hero";
import { FeaturedEvent } from "@/components/events/featured-event";
import { EventsClient } from "@/components/events/events-client";
import { getPublishedEvents, getFeaturedEvent } from "@/lib/services/events";
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

export default function EventsPage() {
  const events = getPublishedEvents();
  const featured = getFeaturedEvent();

  return (
    <>
      <PageHero
        eyebrow="Events & Booking"
        title="Real Conversations. Real Connections. Real Opportunities."
        description="Discover CSC Circle meetups, pitch sessions, workshops, and opportunities to connect with Coimbatore's entrepreneurial community."
      />
      <section className="py-14 sm:py-16 lg:py-20">
        <Container className="flex flex-col gap-10">
          {featured ? <FeaturedEvent event={featured} /> : null}
          <EventsClient events={events} />
        </Container>
      </section>
    </>
  );
}
