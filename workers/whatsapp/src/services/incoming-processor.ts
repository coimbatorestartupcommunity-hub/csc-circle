import type { Redis } from "ioredis";
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
import { checkSlidingWindowRateLimit } from "./rate-limiter.js";
import { detectScrapingAttempt } from "./anti-scraping.js";
import { dispatchRealTimeAdminAlert } from "./admin-alerts.js";
import { handleIncomingRating } from "./feedback-pipeline.js";
import { formatCommunityHubInvitation } from "./community-hub.js";
import { getFortnightlyFounderSpotlight } from "./founder-spotlight.js";
import { checkWhatsAppLockStatus } from "./lock-service.js";

export interface InboundMessageEvent {
  from: string; // e.g. "919876543210@c.us" or "+919876543210"
  body?: string;
  senderName?: string;
  messageId?: string;
  type?: string;
  mimetype?: string;
}

/**
 * Handles incoming WhatsApp messages with full security, rate limiting, and automated workflows.
 */
export async function processInboundWhatsAppMessage(
  event: InboundMessageEvent,
  openwaClient: OpenWaClient,
  redis: Redis | null = null
): Promise<string | null> {
  const chatId = event.from.includes("@")
    ? event.from
    : `${normalizePhoneForMatching(event.from)}@c.us`;
  const rawSender = event.from.replace(/@(c\.us|lid|g\.us)$/, "");
  const senderPhone = event.from.endsWith("@lid") ? rawSender : normalizePhoneForMatching(rawSender);
  const text = (event.body || "").trim();

  // 0. Dynamic Operational Maintenance Lock Check (Configurable via Admin UI)
  const lockStatus = await checkWhatsAppLockStatus(redis);
  if (lockStatus.isLocked) {
    const customReason = lockStatus.reason || "Our automated WhatsApp assistant, member verification, and inbound queries are currently paused for a scheduled maintenance window.";
    const customTamil = lockStatus.tamilReason || "வணக்கம்! எங்களது WhatsApp AI உதவியாளர் சேவை பராமரிப்பில் உள்ளது. பராமரிப்பு முடிந்த பின் தானாகவே மீண்டும் தொடங்கும். நன்றி! ✨";

    const maintenanceNotice =
      `🛠️ *CSC Circle — WhatsApp Service Maintenance*\n\n` +
      `${customReason}\n\n` +
      `Services will automatically resume once the maintenance cooldown window expires.\n` +
      `For urgent queries, please reach out via our website or email at: coimbatorestartupcommunity@gmail.com\n\n` +
      `${customTamil}`;

    await openwaClient.sendTextMessage(chatId, maintenanceNotice);
    return maintenanceNotice;
  }

  // 1. Voice Note / Audio Message Detection (Polite text-only refusal)
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

  // 2. Redis-backed Sliding Window Rate Limiting & Cooldown Jail
  const rateLimit = await checkSlidingWindowRateLimit(redis, senderPhone);
  if (!rateLimit.allowed) {
    const mins = Math.ceil((rateLimit.remainingJailSeconds || 900) / 60);
    const jailReply = `⚠️ *Notice:* High message frequency detected. For security, your chat is in a brief ${mins}-minute cooldown. Please try again shortly.`;
    await openwaClient.sendTextMessage(chatId, jailReply);
    return jailReply;
  }

  // 3. Anti-Scraping Defense & Honeypot Analysis
  const scraping = await detectScrapingAttempt(redis, senderPhone, text);
  if (scraping.isMalicious && scraping.securityNotice) {
    await openwaClient.sendTextMessage(chatId, scraping.securityNotice);
    return scraping.securityNotice;
  }

  const upperText = text.toUpperCase();

  // 4. Opt-out (STOP / UNSUBSCRIBE) - Formal notice with footer
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

  // Exact Inbound Dedup: if this exact sender already sent this exact message within the last 60 seconds, prevent duplicate reply loop
  if (redis && text) {
    const dedupKey = `whatsapp:msg_dedup:${senderPhone}:${Buffer.from(text.slice(0, 50)).toString("base64")}`;
    const alreadyProcessed = await redis.get(dedupKey);
    if (alreadyProcessed) {
      logger.warn("Suppressing duplicate inbound message execution from same sender", { senderPhone, text });
      return null;
    }
    // Set 60-second lock
    await redis.set(dedupKey, "1", "EX", 60);
  }

  // 5. Human Escalation (HUMAN / SUPPORT) with Instant Real-Time Admin Alert
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

      // Trigger instant real-time admin alert dispatch
      await dispatchRealTimeAdminAlert({
        ticketNumber: ticketNum,
        senderPhone,
        userSummary: text,
      });
    } catch (e) {
      logger.error("Failed to create support ticket or dispatch admin alert", { error: e });
    }

    const humanReply = `🤝 *Support Request Logged*\n\nYour inquiry has been escalated to our Community Team.\n🎫 *Reference:* \`${ticketNum}\`\n\nAn organizer has been notified and will connect with you directly.\n\n${CSC_WHATSAPP_FOOTER}`;
    await openwaClient.sendTextMessage(chatId, humanReply);
    return humanReply;
  }

  // 6. Post-Event NPS & Feedback Collector Reply
  const feedbackReply = await handleIncomingRating(senderPhone, text);
  if (feedbackReply) {
    await openwaClient.sendTextMessage(chatId, feedbackReply);
    return feedbackReply;
  }

  // 7. Official Community Hub & WhatsApp Group Invitation Shortcut
  if (
    upperText === "COMMUNITY" ||
    upperText === "GROUP" ||
    upperText === "JOIN" ||
    upperText === "CONNECT" ||
    upperText === "MEETUP" ||
    upperText === "CALENDAR" ||
    upperText === "SCHEDULE" ||
    upperText === "WHATSAPP"
  ) {
    let lang: "en" | "ta" | "tanglish" = "en";
    if (/[\u0B80-\u0BFF]/.test(text)) {
      lang = "ta";
    } else if (/\b(eppo|eppadi|vaanga|pannunga|kudunga|iruku|romba|bro|vanakkam)\b/i.test(text)) {
      lang = "tanglish";
    }
    const hubReply = formatCommunityHubInvitation(lang);
    await openwaClient.sendTextMessage(chatId, hubReply);
    return hubReply;
  }

  // 8. Founder Spotlight Shortcut
  if (upperText === "SPOTLIGHT" || upperText === "FEATURED" || upperText === "STARTUP") {
    const spotlightReply = await getFortnightlyFounderSpotlight();
    await openwaClient.sendTextMessage(chatId, spotlightReply);
    return spotlightReply;
  }

  // 9. 6-Digit Verification Code check
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

  // 10. Check if user is asking for their private membership status
  const isAskingMembership =
    /\b(membership|member number|my card|claim status|approved yet|my pass|membership id)\b/i.test(text);

  let verifiedMember = await getActiveVerifiedSession(senderPhone);

  if (isAskingMembership && !verifiedMember) {
    const challenge = await initiateOtpChallenge(senderPhone);
    if (challenge.success) {
      const otpMsg = `🔒 *CSC Membership Security Verification*\n\nTo protect your personal member data, we've dispatched a 6-digit verification code to your registered email (*${challenge.maskedEmail}*).\n\n👉 Please reply with the *6-digit code* to view your membership ID and live claim status.`;
      const formatted = verifyAndFormatResponse(otpMsg, false);
      await openwaClient.sendTextMessage(chatId, formatted);
      return formatted;
    }
  }

  // 11. Assemble Live Context, Conversation History & Knowledge
  let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (redis) {
    try {
      const raw = await redis.get(`whatsapp:convo:${senderPhone}`);
      if (raw) {
        conversationHistory = JSON.parse(raw);
      }
    } catch (e) {
      logger.warn("Failed to load conversation history from Redis", { error: e });
    }
  }

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
    conversationHistory,
  });

  // 12. Invoke Multi-Tier AI Model (Groq -> Modal failover -> Contextual fallback)
  const rawReply = await callAIModel(messages);

  // 13. Format response: Clean conversational answers without bloated repetitive footers
  const finalReply = verifyAndFormatResponse(rawReply, false);

  // Save updated conversation history to Redis with 24 hours TTL
  if (redis) {
    try {
      const updatedHistory = [
        ...conversationHistory,
        { role: "user" as const, content: text },
        { role: "assistant" as const, content: finalReply },
      ];
      // Keep only last 6 messages (3 conversation turns)
      const trimmed = updatedHistory.slice(-6);
      await redis.set(`whatsapp:convo:${senderPhone}`, JSON.stringify(trimmed), "EX", 86400);
    } catch (e) {
      logger.warn("Failed to save conversation history to Redis", { error: e });
    }
  }

  // 14. Dispatch to WhatsApp
  const sendRes = await openwaClient.sendTextMessage(chatId, finalReply);
  logger.info("Dispatched response to WhatsApp", {
    chatId,
    success: sendRes.success,
    messageId: sendRes.messageId,
    error: sendRes.errorMessage,
  });

  return finalReply;
}
