import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { UPI_CONFIG } from "./config";

export interface CreateOrderParams {
  eventId: string;
  fullName: string;
  email: string;
  whatsapp: string;
  organization: string;
  role: Database["public"]["Enums"]["paid_registration_role"];
  attendeeCount: number;
  additionalAttendeeNames?: string;
  referralSource?: Database["public"]["Enums"]["paid_registration_referral"];
  dietaryAccessibilityNotes?: string;
  consentContact?: boolean;
  consentPaymentTerms?: boolean;
  userId?: string;
}

export interface PaymentDeepLinks {
  standardUpi: string;
  gpay: string;
  phonepe: string;
  paytm: string;
  bhim: string;
}

export function generateOrderReference(): string {
  const hex = randomBytes(6).toString("hex").toUpperCase();
  return `CSC-ORD-${hex}`;
}

export function generateGuestCheckoutToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function verifyOrderAccess(
  order: { user_id?: string | null; guest_token_hash?: string | null },
  sessionUserId?: string | null,
  guestToken?: string | null
): boolean {
  if (sessionUserId && order.user_id && sessionUserId === order.user_id) {
    return true;
  }
  if (guestToken && order.guest_token_hash) {
    const providedHash = hashGuestToken(guestToken);
    const expectedHash = order.guest_token_hash;
    if (
      providedHash.length === expectedHash.length &&
      timingSafeEqual(Buffer.from(providedHash), Buffer.from(expectedHash))
    ) {
      return true;
    }
  }
  return false;
}

export function buildUpiUri(params: {
  vpa?: string;
  payeeName?: string;
  amountRupees: number;
  orderReference: string;
  eventTitle: string;
}): string {
  const vpa = params.vpa || UPI_CONFIG.PAYEE_VPA;
  const payee = params.payeeName || UPI_CONFIG.PAYEE_NAME;
  const formattedAmount = params.amountRupees.toFixed(2);
  const note = `Pass for ${params.eventTitle.slice(0, 30)}`;

  const query = new URLSearchParams({
    pa: vpa,
    pn: payee,
    am: formattedAmount,
    cu: UPI_CONFIG.CURRENCY,
    tr: params.orderReference,
    tn: note,
  });

  return `upi://pay?${query.toString()}`;
}

export function buildPaymentDeepLinks(upiUri: string): PaymentDeepLinks {
  // Extract query string from upiUri
  const query = upiUri.startsWith("upi://pay?") ? upiUri.slice("upi://pay?".length) : "";

  return {
    standardUpi: upiUri,
    gpay: `gpay://upi/pay?${query}`,
    phonepe: `phonepe://pay?${query}`,
    paytm: `paytmmp://pay?${query}`,
    bhim: `bhim://pay?${query}`,
  };
}

export async function createPaymentOrder(
  admin: SupabaseClient<Database>,
  params: CreateOrderParams
) {
  const {
    eventId,
    fullName,
    email,
    whatsapp,
    organization,
    role,
    attendeeCount,
    additionalAttendeeNames,
    referralSource,
    dietaryAccessibilityNotes,
    consentContact = true,
    consentPaymentTerms = true,
    userId,
  } = params;

  // 1. Fetch and validate event
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id,title,status,registration_state,starts_at,registration_deadline,admission,registration_mode,price_per_attendee,max_attendees_per_registration,upi_vpa,upi_payee_name")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return { ok: false as const, error: "Event not found.", status: 404 };
  }

  const now = Date.now();
  if (
    event.status !== "published" ||
    event.admission !== "paid" ||
    (event.registration_state !== "open" && event.registration_state !== "coming-soon") ||
    Date.parse(event.starts_at) <= now ||
    (event.registration_deadline && Date.parse(event.registration_deadline) <= now)
  ) {
    return { ok: false as const, error: "Registration is not open for this event.", status: 409 };
  }

  if (attendeeCount > (event.max_attendees_per_registration ?? 10)) {
    return { ok: false as const, error: `Attendee count exceeds limit of ${event.max_attendees_per_registration ?? 10}.`, status: 422 };
  }

  const pricePerAttendee = Number(event.price_per_attendee ?? 0);
  if (pricePerAttendee <= 0) {
    return { ok: false as const, error: "Event ticket price is invalid.", status: 422 };
  }

  // 2. Prevent duplicate active registrations for this event
  const lowerEmail = email.toLowerCase().trim();
  const [{ data: existingOrders }, { data: existingPaidRegs }, { data: existingPasses }] = await Promise.all([
    admin.from("event_payment_orders").select("id,status,guest_token_hash").eq("event_id", event.id).eq("email", lowerEmail).in("status", ["pending", "processing", "verified", "reconciled"]).limit(5),
    admin.from("paid_event_registrations").select("id,status").eq("event_id", event.id).eq("email", lowerEmail).not("status", "in", "('rejected','cancelled')").limit(5),
    admin.from("event_registrations").select("id,status").eq("event_id", event.id).eq("source_email", lowerEmail).not("status", "in", "('cancelled','revoked')").limit(5),
  ]);

  if ((existingPaidRegs && existingPaidRegs.length > 0) || (existingPasses && existingPasses.length > 0)) {
    return { ok: false as const, error: "You are already registered or confirmed for this event.", status: 409 };
  }

  // Generate capability token for guest checkout access
  const guestCheckoutToken = generateGuestCheckoutToken();
  const guestTokenHash = hashGuestToken(guestCheckoutToken);

  // If there is an existing pending order created recently (< 30 min), we can reuse it
  const activeOrder = existingOrders?.find((o) => o.status === "pending" || o.status === "processing");
  if (activeOrder) {
    // Update with fresh guest token capability and return details
    await admin
      .from("event_payment_orders")
      .update({ guest_token_hash: guestTokenHash, updated_at: new Date().toISOString() })
      .eq("id", activeOrder.id);

    const { data: fullOrder } = await admin.from("event_payment_orders").select("*").eq("id", activeOrder.id).single();
    if (fullOrder) {
      return {
        ok: true as const,
        order: fullOrder,
        deepLinks: buildPaymentDeepLinks(fullOrder.upi_uri),
        guestCheckoutToken,
      };
    }
  }

  // 3. Calculate amount
  const totalRupees = Math.round(pricePerAttendee * 100) * attendeeCount / 100;
  const amountPaise = Math.round(totalRupees * 100);

  // 4. Generate unique order reference & dynamic UPI URI
  const orderReference = generateOrderReference();
  const upiUri = buildUpiUri({
    vpa: event.upi_vpa || UPI_CONFIG.PAYEE_VPA,
    payeeName: event.upi_payee_name || UPI_CONFIG.PAYEE_NAME,
    amountRupees: totalRupees,
    orderReference,
    eventTitle: event.title,
  });

  const deepLinks = buildPaymentDeepLinks(upiUri);

  // 5. Insert order
  const { data: newOrder, error: insertError } = await admin
    .from("event_payment_orders")
    .insert({
      order_reference: orderReference,
      event_id: event.id,
      user_id: userId || null,
      full_name: fullName.trim(),
      email: lowerEmail,
      whatsapp: whatsapp.trim(),
      organization: organization.trim(),
      role,
      attendee_count: attendeeCount,
      additional_attendee_names: additionalAttendeeNames?.trim() || null,
      referral_source: referralSource || null,
      dietary_accessibility_notes: dietaryAccessibilityNotes?.trim() || null,
      amount_paise: amountPaise,
      currency: "INR",
      payee_vpa: event.upi_vpa || UPI_CONFIG.PAYEE_VPA,
      payee_name: event.upi_payee_name || UPI_CONFIG.PAYEE_NAME,
      expected_account_suffix: UPI_CONFIG.RECEIVING_ACCOUNT_SUFFIX,
      upi_uri: upiUri,
      status: "pending",
      guest_token_hash: guestTokenHash,
      consent_contact: consentContact,
      consent_payment_terms: consentPaymentTerms,
    })
    .select("*")
    .single();

  if (insertError || !newOrder) {
    return { ok: false as const, error: "Failed to initialize payment order.", status: 500 };
  }

  // Record audit event
  await admin.from("event_payment_events").insert({
    order_id: newOrder.id,
    event_type: "order.created",
    details: { orderReference, amountPaise, totalRupees, upiUri },
  });

  return {
    ok: true as const,
    order: newOrder,
    deepLinks,
    guestCheckoutToken,
  };
}
