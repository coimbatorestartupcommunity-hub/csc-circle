import { getSupabase, normalizePhoneForMatching } from "./live-queries.js";
import { CSC_WHATSAPP_FOOTER } from "../utils/message-template.js";
import { logger } from "../utils/logger.js";

/**
 * Retrieves an attendee's active event entry passes and digital member ID.
 */
export async function getAttendeeEventPass(phone: string): Promise<string> {
  const sb = getSupabase();
  const normalized = normalizePhoneForMatching(phone);
  const tenDigit = normalized.slice(-10);

  try {
    // 1. Search recent or upcoming event registrations
    // Look up by phone in source_email (if matches) or query user by membership claim phone
    const { data: claims } = await sb
      .from("membership_claims")
      .select("id, user_id, full_name, linked_account_email, whatsapp")
      .or(`whatsapp.ilike.%${tenDigit}%,whatsapp.eq.${normalized}`)
      .limit(1);

    const claim = claims && claims.length > 0 ? claims[0] : null;
    const userEmail = claim?.linked_account_email?.toLowerCase();
    const userId = claim?.user_id;

    // Search event registrations
    let query = sb
      .from("event_registrations")
      .select(`
        id,
        reference,
        pass_token,
        attendee_name,
        source_email,
        status,
        created_at,
        event:events(id, title, slug, starts_at, venue, location)
      `);

    if (userEmail && userId) {
      query = query.or(`source_email.ilike.%${userEmail}%,user_id.eq.${userId}`);
    } else if (userEmail) {
      query = query.ilike("source_email", userEmail);
    } else {
      // If we don't have linked email yet, look up by phone in case it's in attendee metadata
      query = query.ilike("source_email", `%${tenDigit}%`);
    }

    const { data: registrations, error } = await query
      .order("created_at", { ascending: false })
      .limit(3);

    const lines: string[] = [];
    lines.push(`🎟️ *CSC Circle — Digital ID & Event Passes*`);
    lines.push("");

    if (claim) {
      lines.push(`👤 *Member:* ${claim.full_name || "Valued Member"}`);
      lines.push(`💳 *Digital Membership Card:*`);
      lines.push(`🔗 https://csc.logicintelligencetechnologies.in/member/card`);
      lines.push("");
    }

    if (registrations && registrations.length > 0) {
      lines.push(`🎪 *Your Event Passes:*`);
      for (const reg of registrations) {
        const ev = Array.isArray(reg.event) ? reg.event[0] : reg.event;
        const evTitle = ev?.title || "CSC Offline Meetup";
        const evDate = ev?.starts_at
          ? new Date(ev.starts_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
            })
          : "Upcoming";
        const evVenue = ev?.venue || ev?.location || "Coimbatore";
        const passRef = reg.reference || `CSC-EVT-${reg.id.slice(0, 6).toUpperCase()}`;
        const passToken = reg.pass_token || reg.reference || reg.id;
        const qrUrl = `https://csc.logicintelligencetechnologies.in/events/check-in?token=${passToken}`;

        lines.push(`• *${evTitle}*`);
        lines.push(`  📅 *Date:* ${evDate}`);
        lines.push(`  📍 *Venue:* ${evVenue}`);
        lines.push(`  🎫 *Pass Ref:* \`${passRef}\``);
        lines.push(`  📱 *Dynamic QR Gate Pass:* ${qrUrl}`);
        lines.push("");
      }
      lines.push(`👉 _Present this QR link at the door for express check-in!_`);
    } else {
      lines.push(`ℹ️ *No active event registrations found for this number.*`);
      lines.push(`Explore upcoming meetups and claim your attendee pass here:`);
      lines.push(`🔗 https://csc.logicintelligencetechnologies.in/events`);
    }

    lines.push("");
    lines.push(CSC_WHATSAPP_FOOTER);

    return lines.join("\n");
  } catch (err) {
    logger.error("Exception fetching attendee pass", { error: err, phone });
    return (
      `🎟️ *CSC Circle Event Passes*\n\n` +
      `Access your digital passes, upcoming event details, and tickets directly here:\n` +
      `🔗 https://csc.logicintelligencetechnologies.in/events\n` +
      `🔗 https://csc.logicintelligencetechnologies.in/member/card\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }
}

/**
 * Gate Check-In & Pass Verification for Event Organizers at Venue Door.
 * Can be triggered by sending "CHECKIN <ref>" or "VERIFY <ref>".
 */
export async function verifyAttendeeGateEntry(
  organizerPhone: string,
  refOrToken: string
): Promise<string> {
  const sb = getSupabase();
  const token = refOrToken.trim();

  if (!token || token.length < 4) {
    return (
      `⚠️ *Invalid Gate Pass Entry*\n\n` +
      `Please provide the attendee pass reference or QR token code.\n` +
      `Example: *CHECKIN CSC-EVT-7B9A2F* or *VERIFY 7b9a2f*\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }

  try {
    // 1. Search registration
    let query = sb
      .from("event_registrations")
      .select(`
        id,
        reference,
        pass_token,
        attendee_name,
        source_email,
        status,
        checked_in_at,
        created_at,
        event:events(id, title, slug, starts_at, venue, location)
      `);

    if (token.toUpperCase().startsWith("CSC-EVT-")) {
      query = query.ilike("reference", token);
    } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      query = query.eq("id", token);
    } else {
      query = query.or(`reference.ilike.%${token}%,pass_token.ilike.%${token}%`);
    }

    const { data: results, error } = await query.limit(1);

    if (error || !results || results.length === 0) {
      return (
        `❌ *Pass Not Found*\n\n` +
        `No event registration matches reference \`${token}\`.\n` +
        `Please verify the attendee's email or have them show their digital confirmation pass.\n\n` +
        CSC_WHATSAPP_FOOTER
      );
    }

    const reg = results[0];
    const ev = Array.isArray(reg.event) ? reg.event[0] : reg.event;
    const evTitle = ev?.title || "CSC Offline Meetup";
    const attendeeName = reg.attendee_name || reg.source_email || "Attendee";
    const passRef = reg.reference || `CSC-EVT-${reg.id.slice(0, 6).toUpperCase()}`;

    // 2. Check if already admitted
    if (reg.status === "attended" || reg.checked_in_at) {
      const checkinTime = reg.checked_in_at
        ? new Date(reg.checked_in_at).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "Asia/Kolkata",
          })
        : "earlier today";

      return (
        `⚠️ *Attendee Already Admitted!*\n\n` +
        `👤 *Attendee:* ${attendeeName}\n` +
        `🎟️ *Pass Reference:* \`${passRef}\`\n` +
        `🎪 *Event:* ${evTitle}\n` +
        `⏱️ *Checked In At:* ${checkinTime} IST\n\n` +
        `This pass has already been scanned and verified at the gate.\n\n` +
        CSC_WHATSAPP_FOOTER
      );
    }

    // 3. Mark check-in
    const nowIso = new Date().toISOString();
    await sb
      .from("event_registrations")
      .update({
        status: "attended",
        checked_in_at: nowIso,
      })
      .eq("id", reg.id);

    const nowTimeStr = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Kolkata",
    });

    return (
      `✅ *Gate Check-In Approved!*\n\n` +
      `👤 *Attendee:* ${attendeeName}\n` +
      `🎟️ *Pass Reference:* \`${passRef}\`\n` +
      `🎪 *Event:* ${evTitle}\n` +
      `⏱️ *Admitted At:* ${nowTimeStr} IST\n\n` +
      `Attendee entry has been recorded. Welcome to CSC Circle! 🎉\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  } catch (err) {
    logger.error("Exception during gate check-in", { error: err, refOrToken });
    return (
      `⚠️ *Check-In Service Temporarily Unavailable*\n\n` +
      `Could not verify pass \`${token}\` at this moment. Please check internet connection or verify attendee name in Admin Portal.\n\n` +
      CSC_WHATSAPP_FOOTER
    );
  }
}
