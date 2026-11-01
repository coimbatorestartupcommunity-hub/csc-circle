import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAxisCreditAlert, type RawEmailInput } from "./axis-parser";
import { fetchRecentBankAlerts } from "./imap-client";
import { ensureEventPassEmail } from "@/lib/admin/event-pass-email";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";

export interface ReconciliationSummary {
  ok: boolean;
  leaseAcquired: boolean;
  messagesFetched: number;
  evidenceRecorded: number;
  ordersMatched: number;
  ambiguousCredits: number;
  errors: string[];
}

export async function processReconciliationBatch(
  admin: SupabaseClient<Database>,
  emails: RawEmailInput[]
): Promise<{ evidenceRecorded: number; ordersMatched: number; ambiguousCredits: number; errors: string[] }> {
  let evidenceRecorded = 0;
  let ordersMatched = 0;
  let ambiguousCredits = 0;
  const errors: string[] = [];

  for (const email of emails) {
    try {
      const parsed = parseAxisCreditAlert(email);
      if (!parsed) continue; // Not an Axis credit alert, skip

      // Check if evidence already recorded
      const { data: existing } = await admin
        .from("event_payment_evidence")
        .select("id")
        .or(`utr.eq.${parsed.utr},message_id.eq.${parsed.messageId}`)
        .maybeSingle();

      if (existing) continue; // Already processed

      const { data: insertedEvidence, error: insertError } = await admin
        .from("event_payment_evidence")
        .insert({
          bank: parsed.bank,
          direction: parsed.direction,
          currency: parsed.currency,
          amount_paise: parsed.amountPaise,
          receiving_account_suffix: parsed.receivingAccountSuffix,
          utr: parsed.utr,
          transaction_time: parsed.transactionTime,
          transaction_info_raw: parsed.transactionInfoRaw,
          payer_name: parsed.payerName || null,
          sender_email: parsed.sender,
          message_id: parsed.messageId,
          subject: parsed.subject,
          auth_status: parsed.auth.status,
          auth_details: {
            dkim: parsed.auth.dkimPass,
            spf: parsed.auth.spfPass,
            reasons: parsed.auth.reasons,
            details: parsed.auth.details as Record<string, string | number | boolean>,
          },
          reconciliation_state: parsed.isEligibleForAutoReconcile ? "unmatched" : "ignored",
        })
        .select("*")
        .single();

      if (insertError || !insertedEvidence) {
        errors.push(`Failed to insert evidence for UTR ${parsed.utr}: ${insertError?.message}`);
        continue;
      }
      evidenceRecorded++;

      if (!parsed.isEligibleForAutoReconcile) {
        continue; // Unverified email or mismatched receiving account
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  // 2. Perform Order Matching
  const { data: unmatchedEvidence } = await admin
    .from("event_payment_evidence")
    .select("*")
    .eq("direction", "CREDIT")
    .eq("reconciliation_state", "unmatched")
    .eq("auth_status", "authenticated");

  if (!unmatchedEvidence || unmatchedEvidence.length === 0) {
    return { evidenceRecorded, ordersMatched, ambiguousCredits, errors };
  }

  // Get active pending orders
  const { data: pendingOrders } = await admin
    .from("event_payment_orders")
    .select("*")
    .in("status", ["pending", "processing"]);

  if (!pendingOrders || pendingOrders.length === 0) {
    return { evidenceRecorded, ordersMatched, ambiguousCredits, errors };
  }

  const isAutoConfirmEnabled = process.env.CSC_PAYMENT_AUTO_CONFIRM === "true";

  for (const evidence of unmatchedEvidence) {
    try {
      // Find orders with same amount and currency
      const candidates = pendingOrders.filter(
        (o) =>
          o.amount_paise === evidence.amount_paise &&
          o.currency === evidence.currency &&
          (o.status === "pending" || o.status === "processing")
      );

      if (candidates.length === 0) {
        // No pending order matches this amount right now
        continue;
      }

      // Matching Rule 1: Order reference in transaction info (unambiguous cryptographic or memo match)
      const refMatch = candidates.find(
        (o) =>
          o.order_reference &&
          evidence.transaction_info_raw.toUpperCase().includes(o.order_reference.toUpperCase())
      );

      // Matching Rule 2: User claimed UTR matches evidence UTR
      const utrMatch = candidates.find(
        (o) => o.claimed_utr && o.claimed_utr.trim().toLowerCase() === evidence.utr.trim().toLowerCase()
      );

      let matchedOrder: typeof pendingOrders[0] | null = null;
      let matchedBy: "automated_worker" | "user_utr_claim" = "automated_worker";

      if (refMatch) {
        matchedOrder = refMatch;
        matchedBy = "automated_worker";
      } else if (utrMatch) {
        matchedOrder = utrMatch;
        matchedBy = "user_utr_claim";
      } else {
        // NO AMOUNT-ONLY AUTO-MATCHING.
        // If multiple orders owe this amount with no reference or UTR claim, mark ambiguous.
        if (candidates.length > 1) {
          await admin
            .from("event_payment_evidence")
            .update({ reconciliation_state: "ambiguous" })
            .eq("id", evidence.id);
          ambiguousCredits++;
        }
        continue;
      }

      if (!isAutoConfirmEnabled) {
        // Auto-confirmation feature flag is disabled: link evidence to order for admin review
        await admin
          .from("event_payment_orders")
          .update({
            status: "processing",
            matched_evidence_id: evidence.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchedOrder.id);

        await admin.from("event_payment_events").insert({
          order_id: matchedOrder.id,
          event_type: "order.matched_pending_review",
          details: { evidence_id: evidence.id, utr: evidence.utr, matched_by: matchedBy },
        });

        matchedOrder.status = "processing";
        continue;
      }

      // Unambiguous match found with auto-confirm enabled: fulfill registration atomically!
      const fulfilled = await fulfillConfirmedPayment(admin, matchedOrder, evidence, matchedBy);
      if (fulfilled.ok) {
        ordersMatched++;
        matchedOrder.status = "reconciled";
      } else {
        errors.push(`Order fulfillment failed for ${matchedOrder.id}: ${fulfilled.error}`);
      }
    } catch (matchErr) {
      errors.push(matchErr instanceof Error ? matchErr.message : String(matchErr));
    }
  }

  return { evidenceRecorded, ordersMatched, ambiguousCredits, errors };
}

/**
 * Fulfills a confirmed payment order atomically via the csc_fulfill_confirmed_payment RPC.
 */
export async function fulfillConfirmedPayment(
  admin: SupabaseClient<Database>,
  order: Database["public"]["Tables"]["event_payment_orders"]["Row"],
  evidence: Database["public"]["Tables"]["event_payment_evidence"]["Row"],
  matchedBy: "automated_worker" | "user_utr_claim" = "automated_worker"
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. Resolve User ID if available in auth.users
    let userId = order.user_id;
    if (!userId) {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 100 });
      userId = users?.users.find((u) => u.email?.toLowerCase() === order.email.toLowerCase())?.id || null;
    }

    // 2. Call atomic PostgreSQL function
    const { data: result, error: rpcError } = await admin.rpc("csc_fulfill_confirmed_payment", {
      p_order_id: order.id,
      p_evidence_id: evidence.id,
      p_matched_by: matchedBy,
      p_notes: `Axis Bank alert reconciliation: UTR ${evidence.utr}, ₹${Number(evidence.amount_paise) / 100}`,
      p_user_id: userId,
    });

    if (rpcError) {
      return { ok: false, error: rpcError.message };
    }

    const resObj = result as { ok?: boolean; primary_pass_id?: string; paid_registration_id?: string };
    if (!resObj?.ok) {
      return { ok: false, error: "Atomic fulfillment did not succeed." };
    }

    // 3. Queue Pass Email and schedule delivery
    if (resObj.primary_pass_id) {
      await ensureEventPassEmail(admin, resObj.primary_pass_id);
      scheduleNotificationDelivery();
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Top-level reconciliation runner called by the scheduled endpoint.
 */
export async function reconcilePayments(): Promise<ReconciliationSummary> {
  const admin = createAdminClient();
  const leaseHolder = `worker-${randomUUID().slice(0, 8)}`;

  // 1. Acquire database lease (60 seconds)
  const { data: leaseAcquired, error: leaseError } = await admin.rpc("csc_acquire_payment_worker_lease", {
    p_lease_holder: leaseHolder,
    p_duration_seconds: 60,
  });

  if (leaseError || !leaseAcquired) {
    return {
      ok: false,
      leaseAcquired: false,
      messagesFetched: 0,
      evidenceRecorded: 0,
      ordersMatched: 0,
      ambiguousCredits: 0,
      errors: ["Could not acquire worker lease. Another instance is currently executing."],
    };
  }

  let messagesFetched = 0;
  let evidenceRecorded = 0;
  let ordersMatched = 0;
  let ambiguousCredits = 0;
  const errors: string[] = [];
  let highestUid: number | null = null;
  let uidValidity: number | null = null;
  let mailboxName = "INBOX";

  try {
    // 2. Fetch last cursor UID and UIDVALIDITY
    const { data: workerState } = await admin
      .from("payment_worker_state")
      .select("last_uid,uid_validity,mailbox_name")
      .eq("id", "primary")
      .maybeSingle();

    const lastUid = Number(workerState?.last_uid ?? 0);
    const expectedUidValidity = Number(workerState?.uid_validity ?? 0);

    // 3. Connect to iCloud and fetch new messages
    const fetchResult = await fetchRecentBankAlerts({
      lastUid,
      expectedUidValidity,
      limit: 25,
    });

    messagesFetched = fetchResult.messages.length;
    highestUid = fetchResult.highestUid;
    uidValidity = fetchResult.uidValidity;
    mailboxName = fetchResult.mailboxName;

    // 4. Process and reconcile
    if (fetchResult.messages.length > 0) {
      const batchResult = await processReconciliationBatch(admin, fetchResult.messages);
      evidenceRecorded = batchResult.evidenceRecorded;
      ordersMatched = batchResult.ordersMatched;
      ambiguousCredits = batchResult.ambiguousCredits;
      errors.push(...batchResult.errors);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  } finally {
    // 5. Release worker lease
    await admin.rpc("csc_release_payment_worker_lease", {
      p_lease_holder: leaseHolder,
      p_status: errors.length > 0 ? "error" : "success",
      p_message_count: messagesFetched,
      p_matched_count: ordersMatched,
      p_last_uid: highestUid,
      p_error: errors.length > 0 ? errors.join("; ").slice(0, 500) : null,
      p_uid_validity: uidValidity,
      p_mailbox_name: mailboxName,
    });
  }

  return {
    ok: errors.length === 0,
    leaseAcquired: true,
    messagesFetched,
    evidenceRecorded,
    ordersMatched,
    ambiguousCredits,
    errors,
  };
}
