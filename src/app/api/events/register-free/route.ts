import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import { ensureEventPassEmail } from "@/lib/admin/event-pass-email";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { paidRegistrationRoles, paidRegistrationReferrals, additionalAttendeeSchema } from "@/lib/validations/paid-registration";

const freeRegistrationSchema = z.object({
  eventId: z.string().uuid("Invalid event reference."),
  fullName: z.string().trim().min(2, "Please enter your full name (minimum 2 characters).").max(100),
  email: z.string().trim().email("Please enter a valid email address.").max(254),
  whatsapp: z.string().trim().regex(/^\+?[0-9][0-9\s()-]{7,20}$/, "Please enter a valid WhatsApp or phone number (e.g. +91 98765 43210)."),
  organization: z.string().trim().min(2, "Please enter your startup, company, or venture name.").max(120),
  role: z.enum(paidRegistrationRoles, { message: "Please select your role from the list." }),
  attendeeCount: z.coerce.number().int().min(1).max(10),
  additionalAttendees: z.array(additionalAttendeeSchema).optional(),
  additionalAttendeeNames: z.string().trim().max(1000).optional().or(z.literal("")),
  referralSource: z.enum(paidRegistrationReferrals).optional().or(z.literal("")),
  dietaryAccessibilityNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  consentContact: z.literal("true").optional().or(z.literal("false")).or(z.literal("")),
  consentPaymentTerms: z.literal("true", { message: "Please accept the event registration terms." }),
});

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const json = await request.json();
    const parsed = freeRegistrationSchema.safeParse(json);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Check the registration details and try again.";
      return NextResponse.json({ ok: false, error: firstError, details: parsed.error.format() }, { status: 422 });
    }

    const data = parsed.data;
    const admin = createAdminClient();
    const ip = clientIp(request);
    const limited = await distributedRateLimit(admin, "free-event-registration", ip, 10, 60_000);
    if (!limited.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter || 60) } }
      );
    }

    // 1. Fetch event
    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, title, status, registration_state, starts_at, ends_at, registration_deadline, admission, capacity")
      .eq("id", data.eventId)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
    }

    const now = Date.now();
    if (
      event.status !== "published" ||
      event.registration_state !== "open" ||
      Date.parse(event.starts_at) <= now ||
      (event.registration_deadline && Date.parse(event.registration_deadline) <= now)
    ) {
      return NextResponse.json({ ok: false, error: "Registration is not open for this event." }, { status: 409 });
    }

    // 2. Capacity check
    if (event.capacity != null) {
      const { count: confirmedCount } = await admin
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .in("status", ["confirmed", "checked_in"]);

      if ((confirmedCount ?? 0) + data.attendeeCount > event.capacity) {
        return NextResponse.json({ ok: false, error: "Event is full or has insufficient remaining capacity." }, { status: 409 });
      }
    }

    // 3. Duplicate check for this email
    const lowerEmail = data.email.toLowerCase().trim();
    const { data: existingRegs } = await admin
      .from("event_registrations")
      .select("id, reference, status")
      .eq("event_id", event.id)
      .eq("source_email", lowerEmail)
      .not("status", "in", "('cancelled','revoked')")
      .limit(1);

    if (existingRegs && existingRegs.length > 0) {
      return NextResponse.json({
        ok: true,
        alreadyRegistered: true,
        reference: existingRegs[0].reference,
        passHref: `/member/events/${existingRegs[0].id}`,
        message: "You are already registered for this event. Your confirmed pass has been sent to your email.",
      });
    }

    // 4. Create primary paid_event_registrations tracking record (for analytics & reporting)
    const paidRegId = crypto.randomUUID();
    const regRef = "CSC-EVT-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

    const additionalAttendeeDetails = data.additionalAttendees && data.additionalAttendees.length > 0
      ? data.additionalAttendees.map((a, i) => `[Attendee ${i + 2}] ${a.fullName} | ${a.email} | ${a.whatsapp} | ${a.organization} | ${a.role}`).join("\n")
      : data.additionalAttendeeNames || null;

    await admin.from("paid_event_registrations").insert({
      id: paidRegId,
      event_id: event.id,
      user_id: null,
      reference: regRef,
      status: "confirmed",
      full_name: data.fullName.trim(),
      email: lowerEmail,
      whatsapp: data.whatsapp.trim(),
      organization: data.organization.trim(),
      role: data.role,
      attendee_count: data.attendeeCount,
      additional_attendee_names: additionalAttendeeDetails,
      referral_source: data.referralSource || null,
      dietary_accessibility_notes: data.dietaryAccessibilityNotes?.trim() || null,
      total_amount_paid: 0,
      upi_transaction_ref: "FREE_REGISTRATION",
      payment_evidence_type: "authenticated_bank_alert",
      consent_contact: data.consentContact === "true",
      consent_payment_terms: true,
      reviewed_at: new Date().toISOString(),
      review_note: "Automated free event registration",
    });

    // 5. Create primary pass in event_registrations
    const primaryPassToken = crypto.randomBytes(32).toString("hex");
    const primaryPassRef = "CSC-EVT-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

    const { data: primaryPass, error: passError } = await admin
      .from("event_registrations")
      .insert({
        event_id: event.id,
        user_id: null as unknown as string,
        attendee_name: data.fullName.trim(),
        reference: primaryPassRef,
        pass_token: primaryPassToken,
        status: "confirmed",
        payment: "not_required",
        attendance: "not_attended",
        paid_registration_id: paidRegId,
        source: "platform",
        source_email: lowerEmail,
      })
      .select("id, reference")
      .single();

    if (passError || !primaryPass) {
      return NextResponse.json({ ok: false, error: "Failed to create event pass." }, { status: 500 });
    }

    // Queue email for primary attendee
    await ensureEventPassEmail(admin, primaryPass.id);

    // 6. Handle additional attendees if attendeeCount > 1
    if (data.attendeeCount > 1 && data.additionalAttendees) {
      for (const attendee of data.additionalAttendees) {
        if (!attendee.fullName || !attendee.email) continue;
        const extraToken = crypto.randomBytes(32).toString("hex");
        const extraRef = "CSC-EVT-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

        const { data: extraPass } = await admin
          .from("event_registrations")
          .insert({
            event_id: event.id,
            user_id: null as unknown as string,
            attendee_name: attendee.fullName.trim(),
            reference: extraRef,
            pass_token: extraToken,
            status: "confirmed",
            payment: "not_required",
            attendance: "not_attended",
            paid_registration_id: paidRegId,
            source: "platform",
            source_email: attendee.email.toLowerCase().trim(),
          })
          .select("id")
          .maybeSingle();

        if (extraPass) {
          await ensureEventPassEmail(admin, extraPass.id);
        }
      }
    }

    // 7. Flush notifications
    scheduleNotificationDelivery();

    return NextResponse.json({
      ok: true,
      reference: primaryPass.reference,
      passId: primaryPass.id,
      passHref: `/member/events/${primaryPass.id}`,
      attendeeCount: data.attendeeCount,
      message: "Registration confirmed successfully! Your digital event pass and Google Meet access details have been emailed to you.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Registration is unavailable." },
      { status: 500 }
    );
  }
}
