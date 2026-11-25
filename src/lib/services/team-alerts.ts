import "server-only";
import { enqueueWhatsAppNotification, formatForWhatsApp } from "@/lib/notifications/whatsapp-outbox";
import { triggerViaSocketFlow } from "@/lib/services/viasocket";
import { CSC_WHATSAPP_FOOTER } from "@/lib/notifications/whatsapp-outbox";
import { sendMsg91WhatsAppTextMessage } from "@/lib/services/msg91";

/**
 * Core Leadership Team WhatsApp Group Alerts Dispatcher
 * Group: https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3?s=cl&p=i&iam=2
 * Automatically broadcasts real-time alerts to the 7-member leadership group:
 * - Member ID Card Claims
 * - Event RSVPs & Ticket Registrations
 * - Payment UTR Claims & Reconciliation
 * - New Collaboration Proposals
 * - High-Priority Support Escalations
 */

export const TEAM_WHATSAPP_GROUP_URL =
  process.env.CSC_TEAM_WHATSAPP_GROUP_URL ||
  "https://chat.whatsapp.com/H3Nbi9oKWBcEmPQop0B5X3?s=cl&p=i&iam=2";

export const TEAM_WHATSAPP_GROUP_CHAT_ID =
  process.env.CSC_TEAM_WHATSAPP_GROUP_CHAT_ID || "H3Nbi9oKWBcEmPQop0B5X3@g.us";

export type TeamAlertType =
  | "member_id_claimed"
  | "event_rsvp"
  | "payment_utr_claimed"
  | "collaboration_proposed"
  | "opportunity_submitted"
  | "contact_inquiry"
  | "resource_proposed"
  | "event_proposed"
  | "mobile_verified"
  | "support_escalated"
  | "system_maintenance"
  | "test_broadcast"
  | "feedback_submitted"
  | "idea_submitted";

export interface TeamAlertParams {
  type: TeamAlertType;
  title: string;
  fields: Record<string, string | number | undefined | null>;
  actionUrl?: string;
}

export function formatTeamAlertMessage(params: TeamAlertParams): string {
  const lines: string[] = [];
  lines.push(`🚨 *CSC LEADERSHIP ALERT: ${params.title.toUpperCase()}*`);
  lines.push("");

  for (const [key, val] of Object.entries(params.fields)) {
    if (val !== undefined && val !== null && val !== "") {
      lines.push(`✦ *${key}:* ${val}`);
    }
  }

  if (params.actionUrl) {
    lines.push("");
    lines.push(`🔗 *Review in Admin:* ${params.actionUrl}`);
  }

  lines.push("");
  lines.push(CSC_WHATSAPP_FOOTER);

  return lines.join("\n");
}

/**
 * Dispatches a high-priority alert to the 7-member leadership WhatsApp group.
 * Non-blocking: will never crash caller or user requests.
 */
export async function dispatchTeamWhatsAppAlert(params: TeamAlertParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const formattedText = formatTeamAlertMessage(params);

  try {
    const { getSubsystemMaintenanceConfig } = await import("@/lib/services/system-settings");
    const subsystems = await getSubsystemMaintenanceConfig();
    if (subsystems.messagingAutomations?.paused) {
      console.log(`[team-alerts] Dispatch skipped: messagingAutomations subsystem is paused (${subsystems.messagingAutomations.reason || "Kill-switch active"})`);
      return { success: false, error: "Messaging automations paused by admin kill-switch" };
    }

    // 1. Dispatch to viaSocket Flow automation pipeline
    void triggerViaSocketFlow("team_group_alert" as any, {
      alertType: params.type,
      title: params.title,
      fields: params.fields,
      actionUrl: params.actionUrl,
      groupUrl: TEAM_WHATSAPP_GROUP_URL,
      groupChatId: TEAM_WHATSAPP_GROUP_CHAT_ID,
      formattedText,
      timestamp: new Date().toISOString(),
    }).catch((vsErr) => {
      console.warn("[team-alerts] viaSocket group alert dispatch warning:", vsErr);
    });

    // 2. Enqueue directly to WhatsApp message outbox for delivery to the group
    const outboxRes = await enqueueWhatsAppNotification({
      recipientPhone: "917550067712",
      recipientChatId: TEAM_WHATSAPP_GROUP_CHAT_ID,
      text: formattedText,
      messageType: `team_alert_${params.type}`,
      idempotencyKey: `team-alert-${params.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });

    // 3. Direct WhatsApp dispatch to Core Leadership Phone (+91 93428 77474 - Vikash, CTO & LIT)
    const adminPhones = ["919342877474"];
    for (const phone of adminPhones) {
      try {
        await sendMsg91WhatsAppTextMessage({
          recipientPhone: phone,
          text: formattedText,
        });
      } catch (directErr) {
        console.warn("[team-alerts] Direct admin phone alert note:", directErr);
      }
    }

    console.log(`[team-alerts] Dispatched ${params.type} to Team WhatsApp Group & Leadership Phone`);
    return { success: true, messageId: outboxRes.outboxId };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("[team-alerts] Failed to dispatch team alert:", error);
    return { success: false, error };
  }
}
