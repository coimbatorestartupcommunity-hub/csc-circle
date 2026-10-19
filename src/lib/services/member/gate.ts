import "server-only";

/**
 * Server-enforced boundary for the member portal.
 *
 * The member area is a DEMO/preview until Phase 1 connects real auth + data.
 * This module runs ONLY on the server (import "server-only"), so the decision
 * cannot be flipped from the client, and it does NOT rely on a NEXT_PUBLIC_
 * flag (which would be a client value, not a security control).
 *
 * - In development: the preview is open so the UI can be built and reviewed.
 * - In production: the preview is CLOSED unless the server-only env var
 *   MEMBER_PORTAL_PREVIEW === "true" is explicitly set (e.g. a protected
 *   preview environment). Production visitors otherwise see an "unavailable"
 *   page and never a simulated private member account.
 *
 * `isMemberBackendLive` is always false in Phase 3: no real credentials,
 * memberships, passes or check-ins are issued until Phase 1.
 */

export function isMemberPreviewEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.MEMBER_PORTAL_PREVIEW === "true";
}

/** Whether real, trusted member services are connected. Never true in Phase 3. */
export const isMemberBackendLive = false;

/** True when the UI should visibly mark everything as DEMO (always, pre-Phase 1). */
export const showDemoWatermark = !isMemberBackendLive;
