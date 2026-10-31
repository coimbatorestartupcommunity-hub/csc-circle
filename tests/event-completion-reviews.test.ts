import { describe, it, expect } from "vitest";
import { eventEditorSchema } from "@/lib/validations/admin";
import { reviewSchema } from "@/lib/validations/forms";
import { eventHasConcluded } from "@/lib/events/completion";

describe("eventEditorSchema online format and payments validation", () => {
  it("omits venue details and preserves online meeting link when format is online", () => {
    const input = {
      title: "Virtual Tech Connect",
      slug: "virtual-tech-connect",
      category: "meetup" as const,
      organizer: "CSC Team",
      summary: "Online founder discussions",
      description: "Join us virtually on Google Meet for deep tech discussions.",
      format: "online" as const,
      venueName: "Physical Venue",
      venueAddress: "123 Street",
      mapsUrl: "https://maps.google.com/test",
      onlineInfo: "https://meet.google.com/abc-defg-hij",
      date: "2026-11-15",
      startTime: "10:00",
      endTime: "11:30",
      approvalMode: "automatic" as const,
      allowWaitlist: false,
      admission: "free" as const,
      currency: "INR",
      registrationMode: "rsvp" as const,
      maxAttendeesPerRegistration: 1,
      status: "published" as const,
    };

    const parsed = eventEditorSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.format).toBe("online");
      expect(parsed.data.venueName).toBe("");
      expect(parsed.data.venueAddress).toBe("");
      expect(parsed.data.mapsUrl).toBe("");
      expect(parsed.data.onlineInfo).toBe("https://meet.google.com/abc-defg-hij");
      expect(parsed.data.price).toBe("0");
      expect(parsed.data.currency).toBe("INR");
    }
  });

  it("requires online meeting link when publishing an online event", () => {
    const input = {
      title: "Online Meetup Without Link",
      slug: "online-no-link",
      category: "meetup" as const,
      summary: "Online founder meetup",
      description: "Virtual session with founders.",
      format: "online" as const,
      onlineInfo: "",
      date: "2026-11-15",
      startTime: "10:00",
      endTime: "11:30",
      approvalMode: "automatic" as const,
      allowWaitlist: false,
      admission: "free" as const,
      status: "published" as const,
    };

    const parsed = eventEditorSchema.safeParse(input);
    expect(parsed.success).toBe(false);
  });

  it("sets price to 0 and currency to INR for free events", () => {
    const input = {
      title: "Free Workshop",
      slug: "free-workshop",
      category: "workshop" as const,
      summary: "A free workshop for entrepreneurs",
      description: "Free startup workshop in Coimbatore.",
      format: "offline" as const,
      venueName: "CSC Hall",
      venueAddress: "Coimbatore",
      date: "2026-11-20",
      startTime: "14:00",
      endTime: "16:00",
      approvalMode: "automatic" as const,
      allowWaitlist: false,
      admission: "free" as const,
      price: "500", // should be overridden to 0 by transform
      currency: "USD",
      registrationMode: "rsvp" as const,
      maxAttendeesPerRegistration: 1,
      status: "draft" as const,
    };

    const parsed = eventEditorSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.admission).toBe("free");
      expect(parsed.data.price).toBe("0");
      expect(parsed.data.currency).toBe("INR");
      expect(parsed.data.registrationMode).toBe("rsvp");
    }
  });

  it("validates paid admission requires positive price per attendee", () => {
    const input = {
      title: "Paid Masterclass",
      slug: "paid-masterclass",
      category: "workshop" as const,
      summary: "Paid deep dive",
      description: "Advanced founder training.",
      format: "offline" as const,
      venueName: "CSC Academy",
      venueAddress: "RS Puram, Coimbatore",
      date: "2026-11-25",
      startTime: "09:00",
      endTime: "13:00",
      approvalMode: "automatic" as const,
      allowWaitlist: false,
      admission: "paid" as const,
      price: "999",
      currency: "INR",
      registrationMode: "paid_upi" as const,
      pricePerAttendee: "999",
      maxAttendeesPerRegistration: 2,
      upiPayeeName: "CSC Circle",
      upiVpa: "csc@okaxis",
      upiQrPath: "event-upi-qr/12345678-1234-1234-1234-123456789abc.webp",
      status: "published" as const,
    };

    const parsed = eventEditorSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });
});

describe("eventHasConcluded helper", () => {
  it("returns true when event registration_state is completed", () => {
    expect(
      eventHasConcluded({
        ends_at: new Date(Date.now() + 86400000).toISOString(),
        registration_state: "completed",
      }),
    ).toBe(true);
  });

  it("returns true when event end time has passed", () => {
    expect(
      eventHasConcluded({
        ends_at: new Date(Date.now() - 3600000).toISOString(),
        registration_state: "open",
      }),
    ).toBe(true);
  });

  it("returns false when future event is still open", () => {
    expect(
      eventHasConcluded({
        ends_at: new Date(Date.now() + 86400000).toISOString(),
        registration_state: "open",
      }),
    ).toBe(false);
  });
});

describe("reviewSchema with event and collaboration target", () => {
  it("validates review for concluded event with rating and comments", () => {
    const parsed = reviewSchema.safeParse({
      eventId: "123e4567-e89b-12d3-a456-426614174000",
      rating: 5,
      review: "Fantastic event! Super networking and well organized.",
      consent: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("validates review for completed collaboration", () => {
    const parsed = reviewSchema.safeParse({
      collaborationId: "123e4567-e89b-12d3-a456-426614174001",
      rating: 5,
      review: "Super partnership between CSC and Outlier. Truly wonderful experience.",
      consent: true,
    });
    expect(parsed.success).toBe(true);
  });
});
