// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WhatsAppCloudClient } from "../workers/whatsapp/src/services/whatsapp-client";
import { buildContactAcknowledgementMessage } from "../workers/whatsapp/src/utils/message-template";
import { getRandomDelay } from "../workers/whatsapp/src/utils/delay";

describe("WhatsApp Cloud Client & Message Formatting", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds acknowledgement message with inquiry", () => {
    const text = buildContactAcknowledgementMessage({
      name: "Vikash",
      companyName: "Coimbatore Startup Community",
      inquiry: "Interested in incubation support",
    });

    expect(text).toContain("Hello Vikash! 👋");
    expect(text).toContain("Thank you for contacting Coimbatore Startup Community.");
    expect(text).toContain('"Interested in incubation support"');
    expect(text).toContain("Our team will review your request and get back to you shortly.");
  });

  it("builds acknowledgement message without inquiry cleanly", () => {
    const text = buildContactAcknowledgementMessage({
      name: "Founder",
      companyName: "CSC Circle",
      inquiry: null,
    });

    expect(text).toContain("Hello Founder! 👋");
    expect(text).toContain("Thank you for contacting CSC Circle.");
    expect(text).not.toContain('""');
    expect(text).toContain("Thank you for your interest!");
  });

  it("generates random pacing delay strictly bounded between min and max", () => {
    for (let i = 0; i < 50; i++) {
      const delay = getRandomDelay(2000, 5000);
      expect(delay).toBeGreaterThanOrEqual(2000);
      expect(delay).toBeLessThanOrEqual(5000);
    }
  });

  it("parses successful WhatsApp Cloud 200 response with messageId", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        response: "message-sent",
        messageId: "wamid.HBgLOTE5ODc2NTQzMjEwFQIAEhgWM0VCMEFDMDk2ODk0OUY1Q0Y4",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new WhatsAppCloudClient({
      baseUrl: "http://localhost:2785",
      sessionId: "test-session",
      apiKey: "secret-key",
    });

    const res = await client.sendTextMessage("919876543210@c.us", "Hello world");
    expect(res.success).toBe(true);
    expect(res.messageId).toBe("wamid.HBgLOTE5ODc2NTQzMjEwFQIAEhgWM0VCMEFDMDk2ODk0OUY1Q0Y4");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:2785/api/sessions/test-session/messages/send-text",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "secret-key",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("correctly classifies 401 unauthorized as a permanent failure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({
        message: "Invalid API key provided",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new WhatsAppCloudClient({
      baseUrl: "http://localhost:2785",
      sessionId: "test-session",
      apiKey: "wrong-key",
    });

    const res = await client.sendTextMessage("919876543210@c.us", "Hello");
    expect(res.success).toBe(false);
    expect(res.errorCategory).toBe("permanent");
    expect(res.errorCode).toBe("WHATSAPP_401");
    expect(res.errorMessage).toContain("Invalid API key");
  });

  it("correctly classifies 503 gateway unavailable as a transient retryable failure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => ({
        error: "WhatsApp Web client is restarting",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new WhatsAppCloudClient({
      baseUrl: "http://localhost:2785",
      sessionId: "test-session",
    });

    const res = await client.sendTextMessage("919876543210@c.us", "Hello");
    expect(res.success).toBe(false);
    expect(res.errorCategory).toBe("transient");
    expect(res.errorCode).toBe("WHATSAPP_503");
  });

  it("handles network timeout error gracefully as a transient failure", async () => {
    const mockFetch = vi.fn().mockImplementation(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new WhatsAppCloudClient({
      baseUrl: "http://localhost:2785",
      sessionId: "test-session",
      timeoutMs: 100,
    });

    const res = await client.sendTextMessage("919876543210@c.us", "Hello");
    expect(res.success).toBe(false);
    expect(res.errorCategory).toBe("transient");
    expect(res.errorCode).toBe("GATEWAY_TIMEOUT");
    expect(res.errorMessage).toContain("Request timed out");
  });
});
