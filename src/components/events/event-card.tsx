import * as React from "react";
import Image from "next/image";
import Link from "next/link";
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
import { ReviewDialog } from "@/components/reviews/review-dialog";
import type { EventRecord } from "@/types";

const registrationLabel: Record<EventRecord["registrationState"], string> = {
  completed: "Completed",
  open: "Open Registration",
  closed: "Registration closed",
  full: "Fully booked",
  "coming-soon": "Registration opening soon",
  unavailable: "Registration unavailable",
};

const registrationTone: Record<EventRecord["registrationState"], string> = {
  completed: "bg-brand-cloud text-brand-muted",
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
  href?: string;
}

export function EventCard({
  event,
  onSelect,
  selected,
  className,
  href,
}: EventCardProps) {
  const { day, month } = eventDayParts(event.startsAt);
  const interactive = typeof onSelect === "function";
  const targetHref = href ?? (event.slug ? `/events/${event.slug}` : undefined);

  const body = (
    <>
      <div className="group/cover relative isolate aspect-video w-full overflow-hidden rounded-t-3xl bg-gradient-to-br from-[#e8e5ff] via-[#e8f3ff] to-[#fcecf4]">
        {targetHref && event.registrationState === "completed" && !interactive ? (
          <Link href={targetHref} className="absolute inset-0 z-10" aria-label={`View details for ${event.title}`} />
        ) : null}
        {event.coverImage ? (
          <>
            <Image
              src={event.coverImage}
              alt={`${event.title} cover`}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover transition-transform duration-500 group-hover/cover:scale-[1.03] motion-reduce:transition-none"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#111827]/25 via-transparent to-white/10" />
          </>
        ) : (
          <div className="relative flex size-full items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_18%_12%,rgba(255,255,255,0.92),transparent_36%),radial-gradient(ellipse_at_82%_90%,rgba(236,197,224,0.48),transparent_34%),linear-gradient(135deg,#e9e6ff_0%,#e8f4ff_52%,#f9eaf3_100%)]">
            <span aria-hidden="true" className="absolute -top-16 -left-10 size-52 rounded-full border border-white/60 bg-white/20 shadow-[inset_0_1px_20px_rgba(255,255,255,0.55)] backdrop-blur-md" />
            <span aria-hidden="true" className="absolute -right-12 -bottom-24 size-64 rounded-full border border-white/55 bg-white/25 shadow-[inset_0_1px_24px_rgba(255,255,255,0.7)] backdrop-blur-md" />
            <span aria-hidden="true" className="absolute top-1/2 left-1/2 h-px w-[72%] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
            <span className="relative flex size-20 items-center justify-center rounded-[1.7rem] border border-white/75 bg-white/55 shadow-[0_14px_38px_-18px_rgba(55,64,113,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl ring-1 ring-white/40 sm:size-[5.5rem]">
              <Calendar className="size-9 text-[#66718b]/65 sm:size-10" strokeWidth={1.7} aria-hidden />
            </span>
            <span aria-hidden="true" className="absolute right-5 bottom-4 rounded-full border border-white/70 bg-white/45 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-[#66718b]/75 uppercase shadow-sm backdrop-blur-lg">CSC · COMMUNITY</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col items-center rounded-xl border border-white/80 bg-white/75 px-3 py-1.5 text-center shadow-[0_8px_22px_-12px_rgba(27,35,67,0.45)] ring-1 ring-white/55 backdrop-blur-xl">
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

      <div className="flex flex-1 flex-col gap-3 bg-gradient-to-b from-white/95 to-[#fbfbff]/90 p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="border border-white/80 bg-[#f3f4fb]/80 text-brand-secondary shadow-sm backdrop-blur-lg">
            {eventCategoryLabels[event.category]}
          </Badge>
          <span className="text-xs font-medium text-brand-muted">
            {event.admission === "free" ? "Free" : "Paid"}
          </span>
        </div>

        {targetHref && event.registrationState === "completed" && !interactive ? (
          <Link href={targetHref} className="hover:underline">
            <h3 className="text-lg leading-tight font-semibold text-brand-ink">
              {event.title}
            </h3>
          </Link>
        ) : (
          <h3 className="text-lg leading-tight font-semibold text-brand-ink">
            {event.title}
          </h3>
        )}

        <ul className="flex flex-col gap-1.5 text-sm text-brand-muted">
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" aria-hidden />
            {formatEventDate(event.startsAt)} · {formatEventTime(event.startsAt)} IST
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {event.format === "online" ? "Online (Google Meet)" : event.location}
          </li>
        </ul>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span
            className={cn(
              "inline-flex rounded-full border border-white/75 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-lg",
              registrationTone[event.registrationState],
            )}
          >
            {registrationLabel[event.registrationState]}
          </span>
          {event.registrationState === "completed" && !interactive ? (
            <ReviewDialog
              eventId={event.id}
              eventTitle={event.title}
              type="event"
              buttonLabel="Ratings and Review"
              className="relative z-20 rounded-full bg-brand-ink px-3 py-1.5 text-xs text-brand-white shadow-sm hover:bg-brand-ink/90 cursor-pointer"
            />
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-sm font-semibold",
                event.registrationState === "completed" || event.registrationState === "open"
                  ? "rounded-full bg-brand-ink px-3 py-1.5 text-brand-white shadow-sm"
                  : "text-brand-accent",
              )}
            >
              {event.registrationState === "completed" ? "Ratings and Review" : event.registrationState === "open" ? "Book Now →" : "View details"}
            </span>
          )}
        </div>
      </div>
    </>
  );

  const base = cn(
    "group flex h-full flex-col overflow-hidden rounded-3xl border border-white/75 bg-white/75 text-left shadow-[0_18px_48px_-32px_rgba(31,41,78,0.42)] ring-1 transition-[transform,box-shadow,ring-color] duration-300 backdrop-blur-xl motion-reduce:transition-none",
    selected ? "-translate-y-0.5 ring-2 ring-brand-accent shadow-[0_22px_50px_-28px_rgba(92,74,190,0.35)]" : "ring-brand-border hover:-translate-y-0.5 hover:shadow-[0_24px_56px_-30px_rgba(31,41,78,0.4)]",
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

  if (targetHref && event.registrationState !== "completed") {
    return (
      <Link href={targetHref} className={base}>
        {body}
      </Link>
    );
  }

  return <article className={base}>{body}</article>;
}
