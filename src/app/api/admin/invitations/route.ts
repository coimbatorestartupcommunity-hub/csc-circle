import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminContext, can } from "@/lib/admin/gate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { roleLabels, rolePermissions, permissionLabels, type AdminRole } from "@/lib/admin/permissions";
import { buildAdminInvitationEmail } from "@/lib/admin/invitation-email";
import { sendCommunityEmail } from "@/lib/notifications/email";
import { classifyEmailFailure } from "@/lib/notifications/failures";

export const instant = false;
const roleSchema = z.enum(["super_admin", "community_admin", "event_manager", "checkin_staff", "finance_reviewer", "content_manager", "tech_admin"]);
const schema = z.object({
  email: z.string().trim().email().max(254),
  role: roleSchema,
  fullName: z.string().trim().max(80).optional().default(""),
  message: z.string().trim().max(500).optional().default(""),
  confirmSuperAdmin: z.boolean().optional().default(false),
});
const dbClient = () => createAdminClient() as unknown as SupabaseClient;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function expireInvitations(db: SupabaseClient) {
  const now = new Date().toISOString();
  const { data: expired } = await db.from("admin_role_invitations").update({ status: "expired", updated_at: now })
    .eq("status", "pending").lte("expires_at", now).select("id,role");
  if (expired?.length) await db.from("audit_logs").insert(expired.map((row) => ({
    action: "admin.invitation.expired", actor_id: null, actor_role: "system", target_type: "admin_role_invitation", target_id: row.id,
    after: { role: row.role, status: "expired" }, correlation_id: randomUUID(),
  })));
}

async function sendInvitation(input: { id: string; email: string; role: AdminRole; token: string; expiresAt: Date; fullName: string; message: string }) {
  let invitationUrl: string | null = null;
  try {
    const email = buildAdminInvitationEmail(input);
    invitationUrl = email.invitationUrl;
    const result = await sendCommunityEmail({
      to: input.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
      notificationId: input.id,
    });
    return { accepted: true as const, messageId: result.messageId ?? null, invitationUrl };
  } catch (error) {
    return { accepted: false as const, category: classifyEmailFailure(error).code, invitationUrl };
  }
}

async function findVerifiedAccount(admin: SupabaseClient, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === email && Boolean(user.email_confirmed_at));
    if (match) return match.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

export async function GET() {
  const context = await getAdminContext();
  if (context.mode !== "live" || !can(context, "roles.manage")) return authResponse({ error: "Administrator role management access required." }, 403);
  if (!rateLimit(`admin-invitations:list:${context.userId}`, 30, 60_000).allowed) return authResponse({ error: "Too many requests." }, 429);

  const db = dbClient();
  await expireInvitations(db);
  const { data: invitations, error } = await db.from("admin_role_invitations")
    .select("id,invitee_email,invitee_name,role,invited_by,status,delivery_status,delivery_attempts,last_delivery_error,expires_at,sent_at,accepted_at,accepted_by,revoked_at,created_at,updated_at,invitation_message")
    .order("created_at", { ascending: false }).limit(200);
  if (error) return authResponse({ error: "Administrator invitations could not be loaded." }, 503);

  const inviterIds = [...new Set((invitations ?? []).map((row) => row.invited_by as string))];
  const inviterNames = new Map<string, string>();
  const acceptedNames = new Map<string, string>();
  const acceptedIds = [...new Set((invitations ?? []).map((row) => row.accepted_by as string | null).filter((id): id is string => !!id))];
  const admin = createAdminClient();
  const [inviterUsers, acceptedUsers] = await Promise.all([
    Promise.all(inviterIds.slice(0, 100).map(async (id) => [id, await admin.auth.admin.getUserById(id)] as const)),
    Promise.all(acceptedIds.slice(0, 100).map(async (id) => [id, await admin.auth.admin.getUserById(id)] as const)),
  ]);
  for (const [id, result] of inviterUsers) {
    const user = result.data.user;
    inviterNames.set(id, typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user?.email ?? "CSC administrator");
  }
  for (const [id, result] of acceptedUsers) {
    const user = result.data.user;
    acceptedNames.set(id, typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user?.email ?? "Verified administrator");
  }

  return authResponse({
    roles: roleSchema.options.map((role) => ({
      id: role,
      label: roleLabels[role],
      permissions: rolePermissions[role].map((permission) => ({ id: permission, label: permissionLabels[permission] })),
    })),
    invitations: (invitations ?? []).map((row) => ({
      id: row.id,
      email: row.invitee_email,
      fullName: row.invitee_name,
      role: row.role,
      roleLabel: roleLabels[row.role as AdminRole],
      invitedBy: inviterNames.get(row.invited_by as string) ?? "CSC administrator",
      status: row.status,
      deliveryStatus: row.delivery_status,
      attempts: row.delivery_attempts,
      deliveryIssue: row.last_delivery_error,
      expiresAt: row.expires_at,
      sentAt: row.sent_at,
      acceptedAt: row.accepted_at,
      acceptedBy: row.accepted_by ? acceptedNames.get(row.accepted_by as string) ?? "Verified administrator" : null,
      revokedAt: row.revoked_at,
      createdAt: row.created_at,
      message: row.invitation_message,
    })),
  });
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (context.mode !== "live" || !context.userId || !can(context, "roles.manage")) return authResponse({ error: "Administrator role management access required." }, 403);
  if (!rateLimit(`admin-invitations:create:${context.userId}:${clientIp(request)}`, 10, 60 * 60_000).allowed) return authResponse({ error: "Invitation limit reached. Try again later." }, 429);
  const body = await readAuthBody(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return authResponse({ error: "Enter a valid email address and administrator role." }, 422);
  const input = parsed.data;
  if (input.role === "super_admin" && !input.confirmSuperAdmin) return authResponse({ error: "Confirm the high-privilege Super Admin invitation before continuing." }, 422);
  if (input.role === "super_admin") {
    const sessionClient = await createClient();
    const { data: claims } = await sessionClient.auth.getClaims();
    const rawClaims = (claims?.claims ?? {}) as Record<string, unknown>;
    // Supabase does not issue an `auth_time` claim. The real last-authentication
    // time is the latest `amr` timestamp (set at sign-in and preserved across
    // token refreshes); fall back to the token `iat` if amr is unavailable.
    const amr = rawClaims.amr;
    const amrTimes = Array.isArray(amr)
      ? amr.map((entry) => Number((entry as { timestamp?: unknown })?.timestamp ?? 0)).filter((value) => Number.isFinite(value) && value > 0)
      : [];
    const lastAuthTime = amrTimes.length ? Math.max(...amrTimes) : Number(rawClaims.iat ?? 0);
    const aal = rawClaims.aal;
    if (aal !== "aal2" && (!lastAuthTime || Date.now() / 1000 - lastAuthTime > 10 * 60)) {
      return authResponse({ error: "For Super Admin invitations, sign in again and send within 10 minutes, or complete MFA." }, 403);
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  const email = input.email.trim().toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const id = randomUUID();
  const db = dbClient();
  await expireInvitations(db);

  const { data: row, error: insertError } = await db.from("admin_role_invitations").insert({
    id,
    invitee_email: input.email.trim(),
    invitee_name: input.fullName || null,
    normalized_email: email,
    role: input.role,
    token_hash: hashToken(token),
    invited_by: context.userId,
    status: "pending",
    delivery_status: "sending",
    delivery_attempts: 1,
    expires_at: expiresAt.toISOString(),
    invitation_message: input.message || null,
  }).select("id").single();
  if (insertError || !row) {
    return authResponse({ error: insertError?.code === "23505" ? "A pending invitation already exists for this email. Review it below or revoke it first." : "The invitation could not be created." }, insertError?.code === "23505" ? 409 : 503);
  }

  const admin = createAdminClient() as unknown as SupabaseClient;
  const inviteeId = await findVerifiedAccount(admin, email);
  if (inviteeId) {
    const { error: inboxError } = await db.from("notifications").insert({
      type: "admin.invitation.received",
      channel: "in_app",
      recipient: email,
      recipient_user_id: inviteeId,
      audience: "member",
      related_record_type: "admin_role_invitations",
      related_record_id: id,
      title: "Administrator invitation received",
      message: `You have been invited to join the CSC Circle administration team as ${roleLabels[input.role]}. Review the role and accept using this verified account.`,
      action_url: `/admin/accept-invitation?invitationId=${encodeURIComponent(id)}`,
      payload: { role: input.role, expiresAt: expiresAt.toISOString() },
      dedupe_key: `admin.invitation:${id}`,
      status: "available",
      delivered_at: new Date().toISOString(),
    });
    if (inboxError) {
      await db.from("audit_logs").insert({
        action: "admin.invitation.in_app_notification_failed", actor_id: context.userId,
        actor_role: "super_admin", target_type: "admin_role_invitation", target_id: id,
        after: { role: input.role, recipientAccountMatched: true }, correlation_id: randomUUID(),
      });
    }
  }

  const delivery = await sendInvitation({ id, email, role: input.role, token, expiresAt, fullName: input.fullName, message: input.message });
  const deliveryState = delivery.accepted
    ? { delivery_status: "smtp_accepted", last_delivery_error: null, sent_at: new Date().toISOString() }
    : { delivery_status: "failed", last_delivery_error: delivery.category };
  const { error: updateError } = await db.from("admin_role_invitations").update({ ...deliveryState, updated_at: new Date().toISOString() }).eq("id", id);
  await db.from("audit_logs").insert({
    action: delivery.accepted ? "admin.invitation.created" : "admin.invitation.delivery_failed",
    actor_id: context.userId,
    actor_role: "super_admin",
    target_type: "admin_role_invitation",
    target_id: id,
    after: { email, role: input.role, status: "pending", deliveryStatus: delivery.accepted ? "smtp_accepted" : "failed" },
    correlation_id: randomUUID(),
  });
  if (updateError) return authResponse({ error: "The invitation was created, but its delivery state could not be recorded. Refresh the invitation list before retrying." }, 503);
  if (!delivery.accepted) return authResponse({ ok: false, invitationId: id, invitationUrl: delivery.invitationUrl, error: "The invitation is saved, but SMTP did not accept the email. You can still copy the link below and share it manually, or use Retry from the invitation list." }, 503);
  return authResponse({ ok: true, invitationId: id, deliveryStatus: "smtp_accepted", invitationUrl: delivery.invitationUrl }, 201);
}
