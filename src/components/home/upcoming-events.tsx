import * as React from "react";
import { CalendarClock } from "lucide-react";
import { Section, SectionHeading } from "@/components/common/section";
import { EventCard } from "@/components/events/event-card";
import { CtaLink } from "@/components/common/cta-link";
import { EmptyState } from "@/components/common/empty-state";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { getUpcomingEvents } from "@/lib/services/events";
import { upcomingEventsSection } from "@/lib/content/home";

export function UpcomingEvents() {
  const events = getUpcomingEvents(3);
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
          <div className="mt-10 flex justify-center">
            <CtaLink href={upcomingEventsSection.cta.href} variant="outline">
              {upcomingEventsSection.cta.label}
            </CtaLink>
          </div>
        </>
      ) : (
        <div className="mt-12">
          <EmptyState
            icon={CalendarClock}
            title={upcomingEventsSection.emptyTitle}
            description={upcomingEventsSection.emptyBody}
          >
            <CtaLink href="/login" size="md">
              Join the Community
            </CtaLink>
          </EmptyState>
        </div>
      )}
    </Section>
  );
}
