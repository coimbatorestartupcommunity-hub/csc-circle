import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export interface NormalizedPhoneResult {
  valid: boolean;
  e164: string | null;
  /** Digits only international number (e.g. "919876543210") without "+" */
  internationalDigits: string | null;
  countryCode: string | null;
  chatId: string | null;
  formatted: string | null;
  error?: string;
}

const DEFAULT_COUNTRY: CountryCode = "IN";

/**
 * Normalizes and validates incoming phone numbers using libphonenumber-js.
 * Handles local numbers, international numbers with/without +, leading zeroes,
 * and formats the final OpenWA chat identifier (`{digits}@c.us`).
 */
export function normalizePhoneNumber(
  rawPhone: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY
): NormalizedPhoneResult {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      valid: false,
      e164: null,
      internationalDigits: null,
      countryCode: null,
      chatId: null,
      formatted: null,
      error: "Phone number is required",
    };
  }

  // Strip obvious white spaces, tabs, and common separator characters
  let cleaned = rawPhone.trim();

  // If user passed a number already ending with @c.us or @s.whatsapp.net, strip suffix for validation
  if (cleaned.includes("@")) {
    cleaned = cleaned.split("@")[0].trim();
  }

  // Try parsing with default country
  let parsed = parsePhoneNumberFromString(cleaned, defaultCountry);

  // If initial parse fails and doesn't start with '+', attempt cleaning leading zero or local prefix
  if ((!parsed || !parsed.isValid()) && !cleaned.startsWith("+")) {
    // Check if it's an Indian 10-digit number with leading zero e.g. "09876543210"
    if (defaultCountry === "IN" && cleaned.startsWith("0") && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
      parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
    }
  }

  if (!parsed || !parsed.isValid()) {
    return {
      valid: false,
      e164: null,
      internationalDigits: null,
      countryCode: null,
      chatId: null,
      formatted: null,
      error: "Invalid phone number format or unreachable country code",
    };
  }

  const e164 = parsed.format("E.164"); // e.g. "+919876543210"
  const internationalDigits = e164.replace(/^\+/, ""); // "919876543210"
  const chatId = `${internationalDigits}@c.us`; // "919876543210@c.us"
  const formatted = parsed.formatInternational(); // e.g. "+91 98765 43210"
  const countryCode = parsed.country || null;

  return {
    valid: true,
    e164,
    internationalDigits,
    countryCode,
    chatId,
    formatted,
  };
}

/**
 * Safely masks a phone number for logging and diagnostic output.
 * Never outputs full phone numbers in system logs.
 * Example: "+91 98765 43210" -> "+91 98765 ****0"
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "[EMPTY]";
  const str = String(phone).trim();
  if (str.length <= 4) return "***";
  const start = str.slice(0, Math.min(6, str.length - 2));
  const end = str.slice(-2);
  return `${start}****${end}`;
}
