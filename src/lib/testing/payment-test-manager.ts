import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

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
}

/**
 * Creates or retrieves the active ₹1.00 internal QA payment test event.
 */
export async function createPaymentTestEvent(options?: {
  upiVpa?: string;
  upiPayeeName?: string;
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

  const upiVpa = options?.upiVpa || process.env.CSC_PAYMENT_UPI_VPA || process.env.CSC_UPI_VPA || "6379326671@superyes";
  const upiPayeeName = options?.upiPayeeName || process.env.CSC_PAYMENT_PAYEE_NAME || process.env.CSC_UPI_PAYEE_NAME || "KISHORE C";
  const upiQrPath = "event-upi-qr/8c4616c7-d8a1-42a9-b4d0-1388cba57c08.webp";

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const settings = {
    is_test_event: true,
    test_run_id: testRunId,
    test_purpose: "upi_end_to_end_acceptance",
    visibility: "unlisted",
    created_by_admin: options?.adminUserId || "system",
    expires_at: expiresAt,
    onlineInfo: "https://meet.google.com/test-csc-payment",
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
        location: "Online (Google Meet)",
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
      location: "Online (Google Meet)",
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
  forceStagingPurge?: boolean;
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

  // Step 2: Query orders
  const { data: orders } = await admin
    .from("event_payment_orders")
    .select("id, status")
    .eq("event_id", eventId);

  const orderIds = (orders ?? []).map((o) => o.id);

  // Step 3: Check if real payments exist
  const hasReconciledOrders = (orders ?? []).some((o) => o.status === "reconciled" || o.status === "verified");
  const isPureSynthetic = options?.forceStagingPurge || !hasReconciledOrders;

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
    // Production safety: mark orders as test_completed and event archived
    if (orderIds.length > 0) {
      await admin
        .from("event_payment_orders")
        .update({ status: "cancelled" })
        .eq("event_id", eventId)
        .eq("status", "pending");
    }
  }

  // Audit log
  await admin.from("audit_logs").insert({
    action: "event.test_run_cleaned",
    actor_id: options?.adminUserId || null,
    target_type: "event",
    target_id: eventId,
    after: { testRunId, mode: isPureSynthetic ? "synthetic_purged" : "production_archived", cleanedCounts },
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
  };
}
