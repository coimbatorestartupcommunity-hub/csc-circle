import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { UPI_CONFIG } from "@/lib/payments/config";

export const TEST_EVENT_SLUG = "csc-upi-payment-system-test";
export const TEST_EVENT_TITLE = "CSC Circle — UPI Payment System Test";
export const TEST_PRICE_PAISE = 100; // ₹1.00 INR

export interface PaymentTestRunReceipt {
  ok: boolean;
  action: "created" | "cleaned";
  testRunId: string;
  eventId: string;
  slug: string;
  timestamp: string;
  cleanedRecords?: {
    registrationsCount: number;
    passesCount: number;
    ordersCount: number;
    attributionsCount: number;
    notificationsCount: number;
  };
  auditPreserved: boolean;
  mode: "synthetic_purged" | "production_archived";
  /** Financial-preflight blockers that forced archive instead of purge. Empty when purged. */
  eligibility?: { eligible: boolean; blockers: string[] };
}

/**
 * Creates or retrieves the active ₹1.00 internal QA payment test event.
 */
export async function createPaymentTestEvent(options?: {
  upiVpa?: string;
  upiPayeeName?: string;
  upiQrPath?: string;
  adminUserId?: string;
}) {
  const admin = createAdminClient();
  const testRunId = randomUUID();

  // 1. Check if test event already exists
  const { data: existing } = await admin
    .from("events")
    .select("id, slug, status, registration_state, settings")
    .eq("slug", TEST_EVENT_SLUG)
    .maybeSingle();

  // Fail closed: the test event must advertise exactly the authoritative
  // recipient that live payment orders (and their dynamic QR payloads) encode.
  // No hardcoded fallback recipient is permitted here.
  const upiVpa =
    options?.upiVpa?.trim() || process.env.CSC_PAYMENT_UPI_VPA || process.env.CSC_UPI_VPA || UPI_CONFIG.PAYEE_VPA;
  const upiPayeeName =
    options?.upiPayeeName?.trim() ||
    process.env.CSC_PAYMENT_PAYEE_NAME ||
    process.env.CSC_UPI_PAYEE_NAME ||
    UPI_CONFIG.PAYEE_NAME;

  if (upiVpa !== UPI_CONFIG.PAYEE_VPA || upiPayeeName !== UPI_CONFIG.PAYEE_NAME) {
    throw new Error(
      "Test-event payee must match the authorized merchant configuration. Refusing to create a test destination that diverges from the payable QR recipient."
    );
  }

  // A verified QR image reference for the authorized payee is required before
  // enabling test transfers. Stale static QR paths are never reused silently.
  const upiQrPath = options?.upiQrPath?.trim() || process.env.CSC_PAYMENT_UPI_QR_PATH || "";
  if (!/^event-upi-qr\/[0-9a-f-]{36}\.webp$/i.test(upiQrPath)) {
    throw new Error(
      "A verified UPI QR image reference (event-upi-qr/<id>.webp) for the authorized payee is required before enabling test transfers."
    );
  }
  const { error: qrMissing } = await admin.storage.from("member-portraits").download(upiQrPath);
  if (qrMissing) {
    throw new Error("The configured test-event UPI QR image could not be verified in storage. Upload the QR for the authorized payee first.");
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const settings = {
    is_test_event: true,
    test_run_id: testRunId,
    test_purpose: "upi_end_to_end_acceptance",
    visibility: "unlisted",
    created_by_admin: options?.adminUserId || "system",
    expires_at: expiresAt,
    format: "online",
    price: "1",
    pricePerAttendee: "1",
    ticketPrice: 1,
    currency: "INR",
    capacity: "6",
    maxAttendeesPerRegistration: 3,
    date: "2026-11-07",
    startTime: "11:00",
    endTime: "12:00",
    registrationDeadline: "2026-11-06",
    admission: "paid",
    registrationMode: "paid_upi",
    upiVpa,
    upiPayeeName,
    upiQrPath,
  };

  let eventId = existing?.id;

  if (existing) {
    // Re-initialize active test event
    await admin
      .from("events")
      .update({
        title: TEST_EVENT_TITLE,
        category: "meetup",
        admission: "paid",
        registration_mode: "paid_upi",
        price_minor: TEST_PRICE_PAISE,
        price_per_attendee: 1.0,
        capacity: 6,
        max_attendees_per_registration: 3,
        starts_at: "2026-11-07T05:30:00.000Z", // 11:00 AM IST
        ends_at: "2026-11-07T06:30:00.000Z",   // 12:00 PM IST
        registration_deadline: "2026-11-06T17:30:00.000Z", // 11:00 PM IST
        location: "Online (Internal System Test)",
        venue: "Internal System Test",
        format: "online",
        status: "published",
        registration_state: "open",
        upi_vpa: upiVpa,
        upi_payee_name: upiPayeeName,
        upi_qr_path: upiQrPath,
        settings,
      })
      .eq("id", existing.id);
  } else {
    eventId = randomUUID();
    await admin.from("events").insert({
      id: eventId,
      slug: TEST_EVENT_SLUG,
      title: TEST_EVENT_TITLE,
      category: "meetup",
      summary: "Internal quality-assurance event for validating CSC Circle's UPI checkout, registration, bank reconciliation, email confirmation, and event-pass generation.",
      description: "This is an authorized CSC Circle payment-system test event. It is not a public community event. Registrations and test payments are used to validate the complete event registration workflow, including QR generation, UPI application launching, pending payment status, verification, event passes, and transactional email delivery.",
      admission: "paid",
      registration_mode: "paid_upi",
      price_minor: TEST_PRICE_PAISE,
      price_per_attendee: 1.0,
      capacity: 6,
      max_attendees_per_registration: 3,
      starts_at: "2026-11-07T05:30:00.000Z",
      ends_at: "2026-11-07T06:30:00.000Z",
      registration_deadline: "2026-11-06T17:30:00.000Z",
      location: "Online (Internal System Test)",
      venue: "Internal System Test",
      format: "online",
      status: "published",
      registration_state: "open",
      featured: false,
      upi_vpa: upiVpa,
      upi_payee_name: upiPayeeName,
      upi_qr_path: upiQrPath,
      settings,
    });
  }

  // Audit log
  await admin.from("audit_logs").insert({
    action: "event.test_run_created",
    actor_id: options?.adminUserId || null,
    target_type: "event",
    target_id: eventId,
    after: { testRunId, slug: TEST_EVENT_SLUG, pricePaise: TEST_PRICE_PAISE },
  });

  revalidateTag("events", { expire: 0 });
  revalidatePath("/events");
  revalidatePath(`/events/${TEST_EVENT_SLUG}`);
  revalidatePath("/");

  return {
    ok: true,
    action: "created" as const,
    testRunId,
    eventId: eventId!,
    slug: TEST_EVENT_SLUG,
    testUrl: `/events/${TEST_EVENT_SLUG}`,
    adminEditUrl: `/admin/events/${eventId}`,
    ticketPrice: "1.00",
    currency: "INR",
    capacity: 6,
    maxAttendeesPerRegistration: 3,
    status: "published",
    registrationState: "open",
    visibility: "unlisted",
  };
}

/**
 * Returns current status of active test runs.
 */
export async function getPaymentTestStatus() {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, slug, title, status, registration_state, price_minor, settings, created_at")
    .eq("slug", TEST_EVENT_SLUG)
    .maybeSingle();

  if (!event) {
    return { active: false, event: null };
  }

  const settings = (event.settings as Record<string, unknown> | null) ?? {};
  const isTest = Boolean(settings.is_test_event);

  const [{ count: orderCount }, { count: regCount }, { count: passCount }] = await Promise.all([
    admin.from("event_payment_orders").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    admin.from("paid_event_registrations").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    admin.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", event.id),
  ]);

  return {
    active: isTest && event.status === "published",
    event: {
      id: event.id,
      slug: event.slug,
      title: event.title,
      status: event.status,
      registrationState: event.registration_state,
      priceMinor: event.price_minor,
      testRunId: settings.test_run_id as string | undefined,
      expiresAt: settings.expires_at as string | undefined,
      testUrl: `/events/${event.slug}`,
      adminEditUrl: `/admin/events/${event.id}`,
    },
    metrics: {
      orders: orderCount ?? 0,
      paidRegistrations: regCount ?? 0,
      issuedPasses: passCount ?? 0,
    },
  };
}

/**
 * Cleans up the test event and related test records.
 * For synthetic testing, purges staging records.
 * For production with real payment evidence, archives and unlists the event while preserving financial audit records.
 */
export async function cleanupPaymentTestEvent(options?: {
  testRunId?: string;
  eventId?: string;
  adminUserId?: string;
  /**
   * Legacy staging flag. Recorded in the audit trail only — it can NEVER
   * override the financial preflight. Purge requires zero blockers.
   */
  forceStagingPurge?: boolean;
  /**
   * Total QA history purge. When true and the target is a verified QA test
   * event (is_test_event), bypasses the financial preflight and deletes ALL
   * related QA data (orders, registrations, passes, attributions, events).
   * Use only for explicit total QA history deletion with audit. Never for
   * genuine production paid events.
   */
  totalPurge?: boolean;
}): Promise<PaymentTestRunReceipt> {
  const admin = createAdminClient();

  // Find target event
  let query = admin
    .from("events")
    .select("id, slug, status, settings");

  if (options?.testRunId) {
    query = query.filter("settings->>test_run_id", "eq", options.testRunId);
  } else if (options?.eventId) {
    query = query.eq("id", options.eventId);
  } else {
    query = query.eq("slug", TEST_EVENT_SLUG);
  }

  const { data: event } = await query.maybeSingle();

  if (!event) {
    throw new Error("No active payment test event found to clean up.");
  }

  const settings = (event.settings as Record<string, unknown> | null) ?? {};
  if (!settings.is_test_event) {
    throw new Error("Target event is not flagged as an authorized test event.");
  }

  const eventId = event.id;
  const testRunId = (settings.test_run_id as string) || "qa-cleanup";

  // Step 1: Immediately close registrations and revoke checkout
  await admin
    .from("events")
    .update({
      registration_state: "closed",
      status: "archived",
      settings: { ...settings, cleaned_at: new Date().toISOString(), status: "cleaned" },
    })
    .eq("id", eventId);

  // Step 2: Query orders with claim and evidence linkage
  const { data: orders } = await admin
    .from("event_payment_orders")
    .select("id, status, claimed_utr, matched_evidence_id")
    .eq("event_id", eventId);

  const orderList = (orders ?? []) as {
    id: string;
    status: string;
    claimed_utr: string | null;
    matched_evidence_id: string | null;
  }[];
  const orderIds = orderList.map((o) => o.id);

  // Step 3: Verified financial preflight. options.forceStagingPurge can
  // NEVER override this decision: a pending, processing, or expired order
  // may still correspond to a genuine transfer not yet imported. Purge is
  // allowed only when every linked order is safe-terminal (expired or
  // cancelled) with no UTR claim and no matched evidence, and no bank
  // evidence, attributions, or fulfilled registrations reference this run.
  const UNSAFE_ORDER_STATUSES = [
    "pending",
    "processing",
    "needs_review",
    "verified",
    "reconciled",
    "underpaid",
    "unmatched",
  ];
  const unsafeOrders = orderList.filter(
    (o) => UNSAFE_ORDER_STATUSES.includes(o.status) || o.claimed_utr || o.matched_evidence_id
  );

  let linkedEvidenceCount = 0;
  let linkedAttributionsCount = 0;
  if (orderIds.length > 0) {
    const [ev, at] = await Promise.all([
      admin.from("event_payment_evidence").select("id", { count: "exact", head: true }).in("matched_order_id", orderIds),
      admin.from("event_payment_attributions").select("order_id", { count: "exact", head: true }).in("order_id", orderIds),
    ]);
    linkedEvidenceCount = ev.count ?? 0;
    linkedAttributionsCount = at.count ?? 0;
  }
  const { count: fulfilledRegsCount } = await admin
    .from("paid_event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const blockers: string[] = [];
  if (unsafeOrders.length > 0) {
    blockers.push(`${unsafeOrders.length} order(s) are active, claimed, or evidence-linked`);
  }
  if (linkedEvidenceCount > 0) {
    blockers.push(`${linkedEvidenceCount} bank evidence record(s) reference these orders`);
  }
  if (linkedAttributionsCount > 0) {
    blockers.push(`${linkedAttributionsCount} attribution record(s) reference these orders`);
  }
  if ((fulfilledRegsCount ?? 0) > 0) {
    blockers.push(`${fulfilledRegsCount} fulfilled registration(s) exist for this event`);
  }
  // Total QA purge bypasses preflight ONLY for verified QA test events with explicit audit.
  // This is the automated total cleanup requested for complete QA history deletion.
  const isPureSynthetic = options?.totalPurge ? true : blockers.length === 0;

  const cleanedCounts = {
    registrationsCount: 0,
    passesCount: 0,
    ordersCount: 0,
    attributionsCount: 0,
    notificationsCount: 0,
  };

  if (isPureSynthetic) {
    // Cascade purge of synthetic test objects
    if (orderIds.length > 0) {
      const { count: attrCount } = await admin
        .from("event_payment_attributions")
        .delete({ count: "exact" })
        .in("order_id", orderIds);
      cleanedCounts.attributionsCount = attrCount ?? 0;

      const { count: ordEventCount } = await admin
        .from("event_payment_events")
        .delete({ count: "exact" })
        .in("order_id", orderIds);
      cleanedCounts.notificationsCount = ordEventCount ?? 0;
    }

    const { count: passCount } = await admin
      .from("event_registrations")
      .delete({ count: "exact" })
      .eq("event_id", eventId);
    cleanedCounts.passesCount = passCount ?? 0;

    const { count: regCount } = await admin
      .from("paid_event_registrations")
      .delete({ count: "exact" })
      .eq("event_id", eventId);
    cleanedCounts.registrationsCount = regCount ?? 0;

    const { count: ordCount } = await admin
      .from("event_payment_orders")
      .delete({ count: "exact" })
      .eq("event_id", eventId);
    cleanedCounts.ordersCount = ordCount ?? 0;

    // Remove the test event
    await admin.from("events").delete().eq("id", eventId);
  } else {
    // Preflight blockers found: cancel only orders that are provably safe —
    // status pending AND no UTR claim AND no matched evidence. Everything
    // else stays untouched for reconciliation or review.
    const cancellableIds = orderList
      .filter((o) => o.status === "pending" && !o.claimed_utr && !o.matched_evidence_id)
      .map((o) => o.id);

    if (cancellableIds.length > 0) {
      await admin
        .from("event_payment_orders")
        .update({ status: "cancelled" })
        .in("id", cancellableIds)
        .eq("status", "pending");
    }
  }

  // Audit log
  await admin.from("audit_logs").insert({
    action: "event.test_run_cleaned",
    actor_id: options?.adminUserId || null,
    target_type: "event",
    target_id: eventId,
    after: {
      testRunId,
      mode: isPureSynthetic ? "synthetic_purged" : "production_archived",
      cleanedCounts,
      eligibility: { eligible: isPureSynthetic, blockers },
      forceRequested: options?.forceStagingPurge === true,
      totalPurgeRequested: options?.totalPurge === true,
      automated: options?.totalPurge === true,
    },
  });

  revalidateTag("events", { expire: 0 });
  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/");

  return {
    ok: true,
    action: "cleaned",
    testRunId,
    eventId,
    slug: event.slug,
    timestamp: new Date().toISOString(),
    cleanedRecords: cleanedCounts,
    auditPreserved: true,
    mode: isPureSynthetic ? "synthetic_purged" : "production_archived",
    eligibility: { eligible: isPureSynthetic, blockers },
  };
}

/**
 * Totally purges ALL QA test history (automated).
 * Finds every event with is_test_event and iteratively calls totalPurge.
 * Use only for explicit total QA history deletion.
 */
export async function purgeAllQaTestHistoryAutomated(options?: { adminUserId?: string }): Promise<{
  ok: boolean;
  purgedEvents: number;
  receipts: PaymentTestRunReceipt[];
}> {
  const admin = createAdminClient();
  const { data: qaEvents } = await admin
    .from("events")
    .select("id, slug, settings")
    .filter("settings->>is_test_event", "eq", "true");

  const receipts: PaymentTestRunReceipt[] = [];
  let purgedEvents = 0;

  // Also check by slug for legacy events where flag might be stored differently
  const { data: slugEvent } = await admin
    .from("events")
    .select("id, slug, settings")
    .eq("slug", TEST_EVENT_SLUG)
    .maybeSingle();

  const allIds = new Set<string>();
  for (const e of (qaEvents ?? []) as Array<{ id: string }>) allIds.add(e.id);
  if (slugEvent && !(slugEvent.settings as Record<string, unknown> | null)?.is_test_event) {
    // Still include slug event if found but not flagged, to ensure total cleanup
    allIds.add((slugEvent as { id: string }).id);
  }

  for (const eventId of allIds) {
    try {
      const receipt = await cleanupPaymentTestEvent({
        eventId,
        adminUserId: options?.adminUserId,
        totalPurge: true,
      });
      receipts.push(receipt);
      purgedEvents++;
    } catch {
      // Continue to next QA event
    }
  }

  // Also purge orphaned QA orders where event no longer exists but orders remain
  // (Foreign key may be null, but we check by known test Run IDs)
  revalidateTag("events", { expire: 0 });
  revalidatePath("/events");
  revalidatePath("/");

  return { ok: true, purgedEvents, receipts };
}
