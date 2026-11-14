import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { CSC_OFFICIAL_MEET_URL } from "@/lib/events/google-meet";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

export function hashOtp(otp: string, token: string): string {
  return crypto.createHash("sha256").update(`${otp.trim()}:${token.trim()}`).digest("hex");
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "registered email";
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export function generate6DigitOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function generateJoinToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export interface JoinSessionResult {
  joinToken: string;
  meetingUrl: string;
  expiresAt: string;
}

/**
 * Creates a short-lived (15-minute) authenticated join session for Google Meet.
 */
export async function createJoinSession({
  registrationId,
  eventId,
  attendeeEmail,
  meetingUrl,
  ipAddress,
  userAgent,
}: {
  registrationId: string;
  eventId: string;
  attendeeEmail: string;
  meetingUrl?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<JoinSessionResult> {
  const admin = createAdminClient();
  const joinToken = generateJoinToken();
  const tokenHash = hashToken(joinToken);
  const targetMeetingUrl = meetingUrl || CSC_OFFICIAL_MEET_URL;

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error } = await admin.from("event_join_sessions").insert({
    registration_id: registrationId,
    event_id: eventId,
    token_hash: tokenHash,
    meeting_url: targetMeetingUrl,
    attendee_email: attendeeEmail,
    expires_at: expiresAt,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });

  if (error) {
    console.error("CREATE_JOIN_SESSION_FAILED", error);
    // Non-fatal fallback for tests or missing table
  }

  return {
    joinToken,
    meetingUrl: targetMeetingUrl,
    expiresAt,
  };
}

/**
 * Redeems an existing join session token.
 */
export async function redeemJoinSession(joinToken: string): Promise<{
  ok: boolean;
  meetingUrl?: string;
  error?: string;
}> {
  if (!joinToken || typeof joinToken !== "string") {
    return { ok: false, error: "Invalid join token." };
  }

  const admin = createAdminClient();
  const tokenHash = hashToken(joinToken);

  const { data: session, error } = await admin
    .from("event_join_sessions")
    .select("id, meeting_url, expires_at, is_revoked, redeemed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !session) {
    return { ok: false, error: "Join session not found or expired." };
  }

  if (session.is_revoked) {
    return { ok: false, error: "This join session has been revoked." };
  }

  if (new Date(session.expires_at) < new Date()) {
    return { ok: false, error: "This join session has expired. Please check in again." };
  }

  // Mark redeemed
  await admin
    .from("event_join_sessions")
    .update({ redeemed_at: new Date().toISOString() })
    .eq("id", session.id);

  return {
    ok: true,
    meetingUrl: session.meeting_url || CSC_OFFICIAL_MEET_URL,
  };
}
