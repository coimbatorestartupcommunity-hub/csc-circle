import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleLabels, type AdminRole } from "@/lib/admin/permissions";
import { readAuthBody } from "@/lib/auth/http";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const instant = false;
const TOKEN_COOKIE = "csc_admin_invitation";

async function tokenHash() {
  const cookieStore = await cookies();
  const value = cookieStore.get(TOKEN_COOKIE)?.value;
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

export async function GET(request: Request) {
  const hash = await tokenHash();
  if (!hash) {
    const invitationId = new URL(request.url).searchParams.get("invitationId");
    const user = await getAuthUser();
    const verifiedEmail = user?.email && (user.email_confirmed_at || user.confirmed_at)
      ? user.email.toLowerCase() : null;
    if (!invitationId || !/^[0-9a-f-]{36}$/i.test(invitationId) || !verifiedEmail) {
      return NextResponse.json({ invitation: null, authenticated: !!user }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { data, error } = await admin.from("admin_role_invitations")
      .select("role,status,expires_at,normalized_email")
      .eq("id", invitationId).maybeSingle();
    if (data?.status === "pending" && new Date(data.expires_at) <= new Date()) {
      const { data: expired } = await admin.from("admin_role_invitations").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", invitationId).eq("status", "pending").select("id,role").maybeSingle();
      if (expired) await admin.from("audit_logs").insert({ action: "admin.invitation.expired", actor_id: null, actor_role: "system", target_type: "admin_role_invitation", target_id: invitationId, after: { role: expired.role, status: "expired" }, correlation_id: randomUUID() });
    }
    if (error || !data || data.status !== "pending" || data.normalized_email !== verifiedEmail || new Date(data.expires_at) <= new Date()) {
      return NextResponse.json({ invitation: null, authenticated: true }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({
      authenticated: true,
      invitation: { role: data.role, roleLabel: roleLabels[data.role as AdminRole], expiresAt: data.expires_at, invitationId, acceptanceMethod: "in_app" },
    }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data, error } = await admin.from("admin_role_invitations")
    .select("role,status,delivery_status,expires_at")
    .eq("token_hash", hash).maybeSingle();
  if (data?.status === "pending" && new Date(data.expires_at) <= new Date()) {
    const { data: expired } = await admin.from("admin_role_invitations").update({ status: "expired", updated_at: new Date().toISOString() }).eq("token_hash", hash).eq("status", "pending").select("id,role").maybeSingle();
    if (expired) await admin.from("audit_logs").insert({ action: "admin.invitation.expired", actor_id: null, actor_role: "system", target_type: "admin_role_invitation", target_id: expired.id, after: { role: expired.role, status: "expired" }, correlation_id: randomUUID() });
  }
  if (error || !data || data.status !== "pending" || data.delivery_status !== "smtp_accepted" || new Date(data.expires_at) <= new Date()) {
    return NextResponse.json({ invitation: null, authenticated: !!(await getAuthUser()) });
  }
  return NextResponse.json({
    authenticated: !!(await getAuthUser()),
    invitation: { role: data.role, roleLabel: roleLabels[data.role as AdminRole], expiresAt: data.expires_at, acceptanceMethod: "email" },
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in with the invited account to continue." }, { status: 401 });
  if (!rateLimit(`admin-invite-accept:${user.id}`, 8, 15 * 60_000).allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const hash = await tokenHash();
  const supabase = await createClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  let result: { data: unknown; error: { code?: string } | null };
  const body = await readAuthBody(request);
  const parsed = z.object({ invitationId: z.string().uuid() }).safeParse(body);
  if (parsed.success) {
    result = await supabase.rpc("csc_accept_admin_role_invitation_in_app", { p_invitation_id: parsed.data.invitationId });
  } else if (hash) {
    result = await supabase.rpc("csc_accept_admin_role_invitation", { p_token_hash: hash });
  } else {
    return NextResponse.json({ error: "Reopen the invitation email or notification to continue." }, { status: 410 });
  }
  const { data, error } = result;
  if (error || !data || (typeof data === "object" && data !== null && "ok" in data && (data as { ok?: unknown }).ok !== true)) {
    // Keep the short-lived cookie so the invitee can switch to the intended account.
    const expired = typeof data === "object" && data !== null && "reason" in data && (data as { reason?: unknown }).reason === "expired";
    return NextResponse.json({ error: expired ? "This invitation has expired." : "This invitation could not be accepted. Confirm you are signed in to the invited, verified email account and try again." }, { status: expired ? 410 : error?.code === "42501" ? 403 : 409 });
  }
  const response = NextResponse.json({ ok: true, role: (data as { role?: string }).role });
  response.cookies.set(TOKEN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/invitations/accept", maxAge: 0 });
  return response;
}
