// @vitest-environment node
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { eventNoticeSchema } from "@/lib/announcements/event-notice";
import { sanitizeEventBanner } from "@/lib/media/images";

describe("event notice publishing data", () => {
  it("accepts the required notice details and normalized banner reference", () => {
    const result = eventNoticeSchema.safeParse({
      title: "CSC Founder Meetup",
      message: "Join the founder gathering on Friday at the Coimbatore venue. Register on the events page.",
      actionLabel: "Register for event",
      eventPath: "/events",
      bannerPath: "event-banners/123e4567-e89b-12d3-a456-426614174000.webp",
      expiresAt: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects external event destinations and malformed banner paths", () => {
    const base = { title: "CSC Founder Meetup", message: "Join this community gathering and register now.", actionLabel: "Register", eventPath: "/events" };
    expect(eventNoticeSchema.safeParse({ ...base, eventPath: "https://example.com" }).success).toBe(false);
    expect(eventNoticeSchema.safeParse({ ...base, bannerPath: "../member-portraits/private.webp" }).success).toBe(false);
  });

  it("converts a valid upload into a 4:3 WebP banner", async () => {
    const source = await sharp({ create: { width: 1280, height: 720, channels: 3, background: "#8a6cff" } }).jpeg().toBuffer();
    const banner = await sanitizeEventBanner(source, "image/jpeg");
    const metadata = await sharp(banner.data).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(1200);
    expect(banner.width / banner.height).toBe(4 / 3);
  });
});
