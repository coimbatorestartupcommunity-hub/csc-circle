import * as React from "react";
import Image from "next/image";
import { MapPin, Clock, Calendar } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { FixtureNotice } from "@/components/common/empty-state";
import { eventCategoryLabels } from "@/lib/content/taxonomy";
import {
  eventDayParts,
  formatEventDate,
  formatEventTime,
} from "@/lib/format";
import type { EventRecord } from "@/types";

const registrationLabel: Record<EventRecord["registrationState"], string> = {
  open: "Registration open",
  closed: "Registration closed",
  full: "Fully booked",
  "coming-soon": "Registration opening soon",
  unavailable: "Registration unavailable",
};

const registrationTone: Record<EventRecord["registrationState"], string> = {
  open: "bg-green-100 text-green-700",
  closed: "bg-brand-cloud text-brand-muted",
  full: "bg-brand-red text-brand-ink",
  "coming-soon": "bg-brand-gold text-brand-ink",
  unavailable: "bg-brand-cloud text-brand-muted",
};

export interface EventCardProps {
  event: EventRecord;
  onSelect?: (event: EventRecord) => void;
  selected?: boolean;
  className?: string;
}

export function EventCard({
  event,
  onSelect,
  selected,
  className,
}: EventCardProps) {
  const { day, month } = eventDayParts(event.startsAt);
  const interactive = typeof onSelect === "function";

  const body = (
    <>
      <div className="relative aspect-video w-full overflow-hidden rounded-t-3xl bg-gradient-to-br from-brand-purple via-brand-blue to-brand-pink">
        {event.coverImage ? (
          <Image
            src={event.coverImage}
            alt={`${event.title} cover`}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Calendar className="size-10 text-brand-ink/30" aria-hidden />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col items-center rounded-xl bg-brand-white px-3 py-1.5 text-center shadow-sm ring-1 ring-brand-border">
          <span className="text-lg leading-none font-bold text-brand-ink">
            {day}
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-brand-muted">
            {month}
          </span>
        </div>
        {event.isFixture ? (
          <div className="absolute top-3 right-3">
            <FixtureNotice />
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-brand-cloud text-brand-secondary">
            {eventCategoryLabels[event.category]}
          </Badge>
          <span className="text-xs font-medium text-brand-muted">
            {event.admission === "free" ? "Free" : "Paid"}
          </span>
        </div>

        <h3 className="text-lg leading-tight font-semibold text-brand-ink">
          {event.title}
        </h3>

        <ul className="flex flex-col gap-1.5 text-sm text-brand-muted">
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" aria-hidden />
            {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt)} IST
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {event.location}
          </li>
        </ul>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
              registrationTone[event.registrationState],
            )}
          >
            {registrationLabel[event.registrationState]}
          </span>
          {interactive ? (
            <span className="text-sm font-medium text-brand-accent">
              {selected ? "Selected" : "View details"}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  const base = cn(
    "flex h-full flex-col overflow-hidden rounded-3xl bg-brand-white text-left ring-1 transition-shadow",
    selected ? "ring-2 ring-brand-accent" : "ring-brand-border",
    className,
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(event)}
        aria-pressed={selected}
        className={cn(
          base,
          "outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        {body}
      </button>
    );
  }

  return <article className={base}>{body}</article>;
}
