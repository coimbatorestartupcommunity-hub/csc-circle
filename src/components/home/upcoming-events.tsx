import * as React from "react";
import { CalendarClock } from "lucide-react";
import { Section, SectionHeading } from "@/components/common/section";
import { EventCard } from "@/components/events/event-card";
import { CtaLink } from "@/components/common/cta-link";
import { EmptyState } from "@/components/common/empty-state";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { getPublicUpcomingEvents } from "@/lib/services/public-data";
import { upcomingEventsSection } from "@/lib/content/home";

export async function UpcomingEvents() {
  const events = await getPublicUpcomingEvents(3);
  return (
    <Section className="bg-brand-white">
      <SectionHeading
        eyebrow="Upcoming events"
        title={upcomingEventsSection.heading}
        description={upcomingEventsSection.description}
      />

      {events.length > 0 ? (
        <>
          <StaggerContainer className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <StaggerItem key={event.id} className="h-full">
                <EventCard event={event} />
              </StaggerItem>
            ))}
          </StaggerContainer>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <CtaLink href={upcomingEventsSection.cta.href} variant="outline">
              {upcomingEventsSection.cta.label}
            </CtaLink>
            <CtaLink href="/login" size="md" arrow={false}>
              Member Login
            </CtaLink>
          </div>
        </>
      ) : (
        <div className="mt-12">
          <EmptyState
            icon={CalendarClock}
            title={upcomingEventsSection.emptyTitle}
            description={upcomingEventsSection.emptyBody}
          />
        </div>
      )}
      {events.length === 0 ? (
        <div className="mt-6 flex justify-center">
          <CtaLink href="/login" size="md" arrow={false}>
            Member Login
          </CtaLink>
        </div>
      ) : null}
    </Section>
  );
}
