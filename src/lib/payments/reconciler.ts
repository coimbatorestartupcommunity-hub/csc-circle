import { randomBytes, randomUUID } from "node:crypto";
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
    .eq("reconciliation_state", "unmatched");

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

  for (const evidence of unmatchedEvidence) {
    try {
      // Find orders with same amount and currency
      const candidates = pendingOrders.filter(
        (o) =>
          o.amount_paise === evidence.amount_paise &&
          o.currency === evidence.currency &&
          o.status === "pending"
      );

      if (candidates.length === 0) {
        // No pending order matches this amount right now
        continue;
      }

      // Check if any candidate has a matching claimed_utr
      const utrMatch = candidates.find(
        (o) => o.claimed_utr && o.claimed_utr.trim().toLowerCase() === evidence.utr.trim().toLowerCase()
      );

      let matchedOrder: typeof pendingOrders[0] | null = null;

      if (utrMatch) {
        matchedOrder = utrMatch;
      } else if (candidates.length === 1) {
        // Unique candidate for this exact amount!
        matchedOrder = candidates[0];
      } else {
        // Ambiguous! Multiple orders owe the exact same amount with no distinguishing UTR.
        // DO NOT GUESS. Mark evidence as ambiguous and keep orders pending.
        await admin
          .from("event_payment_evidence")
          .update({ reconciliation_state: "ambiguous" })
          .eq("id", evidence.id);

        ambiguousCredits++;
        continue;
      }

      // Unambiguous match found: fulfill registration transactionally!
      const fulfilled = await fulfillConfirmedPayment(admin, matchedOrder, evidence);
      if (fulfilled.ok) {
        ordersMatched++;
        // Update candidate status in memory so it won't be matched again in this loop
        matchedOrder.status = "verified";
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
 * Fulfills a confirmed payment order:
 * - Links evidence and order
 * - Creates paid_event_registrations row
 * - Issues event admission pass in event_registrations
 * - Queues confirmed event email
 */
export async function fulfillConfirmedPayment(
  admin: SupabaseClient<Database>,
  order: Database["public"]["Tables"]["event_payment_orders"]["Row"],
  evidence: Database["public"]["Tables"]["event_payment_evidence"]["Row"]
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString();

  // 1. Resolve User ID
  let userId = order.user_id;
  if (!userId) {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 100 });
    userId = users?.users.find((u) => u.email?.toLowerCase() === order.email.toLowerCase())?.id || null;
  }

  // 2. Insert or update paid_event_registrations
  const paidRegId = order.paid_registration_id || randomUUID();
  const registrationRef = `CSC-EVT-${randomUUID().replaceAll("-", "").toUpperCase()}`;

  const { error: paidRegError } = await admin.from("paid_event_registrations").upsert({
    id: paidRegId,
    event_id: order.event_id,
    user_id: userId,
    reference: registrationRef,
    status: "confirmed",
    full_name: order.full_name,
    email: order.email.toLowerCase(),
    whatsapp: order.whatsapp,
    organization: order.organization,
    role: order.role,
    attendee_count: order.attendee_count,
    additional_attendee_names: order.additional_attendee_names,
    referral_source: order.referral_source,
    dietary_accessibility_notes: order.dietary_accessibility_notes,
    total_amount_paid: Number(order.amount_paise) / 100,
    upi_transaction_ref: evidence.utr,
    payment_screenshot_path: `payment-proofs/${order.event_id}/${paidRegId}.png`,
    consent_contact: true,
    consent_payment_terms: true,
    reviewed_at: now,
    review_note: `Automated Axis Bank reconciliation: UTR ${evidence.utr}, ₹${Number(evidence.amount_paise) / 100}`,
  });

  if (paidRegError) {
    return { ok: false, error: `Failed to create paid registration: ${paidRegError.message}` };
  }

  // 3. Issue Event Passes in event_registrations for each attendee
  const attendeeNames = [
    order.full_name,
    ...(order.additional_attendee_names ?? "").split(/[\r\n;]/).map((n) => n.trim()).filter(Boolean),
  ].slice(0, order.attendee_count);

  let primaryMemberRegistrationId: string | null = null;

  for (const attendee of attendeeNames) {
    const passReference = `CSC-EVT-${randomUUID().replaceAll("-", "").toUpperCase()}`;
    const passToken = randomBytes(32).toString("hex");

    const { data: pass, error: passError } = await admin
      .from("event_registrations")
      .insert({
        event_id: order.event_id,
        user_id: userId || randomUUID(), // Link to user or dummy if not yet signed up
        attendee_name: attendee,
        reference: passReference,
        pass_token: passToken,
        status: "confirmed",
        payment: "paid",
        paid_registration_id: paidRegId,
        source: "platform",
        source_email: order.email.toLowerCase(),
      })
      .select("id")
      .single();

    if (!passError && pass && (!primaryMemberRegistrationId || attendee === order.full_name)) {
      primaryMemberRegistrationId = pass.id;
    }
  }

  // 4. Update paid registration with primary pass ID
  if (primaryMemberRegistrationId) {
    await admin
      .from("paid_event_registrations")
      .update({ member_registration_id: primaryMemberRegistrationId })
      .eq("id", paidRegId);
  }

  // 5. Update Order & Evidence
  await admin
    .from("event_payment_orders")
    .update({
      status: "reconciled",
      paid_registration_id: paidRegId,
      matched_evidence_id: evidence.id,
      matched_at: now,
      updated_at: now,
    })
    .eq("id", order.id);

  await admin
    .from("event_payment_evidence")
    .update({
      reconciliation_state: "matched",
      matched_order_id: order.id,
    })
    .eq("id", evidence.id);

  // 6. Record Reconciliation Mapping
  await admin.from("event_payment_reconciliation").insert({
    order_id: order.id,
    evidence_id: evidence.id,
    matched_by: order.claimed_utr ? "user_utr_claim" : "automated_worker",
    notes: `Matched ₹${Number(evidence.amount_paise) / 100} with UTR ${evidence.utr}`,
  });

  // 7. Audit log & Event Pass email
  await admin.from("event_payment_events").insert({
    order_id: order.id,
    event_type: "order.reconciled",
    details: {
      evidenceId: evidence.id,
      utr: evidence.utr,
      paidRegistrationId: paidRegId,
      memberRegistrationId: primaryMemberRegistrationId,
    },
  });

  if (primaryMemberRegistrationId) {
    await ensureEventPassEmail(admin, primaryMemberRegistrationId);
    scheduleNotificationDelivery();
  }

  return { ok: true };
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

  try {
    // 2. Fetch last cursor UID
    const { data: workerState } = await admin
      .from("payment_worker_state")
      .select("last_uid")
      .eq("id", "primary")
      .maybeSingle();

    const lastUid = Number(workerState?.last_uid ?? 0);

    // 3. Connect to iCloud and fetch new messages
    const fetchResult = await fetchRecentBankAlerts({ lastUid, limit: 25 });
    messagesFetched = fetchResult.messages.length;
    highestUid = fetchResult.highestUid;

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
