import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase admin
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        or: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })),
  })),
}));

// Mock viaSocket trigger
vi.mock("@/lib/services/viasocket", () => ({
  triggerViaSocketFlow: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock Inbound Router
const mockRouteInbound = vi.fn().mockResolvedValue({ handled: true });
vi.mock("@/lib/services/whatsapp-inbound-router", () => ({
  routeInboundWhatsAppMessage: (...args: any[]) => mockRouteInbound(...args),
}));

import { POST } from "../src/app/api/webhooks/msg91/route";

describe("MSG91 Webhook Route Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("intercepts and absorbs MSG91 Outbound webhook without dispatching to inbound router", async () => {
    const req = new Request("http://localhost:3000/api/webhooks/msg91", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "On Outbound Request Received",
        mobile: "919342877474",
        uuid: "out-msg-12345",
        content: "Coimbatore Startup Community was founded by K. N. Reyash",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.status).toBe("success");
    expect(json.channel).toBe("outbound");
    expect(json.result.status).toBe("request_acknowledged");

    // Inbound router MUST NEVER be called for outbound events!
    expect(mockRouteInbound).not.toHaveBeenCalled();
  });

  it("drops messages sent from our own CSC business number (+91 7550067712)", async () => {
    const req = new Request("http://localhost:3000/api/webhooks/msg91", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "message",
        customerNumber: "917550067712",
        content: "Echo message from bot",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.status).toBe("success");
    expect(json.type).toBe("self_message_ignored");
    expect(mockRouteInbound).not.toHaveBeenCalled();
  });

  it("deduplicates identical requests delivered within 60s", async () => {
    const makeReq = () =>
      new Request("http://localhost:3000/api/webhooks/msg91", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "inbound",
          customerNumber: "919342877474",
          content: "Hello CSC",
          uuid: "unique-msg-9999",
        }),
      });

    // First call: processed
    const res1 = await POST(makeReq());
    const json1 = await res1.json();
    expect(json1.type).toBe("inbound_processed");
    expect(mockRouteInbound).toHaveBeenCalledTimes(1);

    // Second call: duplicate ignored
    const res2 = await POST(makeReq());
    const json2 = await res2.json();
    expect(json2.type).toBe("duplicate_ignored");
    expect(mockRouteInbound).toHaveBeenCalledTimes(1);
  });

  it("processes legitimate inbound user messages cleanly", async () => {
    const req = new Request("http://localhost:3000/api/webhooks/msg91", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "inbound",
        customerNumber: "919876543210",
        content: "hello",
        uuid: "inbound-msg-abc",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.status).toBe("success");
    expect(json.type).toBe("inbound_processed");
    expect(mockRouteInbound).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "919876543210",
        text: "hello",
        messageId: "inbound-msg-abc",
      })
    );
  });
});
