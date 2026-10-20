import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemberNotificationMenu } from "@/components/member/member-notification-menu";

describe("member notification inbox", () => {
  afterEach(() => vi.unstubAllGlobals());

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
});
