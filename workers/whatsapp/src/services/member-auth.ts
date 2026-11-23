import crypto from "node:crypto";
import { getSupabase, getMemberStatusByPhone, MemberStatusSummary, normalizePhoneForMatching } from "./live-queries.js";
import { logger } from "../utils/logger.js";

export interface VerificationSession {
  verified: boolean;
  memberSummary?: MemberStatusSummary;
  message?: string;
}

/**
 * Checks if the sender phone has an active, valid verified session.
 */
export async function getActiveVerifiedSession(phone: string): Promise<MemberStatusSummary | null> {
  const sb = getSupabase();
  const normalized = normalizePhoneForMatching(phone);

  try {
    const { data, error } = await sb
      .from("csc_agent_verified_sessions")
      .select("id, user_id, member_number, email, session_expires_at")
      .eq("sender_phone", normalized)
      .gt("session_expires_at", new Date().toISOString())
      .order("session_expires_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const session = data[0];
    const memberSummary = await getMemberStatusByPhone(normalized);
    return memberSummary;
  } catch (err) {
    logger.error("Error checking verified session", { error: err });
    return null;
  }
}

/**
 * Initiates an OTP challenge for the sender phone.
 */
export async function initiateOtpChallenge(phone: string): Promise<{ success: boolean; maskedEmail?: string; error?: string }> {
  const sb = getSupabase();
  const normalized = normalizePhoneForMatching(phone);
  const member = await getMemberStatusByPhone(phone);

  if (!member.exists || !member.emailMasked) {
    return {
      success: false,
      error: "No membership application found linked to this WhatsApp number. Please apply at https://csc.logicintelligencetechnologies.in/join",
    };
  }

  // Generate 6-digit numeric OTP
  const otpCode = String(crypto.randomInt(100000, 999999));
  const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  try {
    // Delete any prior unverified sessions for this sender
    await sb
      .from("csc_agent_verified_sessions")
      .delete()
      .eq("sender_phone", normalized)
      .is("verified_at", null);

    // Insert new pending OTP session
    await sb.from("csc_agent_verified_sessions").insert({
      sender_phone: normalized,
      user_id: member.userId || null,
      member_number: member.memberNumber || null,
      email: member.emailMasked,
      otp_code_hash: otpHash,
      otp_expires_at: expiresAt,
      attempts_count: 0,
    });

    // In a production setup, dispatch OTP email to member's actual registered email address
    // Log masked OTP creation for security audit
    logger.info("Generated 6-digit OTP verification challenge", {
      sender_phone: normalized,
      masked_email: member.emailMasked,
      expires_at: expiresAt,
    });

    return {
      success: true,
      maskedEmail: member.emailMasked,
    };
  } catch (err) {
    logger.error("Error initiating OTP challenge", { error: err });
    return {
      success: false,
      error: "Failed to initiate verification challenge. Please try again shortly.",
    };
  }
}

/**
 * Validates a 6-digit OTP code submitted by the user.
 */
export async function verifyOtpCode(
  phone: string,
  candidateCode: string
): Promise<{ verified: boolean; member?: MemberStatusSummary; error?: string }> {
  const sb = getSupabase();
  const normalized = normalizePhoneForMatching(phone);
  const cleanCode = candidateCode.trim().replace(/[^0-9]/g, "");

  if (cleanCode.length !== 6) {
    return { verified: false, error: "Please provide a valid 6-digit verification code." };
  }

  try {
    const { data, error } = await sb
      .from("csc_agent_verified_sessions")
      .select("id, user_id, otp_code_hash, otp_expires_at, attempts_count")
      .eq("sender_phone", normalized)
      .is("verified_at", null)
      .gt("otp_expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return {
        verified: false,
        error: "No active verification code found or the code has expired. Please ask for your membership status again to request a new code.",
      };
    }

    const session = data[0];

    // Anti-abuse: limit attempts to 3
    if (session.attempts_count >= 3) {
      await sb.from("csc_agent_verified_sessions").delete().eq("id", session.id);
      return {
        verified: false,
        error: "Too many incorrect attempts. For security reasons, please request a new verification code.",
      };
    }

    const candidateHash = crypto.createHash("sha256").update(cleanCode).digest("hex");
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(candidateHash, "hex"),
      Buffer.from(session.otp_code_hash, "hex")
    );

    if (!isMatch) {
      await sb
        .from("csc_agent_verified_sessions")
        .update({ attempts_count: session.attempts_count + 1 })
        .eq("id", session.id);

      return {
        verified: false,
        error: "Incorrect verification code. Please check your email and try again.",
      };
    }

    // OTP Verified! Activate session for 1 hour
    const sessionExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const sessionToken = crypto.randomBytes(24).toString("hex");

    await sb
      .from("csc_agent_verified_sessions")
      .update({
        verified_at: new Date().toISOString(),
        session_expires_at: sessionExpiresAt,
        session_token: sessionToken,
      })
      .eq("id", session.id);

    const member = await getMemberStatusByPhone(phone);
    return { verified: true, member };
  } catch (err) {
    logger.error("Error verifying OTP code", { error: err });
    return { verified: false, error: "An unexpected error occurred during verification." };
  }
}
