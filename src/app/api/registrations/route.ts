import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSubmissionClient } from "@/lib/supabase/submissions";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isAllowedPaymentProof, isPaidRegistrationAmountValid, paidRegistrationSchema } from "@/lib/validations/paid-registration";

const MAX_UPLOAD = 5 * 1024 * 1024;
const formats = {
  "image/jpeg": { ext: "jpg", check: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", check: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/webp": { ext: "webp", check: (b: Buffer) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
  "application/pdf": { ext: "pdf", check: (b: Buffer) => b.toString("ascii", 0, 5) === "%PDF-" },
} as const;

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 403 });
  if (!rateLimit(`paid-registration:${clientIp(request)}`, 5, 60_000).allowed) return NextResponse.json({ ok: false, error: "Too many attempts. Please try again shortly." }, { status: 429 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD + 32_000) return NextResponse.json({ ok: false, error: "The upload must be under 5 MB." }, { status: 413 });
  try {
    const form = await request.formData();
    const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
    const parsed = paidRegistrationSchema.safeParse(fields);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Check the required registration details and consent boxes." }, { status: 422 });
    const value = parsed.data;
    const proof = form.get("paymentScreenshot");
    if (!(proof instanceof File) || !isAllowedPaymentProof(proof)) return NextResponse.json({ ok: false, error: "Upload a JPEG, PNG, WebP, or PDF file under 5 MB." }, { status: 422 });
    const format = formats[proof.type as keyof typeof formats];
    if (!format) return NextResponse.json({ ok: false, error: "This payment proof format is not supported." }, { status: 422 });
    const bytes = Buffer.from(await proof.arrayBuffer());
    if (!format.check(bytes)) return NextResponse.json({ ok: false, error: "The payment proof file content does not match its file type." }, { status: 422 });
    const sb = createSubmissionClient();
    if (!sb) return NextResponse.json({ ok: false, error: "Registration is temporarily unavailable." }, { status: 503 });
    const { data: event, error: eventError } = await sb.from("events").select("id,status,registration_state,registration_deadline,starts_at,admission,registration_mode,price_per_attendee,max_attendees_per_registration,upi_vpa,upi_payee_name,upi_qr_path").eq("id", value.eventId).maybeSingle();
    const now = Date.now();
    if (eventError || !event || event.status !== "published" || event.admission !== "paid" || event.registration_mode !== "paid_upi" || event.registration_state !== "open" || Date.parse(event.starts_at) <= now || (event.registration_deadline && Date.parse(event.registration_deadline) <= now) || !event.price_per_attendee || !event.upi_vpa || !event.upi_payee_name || !event.upi_qr_path) return NextResponse.json({ ok: false, error: "Registration is not open for this event." }, { status: 409 });
    if (value.attendeeCount > event.max_attendees_per_registration) return NextResponse.json({ ok: false, error: "The selected attendee count exceeds this event's limit." }, { status: 422 });
    const expectedAmount = Math.round(Number(event.price_per_attendee) * 100) * value.attendeeCount / 100;
    if (!isPaidRegistrationAmountValid(Number(event.price_per_attendee), value.attendeeCount, value.totalAmountPaid)) return NextResponse.json({ ok: false, error: "The amount must equal the event price multiplied by the attendee count." }, { status: 422 });
    const id = randomUUID();
    const storagePath = `payment-proofs/${event.id}/${id}.${format.ext}`;
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage.from("payment-proofs").upload(storagePath, bytes, { contentType: proof.type, cacheControl: "0", upsert: false });
    if (uploadError) return NextResponse.json({ ok: false, error: "Payment proof could not be securely stored." }, { status: 503 });
    const { error: insertError } = await admin.from("paid_event_registrations").insert({
      id, event_id: event.id, full_name: value.fullName, email: value.email.toLowerCase(), whatsapp: value.whatsapp,
      organization: value.organization, role: value.role, attendee_count: value.attendeeCount,
      additional_attendee_names: value.additionalAttendeeNames || null, referral_source: value.referralSource || null,
      dietary_accessibility_notes: value.dietaryAccessibilityNotes || null, total_amount_paid: expectedAmount,
      upi_transaction_ref: value.upiTransactionRef, payment_screenshot_path: storagePath,
      consent_contact: true, consent_payment_terms: true,
    });
    if (insertError) {
      await admin.storage.from("payment-proofs").remove([storagePath]);
      return NextResponse.json({ ok: false, error: "Registration could not be saved. Check the details and try again." }, { status: 409 });
    }
    scheduleNotificationDelivery();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Registration is temporarily unavailable." }, { status: 503 });
  }
}
