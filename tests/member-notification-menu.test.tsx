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
    expect(panel.style.top).toBe("68px");
    expect(panel.style.width).toBe("366px");
    expect(panel).toHaveClass("flex", "flex-col");
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
});
