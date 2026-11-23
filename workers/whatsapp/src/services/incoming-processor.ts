import { OpenWaClient } from "./openwa.js";
import { getWorkerEnv } from "../config/env.js";
import { logger } from "../utils/logger.js";
import {
  getUpcomingPublishedEvents,
  getMemberStatusByPhone,
  searchKnowledgeDocuments,
  getSupabase,
  normalizePhoneForMatching,
} from "./live-queries.js";
import {
  getActiveVerifiedSession,
  initiateOtpChallenge,
  verifyOtpCode,
} from "./member-auth.js";
import { callAIModel } from "../ai/grok-client.js";
import { constructMessages } from "../ai/prompt-engine.js";
import { verifyAndFormatResponse } from "../ai/response-verifier.js";
import { CSC_WHATSAPP_FOOTER } from "../utils/message-template.js";

// In-memory rate limiting: sender phone -> timestamp array
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_MESSAGES_PER_MINUTE = 10;

function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(phone) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_MESSAGES_PER_MINUTE) {
    return false; // Rate limit exceeded
  }

  validTimestamps.push(now);
  rateLimitMap.set(phone, validTimestamps);
  return true;
}

export interface InboundMessageEvent {
  from: string; // e.g. "919876543210@c.us" or "+919876543210"
  body?: string;
  senderName?: string;
  messageId?: string;
  type?: string;
  mimetype?: string;
}

/**
 * Handles incoming WhatsApp messages from webhooks or polling.
 */
export async function processInboundWhatsAppMessage(
  event: InboundMessageEvent,
  openwaClient: OpenWaClient
): Promise<string | null> {
  const rawSender = event.from.replace(/@c\.us$/, "");
  const senderPhone = normalizePhoneForMatching(rawSender);
  const chatId = `${senderPhone}@c.us`;
  const text = (event.body || "").trim();

  // 1. Voice Note / Audio Message Detection
  const isAudio =
    event.type === "ptt" ||
    event.type === "audio" ||
    (typeof event.mimetype === "string" && event.mimetype.startsWith("audio/"));

  if (isAudio) {
    const voiceRefusalReply =
      `🎙️ *Voice Note Received / குரல் பதிவு வந்துள்ளது*\n\n` +
      `Hello! Thank you for reaching out to *Coimbatore Startup Community (CSC Circle)*. ✨\n\n` +
      `Our automated assistant currently processes text-based messages only and cannot listen to voice notes. Kindly type your inquiry or question as a text message, and I will be delighted to assist you promptly! 🤝\n\n` +
      `வணக்கம்! எங்களது AI உதவியாளரால் குரல் பதிவுகளைக் கேட்க இயலாது. தயவுசெய்து உங்கள் கேள்வியை எழுத்து வடிவில் (Text message) அனுப்புங்கள், உடனடியாக உங்களுக்கு உதவ மகிழ்ச்சியடைகிறோம்!`;

    await openwaClient.sendTextMessage(chatId, voiceRefusalReply);
    return voiceRefusalReply;
  }

  if (!text) return null;

  // 2. Rate Limit Enforcement
  if (!checkRateLimit(senderPhone)) {
    logger.warn("Inbound WhatsApp message rate limit reached", { senderPhone });
    const rateLimitReply = `⚠️ *Notice:* You have reached the maximum frequency of messages for this minute. Please wait a moment before sending another message.`;
    await openwaClient.sendTextMessage(chatId, rateLimitReply);
    return rateLimitReply;
  }

  const upperText = text.toUpperCase();

  // 3. Opt-out (STOP / UNSUBSCRIBE) - Formal notice with footer
  if (upperText === "STOP" || upperText === "UNSUBSCRIBE") {
    const optOutReply = `You have unsubscribed from Coimbatore Startup Community WhatsApp notifications. To opt back in at any time, simply send *START*.\n\n${CSC_WHATSAPP_FOOTER}`;
    await openwaClient.sendTextMessage(chatId, optOutReply);
    return optOutReply;
  }

  if (upperText === "START") {
    const optInReply = `Welcome back! You are now subscribed to Coimbatore Startup Community WhatsApp updates and AI assistance.\n\n${CSC_WHATSAPP_FOOTER}`;
    await openwaClient.sendTextMessage(chatId, optInReply);
    return optInReply;
  }

  // 4. Human Escalation (HUMAN / SUPPORT) - Formal ticket notice with footer
  if (upperText.startsWith("HUMAN") || upperText.startsWith("SUPPORT") || upperText.startsWith("HELP")) {
    const sb = getSupabase();
    let ticketNum = "TICKET-PENDING";
    try {
      const { data } = await sb.rpc("create_agent_support_ticket", {
        p_sender_phone: senderPhone,
        p_subject: "WhatsApp Human Support Request",
        p_summary: text,
        p_priority: "medium",
        p_conversation_history: [{ from: senderPhone, text, timestamp: new Date().toISOString() }],
      });
      if (data) ticketNum = String(data);
    } catch (e) {
      logger.error("Failed to create support ticket", { error: e });
    }

    const humanReply = `🤝 *Support Request Logged*\n\nYour inquiry has been escalated to our Community Team.\n🎫 *Reference:* \`${ticketNum}\`\n\nAn organizer will review your request and connect with you directly.\n\n${CSC_WHATSAPP_FOOTER}`;
    await openwaClient.sendTextMessage(chatId, humanReply);
    return humanReply;
  }

  // 5. 6-Digit Verification Code check
  if (/^\d{6}$/.test(text)) {
    const verification = await verifyOtpCode(senderPhone, text);
    if (verification.verified && verification.member) {
      const m = verification.member;
      let reply = `✅ *Identity Verified Successfully!*\n\nHello *${m.fullName || "Member"}*,\n`;
      if (m.status === "active" || m.status === "approved") {
        reply += `💳 *Membership ID:* \`${m.memberNumber}\`\n`;
        reply += `📊 *Status:* Active Member\n`;
        reply += `🔗 *View Digital ID Pass:* https://csc.logicintelligencetechnologies.in/member/card\n\n`;
        reply += `Your verified session is active for the next 1 hour. Feel free to ask any community questions!`;
      } else {
        reply += `📊 *Status:* Pending 5-Minute Automated Approval\n`;
        reply += `⏳ *Estimated Approval Time:* approximately ${m.minutesRemaining ?? 2} minute(s)\n`;
        reply += `\nYour membership ID will be automatically issued once the 5-minute verification window completes.`;
      }
      // Formal credential notification includes footer
      const formatted = verifyAndFormatResponse(reply, true);
      await openwaClient.sendTextMessage(chatId, formatted);
      return formatted;
    } else {
      const formatted = verifyAndFormatResponse(
        verification.error || "Verification failed. Please double check the 6-digit code sent to your email.",
        false
      );
      await openwaClient.sendTextMessage(chatId, formatted);
      return formatted;
    }
  }

  // 6. Check if user is asking for their private membership status
  const isAskingMembership =
    /\b(membership|member number|my card|claim status|approved yet|my pass|membership id)\b/i.test(text);

  let verifiedMember = await getActiveVerifiedSession(senderPhone);

  if (isAskingMembership && !verifiedMember) {
    // Initiate OTP Challenge (quick interactive prompt, no footer needed)
    const challenge = await initiateOtpChallenge(senderPhone);
    if (challenge.success) {
      const otpMsg = `🔒 *CSC Membership Security Verification*\n\nTo protect your personal member data, we've dispatched a 6-digit verification code to your registered email (*${challenge.maskedEmail}*).\n\n👉 Please reply with the *6-digit code* to view your membership ID and live claim status.`;
      const formatted = verifyAndFormatResponse(otpMsg, false);
      await openwaClient.sendTextMessage(chatId, formatted);
      return formatted;
    }
  }

  // 7. Assemble Live Context & Knowledge
  const [upcomingEvents, knowledgeSnippets] = await Promise.all([
    getUpcomingPublishedEvents(),
    searchKnowledgeDocuments(text),
  ]);

  const messages = constructMessages(text, {
    senderPhone,
    isVerifiedMember: Boolean(verifiedMember),
    memberSummary: verifiedMember || undefined,
    upcomingEvents,
    knowledgeSnippets,
  });

  // 8. Invoke AI Model (Groq -> Modal failover -> Contextual fallback)
  const rawReply = await callAIModel(messages);

  // 9. Format response: Clean conversational answers without bloated repetitive footers
  const finalReply = verifyAndFormatResponse(rawReply, false);

  // 10. Dispatch to WhatsApp
  await openwaClient.sendTextMessage(chatId, finalReply);

  return finalReply;
}
