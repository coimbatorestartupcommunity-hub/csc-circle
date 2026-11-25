import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueWhatsAppNotification, formatForWhatsApp, normalizePhoneForWhatsApp } from "@/lib/notifications/whatsapp-outbox";
import { sendCommunityEmail } from "@/lib/notifications/email";
import { renderMerakiEditorialEmail } from "@/lib/notifications/template-meraki";
import { dispatchTeamWhatsAppAlert } from "@/lib/services/team-alerts";

export interface PhoneVerificationNotificationInput {
  userId: string;
  phone: string;
  email?: string | null;
  name?: string | null;
}

const BASE_URL = process.env.APP_BASE_URL || "https://csc.logicintelligencetechnologies.in";
const SUPPORT_EMAIL = process.env.CSC_SUPPORT_EMAIL || "coimbatorestartupcommunity@gmail.com";

/**
 * Dispatches WhatsApp, Email, and In-App Inbox notifications when a member's mobile number is verified.
 */
export async function notifyPhoneVerifiedSuccess(input: PhoneVerificationNotificationInput) {
  const admin = createAdminClient();
  const { userId, phone, email, name } = input;
  const displayName = (name && name.trim()) || "Founder";
  const { e164 } = normalizePhoneForWhatsApp(phone);

  const results = {
    whatsapp: false,
    email: false,
    inApp: false,
    errors: [] as string[],
  };

  // 1. WhatsApp Confirmation Message
  if (e164 && e164.length >= 10) {
    try {
      const waText = [
        "✅ *Mobile Number Verified Successfully!*",
        "",
        `வணக்கம் *${displayName}*! Your mobile number *+${e164}* has been verified on *Coimbatore Startup Community (CSC)*.`,
        "",
        "🎉 *Unga mobile number verify aayiruchu!*",
        "Now your founder profile is fully unlocked with:",
        "• 🎫 Instant WhatsApp Event Passes & RSVPs",
        "• 🪪 Coimbatore Startup Community Membership ID Card",
        "• ⚡ Priority Community Networking & Founder Hub Alerts",
        "• 🤖 24/7 Multi-Lingual WhatsApp Concierge (+91 75500 67712)",
        "",
        `👉 *View your verified profile & ID card:*`,
        `${BASE_URL}/profile`,
        "",
        "🚀 *Connect • Build • Grow*",
        "🌐 *Coimbatore Startup Community (CSC Circle)*",
        "🤍 ⚙️ *Powered by Logic Intelligence Technologies*",
      ].join("\n");

      const waRes = await enqueueWhatsAppNotification({
        recipientPhone: e164,
        text: waText,
        messageType: "phone_verification_success",
        templateName: "phone_verification_success",
        templateVariables: [displayName, e164, `${BASE_URL}/profile`],
        name: displayName,
        idempotencyKey: `phone-verify-success-${userId}`,
      });

      results.whatsapp = waRes.success;
      if (!waRes.success && waRes.error) {
        results.errors.push(`WhatsApp error: ${waRes.error}`);
      }
    } catch (waErr) {
      const msg = waErr instanceof Error ? waErr.message : String(waErr);
      results.errors.push(`WhatsApp exception: ${msg}`);
    }
  }

  // 2. Email Notification (Meraki Editorial Standard)
  if (email && email.includes("@")) {
    try {
      const emailHtml = renderMerakiEditorialEmail({
        base: BASE_URL,
        support: SUPPORT_EMAIL,
        badgeText: "MOBILE VERIFICATION CONFIRMED ✦",
        headline: "Mobile Number Verified",
        headlineItalic: "Successfully",
        greeting: `வணக்கம் ${displayName},`,
        body: `<p>Unga mobile number <strong>+${e164}</strong> has been successfully verified on <strong>Coimbatore Startup Community (CSC)</strong>.</p><p>Your account is now authenticated with 30-second rapid OTP login, instant WhatsApp event tickets & RSVPs, and Coimbatore Startup Community Membership ID Card access.</p>`,
        polaroidCaption: "CSC Verified Member Network",
        thumbtackNote: "Verified members receive real-time WhatsApp ticket delivery and priority entry at all CSC roundtables.",
        gridNote: "Your verified mobile number is securely encrypted and linked exclusively to your founder profile.",
        checklistItems: [
          "Instant WhatsApp Event RSVPs & QR Pass delivery",
          "Coimbatore Startup Community Membership ID Card unlocked",
          "24/7 Multi-Lingual WhatsApp Concierge access (+91 75500 67712)",
          "Priority entry to CSC Founder Mixers & Ecosystem cohorts",
        ],
        buttonText: "View Verified Profile & ID Card",
        buttonUrl: `${BASE_URL}/profile`,
      });

      const emailText = [
        `Hello ${displayName},`,
        "",
        `Your mobile number +${e164} has been verified successfully on Coimbatore Startup Community (CSC).`,
        "Unga mobile number verify aayiruchu!",
        "",
        "Unlocked Features:",
        "1. Instant WhatsApp Event Passes & RSVPs",
        "2. Coimbatore Startup Community Membership ID Card",
        "3. 24/7 Multi-Lingual WhatsApp Concierge (+91 75500 67712)",
        "",
        `View Profile: ${BASE_URL}/profile`,
        "",
        "CSC Circle Team",
      ].join("\n");

      const cleanNotificationId = `pv-${userId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 32)}`;
      await sendCommunityEmail({
        to: email,
        subject: "Mobile Number Verified — Coimbatore Startup Community",
        text: emailText,
        html: emailHtml,
        notificationId: cleanNotificationId,
      });

      results.email = true;
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
      results.errors.push(`Email error: ${msg}`);
    }
  }

  // 3. In-App Inbox Notification
  try {
    const dedupeKey = `phone-verify-success-${userId}`;
    const { error: inAppErr } = await admin.from("notifications").upsert(
      {
        channel: "in_app",
        type: "account",
        recipient_user_id: userId,
        title: "Mobile Number Verified (வெற்றிகரமாக உறுதியானது)",
        message: "Unga mobile number verify aayiruchu. Your phone number is now linked for instant WhatsApp event passes, Digital ID card access, and priority notifications.",
        action_url: "/profile",
        status: "available",
        delivered_at: new Date().toISOString(),
        dedupe_key: dedupeKey,
        audience: "member",
      },
      { onConflict: "dedupe_key" }
    );

    if (inAppErr) {
      results.errors.push(`In-App error: ${inAppErr.message}`);
    } else {
      results.inApp = true;
    }
  } catch (inAppEx) {
    const msg = inAppEx instanceof Error ? inAppEx.message : String(inAppEx);
    results.errors.push(`In-App exception: ${msg}`);
  }

  // 4. Alert Core Leadership Team WhatsApp Group & Admin phone
  void dispatchTeamWhatsAppAlert({
    type: "mobile_verified",
    title: "Member Mobile Number Verified",
    fields: {
      "Member": displayName,
      "Mobile Number": `+${e164}`,
      "Email": email || "N/A",
    },
    actionUrl: `${BASE_URL}/admin/members`,
  }).catch(() => {});

  return results;
}

/**
 * Sends an In-App Inbox Notification to members who haven't verified their phone number yet.
 */
export async function sendUnverifiedPhoneReminder(userId: string, name?: string | null) {
  const admin = createAdminClient();
  const displayName = (name && name.trim()) || "Founder";
  const dedupeKey = `phone-verify-prompt-${userId}`;

  try {
    const { error } = await admin.from("notifications").upsert(
      {
        channel: "in_app",
        type: "account",
        recipient_user_id: userId,
        title: "Verify Your Mobile Number (முக்கியமானது)",
        message: `வணக்கம் ${displayName}! Verify your phone number with 30s OTP to unlock instant WhatsApp event tickets, Coimbatore Startup Community Membership ID Card, and priority community updates.`,
        action_url: "/profile/settings",
        status: "available",
        delivered_at: new Date().toISOString(),
        dedupe_key: dedupeKey,
        audience: "member",
      },
      { onConflict: "dedupe_key" }
    );

    return { success: !error, error: error?.message };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Backfills verification confirmations to all currently verified members,
 * and sends verification reminders to all unverified members.
 */
export async function backfillPhoneVerificationNotifications() {
  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, display_name, email, whatsapp, consent");

  if (error || !profiles) {
    throw new Error(`Failed to load profiles: ${error?.message || "Unknown error"}`);
  }

  const verifiedMembers: Array<{ id: string; name: string; email: string; phone: string }> = [];
  const unverifiedMembers: Array<{ id: string; name: string }> = [];

  for (const p of profiles) {
    const consent = (p.consent as Record<string, unknown>) || {};
    const isVerified = Boolean(
      consent.phone_verified ||
      (p as any).phone_verified ||
      (p.whatsapp && p.whatsapp.trim().length >= 10)
    );

    const name = p.full_name || p.display_name || "Founder";
    const email = p.email || "";
    const phone = p.whatsapp || "";

    if (isVerified && (phone || email)) {
      verifiedMembers.push({ id: p.id, name, email, phone });
    } else {
      unverifiedMembers.push({ id: p.id, name });
    }
  }

  const summary = {
    totalProfiles: profiles.length,
    verifiedCount: verifiedMembers.length,
    unverifiedCount: unverifiedMembers.length,
    verifiedDispatches: [] as Array<{ id: string; name: string; phone: string; email: string; results: any }>,
    reminderDispatches: [] as Array<{ id: string; name: string; success: boolean }>,
  };

  // 1. Dispatch confirmations to verified members
  for (const member of verifiedMembers) {
    const res = await notifyPhoneVerifiedSuccess({
      userId: member.id,
      phone: member.phone,
      email: member.email,
      name: member.name,
    });
    summary.verifiedDispatches.push({
      id: member.id,
      name: member.name,
      phone: member.phone,
      email: member.email,
      results: res,
    });
  }

  // 2. Dispatch reminders to unverified members
  for (const member of unverifiedMembers) {
    const res = await sendUnverifiedPhoneReminder(member.id, member.name);
    summary.reminderDispatches.push({
      id: member.id,
      name: member.name,
      success: res.success,
    });
  }

  return summary;
}
