import { NextResponse } from "next/server";
import { z } from "zod";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const requestStarted = performance.now();
  const timings: Record<string, number> = {};
  const send = (body: object, status: number, includeMetrics = false) => {
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    if (process.env.CSC_PERF_DIAGNOSTICS === "true") {
      headers.set("Server-Timing", [
        ...Object.entries(timings).map(([name, duration]) => `${name};dur=${duration.toFixed(2)}`),
        ...(includeMetrics ? [`request;dur=${(performance.now() - requestStarted).toFixed(2)}`] : []),
      ].join(", "));
    }
    return NextResponse.json(body, { status, headers });
  };

  const clientStarted = performance.now();
  const sb = await createClient();
  timings["client-init"] = performance.now() - clientStarted;

  // Verify the JWT signature/expiry with Supabase, then check current session
  // revocation, email verification and membership state in PostgreSQL. The
  // subject is taken only from verified claims; browser-supplied IDs are never
  // used. RLS remains authoritative for each inbox query below.
  const authStarted = performance.now();
  const { data: claimsResult, error: claimsError } = await sb.auth.getClaims();
  const claims = claimsResult?.claims;
  timings["auth-claims"] = performance.now() - authStarted;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (claimsError || !userId) {
    return send({ error: "Sign in to view notifications." }, 401, true);
  }

  const inboxStarted = performance.now();
  // This invoker RPC combines session validation, the RLS-filtered inbox and
  // unread count into one PostgREST round trip.
  const { data: inbox, error: inboxError } = await sb.rpc("csc_member_notification_inbox");
  timings["inbox-queries"] = performance.now() - inboxStarted;

  if (inboxError) {
    return send({ error: "Notifications are temporarily unavailable." }, 503, true);
  }
  if (!inbox || typeof inbox !== "object" || Array.isArray(inbox)) {
    return send({ error: "Sign in to view notifications." }, 401, true);
  }
  const inboxObject = inbox as { items?: unknown; unreadCount?: unknown };
  if (!Array.isArray(inboxObject.items) || typeof inboxObject.unreadCount !== "number") {
    return send({ error: "Sign in to view notifications." }, 401, true);
  }
  return send({ items: inboxObject.items, unreadCount: inboxObject.unreadCount }, 200, true);
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), id: z.string().uuid() }),
  z.object({ action: z.literal("read_all") }),
]);

export async function POST(request: Request) {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live" || !ctx.user) {
    return NextResponse.json({ error: "Sign in to update notifications." }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification action." }, { status: 422 });

  const sb = await createClient();
  let query = sb.from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("channel", "in_app")
    .eq("status", "available")
    .eq("recipient_user_id", ctx.user.id)
    .is("read_at", null);
  if (parsed.data.action === "read") query = query.eq("id", parsed.data.id);

  const { error } = await query;
  if (error) return NextResponse.json({ error: "Could not update the notification." }, { status: 503 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
