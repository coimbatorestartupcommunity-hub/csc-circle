import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleLabels, type AdminRole } from "@/lib/admin/permissions";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { readAuthBody } from "@/lib/auth/http";

export const instant = false;
const TOKEN_COOKIE = "csc_admin_invitation";
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{40,60}$/);

export async function POST(request: Request) {
  if (!rateLimit(`admin-invite-exchange:${clientIp(request)}`, 8, 15 * 60_000).allowed) {
    return NextResponse.json({ error: "Too many attempts. Reopen the invitation email and try later." }, { status: 429 });
  }
  const body = await readAuthBody(request);
  const parsed = z.object({ token: tokenSchema }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "This invitation link is invalid or unavailable." }, { status: 400 });
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data, error } = await admin.from("admin_role_invitations")
    .select("role,status,delivery_status,expires_at")
    .eq("token_hash", tokenHash).maybeSingle();
  if (error || !data || data.status !== "pending" || data.delivery_status !== "smtp_accepted" || new Date(data.expires_at) <= new Date()) {
    return NextResponse.json({ error: "This invitation is invalid, expired, revoked, or not ready for acceptance." }, { status: 410 });
  }
  const response = NextResponse.json({ ok: true, role: data.role, roleLabel: roleLabels[data.role as AdminRole], expiresAt: data.expires_at });
  response.cookies.set(TOKEN_COOKIE, tokenHash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/admin/invitations/accept",
    maxAge: 30 * 60,
  });
  return response;
}
