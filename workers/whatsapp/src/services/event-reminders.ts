import { getSupabase } from "./live-queries.js";
import { logger } from "../utils/logger.js";
import { CSC_WHATSAPP_FOOTER } from "../utils/message-template.js";

/**
 * Pre-Event Automated Reminder Engine
 * Automatically queues WhatsApp reminders 24h and 2h before event start time.
 */
export async function executePreEventReminderCycle(): Promise<number> {
  const sb = getSupabase();
  const now = new Date();
  let dispatchedCount = 0;

  try {
    // 1. Query upcoming published events in next 24 hours
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { data: events, error: eventErr } = await sb
      .from("events")
      .select("id, title, slug, starts_at, venue_name, venue_city")
      .eq("status", "published")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", next24h);

    if (eventErr || !events || events.length === 0) return 0;

    for (const evt of events) {
      const startsAtMs = new Date(evt.starts_at).getTime();
      const diffMs = startsAtMs - now.getTime();
      const diffHours = diffMs / (60 * 60 * 1000);

      // Determine reminder type: 24h (between 23h and 24h) or 2h (between 1.5h and 2.5h)
      let reminderType: "24h" | "2h" | null = null;
      if (diffHours >= 22.5 && diffHours <= 24.5) {
        reminderType = "24h";
      } else if (diffHours >= 1.5 && diffHours <= 2.5) {
        reminderType = "2h";
      }

      if (!reminderType) continue;

      // Query confirmed attendees for this event
      const { data: attendees } = await sb
        .from("event_registrations")
        .select("id, name, whatsapp, reference")
        .eq("event_id", evt.id)
        .eq("status", "confirmed");

      if (!attendees || attendees.length === 0) continue;

      for (const att of attendees) {
        if (!att.whatsapp || att.whatsapp.length < 10) continue;

        const cleanPhone = att.whatsapp.replace(/[^0-9]/g, "");
        const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
        const chatId = `${cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone}@c.us`;
        const idempotencyKey = `event-reminder-${reminderType}-${evt.id}-${att.id}`;

        const isTomorrow = reminderType === "24h";
        const reminderText =
          `⏰ *Upcoming Event Reminder: ${isTomorrow ? "Tomorrow!" : "Starting in 2 Hours!"}*\n\n` +
          `Hello *${att.name || "Member"}*,\n` +
          `Your spot for *${evt.title}* is confirmed! ${isTomorrow ? "We look forward to seeing you tomorrow." : "Doors are opening soon."}\n\n` +
          `📅 *Date & Time:* ${new Date(evt.starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n` +
          `📍 *Venue:* ${evt.venue_name || "Coimbatore"}, ${evt.venue_city || "Coimbatore"}\n` +
          `🎫 *Booking Reference:* \`${att.reference || "Pass Confirmed"}\`\n` +
          `🔗 *View Your Pass:* https://csc.logicintelligencetechnologies.in/member/card\n\n` +
          CSC_WHATSAPP_FOOTER;

        const { error: insertErr } = await sb.from("whatsapp_message_outbox").insert({
          recipient_phone: formattedPhone,
          recipient_chat_id: chatId,
          message_type: `event_reminder_${reminderType}`,
          message_payload: { text: reminderText, eventId: evt.id, reminderType },
          idempotency_key: idempotencyKey,
          status: "pending",
        });

        if (!insertErr) {
          dispatchedCount++;
        }
      }
    }

    if (dispatchedCount > 0) {
      logger.info(`Pre-event reminder engine queued ${dispatchedCount} reminders`);
    }

    return dispatchedCount;
  } catch (err) {
    logger.error("Exception in executePreEventReminderCycle", { error: err });
    return 0;
  }
}
