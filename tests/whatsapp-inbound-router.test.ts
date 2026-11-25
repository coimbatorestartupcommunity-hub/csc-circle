import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock MSG91 dispatch
const mockSendText = vi.fn().mockResolvedValue({ success: true, message: "Dispatched" });
vi.mock("@/lib/services/msg91", () => ({
  sendMsg91WhatsAppTextMessage: (...args: any[]) => mockSendText(...args),
}));

// Mock team alerts
const mockTeamAlert = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/services/team-alerts", () => ({
  dispatchTeamWhatsAppAlert: (...args: any[]) => mockTeamAlert(...args),
}));

// Mock Supabase admin
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({})),
}));

import { routeInboundWhatsAppMessage } from "../src/lib/services/whatsapp-inbound-router";

describe("Live WhatsApp Inbound Router (Serverless MSG91 Integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles voice note politely without token consumption", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "+91 75500 67712",
      text: "",
      isAudio: true,
    });

    expect(res.handled).toBe(true);
    expect(res.command).toBe("VOICE_NOTE");
    expect(res.replyText).toContain("Voice Notes Not Supported");
    expect(res.replyText).toContain("மன்னிக்கவும்");
    expect(mockSendText).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientPhone: "917550067712",
        text: expect.stringContaining("Voice Notes Not Supported"),
      })
    );
  });

  it("renders interactive navigation menu on MENU or START command", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "MENU",
    });

    expect(res.handled).toBe(true);
    expect(res.command).toBe("MENU");
    expect(res.replyText).toContain("Quick Navigation");
    expect(res.replyText).toContain("Upcoming Events");
    expect(res.replyText).toContain("Digital ID & Event Passes");
    expect(mockSendText).toHaveBeenCalledTimes(1);
  });

  it("sends welcome greeting first and then navigation menu on Hi / Hello", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "Hi",
    });

    expect(res.handled).toBe(true);
    expect(res.command).toBe("WELCOME_GREETING_AND_MENU");
    expect(mockSendText).toHaveBeenCalledTimes(2);
    expect(mockSendText).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recipientPhone: "917550067712",
        text: expect.stringContaining("Welcome to Coimbatore Startup Community!"),
      })
    );
    expect(mockSendText).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recipientPhone: "917550067712",
        text: expect.stringContaining("Official Quick Navigation"),
      })
    );
  });

  it("renders Tamil welcome and navigation menu on வணக்கம்", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "வணக்கம்",
    });

    expect(res.handled).toBe(true);
    expect(res.command).toBe("WELCOME_GREETING_AND_MENU");
    expect(mockSendText).toHaveBeenCalledTimes(2);
    expect(res.replyText).toContain("விரைவு வழிகாட்டி");
    expect(res.replyText).toContain("நிகழ்வுகள்");
  });

  it("provides digital pass link on PASS command", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "PASS",
    });

    expect(res.handled).toBe(true);
    expect(res.command).toBe("PASS");
    expect(res.replyText).toContain("/profile/id-card");
  });

  it("captures IDEA and notifies Leadership Group on IDEA <text>", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "IDEA AI Startup Pitch Battle in Gandhipuram",
    });

    expect(res.handled).toBe(true);
    expect(res.command).toBe("IDEA_RECORDED");
    expect(res.replyText).toContain("Thank You for Shaping Our Ecosystem");
    expect(mockTeamAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "feedback_submitted",
        fields: expect.objectContaining({
          "Idea / Topic": "AI Startup Pitch Battle in Gandhipuram",
        }),
      })
    );
  });

  it("provides community WhatsApp group link on COMMUNITY command", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "COMMUNITY",
    });

    expect(res.handled).toBe(true);
    expect(res.command).toBe("COMMUNITY");
    expect(res.replyText).toContain("https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3");
  });

  it("returns matchmaking guide on MATCH command", async () => {
    const res = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "MATCH AI",
    });

    expect(res.handled).toBe(true);
    expect(res.command).toBe("MATCH_SEARCH");
    expect(res.replyText).toContain("Founders Matching");
    expect(res.replyText).toContain("/directory?q=AI");
  });

  it("handles slash commands seamlessly (e.g. /events, /pass, /help)", async () => {
    // /events test
    const eventsRes = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "/events",
    });
    expect(eventsRes.handled).toBe(true);
    expect(eventsRes.command).toBe("EVENTS");
    expect(eventsRes.replyText).toContain("/events");

    // /pass test
    const passRes = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "/pass",
    });
    expect(passRes.handled).toBe(true);
    expect(passRes.command).toBe("PASS");
    expect(passRes.replyText).toContain("/profile/id-card");

    // /help test
    const helpRes = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "/help",
    });
    expect(helpRes.handled).toBe(true);
    expect(helpRes.command).toBe("HELP");
    expect(helpRes.replyText).toContain("Official Commands Guide");
  });

  it("resolves community knowledge questions accurately via agent knowledge base", async () => {
    const ctoRes = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "Who is the CTO of CSC Circle?",
    });

    expect(ctoRes.handled).toBe(true);
    expect(ctoRes.command).toBe("AI_REPLY");
    expect(ctoRes.replyText).toContain("Vikash Saravanan");
    expect(ctoRes.replyText).toContain("Logic Intelligence Technologies");

    const memberRes = await routeInboundWhatsAppMessage({
      phone: "917550067712",
      text: "How much does membership cost?",
    });

    expect(memberRes.handled).toBe(true);
    expect(memberRes.command).toBe("AI_REPLY");
    expect(memberRes.replyText).toContain("100% free");
  });
});
