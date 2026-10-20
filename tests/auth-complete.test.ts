// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { schedule } = vi.hoisted(() => ({ schedule: vi.fn() }));
const query = {
  select: vi.fn(),
  eq: vi.fn(),
  limit: vi.fn(),
  maybeSingle: vi.fn(),
};
query.select.mockReturnValue(query);
query.eq.mockReturnValue(query);
query.limit.mockResolvedValue({ data: [] });
query.maybeSingle.mockResolvedValue({ data: { id: "member-1" }, error: null });

vi.mock("@/lib/supabase/server", () => ({
  getAuthUser: vi.fn(async () => ({ id: "member-1", email_confirmed_at: "2026-10-20T00:00:00Z" })),
  createClient: vi.fn(async () => ({
    rpc: vi.fn(async () => ({ error: null })),
    from: vi.fn(() => query),
  })),
}));
vi.mock("@/lib/notifications/schedule", () => ({ scheduleNotificationDelivery: schedule }));

import { GET } from "@/app/auth/complete/route";

beforeEach(() => {
  vi.clearAllMocks();
  query.limit.mockResolvedValue({ data: [] });
  query.maybeSingle.mockResolvedValue({ data: { id: "member-1" }, error: null });
});

describe("authentication completion", () => {
  it("schedules queued first-login email delivery after successful sign-in", async () => {
    const response = await GET(new Request("https://csc.example/auth/complete"));

    expect(schedule).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("https://csc.example/auth/success?next=%2Fmember%2Fprofile");
  });
});
