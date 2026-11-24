import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatTeamAlertMessage,
  dispatchTeamWhatsAppAlert,
  TEAM_WHATSAPP_GROUP_URL,
  TEAM_WHATSAPP_GROUP_CHAT_ID,
} from "../src/lib/services/team-alerts";
import { CSC_WHATSAPP_FOOTER } from "../src/lib/notifications/whatsapp-outbox";

// Mock server-only and dependent services
vi.mock("server-only", () => ({}));

vi.mock("@/lib/notifications/whatsapp-outbox", () => ({
  CSC_WHATSAPP_FOOTER: [
    "🚀 *Connect • Build • Grow*",
    "🌐 *Coimbatore Startup Community (CSC Circle)*",
    "🤍 ⚙️ *Powered by Logic Intelligence Technologies*",
  ].join("\n"),
  enqueueWhatsAppNotification: vi.fn().mockResolvedValue({
    success: true,
    outboxId: "outbox-test-123",
  }),
}));

vi.mock("@/lib/services/viasocket", () => ({
  triggerViaSocketFlow: vi.fn().mockResolvedValue({
    success: true,
    flowHitId: "flow-hit-456",
  }),
}));

vi.mock("@/lib/services/system-settings", () => ({
  getSubsystemMaintenanceConfig: vi.fn().mockResolvedValue({
    payments: { paused: false },
    eventRegistrations: { paused: false },
    idCardGeneration: { paused: false },
    whatsappBot: { paused: false },
    messagingAutomations: { paused: false },
  }),
}));

describe("Core Leadership Team WhatsApp Group Automated Alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Group Metadata & Target Addressing", () => {
    it("targets the official 7-member leadership group invite URL", () => {
      expect(TEAM_WHATSAPP_GROUP_URL).toBe(
        "https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3?s=cl&p=i&iam=2"
      );
    });

    it("addresses the group JID formatted for WhatsApp Web/Multi-Device protocol", () => {
      expect(TEAM_WHATSAPP_GROUP_CHAT_ID).toBe("H3Nbi9oKWBcEmPQop0B5X3@g.us");
    });
  });

  describe("Message Formatting & Brand Footer Standards", () => {
    it("formats member ID claimed alerts with all fields and admin action link", () => {
      const formatted = formatTeamAlertMessage({
        type: "member_id_claimed",
        title: "New Member ID Card Application",
        fields: {
          "Applicant": "Sundar Pichai",
          "Email": "sundar@alphabet.com",
          "WhatsApp": "+919876543210",
          "Designation": "Founder & CEO",
          "Startup": "Alphabet Inc",
          "Category": "founder",
        },
        actionUrl: "https://csc.logicintelligencetechnologies.in/admin/members",
      });

      expect(formatted).toContain("🚨 *CSC LEADERSHIP ALERT: NEW MEMBER ID CARD APPLICATION*");
      expect(formatted).toContain("✦ *Applicant:* Sundar Pichai");
      expect(formatted).toContain("✦ *Email:* sundar@alphabet.com");
      expect(formatted).toContain("✦ *Startup:* Alphabet Inc");
      expect(formatted).toContain("🔗 *Review in Admin:* https://csc.logicintelligencetechnologies.in/admin/members");
      expect(formatted).toContain(CSC_WHATSAPP_FOOTER);
      expect(formatted).toContain("🚀 *Connect • Build • Grow*");
      expect(formatted).toContain("🤍 ⚙️ *Powered by Logic Intelligence Technologies*");
    });

    it("formats event RSVP alerts with pass reference and ticket counts", () => {
      const formatted = formatTeamAlertMessage({
        type: "event_rsvp",
        title: "New Event Pass Booked",
        fields: {
          "Event": "CSC Connect Edition 3",
          "Attendee": "Ananya Sharma",
          "Email": "ananya@startup.co",
          "Tickets": 2,
          "Pass Ref": "CSC-EVT-7890ABCDEF12",
        },
        actionUrl: "https://csc.logicintelligencetechnologies.in/admin/events",
      });

      expect(formatted).toContain("🚨 *CSC LEADERSHIP ALERT: NEW EVENT PASS BOOKED*");
      expect(formatted).toContain("✦ *Event:* CSC Connect Edition 3");
      expect(formatted).toContain("✦ *Attendee:* Ananya Sharma");
      expect(formatted).toContain("✦ *Tickets:* 2");
      expect(formatted).toContain("✦ *Pass Ref:* CSC-EVT-7890ABCDEF12");
      expect(formatted).toContain(CSC_WHATSAPP_FOOTER);
    });

    it("formats bank UTR payment claims with verification details", () => {
      const formatted = formatTeamAlertMessage({
        type: "payment_utr_claimed",
        title: "Bank UTR Claim Submitted",
        fields: {
          "Order Ref": "ORD-2026-9901",
          "Claimed UTR": "432109876543",
          "Claim Source": "Authenticated Member",
          "Status": "Processing Bank Ledger Match",
        },
        actionUrl: "https://csc.logicintelligencetechnologies.in/admin/payments",
      });

      expect(formatted).toContain("🚨 *CSC LEADERSHIP ALERT: BANK UTR CLAIM SUBMITTED*");
      expect(formatted).toContain("✦ *Order Ref:* ORD-2026-9901");
      expect(formatted).toContain("✦ *Claimed UTR:* 432109876543");
      expect(formatted).toContain("✦ *Status:* Processing Bank Ledger Match");
      expect(formatted).toContain(CSC_WHATSAPP_FOOTER);
    });
  });

  describe("Dispatching Pipeline & Dual-Routing", () => {
    it("dispatches simultaneously to both WhatsApp group outbox and viaSocket webhook", async () => {
      const { enqueueWhatsAppNotification } = await import("@/lib/notifications/whatsapp-outbox");
      const { triggerViaSocketFlow } = await import("@/lib/services/viasocket");

      const result = await dispatchTeamWhatsAppAlert({
        type: "test_broadcast",
        title: "Telemetry Ping",
        fields: {
          "Sender": "CTO Vikash Saravanan",
          "Status": "24/7 Verified",
        },
        actionUrl: "https://csc.logicintelligencetechnologies.in/admin/maintenance",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("outbox-test-123");

      // Verify WhatsApp outbox queue targeted the leadership group
      expect(enqueueWhatsAppNotification).toHaveBeenCalledTimes(1);
      const waArgs = vi.mocked(enqueueWhatsAppNotification).mock.calls[0][0];
      expect(waArgs.recipientChatId).toBe("H3Nbi9oKWBcEmPQop0B5X3@g.us");
      expect(waArgs.text).toContain("🚨 *CSC LEADERSHIP ALERT: TELEMETRY PING*");
      expect(waArgs.text).toContain(CSC_WHATSAPP_FOOTER);

      // Verify viaSocket webhook was triggered
      expect(triggerViaSocketFlow).toHaveBeenCalledTimes(1);
      const vsArgs = vi.mocked(triggerViaSocketFlow).mock.calls[0];
      expect(vsArgs[0]).toBe("team_group_alert");
      expect(vsArgs[1]).toMatchObject({
        alertType: "test_broadcast",
        title: "Telemetry Ping",
        groupChatId: "H3Nbi9oKWBcEmPQop0B5X3@g.us",
      });
    });

    it("respects the messagingAutomations kill-switch when paused", async () => {
      const { getSubsystemMaintenanceConfig } = await import("@/lib/services/system-settings");
      const { enqueueWhatsAppNotification } = await import("@/lib/notifications/whatsapp-outbox");

      vi.mocked(getSubsystemMaintenanceConfig).mockResolvedValueOnce({
        payments: { paused: false, updatedAt: "" },
        eventRegistrations: { paused: false, updatedAt: "" },
        idCardGeneration: { paused: false, updatedAt: "" },
        whatsappBot: { paused: false, updatedAt: "" },
        messagingAutomations: {
          paused: true,
          reason: "Automations paused during load test",
          updatedAt: "",
        },
      });

      const result = await dispatchTeamWhatsAppAlert({
        type: "system_maintenance",
        title: "Load Test Notice",
        fields: { State: "Paused" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("paused by admin kill-switch");
      expect(enqueueWhatsAppNotification).not.toHaveBeenCalled();
    });
  });
});
