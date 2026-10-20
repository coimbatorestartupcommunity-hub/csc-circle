import { describe, expect, it } from "vitest";
import { isEventNoticeActive } from "@/lib/announcements/event-notice";

describe("event notice visibility", () => {
  const now = Date.parse("2026-10-21T10:00:00.000Z");
  const base = { status: "published", eventStatus: "published", startsAt: "2026-10-21T10:00:00.000Z", stopsAt: "2026-10-22T10:00:00.000Z" };

  it("includes the exact start and excludes the exact end", () => {
    expect(isEventNoticeActive(base, now)).toBe(true);
    expect(isEventNoticeActive({ ...base, stopsAt: "2026-10-21T10:00:00.000Z" }, now)).toBe(false);
    expect(isEventNoticeActive({ ...base, startsAt: "2026-10-21T10:00:00.001Z" }, now)).toBe(false);
  });

  it("never shows an unpublished notice, removed notice or ineligible event", () => {
    expect(isEventNoticeActive({ ...base, status: "draft" }, now)).toBe(false);
    expect(isEventNoticeActive({ ...base, deletedAt: "2026-10-21T09:00:00.000Z" }, now)).toBe(false);
    expect(isEventNoticeActive({ ...base, eventStatus: "cancelled" }, now)).toBe(false);
  });

  it("allows open-ended windows once their start has arrived", () => {
    expect(isEventNoticeActive({ ...base, startsAt: null, stopsAt: null }, now)).toBe(true);
    expect(isEventNoticeActive({ ...base, startsAt: "not-a-date" }, now)).toBe(false);
  });
});
