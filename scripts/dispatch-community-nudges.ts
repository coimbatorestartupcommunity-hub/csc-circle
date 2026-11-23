import * as dotenv from "dotenv";
dotenv.config({ path: "workers/whatsapp/.env" });
dotenv.config({ path: ".env.production.local" });
dotenv.config({ path: ".env.local" });

import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE !== "false",
  auth: {
    user: process.env.SMTP_USER || "coimbatorestartupcommunity@gmail.com",
    pass: process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASSWORD || "",
  },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 10000,
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhone(input: string): string {
  let cleaned = (input || "").replace(/\D/g, "");
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
}

async function enqueueWhatsApp(phone: string, text: string, messageType: string, name?: string) {
  const e164 = normalizePhone(phone);
  if (!e164 || e164.length < 10) return false;

  const { error } = await supabase.from("whatsapp_message_outbox").insert({
    contact_id: "00000000-0000-0000-0000-000000000000",
    recipient_phone: e164,
    recipient_chat_id: `${e164}@c.us`,
    message_type: messageType,
    message_payload: {
      text,
      name: name || "Founder",
      enqueuedAt: new Date().toISOString(),
    },
    status: "pending",
    attempts: 0,
    max_attempts: 5,
    idempotency_key: `nudge-${messageType}-${e164}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    available_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return !error;
}

async function createInAppNotification(userId: string, title: string, message: string, actionUrl: string) {
  try {
    await supabase.from("notifications").insert({
      recipient_user_id: userId,
      title,
      message,
      action_url: actionUrl,
      type: "system_announcement",
      channel: "in_app",
      status: "delivered",
      template_key: "SystemNudge",
      template_version: 1,
      audience: "individual",
      attempts: 1,
      available_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

async function main() {
  console.log("=================================================");
  console.log("CSC CIRCLE COMMUNITY NUDGE & NOTIFICATION RUNNER");
  console.log("=================================================\n");

  let smtpAvailable = false;
  try {
    await transporter.verify();
    smtpAvailable = true;
    console.log("✓ SMTP Server Connected Successfully");
  } catch (smtpErr) {
    console.warn("⚠️ SMTP Credentials rejected by Gmail. In-App and WhatsApp Outbox pipelines will be used exclusively.");
  }

  // 1. Fetch claims, profiles, and auth users
  const { data: claims, error: claimsErr } = await supabase
    .from("membership_claims")
    .select("id, user_id, linked_account_email, whatsapp, status, reference, full_name");

  if (claimsErr) {
    console.error("Failed to load claims:", claimsErr);
    process.exit(1);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, whatsapp");

  const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (usersErr || !users) {
    console.error("Failed to list auth users:", usersErr);
    process.exit(1);
  }

  const approvedClaims = (claims || []).filter((c) => c.status === "active" || c.status === "approved" || c.reference);
  const claimedUserIds = new Set(approvedClaims.map((c) => c.user_id).filter(Boolean));
  const claimedEmails = new Set(approvedClaims.map((c) => c.linked_account_email?.toLowerCase().trim()).filter(Boolean));

  // Determine Stalled Users (Registered but not claimed)
  const stalledUsers = users.filter((u) => {
    const email = u.email?.toLowerCase().trim();
    return !claimedUserIds.has(u.id) && (!email || !claimedEmails.has(email));
  });

  console.log(`Total Auth Users in System: ${users.length}`);
  console.log(`Total Claimed Members: ${approvedClaims.length}`);
  console.log(`Total Stalled Users to Nudge: ${stalledUsers.length}\n`);

  // Cross reference phone numbers from all tables
  const [cmRes, csRes, erRes] = await Promise.all([
    supabase.from("csc_members").select("email, contact_number"),
    supabase.from("contact_submissions").select("email, phone"),
    supabase.from("event_registrations").select("email, phone"),
  ]);

  const emailToPhone = new Map<string, string>();
  cmRes.data?.forEach((r) => { if (r.email && r.contact_number) emailToPhone.set(r.email.toLowerCase().trim(), r.contact_number); });
  csRes.data?.forEach((r) => { if (r.email && r.phone) emailToPhone.set(r.email.toLowerCase().trim(), r.phone); });
  erRes.data?.forEach((r) => { if (r.email && r.phone) emailToPhone.set(r.email.toLowerCase().trim(), r.phone); });
  profiles?.forEach((r) => { if (r.email && r.whatsapp) emailToPhone.set(r.email.toLowerCase().trim(), r.whatsapp); });

  // =========================================================================
  // BATCH 1: Send Direct Stalled User Nudges (67 Users)
  // =========================================================================
  console.log("--- BATCH 1: Dispatching Nudges to Stalled Users (67 Users) ---");
  let stalledEmailsSent = 0;
  let stalledInAppCreated = 0;
  let stalledWhatsAppEnqueued = 0;

  for (const user of stalledUsers) {
    const email = user.email?.trim();
    if (!email || email.endsWith("@login.csc.internal")) continue;

    const prof = profiles?.find((p) => p.id === user.id);
    const fullName = prof?.full_name || (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "Founder";
    const phone = emailToPhone.get(email.toLowerCase()) || user.phone || (user.user_metadata?.phone as string) || (user.user_metadata?.whatsapp as string) || prof?.whatsapp;

    // 1. In-App Notification (Always delivered)
    await createInAppNotification(
      user.id,
      "Final Step: Claim Your Digital ID Card",
      "Your CSC Circle membership credentials and Apple/Google Wallet digital pass are waiting. Complete your claim in 60 seconds.",
      "/profile/claim"
    );
    stalledInAppCreated++;

    // 2. Email Notification (if SMTP is operational)
    if (smtpAvailable) {
      const emailSubject = "Final Step: Your CSC Digital ID Card is Waiting";
      const emailText = `Hi ${fullName},

You recently logged into CSC Circle, but your official Digital ID card has not been claimed yet.

Claiming your card gives you:
1. Your verified CSC member number (e.g. CSC-2026-000075).
2. Apple Wallet & Google Wallet pass integration.
3. Express check-in QR code for upcoming CSC offline events.

It takes less than 60 seconds to complete your claim:
👉 https://csc.logicintelligencetechnologies.in/profile/claim

See you in the directory,
The CSC Leadership Team
Coimbatore Startup Community (CSC)
      `.trim();

      try {
        await transporter.sendMail({
          from: `"CSC Circle" <${process.env.SMTP_FROM_EMAIL || "coimbatorestartupcommunity@gmail.com"}>`,
          to: email,
          subject: emailSubject,
          text: emailText,
        });
        stalledEmailsSent++;
      } catch {}
    }

    // 3. WhatsApp Nudge (if phone available)
    if (phone) {
      const waText =
        `👋 *Hi ${fullName}!*\n\n` +
        `You recently joined *CSC Circle*, but your official *Digital ID card* has not been claimed yet.\n\n` +
        `Claiming your card takes less than 60 seconds and gives you:\n` +
        `1. Your verified CSC member number (e.g. CSC-2026-XXXX)\n` +
        `2. Apple & Google Wallet pass integration\n` +
        `3. Express QR entry for upcoming Coimbatore offline events\n\n` +
        `👉 *Claim your card now:* https://csc.logicintelligencetechnologies.in/profile/claim\n\n` +
        `See you in the directory!\n` +
        `— Coimbatore Startup Community (CSC Circle)`;

      const enqueued = await enqueueWhatsApp(phone, waText, "stalled_claim_nudge", fullName);
      if (enqueued) {
        stalledWhatsAppEnqueued++;
        console.log(`[Stalled WhatsApp] Enqueued to +91 ${phone.slice(-10)} (${fullName})`);
      }
    }
  }

  console.log(`✓ Finished Batch 1: ${stalledInAppCreated} in-app alerts created, ${stalledWhatsAppEnqueued} WhatsApp messages enqueued.\n`);

  // =========================================================================
  // BATCH 2: Send Mobile Verification Reminder to Claimed Members (68 Members)
  // =========================================================================
  console.log("--- BATCH 2: Dispatching Mobile Verification Reminders to Claimed Members ---");
  let claimedInAppCreated = 0;
  let claimedWhatsAppEnqueued = 0;
  let claimedEmailsSent = 0;
  const processedEmails = new Set<string>();

  for (const claim of approvedClaims) {
    const email = claim.linked_account_email?.trim();
    if (!email || processedEmails.has(email.toLowerCase())) continue;
    processedEmails.add(email.toLowerCase());

    const fullName = claim.full_name || "Founder";
    const phone = claim.whatsapp;

    // 1. In-App Notification
    if (claim.user_id) {
      await createInAppNotification(
        claim.user_id,
        "Action Required: Verify Your Mobile Number",
        "Please verify your mobile number in Settings to ensure seamless delivery of your digital entry passes and 24/7 WhatsApp concierge assistance.",
        "/profile/settings"
      );
      claimedInAppCreated++;
    }

    // 2. Email (if SMTP available)
    if (smtpAvailable) {
      const emailSubject = "Action Required: Verify Your Mobile Number on CSC Circle";
      const emailText = `Hello ${fullName},

You have successfully claimed your Coimbatore Startup Community (CSC Circle) membership!

To ensure uninterrupted delivery of your digital passes, offline event entry QR codes, and 24/7 WhatsApp updates, please verify your mobile number on your profile:
👉 https://csc.logicintelligencetechnologies.in/profile/settings

Next time you log in to the website, you can also complete this in one click via the automatic verification popup.

Please do not forget to complete this verification.

Connect. Build. Grow.
Coimbatore Startup Community (CSC Circle)
      `.trim();

      try {
        await transporter.sendMail({
          from: `"CSC Circle" <${process.env.SMTP_FROM_EMAIL || "coimbatorestartupcommunity@gmail.com"}>`,
          to: email,
          subject: emailSubject,
          text: emailText,
        });
        claimedEmailsSent++;
      } catch {}
    }

    // 3. WhatsApp Message to Claimed Member
    if (phone) {
      const waText =
        `👋 *Hello ${fullName}!*\n\n` +
        `You have successfully claimed your *Coimbatore Startup Community (CSC Circle)* membership! 🎉\n\n` +
        `To ensure uninterrupted delivery of your digital passes, offline event QR check-ins, and 24/7 community updates, please verify your mobile number on your profile:\n` +
        `👉 https://csc.logicintelligencetechnologies.in/profile/settings\n\n` +
        `Next time you log in to the website, an automated verification popup will also assist you to complete this in one click.\n\n` +
        `Please do not forget to complete your mobile number verification! 🤝\n\n` +
        `Connect. Build. Grow.\n` +
        `Coimbatore Startup Community (CSC Circle)`;

      const enqueued = await enqueueWhatsApp(phone, waText, "claimed_phone_verify_reminder", fullName);
      if (enqueued) {
        claimedWhatsAppEnqueued++;
        console.log(`[Claimed WhatsApp] Enqueued to +91 ${phone.slice(-10)} (${fullName})`);
      }
    }
  }

  console.log(`\n✓ Finished Batch 2: ${claimedInAppCreated} in-app alerts created, ${claimedWhatsAppEnqueued} WhatsApp messages enqueued.\n`);

  console.log("=================================================");
  console.log("COMMUNITY NUDGES PIPELINE COMPLETED");
  console.log(`Batch 1 (Stalled Users): ${stalledInAppCreated} in-app notifications, ${stalledWhatsAppEnqueued} WhatsApp queued`);
  console.log(`Batch 2 (Claimed Members): ${claimedInAppCreated} in-app notifications, ${claimedWhatsAppEnqueued} WhatsApp queued`);
  console.log("=================================================");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
