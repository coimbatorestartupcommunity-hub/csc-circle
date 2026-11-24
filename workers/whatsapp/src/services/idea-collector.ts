import { getSupabase } from "./live-queries.js";
import { CSC_WHATSAPP_FOOTER } from "../utils/message-template.js";
import { logger } from "../utils/logger.js";

/**
 * Captures community event ideas, topic suggestions, and ecosystem feedback from WhatsApp,
 * stores them in Supabase, and broadcasts an alert to the Core Leadership Team WhatsApp Group.
 */
export async function recordCommunityIdea(
  senderPhone: string,
  rawText: string
): Promise<string> {
  const sb = getSupabase();
  const idea = rawText
    .replace(/^(IDEA|SUGGEST|FEEDBACK|TOPIC|SUGGESTION)\s*[:\-]?\s*/i, "")
    .trim();

  if (!idea || idea.length < 3) {
    return (
      `💡 *Suggest a Meetup Topic or Speaker*\n\n` +
      `We'd love to hear your ideas for future CSC Circle offline meetups!\n\n` +
      `👉 Please reply in the format:\n` +
      `*IDEA <your suggested topic, speaker, or workshop idea>*\n\n` +
      `Example: *IDEA AI Agents for SaaS startups workshop*\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }

  const ideaRef = `IDEA-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  try {
    // 1. Store in notifications or csc_agent_knowledge_documents as an idea
    await sb.from("notifications").insert({
      type: "in_app",
      title: `Event Idea: ${ideaRef}`,
      message: `From +${senderPhone}: "${idea}"`,
      status: "pending",
      recipient: "admin",
    });

    // 2. Dispatch real-time alert to 7-member Leadership WhatsApp Group
    const teamGroupChatId =
      process.env.CSC_TEAM_WHATSAPP_GROUP_CHAT_ID || "H3Nbi9oKWBcEmPQop0B5X3@g.us";

    const alertText =
      `💡 *CSC LEADERSHIP ALERT: NEW EVENT IDEA / SUGGESTION*\n\n` +
      `✦ *Reference:* \`${ideaRef}\`\n` +
      `✦ *From Member:* \`+${senderPhone}\`\n` +
      `✦ *Suggested Idea:* "${idea}"\n` +
      `✦ *Timestamp:* ${timestamp} IST\n\n` +
      `👉 *Review Ideas in Admin:* https://csc.logicintelligencetechnologies.in/admin/whatsapp-agent\n\n` +
      CSC_WHATSAPP_FOOTER;

    await sb.from("whatsapp_message_outbox").insert({
      recipient_phone: "917550067712",
      recipient_chat_id: teamGroupChatId,
      message_type: "team_alert_community_idea",
      message_payload: {
        text: alertText,
        ideaRef,
        senderPhone,
        idea,
      },
      idempotency_key: `idea-${ideaRef}`,
      status: "pending",
    });

    logger.info("Recorded community idea and queued team alert", {
      ideaRef,
      senderPhone,
      idea: idea.slice(0, 50),
    });

    return (
      `💡 *Thank You for Shaping CSC Circle!*\n\n` +
      `Your suggestion has been logged with our organizing team:\n` +
      `📝 *Reference:* \`${ideaRef}\`\n` +
      `💬 *Idea:* _"${idea}"_\n\n` +
      `Our organizing committee reviews all community ideas during our fortnightly meetup planning sessions. If your topic is selected, we might even invite you to share your experience or co-host!\n\n` +
      `Have more thoughts or want to speak? Feel free to message us anytime.\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  } catch (err) {
    logger.error("Exception recording community idea", { error: err, senderPhone, idea });
    return (
      `💡 *Thank You for Your Suggestion!*\n\n` +
      `We've received your meetup suggestion: _"${idea}"_.\n` +
      `Our team will review it for upcoming CSC offline meetups!\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }
}
