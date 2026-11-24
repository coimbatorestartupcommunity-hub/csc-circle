import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase admin client
const mockSelect = vi.fn();
const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect,
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock WhatsApp outbox enqueue
const mockEnqueue = vi.fn().mockResolvedValue({ id: "outbox-test-123", status: "queued" });
vi.mock("@/lib/notifications/whatsapp-outbox", () => ({
  enqueueWhatsAppNotification: (...args: any[]) => mockEnqueue(...args),
}));

// Mock viaSocket trigger
const mockViaSocket = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/services/viasocket", () => ({
  triggerViaSocketFlow: (...args: any[]) => mockViaSocket(...args),
}));

// Mock team alerts
const mockTeamAlert = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/services/team-alerts", () => ({
  dispatchTeamWhatsAppAlert: (...args: any[]) => mockTeamAlert(...args),
}));

import { GET, POST } from "../src/app/api/internal/community-pulse/route";

describe("Bi-Weekly Sunday Community Pulse Cron (/api/internal/community-pulse)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "super-secret-cron-token-123456";
  });

  it("rejects unauthorized calls with 401", async () => {
    const req = new Request("http://localhost:3000/api/internal/community-pulse");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("authorizes calls with x-vercel-cron header", async () => {
    const req = new Request("http://localhost:3000/api/internal/community-pulse?force=1", {
      headers: { "x-vercel-cron": "1" },
    });

    mockSelect.mockReturnValue({
      not: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [
            { full_name: "Reyash", whatsapp: "+91 9876543210" },
            { full_name: "Sharan", whatsapp: "918765432109" },
          ],
          error: null,
        }),
      }),
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.enqueuedCount).toBe(2);
    expect(mockEnqueue).toHaveBeenCalledTimes(2);
    expect(mockTeamAlert).toHaveBeenCalledTimes(1);
  });

  it("authorizes calls with Bearer authorization header", async () => {
    const req = new Request("http://localhost:3000/api/internal/community-pulse?force=1", {
      headers: { authorization: "Bearer super-secret-cron-token-123456" },
    });

    mockSelect.mockReturnValue({
      not: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [{ full_name: "Mirra", whatsapp: "919988776655" }],
          error: null,
        }),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.enqueuedCount).toBe(1);
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientPhone: "919988776655",
        name: "Mirra",
        messageType: "community_pulse_checkin",
      })
    );
  });

  it("skips execution cleanly on off-weeks when not forced", async () => {
    // Current week calculation: Date.now() / (7*24*60*60*1000)
    const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const isOddWeek = currentWeek % 2 !== 0;

    const req = new Request("http://localhost:3000/api/internal/community-pulse", {
      headers: { "x-vercel-cron": "1" },
    });

    mockSelect.mockReturnValue({
      not: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    const res = await GET(req);
    const json = await res.json();

    if (isOddWeek) {
      expect(json.skipped).toBe(true);
      expect(json.reason).toContain("Off-week for bi-weekly Sunday schedule");
      expect(mockEnqueue).not.toHaveBeenCalled();
    } else {
      expect(json.ok).toBe(true);
    }
  });
});
