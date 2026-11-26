import { NextRequest, NextResponse } from "next/server";
import { isSafeOrigin } from "@/lib/auth/http";
import { z } from "zod";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientIp, distributedRateLimit } from "@/lib/rate-limit";
import { ensureEventPassEmail } from "@/lib/admin/event-pass-email";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import { paidRegistrationRoles, paidRegistrationReferrals, additionalAttendeeSchema } from "@/lib/validations/paid-registration";
import { getSubsystemMaintenanceConfig } from "@/lib/services/system-settings";
import { dispatchTeamWhatsAppAlert } from "@/lib/services/team-alerts";

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
  if (!isSafeOrigin(request)) {
    return NextResponse.json({ ok: false, error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const subsystems = await getSubsystemMaintenanceConfig();
    if (subsystems.eventRegistrations.paused) {
      return NextResponse.json(
        {
          ok: false,
          error: subsystems.eventRegistrations.reason || "Event registrations and RSVPs are temporarily paused while organizers update seat allocations.",
          maintenance: true,
        },
        { status: 503 }
      );
    }

    const json = await request.json();
    const parsed = freeRegistrationSchema.safeParse(json);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Check the registration details and try again.";
      return NextResponse.json({ ok: false, error: firstError, details: parsed.error.format() }, { status: 422 });
    }

    const data = parsed.data;
    const admin = createAdminClient();
    const ip = clientIp(request);

    // IP-level rate limit: max 5 attempts per 5 minutes
    const ipLimited = await distributedRateLimit(admin, "free-event-registration-ip", ip, 5, 300_000);
    if (!ipLimited.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many registration attempts from this device. Please wait a few minutes." },
        { status: 429, headers: { "Retry-After": String(ipLimited.retryAfter || 300) } }
      );
    }

    // Email-level rate limit: max 3 attempts per 10 minutes
    const emailLimited = await distributedRateLimit(admin, "free-event-registration-email", data.email.toLowerCase().trim(), 3, 600_000);
    if (!emailLimited.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many registration attempts for this email address. Please wait a few minutes." },
        { status: 429, headers: { "Retry-After": String(emailLimited.retryAfter || 600) } }
      );
    }

    // 1. Fetch event
    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, title, slug, status, registration_state, starts_at, ends_at, registration_deadline, admission, capacity")
      .eq("id", data.eventId)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
    }

    // Auto-align joint online meeting schedule (Sunday, Nov 22, 2026, 3:00 PM – 5:00 PM IST)
    const isJointMeeting =
      event.slug === "csc-joint-online-meeting" ||
      event.title?.includes("Joint Online Meeting") ||
      event.id === "948bfc48-c627-4b06-a665-5c2cd8226505";

    if (isJointMeeting) {
      const liveStartsAt = "2026-11-22T15:00:00+05:30";
      const liveEndsAt = "2026-11-22T17:00:00+05:30";
      const liveDeadline = "2026-11-22T17:00:00+05:30";

      if (
        event.starts_at !== liveStartsAt ||
        event.ends_at !== liveEndsAt ||
        event.registration_deadline !== liveDeadline ||
        event.registration_state !== "open"
      ) {
        event.starts_at = liveStartsAt;
        event.ends_at = liveEndsAt;
        event.registration_deadline = liveDeadline;
        event.registration_state = "open";
        event.status = "published";

        // Asynchronously self-heal Supabase database record
        void admin
          .from("events")
          .update({
            starts_at: liveStartsAt,
            ends_at: liveEndsAt,
            registration_deadline: liveDeadline,
            registration_state: "open",
            status: "published",
          })
          .eq("id", event.id);
      }
    }

    const now = Date.now();
    const eventEnded = event.ends_at ? Date.parse(event.ends_at) <= now : Date.parse(event.starts_at) <= now;
    const deadlinePassed = event.registration_deadline ? Date.parse(event.registration_deadline) <= now : false;

    if (
      event.status !== "published" ||
      event.registration_state !== "open" ||
      eventEnded ||
      (deadlinePassed && !isJointMeeting)
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

    // 3. Duplicate check for this email & resolve authenticated user ID
    const lowerEmail = data.email.toLowerCase().trim();

    let registeredUserId: string | null = null;
    try {
      const sessionClient = await createClient();
      const { data: authData } = await sessionClient.auth.getUser();
      if (authData?.user?.id) {
        registeredUserId = authData.user.id;
      }
    } catch {}

    if (!registeredUserId) {
      const { data: profileUser } = await admin
        .from("profiles")
        .select("id")
        .eq("email", lowerEmail)
        .maybeSingle();
      if (profileUser) {
        registeredUserId = profileUser.id;
      }
    }

    const { data: existingRegs } = await admin
      .from("event_registrations")
      .select("id, reference, status, user_id, pass_token")
      .eq("event_id", event.id)
      .eq("source_email", lowerEmail)
      .not("status", "in", "('cancelled','revoked')")
      .limit(1);

    if (existingRegs && existingRegs.length > 0) {
      if (registeredUserId && !existingRegs[0].user_id) {
        await admin
          .from("event_registrations")
          .update({ user_id: registeredUserId })
          .eq("id", existingRegs[0].id);
      }
      return NextResponse.json({
        ok: true,
        alreadyRegistered: true,
        reference: existingRegs[0].reference,
        passId: existingRegs[0].id,
        passToken: existingRegs[0].pass_token,
        passHref: existingRegs[0].pass_token
          ? `/events/meet-access/${existingRegs[0].pass_token}`
          : `/member/events/${existingRegs[0].id}`,
        message: "You are already registered for this event. Your confirmed pass is ready below.",
      });
    }

    // 4. Try optional paid_event_registrations tracking record (for legacy analytics & reporting if permitted)
    const paidRegId = crypto.randomUUID();
    const regRef = "CSC-EVT-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

    const additionalAttendeeDetails = data.additionalAttendees && data.additionalAttendees.length > 0
      ? data.additionalAttendees.map((a, i) => `[Attendee ${i + 2}] ${a.fullName} | ${a.email} | ${a.whatsapp} | ${a.organization} | ${a.role}`).join("\n")
      : data.additionalAttendeeNames || null;

    let insertedPaidRegId: string | null = null;
    try {
      const { data: paidReg, error: paidError } = await admin
        .from("paid_event_registrations")
        .insert({
          id: paidRegId,
          event_id: event.id,
          user_id: registeredUserId,
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
        })
        .select("id")
        .maybeSingle();

      if (!paidError && paidReg) {
        insertedPaidRegId = paidReg.id;
      }
    } catch {
      // Non-blocking: free registrations do not require a paid_event_registrations record
    }

    // 5. Create primary pass in event_registrations
    const primaryPassToken = crypto.randomBytes(32).toString("hex");
    const primaryPassRef = "CSC-EVT-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

    const { data: primaryPass, error: passError } = await admin
      .from("event_registrations")
      .insert({
        event_id: event.id,
        user_id: registeredUserId as unknown as string,
        attendee_name: data.fullName.trim(),
        reference: primaryPassRef,
        pass_token: primaryPassToken,
        status: "confirmed",
        payment: "not_required",
        attendance: "not_attended",
        paid_registration_id: insertedPaidRegId,
        source: "platform",
        source_email: lowerEmail,
      })
      .select("id, reference")
      .single();

    if (passError || !primaryPass) {
      console.error("Free registration pass creation error:", passError);
      return NextResponse.json(
        { ok: false, error: passError?.message || "Failed to create event pass." },
        { status: 500 }
      );
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
            paid_registration_id: insertedPaidRegId,
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

    // 8. Dispatch real-time alert to Leadership Team WhatsApp Group (7 members)
    void dispatchTeamWhatsAppAlert({
      type: "event_rsvp",
      title: "New Event Pass Booked",
      fields: {
        "Event": event.title,
        "Attendee": data.fullName.trim(),
        "Email": lowerEmail,
        "WhatsApp": data.whatsapp.trim(),
        "Organization": data.organization.trim(),
        "Role": data.role,
        "Tickets Booked": data.attendeeCount,
        "Pass Reference": primaryPass.reference,
      },
      actionUrl: "https://csc.logicintelligencetechnologies.in/admin/events",
    }).catch((err) => console.warn("[team-alert] free event rsvp error:", err));

    return NextResponse.json({
      ok: true,
      reference: primaryPass.reference,
      passId: primaryPass.id,
      passToken: primaryPassToken,
      passHref: `/events/meet-access/${primaryPassToken}`,
      attendeeCount: data.attendeeCount,
      message: "Registration confirmed successfully! Your digital event pass with QR code and Google Meet access details are ready below.",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Registration is unavailable." },
      { status: 500 }
    );
  }
}
