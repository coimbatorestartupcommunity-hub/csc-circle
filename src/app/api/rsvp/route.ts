import { createClient, getAuthUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createSubmissionClient } from "@/lib/supabase/submissions";
import { publicRsvpSchema } from "@/lib/validations/forms";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Public event RSVP submission. Server-validated, rate-limited, persisted to
 * the admin queue (rsvp_submissions). Status defaults to `pending`; the event
 * is bound to a server-side event id/label. No pass is issued here — admins
 * review and confirm, then a member registration/pass is created (Phase 1).
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`rsvp:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = publicRsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the form and try again." },
      { status: 422 },
    );
  }
  const v = parsed.data;

  const user = await getAuthUser();
  if (user) {
    const sb = await createClient();
    const { data, error } = await sb.rpc("csc_register_event", { event: v.eventId!, objective: v.goal });
    if (error || !data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ ok: false, error: "Registration requires an active membership and an open event." }, { status: 409 });
    return NextResponse.json({ ok: true, reference: data.reference });
  }
  const supabase = createSubmissionClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "Submissions are temporarily unavailable." }, { status: 503 });
  const { data, error } = await supabase.rpc("submit_rsvp", {
    // event_id is a nullable uuid in the RPC; pass null when not provided.
    p_event_id: (v.eventId ?? null) as unknown as string,
    p_event_label: v.eventLabel ?? "",
    p_full_name: v.fullName,
    p_startup: v.startup,
    p_whatsapp: v.whatsapp,
    p_email: v.email,
    p_goal: v.goal,
  });

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "Could not submit your RSVP. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, reference: data });
}
