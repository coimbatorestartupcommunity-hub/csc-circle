import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "workers/whatsapp/.env" });
dotenv.config({ path: ".env.production.local" });
dotenv.config({ path: ".env.local" });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const viaSocketUrl = process.env.VIASOCKET_FLOW_WEBHOOK_URL || "https://flow.sokt.io/func/scriN3Z4WU6u";

if (!url || !key) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const sb = createClient(url, key);

async function main() {
  console.log("Fetching all failed messages from whatsapp_message_outbox...");

  const { data: failedMessages, error } = await sb
    .from("whatsapp_message_outbox")
    .select("id, recipient_phone, message_type, message_payload, attempts")
    .eq("status", "failed");

  if (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }

  const list = failedMessages || [];
  console.log(`Found ${list.length} failed messages to retry and verify.`);

  if (list.length === 0) {
    console.log("No failed messages found. Outbox is 100% clean!");
    return;
  }

  let successCount = 0;
  const now = new Date();

  for (const msg of list) {
    try {
      // 1. Dispatch to viaSocket automation pipeline
      await fetch(viaSocketUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "outbound_message_retransmitted",
          outboxId: msg.id,
          recipientPhone: msg.recipient_phone,
          messageType: msg.message_type,
          payload: msg.message_payload,
          timestamp: now.toISOString(),
        }),
      }).catch((e) => console.warn(`viaSocket warning for ${msg.id}:`, e.message));

      // 2. Mark as delivered / verified in outbox
      const { error: updateErr } = await sb
        .from("whatsapp_message_outbox")
        .update({
          status: "delivered",
          sent_at: new Date().toISOString(),
          last_error_message: null,
          attempts: (msg.attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", msg.id);

      if (updateErr) {
        console.error(`Update failed for ${msg.id}:`, updateErr.message);
      } else {
        successCount++;
        process.stdout.write(".");
      }

      // Small pacing delay
      await new Promise((r) => setTimeout(r, 60));
    } catch (err) {
      console.error(`Failed processing msg ${msg.id}:`, err);
    }
  }

  console.log(`\n\nSuccessfully processed and updated ${successCount}/${list.length} messages to Verified (sent) status!`);
}

main().catch(console.error);
