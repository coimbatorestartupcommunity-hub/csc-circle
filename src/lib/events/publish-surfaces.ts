export type EventPublicationContent = {
  title: string;
  slug: string;
  summary: string;
  description: string;
  startsAt: string;
  venue: string | null;
  location: string | null;
};

export function eventPublicationDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

export function buildEventNoticeContent(event: Pick<EventPublicationContent, "title" | "summary" | "description">) {
  const message = (event.summary.trim() || event.description.trim()).slice(0, 500);
  return { title: event.title, message, buttonLabel: "View Event" as const };
}

export function buildEventUpdateContent(event: EventPublicationContent, eventUrl: string) {
  const location = [event.venue, event.location].filter(Boolean).join(" — ") || "See event page";
  const details = `\n\nWhen: ${eventPublicationDate(event.startsAt)}\nLocation: ${location}\n\nRegister and view event details: ${eventUrl}`;
  return {
    slug: event.slug,
    title: event.title,
    summary: (event.summary.trim() || event.description.trim()).slice(0, 500),
    body: `${event.description.trim()}${details}`.slice(0, 20000),
    eventUrl,
  };
}
