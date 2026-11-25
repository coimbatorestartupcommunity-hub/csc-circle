import { describe, it, expect, vi } from "vitest";
import { routeInboundWhatsAppMessage } from "../src/lib/services/whatsapp-inbound-router";

// Mock external network calls
vi.mock("../src/lib/services/msg91", () => ({
  sendMsg91WhatsAppTextMessage: vi.fn().mockResolvedValue({
    success: true,
    message: "Message queued",
  }),
}));

vi.mock("../src/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));

describe("CSC WhatsApp Inbound Router & Community RAG Knowledge Engine", () => {
  it("answers the user's exact query: 'I need to know about your community and also the whatsapp group guidelines'", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "I need to know about your community and also the whatsapp group guidelines",
    });

    expect(res.handled).toBe(true);
    // Must contain community information
    expect(res.replyText).toContain("Coimbatore Startup Community");
    expect(res.replyText).toContain("Connect");
    // Must contain WhatsApp group guidelines / rules
    expect(res.replyText.toLowerCase()).toMatch(/guidelines|rules|conduct|prohibited/);
    // Must NOT contain the generic fallback
    expect(res.replyText).not.toContain("Reply */menu* for our quick options or */help* for all slash commands");
  }, 15000);

  it("answers 'WhatsApp community guidelines' accurately", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "WhatsApp community guidelines",
    });

    expect(res.handled).toBe(true);
    expect(res.replyText.toLowerCase()).toMatch(/guidelines|rules/);
    expect(res.replyText).toContain("https://csc.logicintelligencetechnologies.in/community-guidelines");
  }, 15000);

  it("handles the new official command /rules and option 7", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "/rules",
    });

    expect(res.handled).toBe(true);
    expect(res.command).toBe("GUIDELINES");
    expect(res.replyText.toLowerCase()).toContain("code of conduct");
    expect(res.replyText).toContain("Stage 1");
    expect(res.replyText).toContain("Stage 3");
  }, 15000);

  it("explains the 5 official WhatsApp groups and bios from csc-whatsapp-ecosystem-bios.txt", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "What are the 5 whatsapp groups in your ecosystem?",
    });

    expect(res.handled).toBe(true);
    expect(res.replyText).toContain("CSC Announcements");
    expect(res.replyText).toContain("CSC Circle");
    expect(res.replyText).toContain("CSC Mindsprint");
    expect(res.replyText).toContain("CSC Business Network");
    expect(res.replyText).toContain("CSC Opportunities");
  }, 15000);

  it("accurately names the leadership desk including Founder, Co-Founder, CTO, CEO, CCO, COO, CBO", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "Who is the CTO of CSC Circle?",
    });

    expect(res.handled).toBe(true);
    expect(res.replyText).toContain("Vikash Saravanan");
    expect(res.replyText).toContain("Logic Intelligence Technologies");
  }, 15000);

  it("never refers to the digital ID card as pump set", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "How do I download my membership card or gate pass?",
    });

    expect(res.handled).toBe(true);
    expect(res.replyText).toContain("https://csc.logicintelligencetechnologies.in/profile/id-card");
    expect(res.replyText.toLowerCase()).not.toContain("pump set");
    expect(res.replyText.toLowerCase()).not.toContain("pumpset");
  }, 15000);

  it("strictly ensures bold formatting uses single asterisks (*word*) and NEVER double asterisks (**word**)", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "Who is the CTO of Coimbatore Startup Community?",
    });

    expect(res.handled).toBe(true);
    // Must NOT contain double asterisks anywhere in outbound text
    expect(res.replyText).not.toContain("**");
    // Must contain native single asterisk bolding
    expect(res.replyText).toMatch(/\*Vikash/);
  }, 15000);
});
