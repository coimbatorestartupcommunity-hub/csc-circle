/**
 * QR payload construction for member credentials.
 *
 * Payloads carry ONLY an opaque verification token (resolved server-side in
 * Phase 1) plus a type + version discriminator. They never contain email,
 * phone, names, database ids, keys, or any raw personal data. Membership and
 * event-access credentials are deliberately distinct types.
 */

export type QrCredentialType = "csc.membership" | "csc.eventpass";

export interface QrPayload {
  t: QrCredentialType;
  v: 1;
  /** Opaque token only. */
  ref: string;
}

export function buildMembershipQrPayload(token: string): string {
  const payload: QrPayload = { t: "csc.membership", v: 1, ref: token };
  return JSON.stringify(payload);
}

export function buildEventPassQrPayload(token: string): string {
  const payload: QrPayload = { t: "csc.eventpass", v: 1, ref: token };
  return JSON.stringify(payload);
}

/** Fields that must never appear in a QR payload (used by tests). */
export const forbiddenQrSubstrings = ["@", "email", "phone", "whatsapp"];

/** True if the serialized payload leaks none of the forbidden substrings. */
export function qrPayloadIsOpaque(serialized: string): boolean {
  const lower = serialized.toLowerCase();
  return !forbiddenQrSubstrings.some((f) => lower.includes(f));
}
