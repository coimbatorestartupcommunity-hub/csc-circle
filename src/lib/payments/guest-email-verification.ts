import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const VERIFICATION_TTL_MS = 10 * 60_000;

function verificationSecret(): string {
  const secret = process.env.CSC_GUEST_EMAIL_VERIFICATION_SECRET ?? "";
  if (secret.length < 32) throw new Error("Guest email verification is not configured");
  return secret;
}

function hashSecret(id: string, value: string): string {
  return createHmac("sha256", verificationSecret()).update(`${id}:${value}`).digest("hex");
}

function equalHash(left: string, right: string): boolean {
  return left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export async function createGuestEmailVerification(
  admin: SupabaseClient<Database>,
  email: string,
  eventId: string,
  eventSlug?: string
) {
  const id = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const magicToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();
  const normalizedEmail = email.trim().toLowerCase();

  let slug = eventSlug;
  if (!slug) {
    const { data: ev } = await admin.from("events").select("slug").eq("id", eventId).maybeSingle();
    slug = (ev?.slug as string) || "csc-joint-online-meeting";
  }

  const { error } = await admin.from("guest_email_verifications").insert({
    id,
    email: normalizedEmail,
    event_id: eventId,
    code_hash: hashSecret(id, code),
    expires_at: expiresAt,
    metadata: {
      policy_version: "csc-guest-email-v1",
      magic_token_hash: hashSecret(id, magicToken),
      event_slug: slug,
    },
  });
  if (error) throw new Error("Could not create guest email verification");

  const verificationUrl = `/events/verify-email?id=${encodeURIComponent(id)}&token=${encodeURIComponent(magicToken)}&event=${encodeURIComponent(slug)}`;

  const { error: notificationError } = await admin.from("notifications").insert({
    type: "GuestEmailVerification",
    template_key: "GuestEmailVerification",
    channel: "email",
    recipient: normalizedEmail,
    recipient_user_id: null,
    audience: "member",
    related_record_type: "guest_email_verifications",
    related_record_id: id,
    payload: {
      verificationCode: code,
      verificationUrl,
      magicToken,
      slug,
      eventSlug: slug,
    },
    dedupe_key: `GuestEmailVerification:${id}`,
  });
  if (notificationError) throw new Error("Could not queue guest verification email");

  return { id, expiresAt, verificationUrl, magicToken };
}

export async function verifyGuestEmailCode(
  admin: SupabaseClient<Database>,
  id: string,
  email: string,
  code: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data: row } = await admin
    .from("guest_email_verifications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row || row.email !== normalizedEmail || row.consumed_at || row.verified_at) return null;
  if (Date.parse(row.expires_at) <= Date.now() || row.attempts >= 5) return null;

  const nextAttempts = row.attempts + 1;
  if (!equalHash(row.code_hash, hashSecret(id, code))) {
    await admin
      .from("guest_email_verifications")
      .update({ attempts: nextAttempts })
      .eq("id", id)
      .eq("attempts", row.attempts);
    return null;
  }

  const token = randomBytes(32).toString("base64url");
  const { data: verified } = await admin
    .from("guest_email_verifications")
    .update({
      attempts: nextAttempts,
      verified_at: new Date().toISOString(),
      token_hash: hashSecret(id, token),
    })
    .eq("id", id)
    .eq("attempts", row.attempts)
    .is("verified_at", null)
    .select("id")
    .maybeSingle();
  return verified ? token : null;
}

export async function verifyGuestEmailToken(
  admin: SupabaseClient<Database>,
  id: string,
  token: string
) {
  const { data: row } = await admin
    .from("guest_email_verifications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!row || row.consumed_at) return null;
  if (Date.parse(row.expires_at) <= Date.now() || row.attempts >= 5) return null;

  const meta = (row.metadata as Record<string, unknown> | null) ?? {};
  const storedMagicHash = typeof meta.magic_token_hash === "string" ? meta.magic_token_hash : "";

  // If already verified with this token or token_hash matches
  if (row.verified_at && row.token_hash && equalHash(row.token_hash, hashSecret(id, token))) {
    return {
      verificationToken: token,
      email: row.email,
      eventId: row.event_id,
      eventSlug: (meta.event_slug as string) || "csc-joint-online-meeting",
    };
  }

  // Validate magic token hash
  if (!storedMagicHash || !equalHash(storedMagicHash, hashSecret(id, token))) {
    await admin
      .from("guest_email_verifications")
      .update({ attempts: row.attempts + 1 })
      .eq("id", id)
      .eq("attempts", row.attempts);
    return null;
  }

  // Mark verified and store token_hash for downstream order creation
  const { data: verified } = await admin
    .from("guest_email_verifications")
    .update({
      attempts: row.attempts + 1,
      verified_at: new Date().toISOString(),
      token_hash: hashSecret(id, token),
    })
    .eq("id", id)
    .select("id,email,event_id,metadata")
    .maybeSingle();

  if (!verified) return null;

  const verifiedMeta = (verified.metadata as Record<string, unknown> | null) ?? {};
  return {
    verificationToken: token,
    email: verified.email,
    eventId: verified.event_id,
    eventSlug: (verifiedMeta.event_slug as string) || "csc-joint-online-meeting",
  };
}

export async function validateGuestEmailVerification(
  admin: SupabaseClient<Database>,
  id: string,
  email: string,
  eventId: string,
  token: string
): Promise<boolean> {
  const { data: row } = await admin
    .from("guest_email_verifications")
    .select("id,email,event_id,token_hash,verified_at,consumed_at,expires_at")
    .eq("id", id)
    .maybeSingle();
  if (
    !row ||
    row.email !== email.trim().toLowerCase() ||
    row.event_id !== eventId ||
    !row.verified_at ||
    row.consumed_at ||
    !row.token_hash ||
    Date.parse(row.expires_at) <= Date.now() ||
    !equalHash(row.token_hash, hashSecret(id, token))
  ) {
    return false;
  }

  return true;
}

export async function consumeGuestEmailVerification(
  admin: SupabaseClient<Database>,
  id: string
): Promise<boolean> {
  const { data: consumed } = await admin
    .from("guest_email_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  return Boolean(consumed);
}
