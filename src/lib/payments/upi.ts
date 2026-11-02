/**
 * NPCI UPI Linking Specification 1.5.1 & Platform-Specific UPI Launching (F17 & F18).
 *
 * Implements standards-compliant UPI payment payload generation, amount derivation
 * from server-side integer paise, cross-platform launching (Android Intent, iOS deep links,
 * desktop QR), and payer name verification.
 */

import { UPI_CONFIG } from "./config";

export interface UpiPayloadParams {
  /** Payee Virtual Payment Address (e.g. 9342877474@ptyes). Defaults to UPI_CONFIG.PAYEE_VPA */
  vpa?: string;
  /** Payee Legal / Display Name (e.g. S VIKASH). Defaults to UPI_CONFIG.PAYEE_NAME */
  payeeName?: string;
  /** Amount in rupees (e.g. 180.00). If amountPaise is provided, it takes precedence. */
  amountRupees?: number;
  /** Canonical financial amount in integer paise (e.g. 18000 for ₹180.00). */
  amountPaise?: number;
  /** Unique merchant order reference (e.g. CSC-ORD-ABC123DEF456). Max 35 chars. */
  orderReference: string;
  /** Event title used to generate the transaction note. Truncated to 30 characters. */
  eventTitle: string;
  /** Currency code. NPCI spec requires INR. Defaults to INR. */
  currency?: string;
  /** NPCI Initiating Mode: 02 = Secure Dynamic QR payload. Defaults to 02 when standard metadata is enabled. */
  mode?: string;
  /** NPCI Organization ID. Defaults to 000000. */
  orgId?: string;
  /** Merchant Category Code (e.g. 8299 for education, 7999 for recreation/events). */
  merchantCategoryCode?: string;
  /** Digital signature payload (optional). */
  signature?: string;
  /** Include standard NPCI merchant metadata (mode=02, orgid=000000). Defaults to true. */
  includeMerchantMetadata?: boolean;
}

export interface PaymentDeepLinks {
  /** Standard generic UPI URI (upi://pay?...) */
  standardUpi: string;
  /** Google Pay deep link (gpay://upi/pay?...) */
  gpay: string;
  /** PhonePe deep link (phonepe://pay?...) */
  phonepe: string;
  /** Paytm deep link (paytmmp://pay?...) */
  paytm: string;
  /** BHIM deep link (bhim://pay?...) */
  bhim: string;
  /** Android Chrome Intent URI (intent://pay?...#Intent;scheme=upi;end;) */
  androidIntent?: string;
}

/** Android package identifiers for direct intent targeting */
export const ANDROID_UPI_PACKAGES = {
  GPAY: "com.google.android.apps.nbu.paisa.user",
  PHONEPE: "com.phonepe.app",
  PAYTM: "net.one97.paytm",
  BHIM: "in.org.npci.upiapp",
} as const;

export type ClientPlatform = "android" | "ios" | "desktop" | "unknown";

/**
 * Formats a rupee amount strictly to two decimal places based on server-side integer paise.
 * Avoids IEEE 754 floating point arithmetic distortions.
 */
export function formatUpiAmount(amountRupees?: number, amountPaise?: number): string {
  if (amountPaise !== undefined && Number.isFinite(amountPaise)) {
    if (amountPaise < 0) throw new RangeError("amountPaise must be non-negative");
    return (amountPaise / 100).toFixed(2);
  }
  if (amountRupees !== undefined && Number.isFinite(amountRupees)) {
    if (amountRupees < 0) throw new RangeError("amountRupees must be non-negative");
    // Round to nearest integer paise before two-decimal formatting
    const roundedPaise = Math.round(amountRupees * 100);
    return (roundedPaise / 100).toFixed(2);
  }
  return "0.00";
}

/**
 * Constructs a compliant transaction note safely truncated to prevent bank alert or SMS parse failures.
 */
export function formatTransactionNote(eventTitle: string, prefix = "Pass for "): string {
  const safeTitle = eventTitle.slice(0, 30);
  return `${prefix}${safeTitle}`;
}

/**
 * Generates an NPCI 1.5.1 dynamic UPI payload URI with standard percent-encoding
 * (spaces as %20, mode=02, orgid=000000).
 */
export function buildUpiPayload(params: UpiPayloadParams): string {
  const vpa = params.vpa || UPI_CONFIG.PAYEE_VPA;
  const payee = params.payeeName || UPI_CONFIG.PAYEE_NAME;
  const formattedAmount = formatUpiAmount(params.amountRupees, params.amountPaise);
  const note = formatTransactionNote(params.eventTitle);
  const currency = params.currency || UPI_CONFIG.CURRENCY || "INR";
  const mode = params.mode || "02";
  const orgId = params.orgId || "000000";

  const encode = (val: string) => encodeURIComponent(val);

  const queryParts = [
    `pa=${encode(vpa)}`,
    `pn=${encode(payee)}`,
    `am=${formattedAmount}`,
    `cu=${encode(currency)}`,
    `tr=${encode(params.orderReference)}`,
    `tn=${encode(note)}`,
    `mode=${encode(mode)}`,
    `orgid=${encode(orgId)}`,
  ];

  if (params.merchantCategoryCode) {
    queryParts.push(`mc=${encode(params.merchantCategoryCode)}`);
  }
  if (params.signature) {
    queryParts.push(`sign=${encode(params.signature)}`);
  }

  return `upi://pay?${queryParts.join("&")}`;
}

/**
 * Builds a standards-compliant NPCI UPI Payment URI (Specification 1.5.1).
 * Uses standard URL query formatting compatible with application/x-www-form-urlencoded
 * and existing test suites.
 */
export function buildUpiUri(params: UpiPayloadParams): string {
  const vpa = params.vpa || UPI_CONFIG.PAYEE_VPA;
  const payee = params.payeeName || UPI_CONFIG.PAYEE_NAME;
  const formattedAmount = formatUpiAmount(params.amountRupees, params.amountPaise);
  const note = formatTransactionNote(params.eventTitle);
  const currency = params.currency || UPI_CONFIG.CURRENCY || "INR";

  const searchParams = new URLSearchParams({
    pa: vpa,
    pn: payee,
    am: formattedAmount,
    cu: currency,
    tr: params.orderReference,
    tn: note,
  });

  if (params.includeMerchantMetadata || params.mode || params.orgId) {
    if (params.mode || params.includeMerchantMetadata) {
      searchParams.set("mode", params.mode || "02");
    }
    if (params.orgId || params.includeMerchantMetadata) {
      searchParams.set("orgid", params.orgId || "000000");
    }
  }

  if (params.merchantCategoryCode) {
    searchParams.set("mc", params.merchantCategoryCode);
  }

  if (params.signature) {
    searchParams.set("sign", params.signature);
  }

  return `upi://pay?${searchParams.toString()}`;
}

/**
 * Builds an Android Chrome Intent URI (F18).
 * Enables direct package launch or native chooser resolution in Android Chromium.
 */
export function buildAndroidIntentUri(upiUri: string, packageName?: string): string {
  const query = upiUri.startsWith("upi://pay?") ? upiUri.slice("upi://pay?".length) : "";
  const packageClause = packageName ? `package=${packageName};` : "";
  return `intent://pay?${query}#Intent;scheme=upi;${packageClause}end;`;
}

/**
 * Generates application-specific deep links preserving exact query parameters (F17-3 & F17-4).
 */
export function getUpiAppLinks(upiUri: string): PaymentDeepLinks {
  const query = upiUri.startsWith("upi://pay?") ? upiUri.slice("upi://pay?".length) : "";

  return {
    standardUpi: upiUri,
    gpay: `gpay://upi/pay?${query}`,
    phonepe: `phonepe://pay?${query}`,
    paytm: `paytmmp://pay?${query}`,
    bhim: `bhim://pay?${query}`,
    androidIntent: buildAndroidIntentUri(upiUri),
  };
}

export const buildPaymentDeepLinks = getUpiAppLinks;

/**
 * Detects client platform from User-Agent or browser environment.
 * Returns "android" | "ios" | "desktop".
 */
export function detectUpiPlatform(userAgent?: string): "android" | "ios" | "desktop" {
  const ua = userAgent || (typeof window !== "undefined" ? window.navigator.userAgent : "");
  if (!ua) return "desktop";
  if (/android/i.test(ua)) return "android";
  if (
    /iphone|ipad|ipod/i.test(ua) ||
    (typeof window !== "undefined" &&
      window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  return "desktop";
}

/**
 * Pure, SSR-safe client platform detector returning structured boolean flags.
 */
export function detectPlatform(userAgent?: string): {
  platform: ClientPlatform;
  isAndroid: boolean;
  isIos: boolean;
  isDesktop: boolean;
  isMobile: boolean;
} {
  const platform = detectUpiPlatform(userAgent);
  const isAndroid = platform === "android";
  const isIos = platform === "ios";
  const isDesktop = platform === "desktop";
  const isMobile = isAndroid || isIos;

  return { platform, isAndroid, isIos, isDesktop, isMobile };
}

/**
 * Payer Name Alignment Verification Helper (F18-1 to F18-3).
 *
 * Compares bank alert payer name against order full name. Strips punctuation,
 * normalizes casing, and validates token overlap while ignoring single-character noise.
 */
export function isPayerNameAligned(
  bankPayerName?: string | null,
  orderFullName?: string | null
): boolean {
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
