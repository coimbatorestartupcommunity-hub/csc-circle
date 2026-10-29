import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EventPassCard } from "@/components/member/event-pass-card";
import { RegistrationsClient } from "@/components/member/registrations-client";

afterEach(cleanup);

describe("EventPassCard", () => {
  it("shows the attendee name, UID and venue/address on the downloadable card", () => {
    const { container } = render(<EventPassCard pass={{
      registrationId: "registration-1",
      eventTitle: "CSC CONNECT — Edition 2",
      startsAt: "2026-11-01T06:00:00.000Z",
      endsAt: "2026-11-01T09:00:00.000Z",
      venue: "TICEL Bio Park",
      location: "12th Floor, Coimbatore",
      memberName: "Asha Rao",
      reference: "CSC-EVT-1234567890ABCDEF1234",
      status: "confirmed",
      verificationToken: "a".repeat(64),
    }} isDemo={false} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getAllByText("Asha Rao").length).toBeGreaterThan(0);
    expect(screen.getByText("UID")).toBeInTheDocument();
    expect(screen.getByText("CSC-EVT-1234567890ABCDEF1234")).toBeInTheDocument();
    expect(screen.getByText(/Location:/)).toBeInTheDocument();
    expect(screen.getByText(/TICEL Bio Park, 12th Floor, Coimbatore/)).toBeInTheDocument();
    expect(container.querySelector(".max-w-md")?.textContent).toContain("Name");
    expect(container.querySelector(".max-w-md")?.textContent).toContain("UID");
    expect(container.querySelector(".max-w-md")?.textContent).toContain("Location:");
  });

  it("shows the same labeled fields in the member registration list", () => {
    render(<RegistrationsClient registrations={[{
      id: "registration-2",
      eventId: "event-2",
      eventTitle: "CSC CONNECT — Edition 2",
      startsAt: "2026-11-01T06:00:00.000Z",
      endsAt: "2026-11-01T09:00:00.000Z",
      venue: "TICEL Bio Park",
      location: "12th Floor, Coimbatore",
      memberName: "Asha Rao",
      reference: "CSC-EVT-1234567890ABCDEF1234567890ABCDEF",
      status: "confirmed",
      payment: "paid",
      attendance: "not_attended",
      createdAt: "2026-10-01T00:00:00.000Z",
    }]} />);

    expect(screen.getByText(/Name:/)).toBeInTheDocument();
    expect(screen.getAllByText("Asha Rao").length).toBeGreaterThan(0);
    expect(screen.getByText(/UID:/)).toBeInTheDocument();
    expect(screen.getByText("CSC-EVT-1234567890ABCDEF1234567890ABCDEF")).toBeInTheDocument();
    expect(screen.getByText(/Location:/)).toBeInTheDocument();
    expect(screen.getByText(/TICEL Bio Park, 12th Floor, Coimbatore/)).toBeInTheDocument();
  });
});
