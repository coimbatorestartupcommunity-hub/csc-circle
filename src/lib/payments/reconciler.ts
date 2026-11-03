import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAxisCreditAlert, type RawEmailInput } from "./axis-parser";
import { fetchMessagesById, fetchRecentBankAlerts } from "./imap-client";
import { ensureEventPassEmail } from "@/lib/admin/event-pass-email";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { containsExactOrderReference } from "./orders";

export interface ReconciliationSummary {
  ok: boolean;
  leaseAcquired: boolean;
  messagesFetched: number;
  evidenceRecorded: number;
  evidenceReverified?: number;
  ordersMatched: number;
  ambiguousCredits: number;
  errors: string[];
}

/** Exact reason recorded when no DKIM allowlist was configured at import time. */
export const STRANDED_ALLOWLIST_REASON = "No approved Axis Bank DKIM signing domain is configured";
const STRANDED_REVERIFY_LIMIT = 20;

/**
 * One-time catch-up for evidence stranded as `needs_review`/`ignored` while
 * no DKIM allowlist was configured. Re-fetches the original message by
 * Message-ID, re-runs cryptographic verification under the CURRENT policy,
 * and promotes the row only when verification now passes. Rows with any
 * other status (forged, untrusted) are never touched.
 */
export async function reverifyStrandedEvidence(
  admin: SupabaseClient<Database>
): Promise<{ reverified: number; errors: string[] }> {
  const allowlist = (process.env.CSC_PAYMENT_APPROVED_DKIM_DOMAINS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return { reverified: 0, errors: [] };

  const { data: stranded, error: queryError } = await admin
    .from("event_payment_evidence")
    .select("id, utr, message_id, auth_details")
    .eq("auth_status", "needs_review")
    .eq("reconciliation_state", "ignored")
    .limit(STRANDED_REVERIFY_LIMIT);
  if (queryError) return { reverified: 0, errors: [queryError.message] };

  const rows = (stranded ?? []).filter((row) => {
    const reasons = (row.auth_details as { reasons?: unknown } | null)?.reasons;
    return (
      Array.isArray(reasons) &&
      reasons.includes(STRANDED_ALLOWLIST_REASON) &&
      typeof row.message_id === "string" &&
      row.message_id.length > 0
    );
  });
  if (rows.length === 0) return { reverified: 0, errors: [] };

  const { messages, errors } = await fetchMessagesById(
    rows.map((row) => row.message_id as string),
    { maxMessages: STRANDED_REVERIFY_LIMIT }
  );
  const byMessageId = new Map(messages.map((message) => [message.messageId, message]));

  let reverified = 0;
  for (const row of rows) {
    const email = byMessageId.get(row.message_id as string);
    if (!email) continue;
    const parsed = parseAxisCreditAlert(email);
    if (!parsed || parsed.utr !== row.utr || parsed.messageId !== row.message_id) {
      errors.push(`Re-verification parse mismatch for evidence ${row.id}; row left untouched`);
      continue;
    }
    const { error: updateError } = await admin
      .from("event_payment_evidence")
      .update({
        auth_status: parsed.auth.status,
        auth_details: {
          dkim: parsed.auth.dkimPass,
          spf: parsed.auth.spfPass,
          reasons: parsed.auth.reasons,
          details: parsed.auth.details as Record<string, string | number | boolean>,
        },
        reconciliation_state: parsed.isEligibleForAutoReconcile ? "unmatched" : "ignored",
      })
      .eq("id", row.id);
    if (updateError) {
      errors.push(`Failed to update re-verified evidence ${row.id}: ${updateError.message}`);
    } else {
      reverified++;
    }
  }
  return { reverified, errors };
}

export async function processReconciliationBatch(
  admin: SupabaseClient<Database>,
  emails: RawEmailInput[]
): Promise<{ evidenceRecorded: number; evidenceReverified: number; ordersMatched: number; ambiguousCredits: number; errors: string[] }> {
  let evidenceRecorded = 0;
  let evidenceReverified = 0;
  let ordersMatched = 0;
  let ambiguousCredits = 0;
  const errors: string[] = [];

  // Catch-up first so re-verified rows are matchable in this same run.
  try {
    const catchUp = await reverifyStrandedEvidence(admin);
    evidenceReverified = catchUp.reverified;
    errors.push(...catchUp.errors);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  for (const email of emails) {
    let workerMessageId: string | null = null;
    try {
      if (email.imapUid && email.imapUidValidity !== undefined && email.imapMailbox) {
        const { data: workerMessage, error: workerMessageError } = await admin
          .from("payment_worker_messages")
          .upsert(
            {
              mailbox_name: email.imapMailbox,
              uid_validity: email.imapUidValidity,
              imap_uid: email.imapUid,
              message_id: email.messageId || null,
              status: "parsing",
              updated_at: new Date().toISOString(),
              last_error: null,
            },
            { onConflict: "mailbox_name,uid_validity,imap_uid" }
          )
          .select("id")
          .single();
        if (workerMessageError || !workerMessage) {
          throw new Error(`Could not persist IMAP processing state for UID ${email.imapUid}`);
        }
        workerMessageId = workerMessage.id;
      }

      const parsed = parseAxisCreditAlert(email);
      if (!parsed) {
        if (workerMessageId) {
          await admin.from("payment_worker_messages").update({
            status: "skipped",
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", workerMessageId);
        }
        continue;
      }

      // Check if evidence already recorded
      const { data: existing } = await admin
        .from("event_payment_evidence")
        .select("id")
        .or(`utr.eq.${parsed.utr},message_id.eq.${parsed.messageId}`)
        .maybeSingle();

      if (existing) {
        if (workerMessageId) {
          await admin.from("payment_worker_messages").update({
            status: "duplicate",
            evidence_id: existing.id,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", workerMessageId);
        }
        continue;
      }

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
        throw new Error(`Failed to insert evidence for UTR ${parsed.utr}: ${insertError?.message}`);
      }
      evidenceRecorded++;

      if (workerMessageId) {
        const { error: ledgerError } = await admin.from("payment_worker_messages").update({
          status: "processed",
          evidence_id: insertedEvidence.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", workerMessageId);
        if (ledgerError) throw new Error(`Could not finalize IMAP processing state for UID ${email.imapUid}`);
      }

      if (!parsed.isEligibleForAutoReconcile) {
        continue; // Unverified email or mismatched receiving account
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(message);
      if (workerMessageId) {
        await admin.from("payment_worker_messages").update({
          status: "failed",
          last_error: message.slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq("id", workerMessageId);
      }
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
    return { evidenceRecorded, evidenceReverified, ordersMatched, ambiguousCredits, errors };
  }

  // Get active pending orders
  const { data: pendingOrders } = await admin
    .from("event_payment_orders")
    .select("*")
    .in("status", ["pending", "processing"]);

  if (!pendingOrders || pendingOrders.length === 0) {
    return { evidenceRecorded, evidenceReverified, ordersMatched, ambiguousCredits, errors };
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

      // Matching Rule 1: Order reference in transaction info (unambiguous bank memo match)
      const refMatch = candidates.find(
        (o) =>
          o.order_reference &&
          containsExactOrderReference(evidence.transaction_info_raw, o.order_reference)
      );

      // Candidate with claimed UTR
      const utrMatch = candidates.find(
        (o) => o.claimed_utr && o.claimed_utr.trim().toLowerCase() === evidence.utr.trim().toLowerCase()
      );

      let matchedOrder: typeof pendingOrders[0] | null = null;
      let matchedBy: "automated_worker" | "user_utr_claim" = "automated_worker";

      if (refMatch) {
        // High confidence: verified order reference in bank transaction note
        matchedOrder = refMatch;
        matchedBy = "automated_worker";
      } else if (utrMatch) {
        // Financial Safety Policy (Section 4):
        // UTR claim without bank-confirmed order reference requires admin review to prevent stolen UTR confirmation.
        await admin
          .from("event_payment_evidence")
          .update({ reconciliation_state: "ambiguous" })
          .eq("id", evidence.id);

        await admin
          .from("event_payment_orders")
          .update({
            status: "processing",
            matched_evidence_id: evidence.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", utrMatch.id);

        await admin.from("event_payment_events").insert({
          order_id: utrMatch.id,
          event_type: "order.matched_pending_review",
          details: {
            evidence_id: evidence.id,
            utr: evidence.utr,
            reason: "Bank alert lacks verifiable order reference; held for admin review",
          },
        });

        ambiguousCredits++;
        continue;
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

      const { error: attributionError } = await admin
        .from("event_payment_attributions")
        .upsert(
          {
            order_id: matchedOrder.id,
            evidence_id: evidence.id,
            attribution_method: "bank_order_reference",
            bank_order_reference: matchedOrder.order_reference,
            verification_source: "cryptographically_authenticated_axis_alert",
            policy_version: "csc-axis-attribution-v1",
            supporting_evidence: {
              message_id: evidence.message_id,
              authentication_policy: evidence.auth_details,
            },
            eligible_for_settlement: true,
          },
          { onConflict: "order_id" }
        );
      if (attributionError) {
        errors.push(`Failed to persist verified attribution for order ${matchedOrder.id}: ${attributionError.message}`);
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

  return { evidenceRecorded, evidenceReverified, ordersMatched, ambiguousCredits, errors };
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
    // The settlement actor is not the attendee. The database uses the owner
    // already bound to the order and keeps guest identity null.
    const { data: result, error: rpcError } = await admin.rpc("csc_fulfill_confirmed_payment", {
      p_order_id: order.id,
      p_evidence_id: evidence.id,
      p_matched_by: matchedBy,
      p_notes: `Axis Bank alert reconciliation: UTR ${evidence.utr}, ₹${Number(evidence.amount_paise) / 100}`,
      p_user_id: null,
    });

    if (rpcError) {
      return { ok: false, error: rpcError.message };
    }

    const resObj = result as { ok?: boolean; primary_pass_id?: string; paid_registration_id?: string };
    if (!resObj?.ok) {
      return { ok: false, error: "Atomic fulfillment did not succeed." };
    }

    // 3. Queue Pass Email and schedule delivery (isolated from settlement commitment)
    if (resObj.primary_pass_id) {
      try {
        await ensureEventPassEmail(admin, resObj.primary_pass_id);
        try {
          await admin.from("notifications").insert({
            type: "email",
            channel: "email",
            audience: "admin",
            template_key: "EventRSVPAdminAlert",
            status: "queued",
            payload: {
              eventTitle: "CSC Circle Event",
              reference: order.order_reference,
              name: order.full_name,
              totalAmountPaid: Number(order.amount_paise) / 100,
              attendeeCount: order.attendee_count,
              status: "verified",
              utr: evidence.utr,
            },
            dedupe_key: `paid-order-admin-${order.id}`,
          });
        } catch {
          // Best effort admin notification
        }
        scheduleNotificationDelivery();
      } catch (emailErr) {
        console.error("CSC_EVENT_PASS_EMAIL_ENQUEUE_FAILED", emailErr);
      }
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
      evidenceReverified: 0,
      ordersMatched: 0,
      ambiguousCredits: 0,
      errors: ["Could not acquire worker lease. Another instance is currently executing."],
    };
  }

  let messagesFetched = 0;
  let evidenceRecorded = 0;
  let evidenceReverified = 0;
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

    // 4. Process and reconcile (runs even with zero new messages so
    // stranded needs_review evidence is reconsidered every run)
    const batchResult = await processReconciliationBatch(admin, fetchResult.messages);
    evidenceRecorded = batchResult.evidenceRecorded;
    evidenceReverified = batchResult.evidenceReverified;
    ordersMatched = batchResult.ordersMatched;
    ambiguousCredits = batchResult.ambiguousCredits;
    errors.push(...batchResult.errors);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  } finally {
    // 5. Release worker lease
    await admin.rpc("csc_release_payment_worker_lease", {
      p_lease_holder: leaseHolder,
      p_status: errors.length > 0 ? "error" : "success",
      p_message_count: messagesFetched,
      p_matched_count: ordersMatched,
      // Never advance past a message that failed parsing or persistence. Safe
      // reprocessing is idempotent; skipping a bank alert is not recoverable.
      p_last_uid: errors.length === 0 ? highestUid : null,
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
    evidenceReverified,
    ordersMatched,
    ambiguousCredits,
    errors,
  };
}
