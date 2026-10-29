// @vitest-environment node
import { afterAll, expect, it } from "vitest";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { dispatchNotifications } from "@/lib/notifications/dispatcher";
import { buildAdminInvitationEmail } from "@/lib/admin/invitation-email";
import { sendCommunityEmail } from "@/lib/notifications/email";

const run = process.env.CSC_RUN_LOCAL_EMAIL_INTEGRATION === "true";
const testIds: string[] = [];
const heldJobs: string[] = [];
const mailIds: string[] = [];
const authUserIds: string[] = [];
const invitationIds: string[] = [];
const appNotificationIds: string[] = [];
function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}
const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const localKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabase = run ? createClient(localUrl, localKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const authClient = run ? createClient(localUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", { auth: { persistSession: false, autoRefreshToken: false } }) : null;

async function captureFor(email: string) {
  const sink = process.env.CSC_TEST_MAIL_SINK_URL ?? "";
  const messagesUrl = new URL("/api/v1/messages", sink);
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(messagesUrl, { cache: "no-store" });
    if (response.ok) {
      const result = await response.json() as { messages?: Array<{ ID: string; Subject?: string; To?: Array<{ Address: string }> }> };
      const found = (result.messages ?? []).filter((message) => message.To?.some((to) => to.Address.toLowerCase() === email.toLowerCase()));
      if (found.length) {
        mailIds.push(...found.map(({ ID }) => ID));
        const detailResponse = await fetch(new URL(`/api/v1/message/${found[0]!.ID}`, sink), { cache: "no-store" });
        if (detailResponse.ok) return await detailResponse.json() as { Subject: string; Text: string; HTML: string };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Synthetic local email was not captured by the local inbox.");
}

afterAll(async () => {
  const sink = process.env.CSC_TEST_MAIL_SINK_URL;
  if (sink && mailIds.length) await fetch(new URL("/api/v1/messages", sink), {
    method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ IDs: mailIds }),
  });
  if (!supabase) return;
  if (appNotificationIds.length) await supabase.from("notifications").delete().in("id", appNotificationIds);
  if (invitationIds.length) {
    await supabase.from("audit_logs").delete().in("target_id", invitationIds);
    await supabase.from("admin_role_invitations").delete().in("id", invitationIds);
  }
  if (authUserIds.length) {
    const owned = await supabase.from("notifications").select("id").in("recipient_user_id", authUserIds);
    if (owned.error) throw new Error("Could not inspect local Auth-generated notifications during fixture cleanup.");
    const ownedIds = (owned.data ?? []).map(({ id }) => id);
    if (ownedIds.length) {
      const deliveries = await supabase.from("notification_deliveries").delete().in("notification_id", ownedIds);
      if (deliveries.error) throw new Error("Could not clean local Auth notification delivery records.");
      const notifications = await supabase.from("notifications").delete().in("id", ownedIds);
      if (notifications.error) throw new Error("Could not clean local Auth-generated notifications.");
    }
    await supabase.from("admin_roles").delete().in("user_id", authUserIds);
    await supabase.from("audit_logs").delete().in("actor_id", authUserIds);
    for (const userId of authUserIds) await supabase.auth.admin.deleteUser(userId);
  }
  if (testIds.length) {
    await supabase.from("notification_deliveries").delete().in("notification_id", testIds);
    await supabase.from("notifications").delete().in("id", testIds);
  }
  if (heldJobs.length) {
    for (const ids of chunks(heldJobs, 50)) {
      const restored = await supabase.from("notifications").update({ available_at: new Date().toISOString() }).in("id", ids);
      if (restored.error) throw new Error("Could not restore local queued email jobs after isolated delivery test.");
    }
  }
});

it.skipIf(!run)("validates current member session, email/membership state, and logout revocation", async () => {
  if (!supabase || !authClient) throw new Error("Local Supabase clients are unavailable.");
  const email = `csc-phase4-session-check-${randomUUID().slice(0, 12)}@example.test`;
  const password = `S8!${randomUUID()}secure`;
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  if (!created.data.user) throw new Error("Local synthetic member was not created.");
  authUserIds.push(created.data.user.id);
  const membership = await supabase.from("memberships").update({
    status: "active",
    member_number: `CSC-SESSION-${randomUUID().slice(0, 12)}`,
    issued_at: new Date().toISOString(),
  }).eq("user_id", created.data.user.id);
  expect(membership.error).toBeNull();

  const client = createClient(localUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await client.auth.signInWithPassword({ email, password });
  expect(login.error).toBeNull();
  expect(login.data.session).toBeTruthy();
  const accessToken = login.data.session!.access_token;
  const allowed = await client.rpc("csc_validate_member_session");
  expect(allowed.error).toBeNull();
  expect(allowed.data).toBe(true);

  const otherEmail = `csc-phase4-other-${randomUUID().slice(0, 8)}@example.test`;
  const other = await supabase.auth.admin.createUser({
    email: otherEmail,
    password: `S8!${randomUUID()}secure`,
    email_confirm: true,
  });
  expect(other.error).toBeNull();
  if (!other.data.user) throw new Error("Second local test identity was not created.");
  authUserIds.push(other.data.user.id);
  const ownNotificationId = randomUUID();
  const otherNotificationId = randomUUID();
  const notifications = await supabase.from("notifications").insert([
    { id: ownNotificationId, type: "claim.active", channel: "in_app", recipient_user_id: created.data.user.id,
      recipient: created.data.user.id, audience: "member", title: "Own notice", message: "Synthetic own notice",
      action_url: "/member/id-card", status: "available", delivered_at: new Date().toISOString() },
    { id: otherNotificationId, type: "claim.active", channel: "in_app", recipient_user_id: other.data.user.id,
      recipient: other.data.user.id, audience: "member", title: "Private other notice", message: "Must not leak",
      action_url: "/member/id-card", status: "available", delivered_at: new Date().toISOString() },
  ]);
  expect(notifications.error).toBeNull();
  appNotificationIds.push(ownNotificationId, otherNotificationId);
  const inbox = await client.rpc("csc_member_notification_inbox");
  expect(inbox.error).toBeNull();
  expect(inbox.data).toMatchObject({
    items: [expect.objectContaining({ id: ownNotificationId, title: "Own notice" })],
    unreadCount: 1,
  });
  expect(JSON.stringify(inbox.data)).not.toContain("Private other notice");

  await client.auth.signOut({ scope: "local" });
  const verifiedStaleClaims = await client.auth.getClaims(accessToken);
  expect(verifiedStaleClaims.error).toBeNull();
  expect(verifiedStaleClaims.data?.claims?.sub).toBe(created.data.user.id);
  const staleSessionCheck = await fetch(`${localUrl}/rest/v1/rpc/csc_validate_member_session`, {
    method: "POST",
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  expect(staleSessionCheck.ok).toBe(true);
  expect(await staleSessionCheck.json()).toBe(false);
  const staleInbox = await fetch(`${localUrl}/rest/v1/rpc/csc_member_notification_inbox`, {
    method: "POST",
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  expect(staleInbox.ok).toBe(true);
  expect(await staleInbox.json()).toBeNull();

  const secondLogin = await authClient.auth.signInWithPassword({ email, password });
  expect(secondLogin.error).toBeNull();
  const suspended = await supabase.from("memberships").update({ status: "suspended" }).eq("user_id", created.data.user.id);
  expect(suspended.error).toBeNull();
  const suspendedCheck = await authClient.rpc("csc_validate_member_session");
  expect(suspendedCheck.error).toBeNull();
  expect(suspendedCheck.data).toBe(false);
  await authClient.auth.signOut({ scope: "local" });
}, 30_000);

it.skipIf(!run)("captures local Supabase Auth signup confirmation, recovery, email change, and invitation messages", async () => {
  if (!supabase || !authClient) throw new Error("Local Supabase clients are unavailable.");
  const suffix = randomUUID().slice(0, 12);
  const signupEmail = `csc-auth-signup-${suffix}@example.test`;
  const signup = await authClient.auth.signUp({ email: signupEmail, password: `S9!${randomUUID()}secure` });
  expect(signup.error).toBeNull();
  expect(signup.data.user).toBeTruthy();
  if (signup.data.user) authUserIds.push(signup.data.user.id);
  expect((await captureFor(signupEmail)).Text.toLowerCase()).toMatch(/confirm|verify/);

  const recoveryEmail = `csc-auth-recovery-${suffix}@example.test`;
  const recoveryPassword = `P8!${randomUUID()}secure`;
  const created = await supabase.auth.admin.createUser({ email: recoveryEmail, password: recoveryPassword, email_confirm: true });
  expect(created.error).toBeNull();
  if (created.data.user) authUserIds.push(created.data.user.id);
  const recoveryClient = createClient(localUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
  const recoverySignIn = await recoveryClient.auth.signInWithPassword({ email: recoveryEmail, password: recoveryPassword });
  expect(recoverySignIn.error).toBeNull();
  const recovery = await recoveryClient.auth.resetPasswordForEmail(recoveryEmail, { redirectTo: "http://localhost:3107/reset-password" });
  expect(recovery.error).toBeNull();
  expect((await captureFor(recoveryEmail)).Text.toLowerCase()).toMatch(/reset|password/);
  const changedEmail = `csc-auth-changed-${suffix}@example.test`;
  const changed = await recoveryClient.auth.updateUser({ email: changedEmail });
  expect(changed.error).toBeNull();
  expect((await captureFor(changedEmail)).Text.toLowerCase()).toMatch(/confirm|change|email/);

  const invitedEmail = `csc-auth-invite-${suffix}@example.test`;
  const invite = await supabase.auth.admin.inviteUserByEmail(invitedEmail, { redirectTo: "http://localhost:3107" });
  expect(invite.error).toBeNull();
  if (invite.data.user) authUserIds.push(invite.data.user.id);
  expect((await captureFor(invitedEmail)).Text.toLowerCase()).toMatch(/invitation|invite|accept/);
});

it.skipIf(!run)("accepts every invited admin role atomically and denies wrong-account, expired, revoked, and replay attempts", async () => {
  if (!supabase || !authClient) throw new Error("Local Supabase clients are unavailable.");
  const roles = ["super_admin", "community_admin", "event_manager", "checkin_staff", "finance_reviewer", "content_manager", "tech_admin"] as const;
  const suffix = randomUUID().slice(0, 12);
  const inviterEmail = `csc-phase4-inviter-${suffix}@example.test`;
  const inviter = await supabase.auth.admin.createUser({ email: inviterEmail, password: `I9!${randomUUID()}secure`, email_confirm: true });
  expect(inviter.error).toBeNull();
  if (!inviter.data.user) throw new Error("Local synthetic inviter was not created.");
  const inviterUser = inviter.data.user;
  authUserIds.push(inviterUser.id);

  const createInvitation = async (email: string, role: string, expiresAt: string, state: "pending" | "revoked" = "pending", tokenHash = randomBytes(32).toString("hex")) => {
    const id = randomUUID();
    invitationIds.push(id);
    const insert = await supabase.from("admin_role_invitations").insert({
      id, invitee_email: email, normalized_email: email.toLowerCase(), role,
      token_hash: tokenHash, invited_by: inviterUser.id,
      expires_at: expiresAt, status: state,
      ...(state === "revoked" ? { revoked_at: new Date().toISOString(), revoked_by: inviterUser.id } : {}),
    });
    expect(insert.error).toBeNull();
    return id;
  };
  const createInvitee = async (email: string) => {
    const password = `A7!${randomUUID()}secure`;
    const user = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    expect(user.error).toBeNull();
    if (!user.data.user) throw new Error("Local synthetic invitee was not created.");
    authUserIds.push(user.data.user.id);
    const client = createClient(localUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
    const login = await client.auth.signInWithPassword({ email, password });
    expect(login.error).toBeNull();
    return { client, login, user: user.data.user };
  };
  const rpc = (client: unknown) => client as {
    rpc(name: string, args: Record<string, string>): Promise<{ data: unknown; error: { message: string } | null }>;
  };

  for (const role of roles) {
    const email = `csc-phase4-${role}-${suffix}@example.test`;
    const invitee = await createInvitee(email);
    const invitationId = await createInvitation(email, role, new Date(Date.now() + 60 * 60_000).toISOString());
    const notificationId = randomUUID();
    appNotificationIds.push(notificationId);
    const notice = await supabase.from("notifications").insert({
      id: notificationId, type: "admin.invitation.received", channel: "in_app", recipient: invitee.user.id,
      recipient_user_id: invitee.user.id, audience: "member", related_record_type: "admin_role_invitations",
      related_record_id: invitationId, title: "Administrator invitation received", message: "Synthetic invitation",
      action_url: `/admin/accept-invitation?invitationId=${invitationId}`, dedupe_key: `phase4-invitation-${invitationId}`,
      status: "available", delivered_at: new Date().toISOString(), payload: { role },
    });
    expect(notice.error).toBeNull();
    const accepted = await rpc(invitee.client).rpc("csc_accept_admin_role_invitation_in_app", { p_invitation_id: invitationId });
    expect(accepted.error).toBeNull();
    expect(accepted.data).toMatchObject({ ok: true, role });
    const assignment = await supabase.from("admin_roles").select("role").eq("user_id", invitee.user.id).eq("role", role).maybeSingle();
    expect(assignment.error).toBeNull();
    expect(assignment.data?.role).toBe(role);
    const invitation = await supabase.from("admin_role_invitations").select("status,accepted_by").eq("id", invitationId).single();
    expect(invitation.data).toMatchObject({ status: "accepted", accepted_by: invitee.user.id });
    const synced = await supabase.from("notifications").select("title,action_url,read_at").eq("id", notificationId).single();
    expect(synced.data?.title).toBe("Administrator invitation accepted");
    expect(synced.data?.action_url).toBe("/admin");
    expect(synced.data?.read_at).toBeTruthy();
    const replay = await rpc(invitee.client).rpc("csc_accept_admin_role_invitation_in_app", { p_invitation_id: invitationId });
    expect(replay.error).toBeTruthy();
    await invitee.client.auth.signOut();

    const emailInviteeAddress = `csc-phase4-email-${role}-${suffix}@example.test`;
    const emailInvitee = await createInvitee(emailInviteeAddress);
    const rawToken = randomBytes(32).toString("base64url");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");
    const emailInvitationId = await createInvitation(emailInviteeAddress, role, new Date(Date.now() + 60 * 60_000).toISOString(), "pending", hashedToken);
    const invitationMessage = buildAdminInvitationEmail({
      id: emailInvitationId, token: rawToken, role, expiresAt: new Date(Date.now() + 60 * 60_000), fullName: "Synthetic CSC Invitee",
    });
    const sent = await sendCommunityEmail({ to: emailInviteeAddress, ...invitationMessage, notificationId: emailInvitationId });
    expect(sent.accepted?.some((address) => String(address).toLowerCase() === emailInviteeAddress)).toBe(true);
    const capturedInvitation = await captureFor(emailInviteeAddress);
    expect(capturedInvitation.Subject).toBe("CSC Circle — You're Invited to Join the Administration Team");
    expect(capturedInvitation.Text).toContain("Synthetic CSC Invitee");
    expect(capturedInvitation.Text).toContain("Accept your invitation:");
    expect(capturedInvitation.Text).toContain(`http://localhost:3107/admin/accept-invitation#token=${rawToken}`);
    const deliveryAccepted = await supabase.from("admin_role_invitations").update({
      delivery_status: "smtp_accepted", sent_at: new Date().toISOString(), delivery_attempts: 1,
    }).eq("id", emailInvitationId).eq("status", "pending");
    expect(deliveryAccepted.error).toBeNull();
    const preAccept = await supabase.from("admin_role_invitations").select("status,delivery_status,normalized_email,expires_at").eq("id", emailInvitationId).single();
    expect(preAccept.data).toMatchObject({ status: "pending", delivery_status: "smtp_accepted", normalized_email: emailInviteeAddress });
    expect(new Date(preAccept.data!.expires_at).getTime()).toBeGreaterThan(Date.now());
    expect(emailInvitee.user.email?.toLowerCase()).toBe(emailInviteeAddress);
    const emailAccepted = await rpc(emailInvitee.client).rpc("csc_accept_admin_role_invitation", { p_token_hash: hashedToken });
    expect(emailAccepted.error).toBeNull();
    expect(emailAccepted.data).toMatchObject({ ok: true, role });
    const replayedEmailToken = await rpc(emailInvitee.client).rpc("csc_accept_admin_role_invitation", { p_token_hash: hashedToken });
    expect(replayedEmailToken.error).toBeTruthy();
    await emailInvitee.client.auth.signOut();
  }

  const wrongEmail = `csc-phase4-intended-${suffix}@example.test`;
  const wrong = await createInvitee(`csc-phase4-wrong-${suffix}@example.test`);
  const wrongInvitation = await createInvitation(wrongEmail, "event_manager", new Date(Date.now() + 60 * 60_000).toISOString());
  expect((await rpc(wrong.client).rpc("csc_accept_admin_role_invitation_in_app", { p_invitation_id: wrongInvitation })).error).toBeTruthy();

  const expiredEmail = `csc-phase4-expired-${suffix}@example.test`;
  const expired = await createInvitee(expiredEmail);
  const expiredInvitation = await createInvitation(expiredEmail, "checkin_staff", new Date(Date.now() - 60_000).toISOString());
  const expiredResult = await rpc(expired.client).rpc("csc_accept_admin_role_invitation_in_app", { p_invitation_id: expiredInvitation });
  expect(expiredResult.error).toBeNull();
  expect(expiredResult.data).toMatchObject({ ok: false, reason: "expired" });
  const expiredState = await supabase.from("admin_role_invitations").select("status").eq("id", expiredInvitation).single();
  expect(expiredState.data?.status).toBe("expired");

  const revokedEmail = `csc-phase4-revoked-${suffix}@example.test`;
  const revoked = await createInvitee(revokedEmail);
  const revokedInvitation = await createInvitation(revokedEmail, "finance_reviewer", new Date(Date.now() + 60 * 60_000).toISOString(), "revoked");
  expect((await rpc(revoked.client).rpc("csc_accept_admin_role_invitation_in_app", { p_invitation_id: revokedInvitation })).error).toBeTruthy();
}, 45_000);

it.skipIf(!run)("claims a synthetic outbox job, sends to local SMTP capture, and records SMTP acceptance", async () => {
  expect(new URL(localUrl).hostname).toBe("127.0.0.1");
  expect(new URL(localUrl).port).toBe("54321");
  expect(process.env.SMTP_HOST).toBe("127.0.0.1");
  expect(process.env.SMTP_PORT).toBe("54325");
  expect(process.env.VERCEL).not.toBe("1");
  expect(process.env.VERCEL_ENV).toBeFalsy();
  expect(process.env.EMAIL_NOTIFICATIONS_ENABLED).toBe("true");
  if (!supabase) throw new Error("Local Supabase client is unavailable.");

  const pending = await supabase.from("notifications").select("id,available_at")
    .eq("channel", "email").in("status", ["queued", "failed_retryable"]).lt("attempts", 5).lte("available_at", new Date().toISOString());
  expect(pending.error).toBeNull();
  heldJobs.push(...(pending.data ?? []).map(({ id }) => id));
  for (const ids of chunks(heldJobs, 50)) {
    const held = await supabase.from("notifications").update({ available_at: "2099-01-01T00:00:00.000Z" }).in("id", ids);
    expect(held.error).toBeNull();
  }

  const id = randomUUID();
  const mailbox = `csc-phase4-${id.slice(0, 12)}`;
  const recipient = `${mailbox}@example.test`;
  testIds.push(id);
  const inserted = await supabase.from("notifications").insert({
    id,
    type: "MembershipApplicationReceived",
    channel: "email",
    recipient,
    audience: "member",
    template_key: "MembershipApplicationReceived",
    template_version: 1,
    payload: { name: "Synthetic Member", reference: id, status: "pending_verification" },
    dedupe_key: `phase4-local-mail-${id}`,
  });
  expect(inserted.error).toBeNull();

  const dueAfterIsolation = await supabase.from("notifications").select("id").eq("channel", "email")
    .in("status", ["queued", "failed_retryable"]).lt("attempts", 5).lte("available_at", new Date().toISOString());
  expect(dueAfterIsolation.error).toBeNull();
  expect((dueAfterIsolation.data ?? []).map(({ id }) => id)).toEqual([id]);

  const result = await dispatchNotifications(1);
  const diagnostic = await supabase.from("notifications").select("status,last_error,attempts").eq("id", id).single();
  const receiptDiagnostic = await supabase.from("notification_deliveries").select("status,error_code").eq("notification_id", id);
  expect(result.state).toBe("processed");
  expect(result.claimed).toBe(1);
  expect(result.accepted, JSON.stringify({ result, job: diagnostic.data, receipts: receiptDiagnostic.data })).toBe(1);

  const status = await supabase.from("notifications").select("status,last_error,attempts").eq("id", id).single();
  expect(status.error).toBeNull();
  expect(status.data?.status).toBe("sent");
  expect(status.data?.last_error).toBe("");
  const delivery = await supabase.from("notification_deliveries").select("status,accepted_at").eq("notification_id", id).single();
  expect(delivery.error).toBeNull();
  expect(delivery.data?.status).toBe("accepted");
  expect(delivery.data?.accepted_at).toBeTruthy();

  const sink = process.env.CSC_TEST_MAIL_SINK_URL ?? "";
  const messagesUrl = new URL("/api/v1/messages", sink);
  let messages: Array<{ ID: string; Subject?: string; To?: Array<{ Address: string }> }> = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await fetch(messagesUrl, { cache: "no-store" });
    if (response.ok) {
      const value = await response.json() as { messages?: Array<{ ID: string; Subject?: string; To?: Array<{ Address: string }> }> };
      messages = (value.messages ?? []).filter((message) => message.To?.some((to) => to.Address.toLowerCase() === recipient.toLowerCase()));
      if (messages.length) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  mailIds.push(...messages.map(({ ID }) => ID));
  expect(messages).toHaveLength(1);
  expect(messages[0]?.Subject).toContain("Membership Application Received");
  const messageResponse = await fetch(new URL(`/api/v1/message/${messages[0]!.ID}`, sink), { cache: "no-store" });
  expect(messageResponse.ok).toBe(true);
  const body = await messageResponse.json() as { Text: string; HTML: string };
  expect(body.Text).toContain("Synthetic Member");
  expect(body.Text).toContain("http://localhost:3107/member/claim");
  expect(body.HTML).toContain("Membership Application Received");
});
