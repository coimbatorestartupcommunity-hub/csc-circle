import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
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
  const limit = rateLimit(`consult:ip:${ip}`, 5, 300_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests from this device. Please wait a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter || 300) } },
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
      { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form and try again." },
      { status: 422 },
    );
  }
  const v = parsed.data;

  const emailLimit = rateLimit(`consult:email:${v.email.toLowerCase().trim()}`, 3, 600_000);
  if (!emailLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many consultation requests for this email. Please wait a few minutes." },
      { status: 429, headers: { "Retry-After": String(emailLimit.retryAfter || 600) } },
    );
  }

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

  scheduleNotificationDelivery();
  return NextResponse.json({ ok: true, reference: data });
}
