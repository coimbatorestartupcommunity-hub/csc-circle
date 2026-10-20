import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleLabels, type AdminRole } from "@/lib/admin/permissions";

export const instant = false;
const TOKEN_COOKIE = "csc_admin_invitation";

async function tokenHash() {
  const cookieStore = await cookies();
  const value = cookieStore.get(TOKEN_COOKIE)?.value;
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

export async function GET() {
  const hash = await tokenHash();
  if (!hash) return NextResponse.json({ invitation: null, authenticated: !!(await getAuthUser()) });
  const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data, error } = await admin.from("admin_role_invitations")
    .select("role,status,delivery_status,expires_at")
    .eq("token_hash", hash).maybeSingle();
  if (error || !data || data.status !== "pending" || data.delivery_status !== "smtp_accepted" || new Date(data.expires_at) <= new Date()) {
    return NextResponse.json({ invitation: null, authenticated: !!(await getAuthUser()) });
  }
  return NextResponse.json({
    authenticated: !!(await getAuthUser()),
    invitation: { role: data.role, roleLabel: roleLabels[data.role as AdminRole], expiresAt: data.expires_at },
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Sign in with the invited account to continue." }, { status: 401 });
  const hash = await tokenHash();
  if (!hash) return NextResponse.json({ error: "Reopen the invitation email to continue." }, { status: 410 });

  const supabase = await createClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data, error } = await supabase.rpc("csc_accept_admin_role_invitation", { p_token_hash: hash });
  if (error || !data) {
    // Keep the short-lived cookie so the invitee can switch to the intended account.
    return NextResponse.json({ error: "This invitation could not be accepted. Confirm you are signed in to the invited, verified email account and try again." }, { status: error?.code === "42501" ? 403 : 409 });
  }
  const response = NextResponse.json({ ok: true, role: (data as { role?: string }).role });
  response.cookies.set(TOKEN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/invitations/accept", maxAge: 0 });
  return response;
}
