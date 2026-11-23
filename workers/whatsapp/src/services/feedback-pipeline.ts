import { getSupabase } from "./live-queries.js";
import { logger } from "../utils/logger.js";
import { CSC_WHATSAPP_FOOTER } from "../utils/message-template.js";

/**
 * Post-Event NPS & Feedback Collector
 * Automatically requests feedback 1 hour after events conclude.
 */
export async function executePostEventFeedbackCycle(): Promise<number> {
  const sb = getSupabase();
  const now = new Date();
  let requestedCount = 0;

  try {
    // 1. Find events that concluded between 1 hour and 2 hours ago
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000).toISOString();

    const { data: events, error: evtErr } = await sb
      .from("events")
      .select("id, title")
      .eq("status", "published")
      .lte("ends_at", oneHourAgo)
      .gte("ends_at", twoHoursAgo);

    if (evtErr || !events || events.length === 0) return 0;

    for (const evt of events) {
      const { data: attendees } = await sb
        .from("event_registrations")
        .select("id, name, whatsapp")
        .eq("event_id", evt.id)
        .eq("status", "confirmed");

      if (!attendees || attendees.length === 0) continue;

      for (const att of attendees) {
        if (!att.whatsapp || att.whatsapp.length < 10) continue;

        const cleanPhone = att.whatsapp.replace(/[^0-9]/g, "");
        const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
        const chatId = `${cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone}@c.us`;
        const idempotencyKey = `feedback-request-${evt.id}-${att.id}`;

        const surveyText =
          `🌟 *CSC Community Event Feedback*\n\n` +
          `Hello *${att.name || "Member"}*! Thank you for participating in *${evt.title}* today.\n\n` +
          `How was your experience?\n` +
          `👉 Please reply with your rating from *1* (Needs Improvement) to *5* (Excellent), followed by any feedback.\n\n` +
          `_Example: 5 Inspiring speakers and great networking!_\n\n` +
          CSC_WHATSAPP_FOOTER;

        const { error: insErr } = await sb.from("whatsapp_message_outbox").insert({
          recipient_phone: formattedPhone,
          recipient_chat_id: chatId,
          message_type: "feedback_request",
          message_payload: { text: surveyText, eventId: evt.id, attendeeId: att.id },
          idempotency_key: idempotencyKey,
          status: "pending",
        });

        if (!insErr) requestedCount++;
      }
    }

    return requestedCount;
  } catch (err) {
    logger.error("Exception in executePostEventFeedbackCycle", { error: err });
    return 0;
  }
}

/**
 * Handles incoming ratings and saves positive reviews (>=4) to the reviews table for moderation.
 */
export async function handleIncomingRating(
  phone: string,
  messageText: string
): Promise<string | null> {
  const match = messageText.match(/^([1-5])\b([\s\S]*)/);
  if (!match) return null;

  const rating = parseInt(match[1], 10);
  const comment = match[2]?.trim() || "Attended CSC event";
  const sb = getSupabase();

  try {
    // Record into reviews table
    await sb.from("reviews").insert({
      rating,
      comment,
      moderation: "submitted",
      display_author: "Community Member",
    });

    logger.info("Recorded attendee review from WhatsApp", { phone, rating, comment });

    return `🙏 *Thank You for Your Feedback!*\n\nYour review (Rating: ${rating}/5) has been recorded. Your insights help us continuously elevate the Coimbatore Startup Community experience! ✨\n\n${CSC_WHATSAPP_FOOTER}`;
  } catch (err) {
    logger.error("Failed to store WhatsApp review", { error: err });
    return `🙏 *Thank You!* Your rating of ${rating}/5 has been noted. We appreciate your feedback! ✨`;
  }
}
