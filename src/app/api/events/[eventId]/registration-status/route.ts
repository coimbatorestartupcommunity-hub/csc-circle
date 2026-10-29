import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    if (!z.string().uuid().safeParse(eventId).success) return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
    const session = await createClient();
    const { data: { user }, error: authError } = await session.auth.getUser();
    if (authError || !user?.email_confirmed_at || !user.email) {
      return NextResponse.json({ ok: true, authenticated: false, registered: false }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const admin = createAdminClient();
    const email = user.email.toLowerCase();
    const [{ data: paid, error: paidError }, { data: imported, error: importedError }] = await Promise.all([
      admin.from("paid_event_registrations").select("status,member_registration_id").eq("event_id", eventId).eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("event_registrations").select("id,status,pass_token,paid_registration_id").eq("event_id", eventId).eq("source_email", email).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (paidError || importedError) throw new Error("Registration lookup failed");

    const pass = imported?.pass_token && ["confirmed", "checked_in"].includes(imported.status) ? imported : null;
    if (pass) {
      return NextResponse.json({ ok: true, authenticated: true, registered: true, state: "pass", passHref: `/member/events/${pass.id}` }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (paid) {
      if (paid.status === "confirmed" && paid.member_registration_id) {
        return NextResponse.json({ ok: true, authenticated: true, registered: true, state: "pass", passHref: `/member/events/${paid.member_registration_id}` }, { headers: { "Cache-Control": "private, no-store" } });
      }
      if (paid.status === "confirmed") {
        return NextResponse.json({ ok: true, authenticated: true, registered: true, state: "confirmation_pending" }, { headers: { "Cache-Control": "private, no-store" } });
      }
      if (["pending_verification", "pending_review", "pending_payment"].includes(paid.status)) {
        return NextResponse.json({ ok: true, authenticated: true, registered: true, state: "pending" }, { headers: { "Cache-Control": "private, no-store" } });
      }
    }
    if (imported && ["pending", "pending_review", "pending_payment", "waitlisted"].includes(imported.status)) {
      return NextResponse.json({ ok: true, authenticated: true, registered: true, state: "pending" }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (imported?.status === "confirmed" || imported?.status === "checked_in") {
      return NextResponse.json({ ok: true, authenticated: true, registered: true, state: "confirmation_pending" }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ ok: true, authenticated: true, registered: false }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Registration status is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
