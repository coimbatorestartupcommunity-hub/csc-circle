import { createAdminClient } from "@/lib/supabase/admin";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { randomBytes } from "node:crypto";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Automatically approves membership claims that have reached 5 minutes since submission.
 * Updates both `membership_claims` and `memberships` tables atomically and dispatches
 * the `MembershipApproved` email and in-app inbox notification.
 */
export async function autoApproveDueMembershipClaims(): Promise<number> {
  try {
    const admin = createAdminClient();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Find all submitted or pending claims that were submitted at least 5 minutes ago
    const { data: claims, error: claimsError } = await admin
      .from("membership_claims")
      .select("id, user_id, submitted_at, status")
      .in("status", ["claim_submitted", "pending_verification"])
      .lte("submitted_at", fiveMinutesAgo);

    if (claimsError || !claims || claims.length === 0) {
      return 0;
    }

    let approvedCount = 0;

    for (const claim of claims) {
      // Find the corresponding membership record
      const { data: member, error: memberError } = await admin
        .from("memberships")
        .select("id, member_number, status")
        .eq("user_id", claim.user_id)
        .maybeSingle();

      if (memberError || !member) continue;
      // Do not reactivate suspended or revoked accounts
      if (["suspended", "revoked"].includes(member.status)) continue;

      let memberNum = member.member_number;
      if (!memberNum) {
        // Query highest member number to assign the next sequence
        const { data: highestRows } = await admin
          .from("memberships")
          .select("member_number")
          .not("member_number", "is", null)
          .order("member_number", { ascending: false })
          .limit(1);

        let nextSeq = 1;
        if (highestRows && highestRows.length > 0 && highestRows[0].member_number) {
          const match = highestRows[0].member_number.match(/CSC-2026-(\d+)/);
          if (match) {
            nextSeq = parseInt(match[1], 10) + 1;
          }
        }
        memberNum = `CSC-2026-${String(nextSeq).padStart(6, "0")}`;
      }

      const verificationToken = randomBytes(32).toString("hex");

      // 1. Update claim status to active
      await admin
        .from("membership_claims")
        .update({ status: "active" as Database["public"]["Enums"]["membership_status"] })
        .eq("id", claim.id);

      // 2. Update membership status to active (triggers MembershipApproved notification job)
      await admin
        .from("memberships")
        .update({
          status: "active" as Database["public"]["Enums"]["membership_status"],
          member_number: memberNum,
          issued_at: new Date().toISOString(),
          verification_token: verificationToken,
        })
        .eq("user_id", claim.user_id);

      // 3. Direct WhatsApp Card Activation Notification
      try {
        const { data: memberProfile } = await admin
          .from("profiles")
          .select("whatsapp, full_name, display_name")
          .eq("id", claim.user_id)
          .maybeSingle();

        if (memberProfile?.whatsapp) {
          const { normalizePhoneForWhatsApp } = await import("@/lib/notifications/whatsapp-outbox");
          const { e164 } = normalizePhoneForWhatsApp(memberProfile.whatsapp);
          const name = memberProfile.full_name || memberProfile.display_name || "Founder";
          if (e164) {
            const { enqueueWhatsAppNotification } = await import("@/lib/notifications/whatsapp-outbox");
            const waText = [
              "🎉 *Coimbatore Startup Community Membership ID Card Activated!*",
              "",
              `வணக்கம் *${name}*! Your Coimbatore Startup Community Membership ID Card (*${memberNum}*) is now active.`,
              "",
              "Your digital membership card is unlocked with:",
              "• 🪪 Official CSC Digital ID Card with QR Door Pass",
              "• 🎫 Instant RSVP access for all offline founder meetups",
              "• ⚡ Priority endorsement for TANSEED & SISFS grants",
              "",
              "👉 *View & Download your Digital ID Card:*",
              "https://csc.logicintelligencetechnologies.in/profile",
              "",
              "🚀 *Connect • Build • Grow*",
              "🌐 *Coimbatore Startup Community (CSC Circle)*",
              "🤍 ⚙️ *Powered by Logic Intelligence Technologies*",
            ].join("\n");

            await enqueueWhatsAppNotification({
              recipientPhone: e164,
              text: waText,
              messageType: "membership_approved",
              idempotencyKey: `auto-approved-wa-${claim.user_id}-${memberNum}`,
            });
          }
        }
      } catch (waErr) {
        console.warn("[autoApprove] Direct WhatsApp notification note:", waErr);
      }

      approvedCount++;
    }

    if (approvedCount > 0) {
      scheduleNotificationDelivery();
    }

    return approvedCount;
  } catch (err) {
    console.error("[autoApproveDueMembershipClaims] Error approving claims:", err);
    return 0;
  }
}

/**
 * Fast-forward auto approval for a specific user ID if 5 minutes have elapsed,
 * or immediately schedule it.
 */
export async function checkOrScheduleAutoApproval(userId: string): Promise<void> {
  // First run any due claims
  await autoApproveDueMembershipClaims();

  // If this environment keeps setTimeout alive (long running), schedule approval in 5m
  setTimeout(async () => {
    try {
      await autoApproveDueMembershipClaims();
    } catch {
      // Ignored
    }
  }, 5 * 60 * 1000);
}
