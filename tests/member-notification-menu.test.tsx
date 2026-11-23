import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberNotificationMenu } from "@/components/member/member-notification-menu";

describe("member notification inbox", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("shows available member notifications and persists read state", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          unreadCount: 1,
          items: [{
            id: "11111111-1111-4111-8111-111111111111",
            type: "claim.active",
            title: "CSC membership is active",
            message: "Your CSC membership is now active.",
            action_url: "/member/id-card",
            read_at: null,
            created_at: "2026-10-20T10:00:00Z",
            delivered_at: "2026-10-20T10:00:00Z",
          }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<MemberNotificationMenu />);
    const bell = await screen.findByRole("button", { name: "Notifications, 1 unread" });
    fireEvent.click(bell);
    expect(await screen.findByText("Your CSC membership is now active.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/member/notifications", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ action: "read", id: "11111111-1111-4111-8111-111111111111" }),
    }));
  });

  it("keeps the notification panel inside a narrow mobile viewport", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ unreadCount: 0, items: [] }) }));
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 344, y: 24, top: 24, right: 380, bottom: 60, left: 344, width: 36, height: 36,
      toJSON: () => ({}),
    });

    render(<MemberNotificationMenu />);
    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));
    const panel = await screen.findByRole("region", { name: "Your notifications" });
    expect(panel).toHaveClass("fixed");
    expect(panel.parentElement).toBe(document.body);
    expect(panel.style.left).toBe("12px");
    // Vertically centered in the 844px mobile viewport: (844 - 580) / 2 = 132px
    expect(panel.style.top).toBe("132px");
    expect(panel.style.width).toBe("366px");
    expect(panel).toHaveClass("flex", "flex-col");
    expect(screen.getByTestId("notification-backdrop")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close notifications" })).toBeInTheDocument();
  });

  it("bounds the notification panel to the visible mobile viewport", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ unreadCount: 0, items: [] }) }));
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: {
      offsetLeft: 210, offsetTop: 18, width: 390, height: 700,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    } });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 540, y: 34, top: 34, right: 576, bottom: 70, left: 540, width: 36, height: 36,
      toJSON: () => ({}),
    });

    render(<MemberNotificationMenu />);
    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));
    const panel = await screen.findByRole("region", { name: "Your notifications" });
    expect(panel.style.left).toBe("222px");
    expect(panel.style.top).toBe("78px");
    expect(panel.style.width).toBe("366px");
  });

  it("filters notifications by categories (all, events, passes, updates) and closes via close button", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        unreadCount: 0,
        items: [
          {
            id: "1",
            type: "EventConfirmed",
            title: "You're registered — event pass approved",
            message: "Your registration for CSC Joint Online Meeting is confirmed.",
            action_url: "/profile/events",
            read_at: "2026-11-15T00:00:00Z",
            created_at: "2026-11-15T00:00:00Z",
          },
          {
            id: "2",
            type: "EventRSVPReceived",
            title: "Event registration received",
            message: "Your event registration has been received.",
            action_url: "/profile/events",
            read_at: "2026-11-03T00:00:00Z",
            created_at: "2026-11-03T00:00:00Z",
          },
          {
            id: "3",
            type: "review.approved",
            title: "Review approved",
            message: "Your CSC community review has been approved.",
            action_url: "/profile/reviews",
            read_at: "2026-11-01T00:00:00Z",
            created_at: "2026-11-01T00:00:00Z",
          },
        ],
      }),
    }));

    render(<MemberNotificationMenu />);
    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));

    // All tab shows all 3
    expect(await screen.findByText("You're registered — event pass approved")).toBeInTheDocument();
    expect(screen.getByText("Event registration received")).toBeInTheDocument();
    expect(screen.getByText("Review approved")).toBeInTheDocument();

    // Events filter
    fireEvent.click(screen.getByRole("button", { name: "Events" }));
    expect(screen.getByText("You're registered — event pass approved")).toBeInTheDocument();
    expect(screen.getByText("Event registration received")).toBeInTheDocument();
    expect(screen.queryByText("Review approved")).not.toBeInTheDocument();

    // Passes filter
    fireEvent.click(screen.getByRole("button", { name: "Passes" }));
    expect(screen.getByText("You're registered — event pass approved")).toBeInTheDocument();
    expect(screen.queryByText("Event registration received")).not.toBeInTheDocument();
    expect(screen.queryByText("Review approved")).not.toBeInTheDocument();

    // Updates filter
    fireEvent.click(screen.getByRole("button", { name: "Updates" }));
    expect(screen.queryByText("You're registered — event pass approved")).not.toBeInTheDocument();
    expect(screen.queryByText("Event registration received")).not.toBeInTheDocument();
    expect(screen.getByText("Review approved")).toBeInTheDocument();

    // Close button dismisses the panel
    fireEvent.click(screen.getByRole("button", { name: "Close notifications" }));
    expect(screen.queryByRole("region", { name: "Your notifications" })).not.toBeInTheDocument();
  });
});
