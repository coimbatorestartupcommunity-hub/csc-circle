// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/contact/route";

// Mock submission client
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/submissions", () => ({
  createSubmissionClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe("POST /api/contact route handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when body is malformed JSON", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Invalid JSON");
  });

  it("returns 400 when name is missing or too short", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "A",
        phone: "9876543210",
        whatsappConsent: true,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Name must be at least 2 characters");
  });

  it("returns 400 when phone number is invalid", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Vikash",
        phone: "12345",
        whatsappConsent: true,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Invalid phone number");
  });

  it("returns 400 when whatsappConsent is missing", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Vikash",
        phone: "9876543210",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it("silently traps bots when honeypot field is populated", async () => {
    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Spam Bot",
        phone: "9876543210",
        whatsappConsent: true,
        _hp: "bot-url.com",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.contactId).toBe("bot-discarded");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 202 and queues outbox when consent is true and input is valid", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        contact_id: "c-12345",
        outbox_id: "o-67890",
        whatsapp_status: "queued",
      },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "test-idem-key-1",
        "x-forwarded-for": "192.168.1.101",
      },
      body: JSON.stringify({
        name: "Vikash Saravanan",
        phone: "9876543210",
        inquiry: "Looking for startup collaboration",
        whatsappConsent: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.contactId).toBe("c-12345");
    expect(data.whatsappStatus).toBe("queued");

    expect(mockRpc).toHaveBeenCalledWith(
      "submit_contact_inquiry",
      expect.objectContaining({
        p_name: "Vikash Saravanan",
        p_phone: "+919876543210",
        p_phone_chat_id: "919876543210@c.us",
        p_whatsapp_consent: true,
        p_idempotency_key: "test-idem-key-1",
      })
    );
  });

  it("returns 202 and skips outbox when consent is false", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        contact_id: "c-99999",
        outbox_id: null,
        whatsapp_status: "skipped_no_consent",
      },
      error: null,
    });

    const req = new Request("http://localhost:3000/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.102",
      },
      body: JSON.stringify({
        name: "Vikash",
        phone: "9876543299",
        inquiry: "Just leaving a note",
        whatsappConsent: false,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.contactId).toBe("c-99999");
    expect(data.whatsappStatus).toBe("skipped_no_consent");

    expect(mockRpc).toHaveBeenCalledWith(
      "submit_contact_inquiry",
      expect.objectContaining({
        p_whatsapp_consent: false,
      })
    );
  });
});
