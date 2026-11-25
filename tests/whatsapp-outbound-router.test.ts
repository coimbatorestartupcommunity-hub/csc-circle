import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock viaSocket trigger
const mockTriggerViaSocket = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/services/viasocket", () => ({
  triggerViaSocketFlow: (...args: any[]) => mockTriggerViaSocket(...args),
}));

// Mock Supabase admin
const mockUpdate = vi.fn().mockReturnValue({
  or: vi.fn().mockResolvedValue({ data: null, error: null }),
});
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  })),
}));

import {
  routeOutboundWhatsAppWebhook,
  isOutboundWebhookPayload,
  CSC_BUSINESS_NUMBERS,
} from "../src/lib/services/whatsapp-outbound-router";

describe("WhatsApp Outbound Router & Safety Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isOutboundWebhookPayload detection", () => {
    it("detects MSG91 'On Outbound Request Received' event", () => {
      const payload = {
        eventName: "On Outbound Request Received",
        mobile: "919342877474",
        uuid: "msg-12345",
      };
      expect(isOutboundWebhookPayload(payload)).toBe(true);
    });

    it("detects MSG91 'On Outbound Message Received' event", () => {
      const payload = {
        event: "on outbound message received",
        customerNumber: "919342877474",
      };
      expect(isOutboundWebhookPayload(payload)).toBe(true);
    });

    it("detects delivery receipts: delivered, read, failed", () => {
      expect(isOutboundWebhookPayload({ eventName: "delivered" })).toBe(true);
      expect(isOutboundWebhookPayload({ status: "read" })).toBe(true);
      expect(isOutboundWebhookPayload({ event: "failed" })).toBe(true);
      expect(isOutboundWebhookPayload({ eventName: "undelivered" })).toBe(true);
      expect(isOutboundWebhookPayload({ type: "outbound" })).toBe(true);
      expect(isOutboundWebhookPayload({ direction: "outbound" })).toBe(true);
      expect(isOutboundWebhookPayload({ direction: "1" })).toBe(true);
      expect(
        isOutboundWebhookPayload({
          eventName: "submitted",
          customerNumber: "919342877474",
          content: '{"text":"Hello from bot"}',
        })
      ).toBe(true);
    });

    it("detects dispatches originating from our CSC Business Number (+91 7550067712)", () => {
      const payload = {
        sender: "917550067712",
        to: "919342877474",
        content: "Welcome to Coimbatore Startup Community!",
      };
      expect(isOutboundWebhookPayload(payload)).toBe(true);
    });

    it("does NOT classify genuine inbound messages as outbound", () => {
      const genuineInbound = {
        eventName: "On Inbound Request Received",
        customerNumber: "919342877474",
        integratedNumber: "917550067712",
        content: "Hello",
      };
      expect(isOutboundWebhookPayload(genuineInbound)).toBe(false);

      const standardInbound = {
        from: "919342877474",
        to: "917550067712",
        text: "who is the founder?",
      };
      expect(isOutboundWebhookPayload(standardInbound)).toBe(false);

      const directionInbound = {
        direction: 0,
        customerNumber: "919342877474",
        content: "Tell me about CSC",
      };
      expect(isOutboundWebhookPayload(directionInbound)).toBe(false);
    });
  });

  describe("routeOutboundWhatsAppWebhook execution", () => {
    it("absorbs outbound callbacks without triggering any replies", async () => {
      const result = await routeOutboundWhatsAppWebhook({
        eventName: "On Outbound Request Received",
        messageId: "out-msg-uuid-999",
        customerNumber: "919342877474",
        integratedNumber: "917550067712",
      });

      expect(result.handled).toBe(true);
      expect(result.type).toBe("outbound_webhook_processed");
      expect(result.status).toBe("request_acknowledged");

      // Verify viaSocket Flow telemetry received report
      expect(mockTriggerViaSocket).toHaveBeenCalledWith(
        "whatsapp_delivery_report",
        expect.objectContaining({
          messageId: "out-msg-uuid-999",
          customerNumber: "919342877474",
          deliveryStatus: "request_acknowledged",
        })
      );
    });

    it("handles 'read' blue-tick receipt safely", async () => {
      const result = await routeOutboundWhatsAppWebhook({
        eventName: "read",
        messageId: "msg-read-1",
        customerNumber: "919342877474",
      });

      expect(result.handled).toBe(true);
      expect(result.status).toBe("read");
    });

    it("handles delivery failure gracefully with error reason", async () => {
      const result = await routeOutboundWhatsAppWebhook({
        eventName: "failed",
        messageId: "msg-failed-1",
        customerNumber: "919342877474",
        reason: "User number not registered on WhatsApp",
      });

      expect(result.handled).toBe(true);
      expect(result.status).toBe("failed");
      expect(mockTriggerViaSocket).toHaveBeenCalledWith(
        "whatsapp_delivery_report",
        expect.objectContaining({
          reason: "User number not registered on WhatsApp",
        })
      );
    });
  });
});
