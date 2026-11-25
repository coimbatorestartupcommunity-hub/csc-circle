import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config({ path: "workers/whatsapp/.env" });
dotenv.config({ path: ".env.production.local" });
dotenv.config({ path: ".env.local" });

const BASE_URL = "https://csc.logicintelligencetechnologies.in";
const SUPPORT_EMAIL = "coimbatorestartupcommunity@gmail.com";
const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY || process.env.MSG91_AUTH_KEY || "593367AEcZQeKeoF5c6b05eb92P1";
const SENDER_WHATSAPP_NUMBER = "917550067712";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: process.env.SMTP_SECURE === "true" || true,
  auth: {
    user: process.env.SMTP_USER || SUPPORT_EMAIL,
    pass: process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASSWORD,
  },
  tls: { minVersion: "TLSv1.2" },
});

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mmsrtfktwcrbyrucjmzo.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(url, key);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

const CSC_TOP_3_LEADERS = [
  { name: "K. N. Reyash", role: "FOUNDER", portrait: "/images/team/circular/reyash.jpg" },
  { name: "E. R. Sharan", role: "CO-FOUNDER", portrait: "/images/team/circular/sharan.jpg" },
  { name: "Mirra Mahendran", role: "CHIEF EXECUTIVE OFFICER", portrait: "/images/team/circular/mirra.jpg" },
];

const CSC_BOTTOM_4_LEADERS = [
  { name: "Vikash Saravanan", role: "CHIEF TECHNOLOGY OFFICER", portrait: "/images/team/circular/vikash.jpg" },
  { name: "Swathi", role: "CHIEF COMMUNITY OFFICER", portrait: "/images/team/circular/swathi.jpg" },
  { name: "Kishore C", role: "CHIEF OPERATING OFFICER", portrait: "/images/team/circular/kishore.jpg" },
  { name: "Jaibharath V", role: "CHIEF BRAND OFFICER", portrait: "/images/team/circular/jaibharath.jpg" },
];

function renderMerakiLeadershipRoster(base) {
  const renderRow = (leaders, colWidth) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        ${leaders.map((leader) => `
          <td align="center" valign="top" style="width:${colWidth};padding:10px 4px;box-sizing:border-box;">
            <div style="width:72px;height:72px;margin:0 auto 8px;border-radius:50%;border:2px solid #96A76E;background:#FAF8F5;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.08);">
              <img src="${base}${leader.portrait}" width="72" height="72" alt="${escapeHtml(leader.name)}" style="display:block;width:72px;height:72px;object-fit:cover;border-radius:50%;" />
            </div>
            <p style="margin:0 0 2px;font-family:'Lora',Georgia,serif;font-size:12px;font-weight:700;color:#1A202C;line-height:15px;letter-spacing:-0.01em;">
              ${escapeHtml(leader.name)}
            </p>
            <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;font-weight:700;color:#556B2F;letter-spacing:0.04em;text-transform:uppercase;line-height:12px;">
              ${escapeHtml(leader.role)}
            </p>
          </td>
        `).join("")}
      </tr>
    </table>
  `;

  return `
    <div style="margin:28px auto;max-width:480px;background:#FAF8F5;border:1px solid #E2E8F0;border-radius:14px;padding:20px 14px 16px;box-sizing:border-box;">
      <p style="margin:0 0 14px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#718096;text-align:center;font-weight:700;">
        ✦ Coimbatore Startup Community Core Leadership ✦
      </p>
      ${renderRow(CSC_TOP_3_LEADERS, "33.33%")}
      <div style="height:6px;"></div>
      ${renderRow(CSC_BOTTOM_4_LEADERS, "25%")}
    </div>
  `;
}

function buildMerakiEmailHtml({
  badgeText = "MOBILE VERIFICATION CONFIRMED ✦",
  headline,
  headlineItalic,
  greeting,
  body,
  polaroidCaption = "CSC Verified Member Network",
  thumbtackNote = "Verified members receive real-time WhatsApp ticket delivery and priority entry at all CSC roundtables.",
  gridNote = "Your verified mobile number is securely encrypted and linked exclusively to your founder profile.",
  checklistItems = [],
  buttonText = "View Verified Profile & ID Card →",
  buttonUrl = `${BASE_URL}/profile`,
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(headline)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:#EFECE6;font-family:'Lora',Georgia,serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EFECE6;table-layout:fixed;padding:24px 8px 40px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;margin:0 auto;border-collapse:collapse;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.08);background-color:#FAF8F5;">
          
          <!-- Candy-Stripe Header Banner -->
          <tr>
            <td style="padding:28px 24px 20px;text-align:center;background:repeating-linear-gradient(45deg, #7D8B53, #7D8B53 14px, #FAF8F5 14px, #FAF8F5 28px);border-bottom:1px solid #D5E2D0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background:#FAF8F5;border:1px solid #7D8B53;padding:8px 18px;border-radius:999px;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                      <p style="margin:0;font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#3B4A26;">
                        ${escapeHtml(badgeText)}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Editorial Headline -->
          <tr>
            <td style="padding:32px 28px 16px;text-align:center;background-color:#FAF8F5;">
              <h1 style="margin:0 0 6px;font-family:'Playfair Display',Georgia,serif;font-size:28px;line-height:34px;color:#1A202C;font-weight:700;">
                ${escapeHtml(headline)}
              </h1>
              ${headlineItalic ? `
                <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:22px;line-height:28px;color:#7D8B53;font-style:italic;">
                  ${escapeHtml(headlineItalic)}
                </p>
              ` : ""}
            </td>
          </tr>

          <!-- Polaroid Graphic -->
          <tr>
            <td align="center" style="padding:10px 24px 20px;background-color:#FAF8F5;">
              <div style="background:#FFFFFF;padding:12px 12px 16px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,0.09);border:1px solid #E2E8F0;max-width:440px;transform:rotate(-0.5deg);">
                <img src="${BASE_URL}/brand/csc-homepage-banner.png" width="416" alt="CSC Ecosystem" style="display:block;width:100%;height:auto;border-radius:4px;" />
                <p style="margin:10px 0 0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.06em;color:#4A5568;text-align:center;">
                  ✦ ${escapeHtml(polaroidCaption)} ✦
                </p>
              </div>
            </td>
          </tr>

          <!-- Letter Body -->
          <tr>
            <td style="padding:20px 32px 24px;background-color:#FAF8F5;">
              <p style="margin:0 0 16px;font-family:'Playfair Display',Georgia,serif;font-size:19px;font-weight:700;color:#2D3748;">
                ${escapeHtml(greeting)}
              </p>
              <div style="font-family:'Lora',Georgia,serif;font-size:15px;line-height:24px;color:#4A5568;">
                ${body}
              </div>

              <!-- Green Thumbtack Note -->
              <div style="margin:24px auto;max-width:440px;background:#7D8B53;color:#FFFFFF;padding:14px 18px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.1);position:relative;transform:rotate(-0.8deg);box-sizing:border-box;">
                <div style="width:12px;height:12px;border-radius:50%;background:#D9383A;position:absolute;top:-6px;left:50%;margin-left:-6px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
                <p style="margin:0;font-family:'Lora',Georgia,serif;font-size:15px;line-height:22px;font-style:italic;text-align:center;color:#FFFFFF;font-weight:600;">
                  &ldquo;${escapeHtml(thumbtackNote)}&rdquo;
                </p>
              </div>

              <!-- Light Sage Grid Card -->
              <div style="margin:24px auto;max-width:460px;background:#F7F9F5;border:1px solid #D5E2D0;border-radius:12px;padding:18px 14px;background-image:linear-gradient(#E5EFE1 1px, transparent 1px), linear-gradient(90deg, #E5EFE1 1px, transparent 1px);background-size:20px 20px;box-sizing:border-box;">
                <p style="margin:0 0 12px;font-family:'Courier New',monospace;font-size:12px;line-height:20px;color:#2D3748;border-left:3px solid #7D8B53;padding-left:10px;">
                  ${escapeHtml(gridNote)}
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                  <tr>
                    ${checklistItems.map((item) => `
                      <td valign="top" style="padding:0 4px;width:25%;box-sizing:border-box;">
                        <div style="background:#FFFFFF;border:1px solid #DCE6D9;border-radius:8px;padding:8px 6px;text-align:center;min-height:64px;">
                          <span style="display:block;font-size:13px;color:#7D8B53;margin-bottom:3px;">✦</span>
                          <span style="font-family:'Courier New',monospace;font-size:9px;line-height:13px;color:#4A5568;display:block;">
                            ${escapeHtml(item)}
                          </span>
                        </div>
                      </td>
                    `).join("")}
                  </tr>
                </table>
              </div>

              <!-- 7-MEMBER CORE LEADERSHIP ROSTER -->
              ${renderMerakiLeadershipRoster(BASE_URL)}

              <!-- CTA Button -->
              <div style="text-align:center;margin:28px 0 10px;">
                <a href="${buttonUrl}" style="display:inline-block;padding:14px 30px;background-color:#7D8B53;color:#FFFFFF;font-size:14px;font-weight:700;letter-spacing:0.04em;text-decoration:none;border-radius:999px;box-shadow:0 3px 8px rgba(125,139,83,0.4);">
                  ${escapeHtml(buttonText)}
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 24px;background-color:#1A202C;color:#CBD5E0;text-align:center;">
              <p style="margin:0 0 8px;font-family:'Lora',Georgia,serif;font-size:14px;color:#E2E8F0;font-weight:700;">
                Coimbatore Startup Community (CSC Circle)
              </p>
              <p style="margin:0 0 14px;font-family:'Courier New',monospace;font-size:11px;color:#A0AEC0;">
                Connect • Build • Grow · Coimbatore, Tamil Nadu, India
              </p>
              <div style="margin:0 auto 14px;display:inline-block;background:#2D3748;border:1px solid #4A5568;border-radius:999px;padding:6px 14px;">
                <p style="margin:0;font-family:'Courier New',monospace;font-size:10px;color:#E2E8F0;letter-spacing:0.04em;">
                  🤍 ⚙️ Powered by Logic Intelligence Technologies
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

async function sendWhatsAppDirect(recipientPhone, messageText) {
  let cleaned = recipientPhone.replace(/\D/g, "");
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  if (cleaned.length < 10) return { success: false, error: "Invalid phone" };

  const payload = {
    integrated_number: SENDER_WHATSAPP_NUMBER,
    recipient_number: cleaned,
    content_type: "text",
    text: messageText,
  };

  const queryParams = new URLSearchParams(payload);
  const url = `https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/?${queryParams.toString()}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authkey: MSG91_AUTHKEY,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status === "fail" || data.type === "error" || data.hasError) {
      return { success: false, error: data.message || "MSG91 failure", raw: data };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log("======================================================================");
  console.log("CSC CIRCLE: MOBILE VERIFICATION NOTIFICATION DISPATCH ENGINE");
  console.log("======================================================================\n");

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, email, whatsapp, consent");

  if (error || !profiles) {
    console.error("Failed to query profiles:", error);
    process.exit(1);
  }

  const verified = [];
  const unverified = [];

  for (const p of profiles) {
    const isV = Boolean(
      (p.consent && p.consent.phone_verified) ||
      p.phone_verified ||
      (p.whatsapp && p.whatsapp.trim().length >= 10)
    );
    if (isV) verified.push(p);
    else unverified.push(p);
  }

  console.log(`Total Member Profiles in Database: ${profiles.length}`);
  console.log(`Verified Members (To receive confirmation Email + WhatsApp + In-App): ${verified.length}`);
  console.log(`Unverified Members (To receive In-App Verification Reminder): ${unverified.length}\n`);

  // =========================================================================
  // STAGE 1: NOTIFY 21 VERIFIED MEMBERS (Email + WhatsApp + In-App Notification)
  // =========================================================================
  console.log("----------------------------------------------------------------------");
  console.log(`[STAGE 1] Sending Verification Confirmations to ${verified.length} Verified Members...`);
  console.log("----------------------------------------------------------------------");

  let verifiedInAppCount = 0;
  let verifiedEmailCount = 0;
  let verifiedWhatsAppCount = 0;

  for (const member of verified) {
    const name = member.full_name || member.display_name || "Founder";
    const email = member.email;
    const phone = member.whatsapp;

    console.log(`\n• Processing Verified: ${name} | Email: ${email || "None"} | WhatsApp: ${phone || "None"}`);

    // 1. In-App Inbox Notification
    const dedupeKey = `phone-verify-success-${member.id}`;
    const { error: inAppErr } = await supabase.from("notifications").upsert(
      {
        channel: "in_app",
        type: "account",
        recipient_user_id: member.id,
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

    if (!inAppErr) {
      verifiedInAppCount++;
      console.log(`  ✓ In-App Inbox: Delivered`);
    } else {
      console.error(`  ✕ In-App Inbox Error:`, inAppErr.message);
    }

    // 2. Email Confirmation via Nodemailer
    if (email && email.includes("@")) {
      const emailHtml = buildMerakiEmailHtml({
        badgeText: "MOBILE VERIFICATION CONFIRMED ✦",
        headline: "Mobile Number Verified",
        headlineItalic: "Successfully",
        greeting: `வணக்கம் ${name},`,
        body: `<p>Unga mobile number <strong>${phone ? `+${phone}` : ""}</strong> has been successfully verified on <strong>Coimbatore Startup Community (CSC)</strong>.</p><p>Your account is now authenticated with 30-second rapid OTP login, instant WhatsApp event tickets & RSVPs, and Coimbatore Pumpset Signature Digital ID Card access.</p>`,
        polaroidCaption: "CSC Verified Member Network",
        thumbtackNote: "Verified members receive real-time WhatsApp ticket delivery and priority entry at all CSC roundtables.",
        gridNote: "Your verified mobile number is securely encrypted and linked exclusively to your founder profile.",
        checklistItems: [
          "Instant WhatsApp Event RSVPs & QR Pass delivery",
          "Coimbatore Pumpset Signature Digital ID Card",
          "24/7 Multi-Lingual WhatsApp Concierge (+91 75500 67712)",
          "Priority entry to CSC Founder Mixers & Ecosystem cohorts",
        ],
        buttonText: "View Verified Profile & ID Card →",
        buttonUrl: `${BASE_URL}/profile`,
      });

      try {
        await transporter.sendMail({
          from: `CSC Circle <${SUPPORT_EMAIL}>`,
          to: email,
          subject: "Mobile Number Verified — Coimbatore Startup Community",
          html: emailHtml,
        });
        verifiedEmailCount++;
        console.log(`  ✓ Email: Sent to ${email}`);
      } catch (emErr) {
        console.error(`  ✕ Email Error to ${email}:`, emErr.message);
      }
    }

    // 3. WhatsApp Message
    if (phone && phone.trim().length >= 10) {
      const waText = [
        "✅ *Mobile Number Verified Successfully!*",
        "",
        `வணக்கம் *${name}*! Your mobile number *+${phone}* has been verified on *Coimbatore Startup Community (CSC)*.`,
        "",
        "🎉 *Unga mobile number verify aayiruchu!*",
        "Now your founder profile is fully unlocked with:",
        "• 🎫 Instant WhatsApp Event Passes & RSVPs",
        "• 🪪 Coimbatore \"Pumpset\" Signature Digital ID Card (பம்பு செட் கார்டு)",
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

      // Also enqueue to whatsapp_message_outbox for traceability
      try {
        await supabase.from("whatsapp_message_outbox").insert({
          contact_id: "00000000-0000-0000-0000-000000000000",
          recipient_phone: phone,
          recipient_chat_id: `${phone}@c.us`,
          message_type: "phone_verification_success",
          message_payload: { text: waText, name, enqueuedAt: new Date().toISOString() },
          status: "pending",
          idempotency_key: `phone-verify-success-${member.id}`,
        });
      } catch {}

      const waRes = await sendWhatsAppDirect(phone, waText);
      if (waRes.success) {
        verifiedWhatsAppCount++;
        console.log(`  ✓ WhatsApp: Delivered to +${phone}`);
      } else {
        console.warn(`  ! WhatsApp Queued in Outbox for dispatch to +${phone}:`, waRes.error);
      }
    }

    // Pacing delay to avoid rate-limits
    await new Promise((r) => setTimeout(r, 450));
  }

  // =========================================================================
  // STAGE 2: INBOX REMINDER TO 114 UNVERIFIED MEMBERS
  // =========================================================================
  console.log("\n----------------------------------------------------------------------");
  console.log(`[STAGE 2] Delivering In-App Verification Reminder to ${unverified.length} Unverified Members...`);
  console.log("----------------------------------------------------------------------");

  let unverifiedReminderCount = 0;

  for (const member of unverified) {
    const name = member.full_name || member.display_name || "Founder";
    const dedupeKey = `phone-verify-prompt-${member.id}`;

    const { error: inAppErr } = await supabase.from("notifications").upsert(
      {
        channel: "in_app",
        type: "account",
        recipient_user_id: member.id,
        title: "Verify Your Mobile Number (முக்கியமானது)",
        message: `வணக்கம் ${name}! Verify your phone number with 30s OTP to unlock instant WhatsApp event tickets, Coimbatore Pumpset Digital ID Card, and priority community updates.`,
        action_url: "/profile/settings",
        status: "available",
        delivered_at: new Date().toISOString(),
        dedupe_key: dedupeKey,
        audience: "member",
      },
      { onConflict: "dedupe_key" }
    );

    if (!inAppErr) {
      unverifiedReminderCount++;
      process.stdout.write(".");
    } else {
      console.error(`\nReminder error for ${member.id}:`, inAppErr.message);
    }
  }

  console.log(`\n\n======================================================================`);
  console.log("NOTIFICATION DISPATCH RUN SUMMARY");
  console.log("======================================================================");
  console.log(`• Verified In-App Inbox Notifications:  ${verifiedInAppCount}/${verified.length}`);
  console.log(`• Verified Confirmation Emails Sent:     ${verifiedEmailCount}/${verified.length}`);
  console.log(`• Verified WhatsApp Messages Sent:       ${verifiedWhatsAppCount}/${verified.length}`);
  console.log(`• Unverified In-App Reminders Delivered: ${unverifiedReminderCount}/${unverified.length}`);
  console.log("======================================================================\n");
}

main().catch(console.error);
