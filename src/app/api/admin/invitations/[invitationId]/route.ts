import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { type AdminRole } from "@/lib/admin/permissions";
import { buildAdminInvitationEmail } from "@/lib/admin/invitation-email";
import { sendCommunityEmail } from "@/lib/notifications/email";
import { classifyEmailFailure } from "@/lib/notifications/failures";

export const instant = false;
const schema = z.object({ action: z.enum(["resend", "revoke"]) });
const dbClient = () => createAdminClient() as unknown as SupabaseClient;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(request: Request, context: { params: Promise<{ invitationId: string }> }) {
  const adminContext = await getAdminContext();
  if (adminContext.mode !== "live" || !adminContext.userId || !can(adminContext, "roles.manage")) return authResponse({ error: "Administrator role management access required." }, 403);
  if (!rateLimit(`admin-invitations:action:${adminContext.userId}:${clientIp(request)}`, 10, 60 * 60_000).allowed) return authResponse({ error: "Invitation action limit reached. Try again later." }, 429);
  const { invitationId } = await context.params;
  if (!z.string().uuid().safeParse(invitationId).success) return authResponse({ error: "Invitation not found." }, 404);
  const body = await readAuthBody(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return authResponse({ error: "Select a valid invitation action." }, 422);
  const db = dbClient();
  const { data: invitation, error } = await db.from("admin_role_invitations").select("id,invitee_email,invitee_name,role,status,delivery_status,delivery_attempts,expires_at,updated_at,invitation_message").eq("id", invitationId).maybeSingle();
  if (error || !invitation) return authResponse({ error: "Invitation not found." }, 404);

  if (parsed.data.action === "revoke") {
    if (invitation.status !== "pending") return authResponse({ error: "Only pending invitations can be revoked." }, 409);
    const now = new Date().toISOString();
    const { data: revoked, error: revokeError } = await db.from("admin_role_invitations").update({ status: "revoked", revoked_at: now, revoked_by: adminContext.userId, updated_at: now }).eq("id", invitationId).eq("status", "pending").select("id").maybeSingle();
    if (revokeError || !revoked) return authResponse({ error: "This invitation changed while you were working. Refresh its status before trying again." }, 409);
    await db.from("audit_logs").insert({ action: "admin.invitation.revoked", actor_id: adminContext.userId, actor_role: "super_admin", target_type: "admin_role_invitation", target_id: invitationId, before: { status: "pending", role: invitation.role }, after: { status: "revoked" }, correlation_id: randomUUID() });
    return authResponse({ ok: true, status: "revoked" });
  }

  if (invitation.status !== "pending") return authResponse({ error: "Only pending invitations can be resent. Create a new invitation for this account." }, 409);
  const now = new Date();
  if (new Date(invitation.expires_at as string) <= now) {
    const { data: expired } = await db.from("admin_role_invitations").update({ status: "expired", updated_at: now.toISOString() }).eq("id", invitationId).eq("status", "pending").select("id").maybeSingle();
    if (expired) await db.from("audit_logs").insert({ action: "admin.invitation.expired", actor_id: null, actor_role: "system", target_type: "admin_role_invitation", target_id: invitationId, after: { role: invitation.role, status: "expired" }, correlation_id: randomUUID() });
    return authResponse({ error: "This invitation has expired. Create a fresh invitation." }, 409);
  }
  if (invitation.delivery_status === "sending" && now.getTime() - new Date(invitation.updated_at as string).getTime() < 5 * 60_000) {
    return authResponse({ error: "An invitation email is already being processed. Wait a few minutes, refresh status, then retry if needed." }, 409);
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  const nextAttempts = Number(invitation.delivery_attempts ?? 0) + 1;
  const { data: rotated, error: rotateError } = await db.from("admin_role_invitations").update({ token_hash: hashToken(token), delivery_status: "sending", delivery_attempts: nextAttempts, last_delivery_error: null, expires_at: expiresAt.toISOString(), updated_at: now.toISOString() }).eq("id", invitationId).eq("status", "pending").eq("delivery_status", invitation.delivery_status).eq("updated_at", invitation.updated_at).select("id").maybeSingle();
  if (rotateError || !rotated) return authResponse({ error: "This invitation changed while you were working. Refresh the invitation list before trying again." }, 409);

  let delivery: { accepted: true } | { accepted: false; category: string };
  try {
    const email = buildAdminInvitationEmail({ id: invitationId, token, role: invitation.role as AdminRole, expiresAt, fullName: (invitation.invitee_name as string | null) ?? "", message: (invitation.invitation_message as string | null) ?? "" });
    await sendCommunityEmail({ to: invitation.invitee_email as string, subject: email.subject, text: email.text, html: email.html, notificationId: invitationId });
    delivery = { accepted: true };
  } catch (cause) {
    delivery = { accepted: false, category: classifyEmailFailure(cause).code };
  }
  const { data: delivered, error: deliveryError } = await db.from("admin_role_invitations").update({
    delivery_status: delivery.accepted ? "smtp_accepted" : "failed",
    delivery_attempts: nextAttempts,
    last_delivery_error: delivery.accepted ? null : delivery.category,
    sent_at: delivery.accepted ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", invitationId).eq("delivery_status", "sending").eq("updated_at", now.toISOString()).select("id,status").maybeSingle();
  await db.from("audit_logs").insert({ action: delivery.accepted ? "admin.invitation.resent" : "admin.invitation.delivery_failed", actor_id: adminContext.userId, actor_role: "super_admin", target_type: "admin_role_invitation", target_id: invitationId, after: { role: invitation.role, deliveryStatus: delivery.accepted ? "smtp_accepted" : "failed", attempt: nextAttempts }, correlation_id: randomUUID() });
  if (deliveryError || !delivered) return authResponse({ error: "The email was processed, but its delivery result could not be recorded. Refresh status before retrying." }, 503);
  return delivery.accepted
    ? authResponse({ ok: true, deliveryStatus: "smtp_accepted" })
    : authResponse({ ok: false, error: "SMTP did not accept the invitation email. The invitation remains inactive until delivery succeeds." }, 503);
}
