import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatQuickMenu } from "../workers/whatsapp/src/services/quick-menu";
import { getAttendeeEventPass, verifyAttendeeGateEntry } from "../workers/whatsapp/src/services/event-checkin-helper";
import { searchFounderMatchmaking } from "../workers/whatsapp/src/services/founder-matchmaking";
import { recordCommunityIdea } from "../workers/whatsapp/src/services/idea-collector";
import { formatBiWeeklyCommunityPulse } from "../workers/whatsapp/src/services/community-pulse";
import { processInboundWhatsAppMessage } from "../workers/whatsapp/src/services/incoming-processor";
import type { WhatsAppMessenger } from "../workers/whatsapp/src/services/whatsapp-client";

// Mock Supabase live-queries
vi.mock("../workers/whatsapp/src/services/live-queries", () => {
  return {
    normalizePhoneForMatching: (phone: string) => {
      const digits = phone.replace(/[^0-9]/g, "");
      if (digits.length === 10) return `91${digits}`;
      return digits;
    },
    getUpcomingPublishedEvents: vi.fn().mockResolvedValue([
      {
        id: "evt-001",
        title: "AI Founders Meetup Coimbatore",
        slug: "ai-founders-meetup",
        startsAt: "2026-11-28T11:30:00Z",
        venueName: "Coimbatore Innovation Hub",
        venueCity: "Coimbatore",
        admission: "free",
        ticketPrice: null,
        status: "published",
        url: "https://csc.logicintelligencetechnologies.in/events/ai-founders-meetup",
      },
    ]),
    getMemberStatusByPhone: vi.fn().mockResolvedValue({
      exists: true,
      fullName: "Test Founder",
      status: "active",
      memberNumber: "CSC-2026-0042",
      digitalPassUrl: "https://csc.logicintelligencetechnologies.in/member/card",
    }),
    searchKnowledgeDocuments: vi.fn().mockResolvedValue([]),
    getSupabase: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === "directory_startups") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "startup-1",
                  name: "Kovai AI Labs",
                  title: "Kovai AI Labs",
                  tagline: "Autonomous Agent Solutions",
                  sector: "Artificial Intelligence",
                  website_url: "https://kovai-ai.example.com",
                  short_description: "Building production-grade AI workflows for Indian enterprises.",
                  slug: "kovai-ai-labs",
                },
              ],
              error: null,
            }),
          };
        }

        if (table === "membership_claims") {
          return {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "claim-1",
                  user_id: "user-123",
                  full_name: "Kovai Founder",
                  linked_account_email: "founder@example.com",
                  whatsapp: "917550067712",
                },
              ],
              error: null,
            }),
          };
        }

        if (table === "event_registrations") {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "reg-001",
                  reference: "CSC-EVT-7B9A2F",
                  pass_token: "tok-7b9a2f-verified",
                  attendee_name: "Kovai Founder",
                  source_email: "founder@example.com",
                  status: "registered",
                  checked_in_at: null,
                  created_at: new Date().toISOString(),
                  event: {
                    id: "evt-001",
                    title: "AI Founders Meetup Coimbatore",
                    slug: "ai-founders-meetup",
                    starts_at: "2026-11-28T11:30:00Z",
                    venue: "Coimbatore Innovation Hub",
                  },
                },
              ],
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
          };
        }

        if (table === "notifications" || table === "whatsapp_message_outbox") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
      rpc: vi.fn().mockResolvedValue({ data: "TICKET-7712", error: null }),
    })),
  };
});

vi.mock("../workers/whatsapp/src/services/lock-service", () => ({
  checkWhatsAppLockStatus: vi.fn().mockResolvedValue({ isLocked: false }),
}));

describe("CSC Circle WhatsApp Strategic Roadmap Features (v2.1.0)", () => {
  let mockMessenger: WhatsAppMessenger;

  beforeEach(() => {
    mockMessenger = {
      sendTextMessage: vi.fn().mockResolvedValue({ success: true, messageId: "msg-123" }),
      sendTemplateMessage: vi.fn().mockResolvedValue({ success: true, messageId: "msg-124" }),
    };
  });

  describe("Feature 1: Interactive Quick Navigation Menu", () => {
    it("renders the interactive menu in English with all 6 quick options", () => {
      const menu = formatQuickMenu("en");
      expect(menu).toContain("Quick Navigation");
      expect(menu).toContain("1️⃣ *Upcoming Meetups & Workshops*");
      expect(menu).toContain("2️⃣ *Digital Member ID & Event Passes*");
      expect(menu).toContain("3️⃣ *Founder & Co-Founder Matchmaking*");
      expect(menu).toContain("4️⃣ *Suggest an Event Idea / Feedback*");
      expect(menu).toContain("5️⃣ *Official Community Group*");
      expect(menu).toContain("6️⃣ *Human Support & Organizers*");
      expect(menu).toContain("🚀 *Connect • Build • Grow*");
    });

    it("renders the interactive menu in Tamil (தமிழ்)", () => {
      const menuTa = formatQuickMenu("ta");
      expect(menuTa).toContain("விரைவு வழிகாட்டி");
      expect(menuTa).toContain("நிகழ்வுகள் & கூட்டங்கள்");
      expect(menuTa).toContain("டிஜிட்டல் அடையாள அட்டை");
      expect(menuTa).toContain("தொழில்முனைவோர் இணைப்பு");
      expect(menuTa).toContain("அதிகாரப்பூர்வ வாட்ஸ்அப் குழு");
    });

    it("responds to MENU command via incoming processor", async () => {
      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", body: "MENU" },
        mockMessenger
      );
      expect(reply).toContain("Quick Navigation");
      expect(reply).toContain("1️⃣");
      expect(mockMessenger.sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it("responds to HELP command with the interactive menu", async () => {
      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", body: "HELP" },
        mockMessenger
      );
      expect(reply).toContain("Quick Navigation");
      expect(mockMessenger.sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it("responds to '1' or 'EVENTS' with the upcoming published events roster", async () => {
      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", body: "EVENTS" },
        mockMessenger
      );
      expect(reply).toContain("Upcoming CSC Meetups & Workshops");
      expect(reply).toContain("AI Founders Meetup Coimbatore");
      expect(reply).toContain("Coimbatore Innovation Hub");
      expect(reply).toContain("Reply *PASS* to retrieve your entry pass");
    });
  });

  describe("Feature 2: Venue Gate Check-In & Dynamic QR Pass Verification", () => {
    it("retrieves attendee dynamic pass and digital card when PASS command is sent", async () => {
      const passText = await getAttendeeEventPass("917550067712");
      expect(passText).toContain("Digital ID & Event Passes");
      expect(passText).toContain("Dynamic QR Gate Pass:");
      expect(passText).toContain("https://csc.logicintelligencetechnologies.in/events/check-in?token=");
      expect(passText).toContain("CSC-EVT-7B9A2F");
      expect(passText).toContain("https://csc.logicintelligencetechnologies.in/member/card");
    });

    it("routes 'PASS' command through processInboundWhatsAppMessage", async () => {
      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", body: "PASS" },
        mockMessenger
      );
      expect(reply).toContain("Dynamic QR Gate Pass");
      expect(reply).toContain("CSC-EVT-7B9A2F");
    });

    it("verifies attendee gate check-in when organizer texts CHECKIN command", async () => {
      const checkinRes = await verifyAttendeeGateEntry("917550067712", "CSC-EVT-7B9A2F");
      expect(checkinRes).toContain("Gate Check-In Approved");
      expect(checkinRes).toContain("CSC-EVT-7B9A2F");
      expect(checkinRes).toContain("AI Founders Meetup Coimbatore");
    });
  });

  describe("Feature 3: Founder-to-Founder / Founder-to-Investor Matchmaking", () => {
    it("returns matchmaking guide when MATCH is requested without parameters", async () => {
      const guide = await searchFounderMatchmaking("MATCH");
      expect(guide).toContain("CSC Founder & Co-Founder Matchmaking");
      expect(guide).toContain("MATCH AI");
      expect(guide).toContain("MATCH SAAS");
      expect(guide).toContain("https://csc.logicintelligencetechnologies.in/directory");
    });

    it("searches startups matching keyword and returns founder profile cards", async () => {
      const results = await searchFounderMatchmaking("MATCH AI");
      expect(results).toContain("Found 1 matching startup(s)");
      expect(results).toContain("Kovai AI Labs");
      expect(results).toContain("Autonomous Agent Solutions");
      expect(results).toContain("https://csc.logicintelligencetechnologies.in/directory/kovai-ai-labs");
      expect(results).toContain("https://csc.logicintelligencetechnologies.in/collaborations");
    });

    it("routes MATCH command through incoming processor", async () => {
      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", body: "MATCH AI" },
        mockMessenger
      );
      expect(reply).toContain("Kovai AI Labs");
      expect(mockMessenger.sendTextMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe("Feature 4: Event Idea & Ecosystem Feedback Capture", () => {
    it("prompts for topic if IDEA is sent with no content", async () => {
      const emptyIdea = await recordCommunityIdea("917550067712", "IDEA");
      expect(emptyIdea).toContain("Suggest a Meetup Topic or Speaker");
      expect(emptyIdea).toContain("*IDEA <your suggested topic");
    });

    it("records idea, logs reference, and alerts leadership team", async () => {
      const ideaReply = await recordCommunityIdea(
        "917550067712",
        "IDEA Workshop on Micro-SaaS pricing for B2B startups"
      );
      expect(ideaReply).toContain("Thank You for Shaping CSC Circle!");
      expect(ideaReply).toContain("Workshop on Micro-SaaS pricing for B2B startups");
      expect(ideaReply).toContain("IDEA-");
    });

    it("routes 'IDEA ...' command through incoming processor", async () => {
      const reply = await processInboundWhatsAppMessage(
        {
          from: "917550067712@c.us",
          body: "IDEA How to raise angel funding in Tamil Nadu",
        },
        mockMessenger
      );
      expect(reply).toContain("Thank You for Shaping CSC Circle!");
      expect(reply).toContain("How to raise angel funding in Tamil Nadu");
      expect(mockMessenger.sendTextMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe("Feature 5: Bi-Weekly Sunday 10 AM Community Pulse & Founder Check-in", () => {
    it("contains all 4 user-specified components in English", () => {
      const pulse = formatBiWeeklyCommunityPulse("en");
      // 1. Milestones
      expect(pulse).toContain("What did you build, launch, or achieve recently?");
      // 2. Roadblocks & Challenges
      expect(pulse).toContain("Are you facing any startup roadblocks or challenges?");
      // 3. Next Meetup Topics
      expect(pulse).toContain("What topics or speaker sessions do you want in our next offline meetup?");
      expect(pulse).toContain("IDEA <your suggested topic or format>");
      // 4. Survey link with ignore notice if already submitted
      expect(pulse).toContain("https://csc.logicintelligencetechnologies.in/survey/member-onboarding");
      expect(pulse).toContain("If you have already completed this survey, please feel free to disregard this link!");
      expect(pulse).toContain("🚀 *Connect • Build • Grow*");
    });

    it("contains all 4 components in natural Tamil (தமிழ்)", () => {
      const pulseTa = formatBiWeeklyCommunityPulse("ta");
      expect(pulseTa).toContain("இருவார கம்யூனிட்டி செக்-இன்");
      expect(pulseTa).toContain("இந்த மாதம் உங்கள் புதிய சாதனைகள் அல்லது வெளியீடுகள் என்ன?");
      expect(pulseTa).toContain("சவால்கள் அல்லது தடைகள் உள்ளதா?");
      expect(pulseTa).toContain("IDEA <உங்கள் யோசனை>");
      expect(pulseTa).toContain("https://csc.logicintelligencetechnologies.in/survey/member-onboarding");
      expect(pulseTa).toContain("ஏற்கனவே நீங்கள் இந்தப் படிவத்தைப் பூர்த்தி செய்திருந்தால், தயவுசெய்து இந்த இணைப்பைத் தவிர்க்கவும்");
    });

    it("contains all 4 components in conversational Tanglish", () => {
      const pulseTanglish = formatBiWeeklyCommunityPulse("tanglish");
      expect(pulseTanglish).toContain("Fortnightly Founder Pulse");
      expect(pulseTanglish).toContain("Indha month enna pudhusa build / launch panneenga?");
      expect(pulseTanglish).toContain("hurdles / problems face panreengala?");
      expect(pulseTanglish).toContain("IDEA <your topic>");
      expect(pulseTanglish).toContain("https://csc.logicintelligencetechnologies.in/survey/member-onboarding");
      expect(pulseTanglish).toContain("Neenga already indha survey fill pannirundha, please ignore this link!");
    });

    it("routes PULSE command through incoming processor", async () => {
      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", body: "PULSE" },
        mockMessenger
      );
      expect(reply).toContain("Fortnightly Pulse Check-In");
      expect(reply).toContain("https://csc.logicintelligencetechnologies.in/survey/member-onboarding");
      expect(mockMessenger.sendTextMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe("Feature 6: Voice Note Handling Constraint (No Whisper / Zero OpenAI Cost)", () => {
    it("politely refuses voice messages in English and Tamil without consuming Whisper tokens", async () => {
      const reply = await processInboundWhatsAppMessage(
        { from: "917550067712@c.us", type: "ptt", mimetype: "audio/ogg; codecs=opus" },
        mockMessenger
      );
      expect(reply).toContain("Voice Note Received / குரல் பதிவு வந்துள்ளது");
      expect(reply).toContain("processes text-based messages only");
      expect(reply).toContain("குரல் பதிவுகளைக் கேட்க இயலாது");
      expect(mockMessenger.sendTextMessage).toHaveBeenCalledTimes(1);
    });
  });
});
