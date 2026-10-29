import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildEventNoticeContent, buildEventUpdateContent } from "@/lib/events/publish-surfaces";

const eventNoticeSchema = z.object({ title: z.string().trim().min(3).max(100), message: z.string().trim().min(8).max(500), buttonLabel: z.string().trim().min(2).max(40) });

const event = {
  title: "CSC CONNECT — Edition 2",
  slug: "csc-connect-edition-2",
  summary: "Socialise · Meet · Connect · Grow — Edition 2 of CSC's stranger-networking meetup.",
  description: "Meet founders, builders, students and professionals. Lunch is included.",
  startsAt: "2026-11-01T06:00:00.000Z",
  venue: "TICEL Bio Park (12th Floor)",
  location: "12th Floor, TICEL Bio Park, Coimbatore",
};

describe("event publication surfaces", () => {
  it("derives a length-valid featured notice from the event copy", () => {
    const notice = buildEventNoticeContent(event);
    expect(eventNoticeSchema.safeParse({ title: notice.title, message: notice.message, buttonLabel: notice.buttonLabel }).success).toBe(true);
  });

  it("derives the linked Updates article with the event date, location and registration URL", () => {
    const update = buildEventUpdateContent(event, "https://csc.logicintelligencetechnologies.in/events/csc-connect-edition-2");
    expect(update.slug).toBe(event.slug);
    expect(update.summary).toBe(event.summary);
    expect(update.body).toContain("When:");
    expect(update.body).toContain("TICEL Bio Park");
    expect(update.body).toContain(update.eventUrl);
    expect(update.body).toContain("2026");
  });
});
