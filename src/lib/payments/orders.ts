import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { UPI_CONFIG, hasExplicitProductionMerchantApproval } from "./config";

export const GUEST_VERIFICATION_COOKIE_NAME = "csc_guest_verification";
export const GUEST_ORDER_TOKEN_COOKIE_PREFIX = "csc_guest_order_token_";

export function getGuestVerificationSecret(): string {
  const secret =
    process.env.CSC_GUEST_EMAIL_VERIFICATION_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "";
  if (secret.length < 32) {
    if (process.env.NODE_ENV !== "production") {
      return "csc-guest-verification-dev-secret-32-chars-minimum!";
    }
    throw new Error("Guest email verification secret is not configured");
  }
  return secret;
}

export function hashGuestVerificationCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function hashGuestVerificationToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function signGuestVerificationCookie(payload: {
  email: string;
  eventId?: string;
  token: string;
}): string {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 15 * 60_000; // 15 minutes
  const data = JSON.stringify({
    email: normalizedEmail,
    eventId: payload.eventId || null,
    token: payload.token,
    issuedAt,
    expiresAt,
  });
  const dataBase64 = Buffer.from(data).toString("base64url");
  const signature = createHmac("sha256", getGuestVerificationSecret())
    .update(dataBase64)
    .digest("base64url");
  return `${dataBase64}.${signature}`;
}

export function verifyGuestVerificationCookie(
  cookieValue: string | null | undefined,
  expectedEmail?: string
): { valid: boolean; email?: string; eventId?: string; token?: string } {
  if (!cookieValue || typeof cookieValue !== "string") return { valid: false };
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return { valid: false };
  const [dataBase64, signature] = parts;

  const expectedSignature = createHmac("sha256", getGuestVerificationSecret())
    .update(dataBase64)
    .digest("base64url");

  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return { valid: false };
  }

  try {
    const raw = Buffer.from(dataBase64, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { valid: false };
    if (typeof parsed.expiresAt !== "number" || Date.now() > parsed.expiresAt) {
      return { valid: false };
    }
    if (typeof parsed.email !== "string" || !parsed.email) {
      return { valid: false };
    }
    const normalizedEmail = parsed.email.trim().toLowerCase();
    if (expectedEmail && normalizedEmail !== expectedEmail.trim().toLowerCase()) {
      return { valid: false };
    }
    return {
      valid: true,
      email: normalizedEmail,
      eventId: parsed.eventId || undefined,
      token: parsed.token || undefined,
    };
  } catch {
    return { valid: false };
  }
}

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
  existingGuestToken?: string;
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

export function containsExactOrderReference(value: string, orderReference: string): boolean {
  if (!/^CSC-ORD-[0-9A-Z]{8,32}$/.test(orderReference)) return false;
  const escaped = orderReference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^A-Z0-9-])${escaped}(?:[^A-Z0-9-]|$)`, "i").test(value);
}

export function generateGuestCheckoutToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function isPayerNameAligned(bankPayerName?: string | null, orderFullName?: string | null): boolean {
  if (!bankPayerName || !orderFullName) return false;
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 1);
  const bankWords = normalize(bankPayerName);
  const orderWords = normalize(orderFullName);
  if (bankWords.length === 0 || orderWords.length === 0) return false;
  const common = bankWords.filter((w) => w.length > 2 && orderWords.includes(w));
  return common.length > 0;
}

export function parseAttendeeList(
  fullName: string,
  attendeeCount: number,
  additionalNamesRaw?: string | null
): string[] {
  const result: string[] = [fullName.trim()];
  if (attendeeCount > 1 && additionalNamesRaw) {
    const extras = additionalNamesRaw
      .split(/[\r\n;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const name of extras) {
      if (result.length < attendeeCount) {
        result.push(name);
      }
    }
  }
  return result;
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

/**
 * Browser form values as produced by react-hook-form. Checkbox inputs carry
 * value="true", so consents arrive as the string "true"; untouched optional
 * selects/textareas arrive as "".
 */
export interface BrowserRegistrationValues {
  eventId: unknown;
  fullName: unknown;
  email: unknown;
  whatsapp: unknown;
  organization: unknown;
  role: unknown;
  attendeeCount: unknown;
  additionalAttendeeNames?: unknown;
  referralSource?: unknown;
  dietaryAccessibilityNotes?: unknown;
  consentContact: unknown;
  consentPaymentTerms: unknown;
  guestVerificationId?: string | null;
  guestEmailVerificationToken?: string | null;
}

/**
 * Coerces browser registration values into the create-order API contract.
 * The order endpoint requires real booleans for consents and rejects empty
 * strings for enum-typed optionals, so this boundary converts "true" to true
 * and "" to undefined. Without it every checkout submission fails with 422.
 */
export function toCreateOrderBody(values: BrowserRegistrationValues): Record<string, unknown> {
  const text = (value: unknown): string => (typeof value === "string" ? value : "");
  const optionalText = (value: unknown): string | undefined => {
    const trimmed = text(value).trim();
    return trimmed ? trimmed : undefined;
  };
  const body: Record<string, unknown> = {
    eventId: text(values.eventId),
    fullName: text(values.fullName),
    email: text(values.email),
    whatsapp: text(values.whatsapp),
    organization: text(values.organization),
    role: text(values.role),
    attendeeCount: Number(values.attendeeCount || 1),
    consentContact: values.consentContact === "true" || values.consentContact === true,
    consentPaymentTerms:
      values.consentPaymentTerms === "true" || values.consentPaymentTerms === true,
  };
  const additionalNames = optionalText(values.additionalAttendeeNames);
  if (additionalNames !== undefined) body.additionalAttendeeNames = additionalNames;
  const referral = optionalText(values.referralSource);
  if (referral !== undefined) body.referralSource = referral;
  const notes = optionalText(values.dietaryAccessibilityNotes);
  if (notes !== undefined) body.dietaryAccessibilityNotes = notes;
  if (values.guestVerificationId) body.guestVerificationId = values.guestVerificationId;
  if (values.guestEmailVerificationToken) {
    body.guestEmailVerificationToken = values.guestEmailVerificationToken;
  }
  return body;
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
  if (!hasExplicitProductionMerchantApproval()) {
    return {
      ok: false as const,
      error: "UPI checkout is unavailable until the production merchant configuration is explicitly approved.",
      status: 503,
    };
  }
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
    consentContact = false,
    consentPaymentTerms = false,
    userId,
    existingGuestToken,
  } = params;

  if (!consentPaymentTerms) {
    return { ok: false as const, error: "You must affirmatively accept the event registration and payment terms.", status: 422 };
  }

  // Enforce Section 11: Validate that every group attendee identity is provided (no placeholder names)
  const attendees = parseAttendeeList(fullName, attendeeCount, additionalAttendeeNames);
  if (attendees.length !== attendeeCount) {
    return {
      ok: false as const,
      error: `Please provide all ${attendeeCount} attendee names. Currently provided: ${attendees.length}.`,
      status: 422,
    };
  }
  if (new Set(attendees.map((name) => name.toLocaleLowerCase("en-IN"))).size !== attendees.length) {
    return {
      ok: false as const,
      error: "Each attendee must have a distinct name.",
      status: 422,
    };
  }

  // 1. Fetch and validate event
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id,title,status,registration_state,starts_at,registration_deadline,admission,registration_mode,price_per_attendee,max_attendees_per_registration,upi_vpa,upi_payee_name,capacity")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return { ok: false as const, error: "Event not found.", status: 404 };
  }

  const now = Date.now();
  if (
    event.status !== "published" ||
    event.admission !== "paid" ||
    event.registration_state !== "open" ||
    Date.parse(event.starts_at) <= now ||
    (event.registration_deadline && Date.parse(event.registration_deadline) <= now)
  ) {
    return { ok: false as const, error: "Registration is not open for this event.", status: 409 };
  }

  if (event.capacity != null) {
    const { count: confirmedCount } = await admin
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .in("status", ["confirmed", "checked_in"]);
    if ((confirmedCount ?? 0) + attendeeCount > event.capacity) {
      return { ok: false as const, error: "Event is sold out or has insufficient capacity.", status: 409 };
    }
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
    admin.from("event_payment_orders").select("id,status,guest_token_hash,user_id,expires_at").eq("event_id", event.id).eq("email", lowerEmail).in("status", ["pending", "processing", "verified", "reconciled"]).limit(5),
    admin.from("paid_event_registrations").select("id,status").eq("event_id", event.id).eq("email", lowerEmail).not("status", "in", "('rejected','cancelled')").limit(5),
    admin.from("event_registrations").select("id,status").eq("event_id", event.id).eq("source_email", lowerEmail).not("status", "in", "('cancelled','revoked')").limit(5),
  ]);

  if ((existingPaidRegs && existingPaidRegs.length > 0) || (existingPasses && existingPasses.length > 0)) {
    return { ok: false as const, error: "You are already registered or confirmed for this event.", status: 409 };
  }

  // Handle existing pending order safely without allowing order takeover
  const activeOrder = existingOrders?.find((o) => o.status === "pending" || o.status === "processing");
  if (activeOrder) {
    const isExpired = activeOrder.expires_at ? new Date(activeOrder.expires_at).getTime() <= now : false;
    if (isExpired) {
      await admin
        .from("event_payment_orders")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", activeOrder.id);
    } else {
      // Order is still active! Verify ownership before allowing resumption
      let isOwner = false;

      // 1) Authenticated user matches order's user_id
      if (userId && activeOrder.user_id && activeOrder.user_id === userId) {
        isOwner = true;
      }

      // 2) Guest presents matching capability token
      if (existingGuestToken && activeOrder.guest_token_hash) {
        const providedHash = hashGuestToken(existingGuestToken);
        if (
          providedHash.length === activeOrder.guest_token_hash.length &&
          timingSafeEqual(Buffer.from(providedHash), Buffer.from(activeOrder.guest_token_hash))
        ) {
          isOwner = true;
        }
      }

      if (isOwner) {
        // Return existing active order details WITHOUT rotating the token
        const { data: fullOrder } = await admin.from("event_payment_orders").select("*").eq("id", activeOrder.id).single();
        if (fullOrder) {
          return {
            ok: true as const,
            order: fullOrder,
            deepLinks: buildPaymentDeepLinks(fullOrder.upi_uri),
            guestCheckoutToken: existingGuestToken,
          };
        }
      } else {
        // Prevent order takeover: unauthenticated visitor cannot access or rotate someone else's order
        return {
          ok: false as const,
          error: "A payment order is already in progress for this email address. Please resume from your active checkout session or wait for it to expire.",
          status: 409,
        };
      }
    }
  }

  // Generate capability token for new guest checkout access
  const guestCheckoutToken = userId ? undefined : generateGuestCheckoutToken();
  const guestTokenHash = guestCheckoutToken ? hashGuestToken(guestCheckoutToken) : null;

  // 3. Calculate amount with exact server-side integer paise arithmetic
  const pricePerAttendeePaise = Math.round(pricePerAttendee * 100);
  const amountPaise = pricePerAttendeePaise * attendeeCount;
  const totalRupees = amountPaise / 100;

  // 4. Generate unique order reference & dynamic UPI URI
  const orderReference = generateOrderReference();
  const upiUri = buildUpiUri({
    vpa: UPI_CONFIG.PAYEE_VPA,
    payeeName: UPI_CONFIG.PAYEE_NAME,
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
      payee_vpa: UPI_CONFIG.PAYEE_VPA,
      payee_name: UPI_CONFIG.PAYEE_NAME,
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
    if (insertError?.code === "23505" || insertError?.message?.includes("idx_active_orders_per_email")) {
      return {
        ok: false as const,
        error: "A payment order is already in progress for this email address. Please resume from your active checkout session or wait for it to expire.",
        status: 409,
      };
    }
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
