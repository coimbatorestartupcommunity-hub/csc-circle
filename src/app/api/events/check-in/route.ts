import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CSC_OFFICIAL_MEET_URL } from "@/lib/events/google-meet";
import { scheduleNotificationDelivery } from "@/lib/notifications/schedule";
import {
  hashOtp,
  hashToken,
  maskEmail,
  generate6DigitOtp,
  createJoinSession,
} from "@/lib/events/check-in";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let token = "";

    if (typeof body.token === "string" && body.token.trim()) {
      token = body.token.trim();
    } else if (body.payload && typeof body.payload === "object") {
      if (typeof body.payload.ref === "string") {
        token = body.payload.ref.trim();
      }
    } else if (typeof body.text === "string") {
      try {
        const parsed = JSON.parse(body.text);
        if (parsed?.t === "csc.eventpass" && typeof parsed.ref === "string") {
          token = parsed.ref.trim();
        } else {
          token = body.text.trim();
        }
      } catch {
        token = body.text.trim();
      }
    }

    if (!token || token.length < 16) {
      return NextResponse.json(
        {
          ok: false,
          status: "invalid",
          error: "Invalid QR Code. Please upload the original QR code provided in your CSC Circle registration confirmation email.",
        },
        { status: 422 }
      );
    }

    const admin = createAdminClient();

    // 1. Look up attendee registration
    const { data: reg, error: regError } = await admin
      .from("event_registrations")
      .select(
        `
        id,
        event_id,
        reference,
        attendee_name,
        source_email,
        user_id,
        status,
        payment,
        created_at,
        event:events(
          id,
          title,
          status,
          format,
          starts_at,
          ends_at,
          admission,
          settings,
          maps_url
        )
      `
      )
      .eq("pass_token", token)
      .maybeSingle();

    if (regError || !reg) {
      return NextResponse.json(
        {
          ok: false,
          status: "invalid",
          error: "Invalid QR Code. Please upload the original QR code provided in your CSC Circle registration confirmation email.",
        },
        { status: 404 }
      );
    }

    const rawEvent = reg.event as unknown as {
      id: string;
      title: string;
      status: string;
      format: string;
      starts_at: string;
      ends_at: string | null;
      admission: string;
      settings?: Record<string, unknown> | null;
      maps_url?: string | null;
    } | null;

    if (!rawEvent || rawEvent.status !== "published") {
      return NextResponse.json(
        {
          ok: false,
          status: "revoked",
          error: "This event is currently not published or active.",
        },
        { status: 400 }
      );
    }

    // 2. Check payment requirement
    const isPaid = reg.payment === "paid" || reg.payment === "not_required";
    if (!isPaid) {
      return NextResponse.json(
        {
          ok: false,
          status: "payment",
          error: "Payment incomplete. Your pass will become active once payment is verified.",
        },
        { status: 402 }
      );
    }

    // 3. Check registration confirmation status
    const isConfirmed = reg.status === "confirmed" || reg.status === "checked_in";
    if (!isConfirmed) {
      return NextResponse.json(
        {
          ok: false,
          status: "pending",
          error: "Registration is pending confirmation.",
        },
        { status: 403 }
      );
    }

    // 4. Attendee Identity Protection (Options A, B, C)
    const attendeeEmail = (reg.source_email || "").trim().toLowerCase();
    let isIdentityVerified = false;

    try {
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;

      if (currentUser) {
        // Option A: Member signed in matches registered user_id
        if (reg.user_id && currentUser.id === reg.user_id) {
          isIdentityVerified = true;
        }
        // Option B: Google / signed-in email matches registered attendee email
        if (currentUser.email && currentUser.email.toLowerCase() === attendeeEmail) {
          isIdentityVerified = true;
        }
      }
    } catch {
      // In guest / serverless mode without active cookie session
    }

    // If identity is NOT verified via active session, trigger Option C: Registered email OTP
    if (!isIdentityVerified && attendeeEmail) {
      const otp = generate6DigitOtp();
      const otpH = hashOtp(otp, token);
      const tokenH = hashToken(token);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { data: challenge } = await admin
        .from("event_checkin_challenges")
        .insert({
          registration_id: reg.id,
          otp_hash: otpH,
          recipient_email: attendeeEmail,
          token_hash: tokenH,
          expires_at: expiresAt,
        })
        .select("id")
        .maybeSingle();

      // Enqueue transactional OTP email
      const challengeRecordId = (challenge as { id?: string } | null)?.id || `chal-${Date.now()}`;
      try {
        await admin.from("notifications").insert({
          type: "EventReminder",
          template_key: "EventReminder",
          channel: "email",
          recipient: attendeeEmail,
          recipient_user_id: reg.user_id || null,
          audience: "member",
          related_record_type: "event_registrations",
          related_record_id: reg.id,
          payload: {
            name: reg.attendee_name || "Valued Attendee",
            eventTitle: rawEvent.title,
            reference: reg.reference,
            otpCode: otp,
            purpose: "Check-in Identity Verification",
          },
          dedupe_key: `otp:${challengeRecordId}`,
        });
        scheduleNotificationDelivery();
      } catch (emailErr) {
        console.warn("OTP_ENQUEUE_FALLBACK", emailErr);
      }

      return NextResponse.json({
        ok: true,
        requiresOtp: true,
        challengeId: challengeRecordId,
        maskedEmail: maskEmail(attendeeEmail),
        attendeeName: reg.attendee_name || "Valued Attendee",
        eventTitle: rawEvent.title,
        message: `A 6-digit verification code has been sent to ${maskEmail(attendeeEmail)}.`,
      });
    }

    // 5. Complete Check-in Server-Side (Atomic)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    const { data: checkinRes } = await admin.rpc("csc_attendee_self_check_in", {
      p_pass_token: token,
      p_verified_email: attendeeEmail || null,
      p_method: "attendee_self_qr_upload",
      p_ip: ip,
      p_user_agent: userAgent,
    });

    const checkinObj = checkinRes as { already_checked_in?: boolean } | null;
    const alreadyCheckedIn = checkinObj?.already_checked_in ?? (reg.status === "checked_in");

    // 6. Generate Join Session for Google Meet
    const eventSettings = (rawEvent.settings as Record<string, unknown> | null) ?? {};
    const meetingUrl =
      (eventSettings.onlineInfo as string) ||
      (eventSettings.googleMeetUrl as string) ||
      (rawEvent.maps_url?.includes("meet.google.com") ? rawEvent.maps_url : null) ||
      process.env.GOOGLE_MEET_FALLBACK_URL ||
      CSC_OFFICIAL_MEET_URL;

    const session = await createJoinSession({
      registrationId: reg.id,
      eventId: rawEvent.id,
      attendeeEmail: attendeeEmail || "attendee@csc.community",
      meetingUrl,
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      ok: true,
      status: "checked_in",
      alreadyCheckedIn,
      attendeeName: reg.attendee_name || "Valued Attendee",
      reference: reg.reference,
      eventTitle: rawEvent.title,
      meetingUrl: session.meetingUrl,
      joinToken: session.joinToken,
      joinUrl: `/api/events/join/${session.joinToken}`,
      countdownSeconds: 3,
    });
  } catch (error) {
    console.error("CHECK_IN_ERROR", error);
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        error: "Verification service temporarily unavailable. Please retry.",
      },
      { status: 500 }
    );
  }
}
