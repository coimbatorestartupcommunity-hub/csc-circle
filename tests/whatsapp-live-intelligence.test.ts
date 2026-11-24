import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyAndFormatResponse } from "../workers/whatsapp/src/ai/response-verifier";
import { constructMessages, buildSystemPrompt } from "../workers/whatsapp/src/ai/prompt-engine";
import { CSC_WHATSAPP_FOOTER } from "../workers/whatsapp/src/utils/message-template";
import { callAIModel } from "../workers/whatsapp/src/ai/grok-client";
import { processInboundWhatsAppMessage } from "../workers/whatsapp/src/services/incoming-processor";
import type { WhatsAppMessenger } from "../workers/whatsapp/src/services/whatsapp-client";

vi.mock("../workers/whatsapp/src/services/lock-service", () => ({
  checkWhatsAppLockStatus: vi.fn().mockResolvedValue({
    isLocked: false,
    unlockEpochMs: 0,
    reason: undefined,
    tamilReason: undefined,
  }),
}));

describe("CSC Circle WhatsApp Live Intelligence & Groq AI Agent", () => {
  describe("Message Footer & Sanitization Policy", () => {
    it("appends the exact required footer to important notices when includeFooter is true", () => {
      const rawText = "Hello! Next meetup is this Saturday at Coimbatore.";
      const formatted = verifyAndFormatResponse(rawText, true);

      expect(formatted).toContain(rawText);
      expect(formatted).toContain(CSC_WHATSAPP_FOOTER);
      expect(formatted).toContain("🚀 *Connect • Build • Grow*");
      expect(formatted).toContain("*Coimbatore Startup Community (CSC Circle)*");
      expect(formatted).toContain("🤍 ⚙️ *Powered by Logic Intelligence Technologies*");
    });

    it("omits the footer for brief conversational messages to prevent bloat", () => {
      const shortText = "We look forward to seeing you there!";
      const formatted = verifyAndFormatResponse(shortText, false);

      expect(formatted).toBe(shortText);
      expect(formatted).not.toContain("🚀 *Connect • Build • Grow*");
    });

    it("scrubs any leaked tokens or API keys before sending to WhatsApp", () => {
      const leakedOutput =
        "Here is your session token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.1234567890abcdef and key owa_k1_c92585d2d685e970e12f8788a1f56cb69abd2d145ec3cdbad79eddb6bd74a8b6 and gsk_12345678901234567890123456789012";
      const sanitized = verifyAndFormatResponse(leakedOutput, true);

      expect(sanitized).not.toContain("eyJhbGciOi");
      expect(sanitized).not.toContain("owa_k1_c92585");
      expect(sanitized).not.toContain("gsk_1234567890");
      expect(sanitized).toContain("[REDACTED_TOKEN]");
      expect(sanitized).toContain("[REDACTED_API_KEY]");
      expect(sanitized).toContain("[REDACTED_KEY]");
      expect(sanitized).toContain(CSC_WHATSAPP_FOOTER);
    });
  });

  describe("Groq AI Client & Dual GROK_API_KEY / GROQ_API_KEY Compatibility", () => {
    it("uses contextual fallback smoothly when API key is missing", async () => {
      delete process.env.GROK_API_KEY;
      delete process.env.GROQ_API_KEY;

      const reply = await callAIModel([
        { role: "user", content: "Tell me about upcoming events in Coimbatore" },
      ]);

      expect(reply).toContain("https://csc.logicintelligencetechnologies.in/events");
    });

    it("detects Tamil queries in fallback mode and replies in Tamil", async () => {
      delete process.env.GROK_API_KEY;
      delete process.env.GROQ_API_KEY;

      const reply = await callAIModel([
        { role: "user", content: "அடுத்த ஈவென்ட் எப்போ நடக்கும்?" },
      ]);

      expect(reply).toContain("வணக்கம்!");
      expect(reply).toContain("கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டி");
      expect(reply).toContain("https://csc.logicintelligencetechnologies.in/events");
    });

    it("handles membership inquiry and directs to digital card pass", async () => {
      delete process.env.GROK_API_KEY;
      delete process.env.GROQ_API_KEY;

      const reply = await callAIModel([
        { role: "user", content: "How do I check my membership card status?" },
      ]);

      expect(reply).toContain("5 minutes");
      expect(reply).toContain("https://csc.logicintelligencetechnologies.in/member/card");
      expect(reply).toContain("https://csc.logicintelligencetechnologies.in/join");
    });
  });

  describe("Prompt Engine & 4-Tier Security Boundary", () => {
    it("includes verified member data in system prompt only when verified", () => {
      const verifiedPrompt = buildSystemPrompt({
        senderPhone: "917550067712",
        isVerifiedMember: true,
        memberSummary: {
          exists: true,
          fullName: "Vikash",
          status: "active",
          memberNumber: "CSC-2026-000089",
          digitalPassUrl: "https://csc.logicintelligencetechnologies.in/member/card",
        },
      });

      expect(verifiedPrompt).toContain("VERIFIED MEMBER SESSION ACTIVE");
      expect(verifiedPrompt).toContain("CSC-2026-000089");
      expect(verifiedPrompt).toContain("Vikash");
    });

    it("refuses to expose private member data when unverified", () => {
      const unverifiedPrompt = buildSystemPrompt({
        senderPhone: "917550067712",
        isVerifiedMember: false,
      });

      expect(unverifiedPrompt).toContain("MEMBER NOT VERIFIED");
      expect(unverifiedPrompt).not.toContain("VERIFIED MEMBER SESSION ACTIVE");
    });
  });

  describe("Inbound Message Commands, Anti-Abuse & Voice Note Handling", () => {
    const mockWhatsAppClient: WhatsAppMessenger = {
      sendTextMessage: vi.fn().mockResolvedValue({ success: true, messageId: "msg-123" }),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns maintenance notice when WhatsApp lock is active", async () => {
      const { checkWhatsAppLockStatus } = await import("../workers/whatsapp/src/services/lock-service");
      vi.mocked(checkWhatsAppLockStatus).mockResolvedValueOnce({
        isLocked: true,
        unlockEpochMs: Date.now() + 3600000,
        reason: "Scheduled WhatsApp cooldown window active",
        tamilReason: "சேவை பராமரிப்பில் உள்ளது",
      });

      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", body: "Hello" },
        mockWhatsAppClient
      );

      expect(reply).toContain("Scheduled WhatsApp cooldown window active");
      expect(reply).toContain("சேவை பராமரிப்பில் உள்ளது");
      expect(mockWhatsAppClient.sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it("politely informs sender when a voice note is received and asks for text", async () => {
      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", type: "ptt", mimetype: "audio/ogg" },
        mockWhatsAppClient
      );

      expect(reply).toContain("Voice Note Received");
      expect(reply).toContain("text-based messages only");
      expect(reply).toContain("குரல் பதிவு வந்துள்ளது");
      expect(mockWhatsAppClient.sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it("handles STOP opt-out command", async () => {
      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", body: "STOP" },
        mockWhatsAppClient
      );

      expect(reply).toContain("unsubscribed");
      expect(reply).toContain("START");
      expect(reply).toContain(CSC_WHATSAPP_FOOTER);
      expect(mockWhatsAppClient.sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it("handles START opt-in command", async () => {
      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", body: "START" },
        mockWhatsAppClient
      );

      expect(reply).toContain("Welcome back");
      expect(reply).toContain(CSC_WHATSAPP_FOOTER);
      expect(mockWhatsAppClient.sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it("escalates to human support ticket on HUMAN command", async () => {
      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", body: "HUMAN need assistance with registration" },
        mockWhatsAppClient
      );

      expect(reply).toContain("Support Request Logged");
      expect(reply).toContain("Reference:");
      expect(reply).toContain(CSC_WHATSAPP_FOOTER);
      expect(mockWhatsAppClient.sendTextMessage).toHaveBeenCalledTimes(1);
    });
  });
});
