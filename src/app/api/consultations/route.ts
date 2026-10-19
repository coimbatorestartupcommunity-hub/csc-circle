import { NextResponse } from "next/server";
import { createSubmissionClient } from "@/lib/supabase/submissions";
import { publicConsultationSchema } from "@/lib/validations/forms";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Public consultation submission. Server-validated (Zod), rate-limited, and
 * persisted to the admin review queue (consultation_submissions). Returns a
 * real stored reference — never a fake success.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`consult:${ip}`, 5, 60_000);
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

  const parsed = publicConsultationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the form and try again." },
      { status: 422 },
    );
  }
  const v = parsed.data;

  const supabase = createSubmissionClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "Submissions are temporarily unavailable." }, { status: 503 });
  const { data, error } = await supabase.rpc("submit_consultation", {
    p_full_name: v.fullName,
    p_startup: v.startup,
    p_whatsapp: v.whatsapp,
    p_email: v.email,
    p_challenge: v.challenge,
  });

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "Could not save your request. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, reference: data });
}
