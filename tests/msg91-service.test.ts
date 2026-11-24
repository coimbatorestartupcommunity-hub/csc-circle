// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  formatPhoneForMsg91,
  sendMsg91Otp,
  verifyMsg91Otp,
  retryMsg91Otp,
  sendMsg91WhatsAppTemplate,
} from "@/lib/services/msg91";
import { triggerViaSocketFlow } from "@/lib/services/viasocket";

describe("MSG91 & viaSocket Services", () => {
  beforeEach(() => {
    vi.stubEnv("MSG91_AUTH_KEY", "593367AEcZQeKeoF5c6b05eb92P1");
    vi.stubEnv("MSG91_WHATSAPP_INTEGRATED_NUMBER", "919876543210");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("formats Indian phone numbers to international digits format without plus", () => {
    expect(formatPhoneForMsg91("9876543210")).toBe("919876543210");
    expect(formatPhoneForMsg91("+91 98765 43210")).toBe("919876543210");
    expect(formatPhoneForMsg91("919876543210")).toBe("919876543210");
  });

  it("sends OTP via MSG91 endpoint with correct query parameters", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ type: "success", message: "OTP sent" }), { status: 200 })
    );

    const result = await sendMsg91Otp({
      phone: "9876543210",
      otp: "123456",
      templateId: "tpl_12345",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("OTP sent");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
    expect(calledUrl.toString()).toContain("mobile=919876543210");
    expect(calledUrl.toString()).toContain("otp=123456");
    expect(calledUrl.toString()).toContain("template_id=tpl_12345");
    expect(calledInit?.headers).toHaveProperty("authkey", "593367AEcZQeKeoF5c6b05eb92P1");
  });

  it("verifies OTP via MSG91 verify endpoint", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ type: "success", message: "OTP verified" }), { status: 200 })
    );

    const result = await verifyMsg91Otp({
      phone: "9876543210",
      otp: "123456",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("OTP verified");
    const [calledUrl] = fetchSpy.mock.calls[0];
    expect(calledUrl.toString()).toContain("/otp/verify");
    expect(calledUrl.toString()).toContain("otp=123456");
  });

  it("retries OTP with voice fallback", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ type: "success", message: "Voice call triggered" }), { status: 200 })
    );

    const result = await retryMsg91Otp({
      phone: "9876543210",
      retryType: "voice",
    });

    expect(result.success).toBe(true);
    const [calledUrl] = fetchSpy.mock.calls[0];
    expect(calledUrl.toString()).toContain("retrytype=voice");
  });

  it("dispatches official WhatsApp template message", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "success" }), { status: 200 })
    );

    const result = await sendMsg91WhatsAppTemplate({
      recipientPhone: "9876543210",
      templateName: "event_pass_confirmation",
      bodyParameters: ["Vikash", "Founder Meetup Nov 2026"],
    });

    expect(result.success).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
    expect(calledUrl.toString()).toContain("/whatsapp/whatsapp-outbound-message/bulk");
    const parsedBody = JSON.parse(calledInit?.body as string);
    expect(parsedBody.payload.template.name).toBe("event_pass_confirmation");
    expect(parsedBody.payload.to_and_components[0].phone_number).toBe("919876543210");
  });

  it("gracefully skips viaSocket dispatch if VIASOCKET_FLOW_WEBHOOK_URL is not set", async () => {
    const result = await triggerViaSocketFlow("event_registered", {
      eventId: "evt_123",
      attendee: "Test User",
    });

    expect(result.success).toBe(true);
    expect(result.triggered).toBe(false);
  });

  it("dispatches event to viaSocket webhook when configured", async () => {
    vi.stubEnv("VIASOCKET_FLOW_WEBHOOK_URL", "https://flow.viasocket.com/api/v1/flow/run/test1234");
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ run_id: "run_abc" }), { status: 200 })
    );

    const result = await triggerViaSocketFlow("event_registered", {
      eventId: "evt_123",
      attendee: "Test User",
    });

    expect(result.success).toBe(true);
    expect(result.triggered).toBe(true);
    expect(result.flowRunId).toBe("run_abc");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
