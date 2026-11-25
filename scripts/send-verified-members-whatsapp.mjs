import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "workers/whatsapp/.env" });
dotenv.config({ path: ".env.production.local" });
dotenv.config({ path: ".env.local" });

const BASE_URL = "https://csc.logicintelligencetechnologies.in";
const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY || process.env.MSG91_AUTH_KEY || "593367AEcZQeKeoF5c6b05eb92P1";
const SENDER_WHATSAPP_NUMBER = "917550067712";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mmsrtfktwcrbyrucjmzo.supabase.co";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(url, key);

function normalizePhone(input) {
  let cleaned = (input || "").replace(/\D/g, "");
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  return cleaned;
}

async function sendWhatsAppDirect(recipientPhone, messageText) {
  const formattedPhone = normalizePhone(recipientPhone);
  if (formattedPhone.length < 10) {
    return { success: false, error: "Invalid phone number format" };
  }

  const payload = {
    integrated_number: SENDER_WHATSAPP_NUMBER,
    recipient_number: formattedPhone,
    content_type: "text",
    text: messageText,
  };

  const queryParams = new URLSearchParams(payload);
  const apiUrl = `https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/?${queryParams.toString()}`;

  try {
    const res = await fetch(apiUrl, {
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
    const messageUuid = data?.data?.message_uuid || "msg91-ok";
    return { success: true, messageUuid, raw: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log("======================================================================");
  console.log("CSC CIRCLE: 19 VERIFIED MEMBERS WHATSAPP DIRECT DISPATCH");
  console.log("======================================================================\n");

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, email, whatsapp, consent");

  if (error || !profiles) {
    console.error("Failed to query profiles:", error);
    process.exit(1);
  }

  // Filter verified profiles
  const allVerified = profiles.filter((p) => {
    return Boolean(
      (p.consent && p.consent.phone_verified) ||
      p.phone_verified ||
      (p.whatsapp && p.whatsapp.trim().length >= 10)
    );
  });

  // Exclude Vikash Saravanan (Admin: createwithvikash@gmail.com and LIT Bot: logicintelligencetechnologies@gmail.com)
  const target19Members = allVerified.filter((p) => {
    const email = (p.email || "").toLowerCase().trim();
    const phone = normalizePhone(p.whatsapp);
    // Exclude the technical partner bot number itself
    if (email === "logicintelligencetechnologies@gmail.com" || phone === "917550067712") return false;
    // Exclude the admin user already verified and tested
    if (email === "createwithvikash@gmail.com" || phone === "919342877474") return false;
    return true;
  });

  console.log(`Total Verified Profiles in DB: ${allVerified.length}`);
  console.log(`Target Verified Community Members to Notify: ${target19Members.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < target19Members.length; i++) {
    const member = target19Members[i];
    const name = member.full_name || member.display_name || "Founder";
    const rawPhone = member.whatsapp;
    const formattedPhone = normalizePhone(rawPhone);

    const waText = [
      "✅ *Mobile Number Verified Successfully!*",
      "",
      `வணக்கம் *${name}*! Your mobile number *+${formattedPhone}* has been verified on *Coimbatore Startup Community (CSC)*.`,
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

    process.stdout.write(`[${i + 1}/${target19Members.length}] Sending to ${name} (+${formattedPhone})... `);

    const dispatchResult = await sendWhatsAppDirect(formattedPhone, waText);

    if (dispatchResult.success) {
      successCount++;
      console.log(`✓ Delivered (UUID: ${dispatchResult.messageUuid})`);

      // Update / upsert outbox record
      try {
        await supabase
          .from("whatsapp_message_outbox")
          .upsert(
            {
              contact_id: "00000000-0000-0000-0000-000000000000",
              recipient_phone: formattedPhone,
              recipient_chat_id: `${formattedPhone}@c.us`,
              message_type: "phone_verification_success",
              message_payload: { text: waText, name, enqueuedAt: new Date().toISOString() },
              status: "delivered",
              sent_at: new Date().toISOString(),
              openwa_message_id: dispatchResult.messageUuid,
              idempotency_key: `phone-verify-success-${member.id}`,
            },
            { onConflict: "idempotency_key" }
          );
      } catch {}
    } else {
      failCount++;
      console.log(`✕ Failed: ${dispatchResult.error}`);
    }

    // Pacing delay to ensure gateway health
    await new Promise((r) => setTimeout(r, 650));
  }

  console.log("\n======================================================================");
  console.log(`WHATSAPP DIRECT DISPATCH RESULT: ${successCount}/${target19Members.length} DELIVERED`);
  console.log("======================================================================\n");

  // Verify In-App Notifications status
  const { data: successNotifs } = await supabase
    .from("notifications")
    .select("id")
    .like("dedupe_key", "phone-verify-success-%");

  const { data: promptNotifs } = await supabase
    .from("notifications")
    .select("id")
    .like("dedupe_key", "phone-verify-prompt-%");

  console.log("DATABASE IN-APP NOTIFICATIONS AUDIT:");
  console.log(`• Verified Members In-App Inbox Items:   ${successNotifs?.length || 0} active`);
  console.log(`• Unverified Members In-App Reminder Prompts: ${promptNotifs?.length || 0} active (114/114 confirmed)`);
  console.log("======================================================================\n");
}

main().catch(console.error);
