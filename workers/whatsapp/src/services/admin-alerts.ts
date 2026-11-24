import { getSupabase } from "./live-queries.js";
import { logger } from "../utils/logger.js";
import { CSC_WHATSAPP_FOOTER } from "../utils/message-template.js";

/**
 * Real-time Admin Alert Dispatcher
 * Instantly notifies organizers when a user escalates via HUMAN or SUPPORT command.
 */
export async function dispatchRealTimeAdminAlert(params: {
  ticketNumber: string;
  senderPhone: string;
  userSummary: string;
}): Promise<void> {
  const sb = getSupabase();
  const adminPhone = process.env.CSC_ADMIN_WHATSAPP_PHONE || "+917550067712";

  const alertMessage =
    `🚨 *ADMIN ALERT: Human Support Ticket Escalated*\n\n` +
    `🎫 *Ticket ID:* \`${params.ticketNumber}\`\n` +
    `📱 *From Member:* \`${params.senderPhone}\`\n` +
    `💬 *Issue Summary:* "${params.userSummary}"\n` +
    `⏰ *Timestamp:* ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n\n` +
    `👉 *Review & Manage:* https://csc.logicintelligencetechnologies.in/admin/whatsapp-agent/knowledge\n\n` +
    CSC_WHATSAPP_FOOTER;

  try {
    // 1. Transactionally queue WhatsApp notification to admin phone
    await sb.from("whatsapp_message_outbox").insert({
      recipient_phone: adminPhone,
      recipient_chat_id: `${adminPhone.replace(/[^0-9]/g, "")}@c.us`,
      message_type: "admin_escalation_alert",
      message_payload: {
        text: alertMessage,
        ticketNumber: params.ticketNumber,
        senderPhone: params.senderPhone,
      },
      idempotency_key: `admin-alert-${params.ticketNumber}`,
      status: "pending",
    });

    // 2. Also dispatch to the 7-member leadership WhatsApp group
    const teamGroupChatId = process.env.CSC_TEAM_WHATSAPP_GROUP_CHAT_ID || "H3Nbi9oKWBcEmPQop0B5X3@g.us";
    await sb.from("whatsapp_message_outbox").insert({
      recipient_phone: "917550067712",
      recipient_chat_id: teamGroupChatId,
      message_type: "team_alert_support_escalated",
      message_payload: {
        text: alertMessage,
        ticketNumber: params.ticketNumber,
        senderPhone: params.senderPhone,
      },
      idempotency_key: `team-group-alert-${params.ticketNumber}`,
      status: "pending",
    });

    // 3. Also register in admin notifications table
    await sb.from("notifications").insert({
      type: "in_app",
      title: `WhatsApp Escalation: ${params.ticketNumber}`,
      message: `User ${params.senderPhone} requested human support: ${params.userSummary.slice(0, 100)}`,
      status: "pending",
      recipient: "admin",
    });

    logger.info("Admin escalation alert queued successfully", {
      ticketNumber: params.ticketNumber,
      senderPhone: params.senderPhone,
    });
  } catch (err) {
    logger.error("Failed to queue admin escalation alert", { error: err });
  }
}
