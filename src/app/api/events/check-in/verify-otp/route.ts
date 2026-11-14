import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CSC_OFFICIAL_MEET_URL } from "@/lib/events/google-meet";
import {
  hashOtp,
  createJoinSession,
} from "@/lib/events/check-in";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const otp = typeof body.otp === "string" ? body.otp.trim() : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!challengeId || !otp || !token) {
      return NextResponse.json(
        { ok: false, error: "Missing required verification parameters." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Look up challenge
    const { data: challenge, error: chalError } = await admin
      .from("event_checkin_challenges")
      .select("id, registration_id, otp_hash, recipient_email, expires_at, attempts")
      .eq("id", challengeId)
      .maybeSingle();

    if (chalError || !challenge) {
      return NextResponse.json(
        { ok: false, error: "Verification challenge expired or invalid. Please upload your QR code again." },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date(challenge.expires_at) < new Date()) {
      return NextResponse.json(
        { ok: false, error: "Verification code has expired. Please upload your QR code to request a new code." },
        { status: 400 }
      );
    }

    // Check max attempts
    if (challenge.attempts >= 5) {
      return NextResponse.json(
        { ok: false, error: "Too many failed attempts. Please re-scan or upload your QR code." },
        { status: 429 }
      );
    }

    // Verify OTP hash
    const expectedHash = hashOtp(otp, token);
    const isValid = challenge.otp_hash === expectedHash;

    if (!isValid) {
      await admin
        .from("event_checkin_challenges")
        .update({ attempts: (challenge.attempts || 0) + 1 })
        .eq("id", challenge.id);

      return NextResponse.json(
        { ok: false, error: "Incorrect verification code. Please check your email and try again." },
        { status: 400 }
      );
    }

    // Mark challenge verified
    await admin
      .from("event_checkin_challenges")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", challenge.id);

    // 2. Look up registration & event
    const { data: reg } = await admin
      .from("event_registrations")
      .select(`
        id,
        event_id,
        reference,
        attendee_name,
        source_email,
        status,
        payment,
        event:events(id, title, status, format, settings, maps_url)
      `)
      .eq("id", challenge.registration_id)
      .maybeSingle();

    if (!reg) {
      return NextResponse.json({ ok: false, error: "Registration not found." }, { status: 404 });
    }

    const rawEvent = reg.event as unknown as {
      id: string;
      title: string;
      settings?: Record<string, unknown> | null;
      maps_url?: string | null;
    } | null;

    // 3. Complete Atomic Check-In
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    const { data: checkinRes } = await admin.rpc("csc_attendee_self_check_in", {
      p_pass_token: token,
      p_verified_email: challenge.recipient_email,
      p_method: "attendee_self_qr_upload",
      p_ip: ip,
      p_user_agent: userAgent,
    });

    const checkinObj = checkinRes as { already_checked_in?: boolean } | null;
    const alreadyCheckedIn = checkinObj?.already_checked_in ?? (reg.status === "checked_in");

    // 4. Create Join Session for Google Meet
    const eventSettings = (rawEvent?.settings as Record<string, unknown> | null) ?? {};
    const meetingUrl =
      (eventSettings.onlineInfo as string) ||
      (eventSettings.googleMeetUrl as string) ||
      (rawEvent?.maps_url?.includes("meet.google.com") ? rawEvent.maps_url : null) ||
      process.env.GOOGLE_MEET_FALLBACK_URL ||
      CSC_OFFICIAL_MEET_URL;

    const session = await createJoinSession({
      registrationId: reg.id,
      eventId: reg.event_id,
      attendeeEmail: challenge.recipient_email,
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
      eventTitle: rawEvent?.title || "CSC First Online Meeting",
      meetingUrl: session.meetingUrl,
      joinToken: session.joinToken,
      joinUrl: `/api/events/join/${session.joinToken}`,
      countdownSeconds: 3,
    });
  } catch (error) {
    console.error("VERIFY_OTP_ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Verification failed. Please retry." },
      { status: 500 }
    );
  }
}
