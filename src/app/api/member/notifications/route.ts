import { NextResponse } from "next/server";
import { z } from "zod";
import { getMemberContext } from "@/lib/services/member/context";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const ctx = await getMemberContext();
  if (ctx.mode !== "live" || !ctx.user) {
    return NextResponse.json({ error: "Sign in to view notifications." }, { status: 401 });
  }

  const sb = await createClient();
  const [itemsResult, unreadResult] = await Promise.all([
    sb.from("notifications")
      .select("id,type,title,message,action_url,read_at,created_at,delivered_at")
      .eq("channel", "in_app")
      .eq("status", "available")
      .eq("recipient_user_id", ctx.user.id)
      .order("delivered_at", { ascending: false })
      .limit(30),
    sb.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("channel", "in_app")
      .eq("status", "available")
      .eq("recipient_user_id", ctx.user.id)
      .is("read_at", null),
  ]);

  if (itemsResult.error || unreadResult.error) {
    return NextResponse.json({ error: "Notifications are temporarily unavailable." }, { status: 503 });
  }
  return NextResponse.json({ items: itemsResult.data ?? [], unreadCount: unreadResult.count ?? 0 }, {
    headers: { "Cache-Control": "private, no-store" },
  });
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
