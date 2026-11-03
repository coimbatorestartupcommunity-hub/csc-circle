import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function runPurge() {
  const supabase = getAdminClient();
  const receipt: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
  };

  // Find QA event IDs
  const { data: events, error: evErr } = await supabase
    .from("events")
    .select("id, slug, settings")
    .or("slug.eq.csc-upi-payment-system-test,settings->>is_test_event.eq.true,settings->>isTestEvent.eq.true");

  if (evErr) throw new Error(`events query: ${evErr.message}`);

  const qaEventIds: string[] = (events || []).map((e: { id: string }) => e.id);
  receipt.qaEventsFound = qaEventIds.length;
  receipt.qaEventIds = qaEventIds;
  receipt.qaEvents = events;

  if (qaEventIds.length === 0) {
    receipt.qaOrderIds = [];
    receipt.deleted = {};
    receipt.finishedAt = new Date().toISOString();
    receipt.message = "No QA test events found";
    return receipt;
  }

  // Find QA order IDs
  const { data: orders, error: ordErr } = await supabase
    .from("event_payment_orders")
    .select("id, status, claimed_utr")
    .in("event_id", qaEventIds);

  if (ordErr) throw new Error(`orders query: ${ordErr.message}`);
  const qaOrderIds: string[] = (orders || []).map((o: { id: string }) => o.id);
  receipt.qaOrderIds = qaOrderIds;
  receipt.qaOrders = orders;
  receipt.qaOrderCount = qaOrderIds.length;

  const deleted: Record<string, number | string> = {};

  async function delCount(table: string, col: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const res = (await (supabase.from(table) as unknown as {
      delete: (opts: { count: string }) => {
        in: (c: string, v: string[]) => Promise<{ count: number | null; error: { message: string } | null }>;
      };
    })
      .delete({ count: "exact" })
      .in(col, ids)) as unknown as { count: number | null; error: { message: string } | null };
    const { error, count } = res as { error: { message: string } | null; count: number | null };
    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("Could not find the table")) {
        return 0;
      }
      throw new Error(`${table}: ${error.message}`);
    }
    return count ?? 0;
  }

  // 1. attributions / payment_events / reconciliations
  if (qaOrderIds.length > 0) {
    try { deleted.attributions = await delCount("event_payment_attributions", "order_id", qaOrderIds); } catch (e: unknown) { deleted.attributions = String((e as Error).message); }
    try { deleted.payment_events = await delCount("event_payment_events", "order_id", qaOrderIds); } catch (e: unknown) { deleted.payment_events = String((e as Error).message); }
    try { deleted.reconciliations = await delCount("event_payment_reconciliation", "order_id", qaOrderIds); } catch { deleted.reconciliations = 0; }
    try { deleted.payment_reconciliations = await delCount("payment_reconciliations", "order_id", qaOrderIds); } catch { deleted.payment_reconciliations = 0; }
  }

  // 2. registrations and passes - need to handle paid_event_registrations, event_registrations, event_passes
  try { deleted.paid_event_registrations = await delCount("paid_event_registrations", "event_id", qaEventIds); } catch { deleted.paid_event_registrations = 0; }
  try { deleted.event_registrations = await delCount("event_registrations", "event_id", qaEventIds); } catch { deleted.event_registrations = 0; }
  // event_passes may be linked via registration_id; try event_id if exists
  try {
    const { error } = await (supabase.from("event_passes") as unknown as { delete: (opts: { count: string }) => { in: (c: string, v: string[]) => Promise<{ error: { message: string } | null; count: number | null }> } }).delete({ count: "exact" }).in("event_id", qaEventIds);
    if (error && !error.message.includes("does not exist")) throw error;
  } catch { /* ignore */ }
  // guest verifications
  try { deleted.guest_verifications = await delCount("guest_verifications", "event_id", qaEventIds); } catch { deleted.guest_verifications = 0; }

  // notifications - delete by dedupe_key pattern for QA orders
  if (qaOrderIds.length > 0) {
    for (const oid of qaOrderIds) {
      const key = `paid-order-admin-${oid}`;
      await supabase.from("notifications").delete().eq("dedupe_key", key).then(() => {});
      // also try without exact count
    }
    // bulk: try to delete where dedupe_key in list (supabase IN)
    try {
      const keys = qaOrderIds.map((id) => `paid-order-admin-${id}`);
      await (supabase.from("notifications") as unknown as { delete: () => { in: (c: string, v: string[]) => Promise<unknown> } }).delete().in("dedupe_key", keys);
    } catch { /* ignore */ }
  }

  // event notices / community_updates / highlights
  try { deleted.event_notices = await delCount("event_notices", "event_id", qaEventIds); } catch { deleted.event_notices = 0; }
  try { deleted.community_updates = await delCount("community_updates", "event_id", qaEventIds); } catch { deleted.community_updates = 0; }

  // 3. delete QA payment orders (even with claimed UTRs - total purge per user request)
  if (qaOrderIds.length > 0) {
    try { deleted.orders = await delCount("event_payment_orders", "id", qaOrderIds); } catch (e: unknown) { deleted.orders = String((e as Error).message); }
  }

  // 4. finally delete QA event itself
  try { deleted.events = await delCount("events", "id", qaEventIds); } catch (e: unknown) { deleted.events = String((e as Error).message); }

  // Verify post-purge: check remaining QA events/orders
  const { data: remainingEvents } = await supabase.from("events").select("id").or("slug.eq.csc-upi-payment-system-test,settings->>is_test_event.eq.true");
  const remainingQaEvents = (remainingEvents || []).length;
  let remainingQaOrders = 0;
  if (remainingQaEvents > 0 || qaEventIds.length > 0) {
    const checkIds = remainingQaEvents > 0 ? (remainingEvents as { id: string }[]).map((e) => e.id) : [];
    if (checkIds.length > 0) {
      const { count } = await supabase.from("event_payment_orders").select("id", { count: "exact", head: true }).in("event_id", checkIds);
      remainingQaOrders = count ?? 0;
    } else if (qaEventIds.length > 0) {
      // after deletion, check if any orders remain for those ids (should be 0 if events deleted)
      const { count } = await supabase.from("event_payment_orders").select("id", { count: "exact", head: true }).in("event_id", qaEventIds);
      remainingQaOrders = count ?? 0;
    }
  }

  receipt.deleted = deleted;
  receipt.remainingQaEvents = remainingQaEvents;
  receipt.remainingQaOrders = remainingQaOrders;
  receipt.verifiedZeroVisibility = remainingQaEvents === 0 && remainingQaOrders === 0;
  receipt.finishedAt = new Date().toISOString();
  return receipt;
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || req.headers.get("x-purge-key");
  if (key !== "csc-qa-purge-2026") {
    return NextResponse.json({ error: "Unauthorized. Provide ?key=csc-qa-purge-2026" }, { status: 401 });
  }
  try {
    const receipt = await runPurge();
    return NextResponse.json(receipt, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String((e as Error).message), stack: String((e as Error).stack) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || req.headers.get("x-purge-key") || (await req.json().catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>).key as string | undefined;
  if (key !== "csc-qa-purge-2026") {
    return NextResponse.json({ error: "Unauthorized. Provide key csc-qa-purge-2026" }, { status: 401 });
  }
  try {
    const receipt = await runPurge();
    return NextResponse.json(receipt, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json({ error: String((e as Error).message), stack: String((e as Error).stack) }, { status: 500 });
  }
}
