"use client";

import * as React from "react";
import Image from "next/image";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Ticket,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FixtureNotice } from "@/components/common/empty-state";
import { RsvpForm } from "@/components/events/rsvp-form";
import { PaidEventRegistration } from "@/components/events/paid-event-registration";
import { eventCategoryLabels } from "@/lib/content/taxonomy";
import {
  formatEventDate,
  formatEventRange,
} from "@/lib/format";
import type { EventRecord } from "@/types";

/** Selected-event summary + info/consent + RSVP interface. */
export function EventDetailsPanel({
  event,
  events,
  onEventChange,
}: {
  event: EventRecord;
  events: EventRecord[];
  onEventChange?: (id: string) => void;
}) {
  const handleEventChange = onEventChange ?? (() => undefined);
  const facts: { icon: React.ElementType; label: string; value: string }[] = [
    { icon: CalendarDays, label: "Date", value: formatEventDate(event.startsAt) },
    {
      icon: Clock,
      label: "Time",
      value: formatEventRange(event.startsAt, event.endsAt),
    },
    { icon: MapPin, label: "Location", value: event.venue ? `${event.venue}, ${event.location}` : event.location },
    {
      icon: Ticket,
      label: "Admission",
      value: event.admission === "free" ? "Free to attend" : "Paid",
    },
  ];
  if (event.capacity) {
    facts.push({
      icon: Users,
      label: "Capacity",
      value: `${event.capacity} attendees`,
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-[2rem] bg-brand-cloud p-6 ring-1 ring-brand-border sm:p-8">
      {event.coverImage ? <div className="order-first overflow-hidden rounded-2xl bg-brand-white ring-1 ring-brand-border">
        <Image src={event.coverImage} alt={`${event.title} event banner`} width={1600} height={900} className="aspect-video w-full object-cover" unoptimized />
      </div> : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-brand-white text-brand-secondary">
            {eventCategoryLabels[event.category]}
          </Badge>
          {event.isFixture ? <FixtureNotice /> : null}
        </div>
        <h3 className="text-2xl font-bold text-brand-ink text-balance">
          {event.title}
        </h3>
        <p className="text-[15px] leading-relaxed text-brand-secondary">
          {event.description}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="flex items-start gap-3 rounded-2xl bg-brand-white p-3 ring-1 ring-brand-border"
          >
            <fact.icon className="mt-0.5 size-4 shrink-0 text-brand-accent" aria-hidden />
            <div className="flex flex-col">
              <dt className="text-xs tracking-wide text-brand-muted uppercase">
                {fact.label}
              </dt>
              <dd className="text-sm font-medium text-brand-ink">{fact.value}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="flex items-start gap-3 rounded-2xl bg-brand-white p-4 text-sm text-brand-secondary ring-1 ring-brand-border">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-accent" aria-hidden />
        <p>
          Your details are used only to organise this event and to keep you
          informed about CSC Circle. All times are shown in India Standard Time
          (Asia/Kolkata).
        </p>
      </div>

      {event.registrationMode === "paid_upi" ? <div className="border-t border-brand-border pt-6">
        <h4 className="mb-2 text-lg font-semibold text-brand-ink">Register and submit payment proof</h4>
        <p className="mb-4 text-sm text-brand-secondary">Pay the exact total using any UPI app, then enter your transaction reference and upload the screenshot.</p>
        <PaidEventRegistration event={event} />
      </div> : <div className="border-t border-brand-border pt-6">
        <h4 className="mb-4 text-lg font-semibold text-brand-ink">Request your spot</h4>
        <RsvpForm events={events} selectedEventId={event.id} onEventChange={handleEventChange} />
      </div>}
    </div>
  );
}
