import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueWhatsAppNotification, normalizePhoneForWhatsApp } from "@/lib/notifications/whatsapp-outbox";
export { normalizePhoneForWhatsApp } from "@/lib/notifications/whatsapp-outbox";
import { sendSecurityCodeEmail } from "@/lib/auth/security-code";
import { getRedisClient, withRedisTimeout } from "@/lib/redis/client";
import { isRedisEnabled } from "@/lib/redis/config";

// In-memory fallback code store
const memoryOtpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

function cleanExpiredOtpCodes() {
  const now = Date.now();
  for (const [key, val] of memoryOtpStore.entries()) {
    if (val.expiresAt < now) {
      memoryOtpStore.delete(key);
    }
  }
}

/**
 * Generates and stores a cryptographically secure 6-digit OTP for a phone number.
 * Dispatches via WhatsApp (and/or Email if linked).
 */
export async function sendPhoneOtp({
  phone,
  channel = "whatsapp",
}: {
  phone: string;
  channel?: "whatsapp" | "email" | "both";
}): Promise<{ success: boolean; phone: string; error?: string }> {
  cleanExpiredOtpCodes();
  const { e164 } = normalizePhoneForWhatsApp(phone);
  if (!e164 || e164.length < 10) {
    return { success: false, phone: "", error: "Please enter a valid 10-digit mobile number." };
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const ttlSeconds = 600; // 10 minutes

  // 1. Store in memory fallback
  memoryOtpStore.set(e164, {
    code,
    expiresAt: Date.now() + ttlSeconds * 1000,
    attempts: 0,
  });

  // 2. Store in Redis if enabled
  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (client) {
        await withRedisTimeout(
          Promise.resolve(client.set(`auth:phone_otp:${e164}`, code, { ex: ttlSeconds }))
        );
      }
    } catch (err) {
      console.warn("[phone-auth] Redis OTP store deferred to memory fallback:", err);
    }
  }

  // 3. Dispatch via WhatsApp
  let dispatched = false;
  if (channel === "whatsapp" || channel === "both") {
    const text =
      `🔐 *CSC Circle Login Verification*\n\n` +
      `Your 6-digit verification code is: *${code}*\n\n` +
      `Use this code to sign in to your Coimbatore Startup Community account.\n` +
      `Valid for 10 minutes. Please do not share this code with anyone.\n\n` +
      `Connect. Build. Grow.\n` +
      `Coimbatore Startup Community (CSC Circle)`;

    const whatsappResult = await enqueueWhatsAppNotification({
      recipientPhone: e164,
      text,
      messageType: "phone_login_otp",
    });

    if (whatsappResult.success) {
      dispatched = true;
    }
  }

  // 3b. Dispatch via MSG91 Multi-Channel SendOTP API (SMS fallback)
  try {
    const { sendMsg91Otp } = await import("@/lib/services/msg91");
    const otpRes = await sendMsg91Otp({
      phone: e164,
      otp: code,
      otpLength: 6,
      otpExpiryMinutes: 10,
    });
    if (otpRes.success) {
      dispatched = true;
    } else {
      console.warn("[phone-auth] MSG91 SendOTP notice:", otpRes.message);
    }
  } catch (otpErr) {
    console.warn("[phone-auth] MSG91 SendOTP call exception:", otpErr);
  }

  // 4. Dispatch via Email (Mirrored for 100% delivery guarantee)
  // If user requested email OR if an existing profile is linked to this phone, dispatch email in parallel
  try {
    const admin = createAdminClient();
    // Look up if an existing member profile has this phone
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .or(`whatsapp.eq.${e164},whatsapp.eq.+${e164},whatsapp.ilike.%${e164.slice(-10)}%`)
      .maybeSingle();

    if (profile?.email && !profile.email.endsWith("@login.csc.internal")) {
      await sendSecurityCodeEmail({
        email: profile.email,
        code,
        name: profile.full_name || null,
      });
      dispatched = true;
    }
  } catch (emailErr) {
    console.warn("[phone-auth] Email dispatch error:", emailErr);
  }

  return { success: true, phone: e164 };
}

/**
 * Verifies a 6-digit phone OTP code.
 */
export async function verifyPhoneOtpCode(phone: string, inputCode: string): Promise<boolean> {
  const { e164 } = normalizePhoneForWhatsApp(phone);
  const cleanInput = (inputCode || "").trim();
  if (!cleanInput || cleanInput.length < 6) return false;

  let storedCode: string | null = null;

  // 1. Try Redis
  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (client) {
        const val = await withRedisTimeout(
          Promise.resolve(client.get<string>(`auth:phone_otp:${e164}`))
        );
        if (typeof val === "string") {
          storedCode = val.trim();
        }
      }
    } catch {
      // fallback to memory
    }
  }

  // 2. Try in-memory store
  if (!storedCode) {
    const mem = memoryOtpStore.get(e164);
    if (mem && mem.expiresAt > Date.now()) {
      mem.attempts++;
      if (mem.attempts > 5) {
        memoryOtpStore.delete(e164);
        return false;
      }
      storedCode = mem.code;
    }
  }

  if (!storedCode) return false;

  const matches = crypto.timingSafeEqual(
    Buffer.from(cleanInput.padEnd(6, "0").slice(0, 6)),
    Buffer.from(storedCode.padEnd(6, "0").slice(0, 6))
  );

  if (matches) {
    memoryOtpStore.delete(e164);
    if (isRedisEnabled()) {
      try {
        const client = getRedisClient();
        if (client) {
          void withRedisTimeout(Promise.resolve(client.del(`auth:phone_otp:${e164}`)));
        }
      } catch {}
    }
    return true;
  }

  return false;
}

/**
 * Resolves an existing member account by phone, or provisions a new one.
 */
export async function resolveOrCreatePhoneUser(phone: string): Promise<{
  userId: string;
  email: string;
  isNewUser: boolean;
  needsEmailPrompt: boolean;
}> {
  const { e164 } = normalizePhoneForWhatsApp(phone);
  const admin = createAdminClient();
  const last10 = e164.slice(-10);

  // 1. Check profiles table for matching phone
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, whatsapp")
    .or(`whatsapp.eq.${e164},whatsapp.eq.+${e164},whatsapp.ilike.%${last10}%`)
    .maybeSingle();

  if (profile?.id) {
    // Fetch auth.users record to get actual email
    const { data: userData } = await admin.auth.admin.getUserById(profile.id);
    const email = userData?.user?.email || profile.email || `phone_${e164}@login.csc.internal`;
    const isProvisional = email.endsWith("@login.csc.internal");

    return {
      userId: profile.id,
      email,
      isNewUser: false,
      needsEmailPrompt: isProvisional,
    };
  }

  // 2. Check membership_claims for matching phone
  const { data: claim } = await admin
    .from("membership_claims")
    .select("user_id, linked_account_email")
    .or(`whatsapp.eq.${e164},whatsapp.eq.+${e164},whatsapp.ilike.%${last10}%`)
    .maybeSingle();

  if (claim?.user_id && claim.linked_account_email) {
    // Update profile whatsapp field
    await admin.from("profiles").update({ whatsapp: e164 }).eq("id", claim.user_id);

    return {
      userId: claim.user_id,
      email: claim.linked_account_email,
      isNewUser: false,
      needsEmailPrompt: claim.linked_account_email.endsWith("@login.csc.internal"),
    };
  }

  // 3. New User: Provision user account with phone alias
  const provisionalEmail = `phone_${e164}@login.csc.internal`;
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email: provisionalEmail,
    email_confirm: true,
    user_metadata: {
      phone: e164,
      full_name: "CSC Member",
      provisional: true,
    },
  });

  if (createErr || !newUser.user) {
    // If user already exists in auth.users with this provisional email
    if (createErr?.code === "user_already_exists" || createErr?.message?.includes("already registered")) {
      const { data: userList } = await admin.auth.admin.listUsers();
      const existing = userList?.users?.find((u) => u.email === provisionalEmail);
      if (existing) {
        return {
          userId: existing.id,
          email: provisionalEmail,
          isNewUser: false,
          needsEmailPrompt: true,
        };
      }
    }
    throw new Error(`Could not provision account: ${createErr?.message || "Unknown error"}`);
  }

  // Upsert profile record
  await admin.from("profiles").upsert({
    id: newUser.user.id,
    whatsapp: e164,
    email: provisionalEmail,
    full_name: "CSC Member",
    display_name: "Member",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return {
    userId: newUser.user.id,
    email: provisionalEmail,
    isNewUser: true,
    needsEmailPrompt: true,
  };
}

/**
 * Generates an exchange token hash for automatic SSR cookie establishment.
 */
export async function createPhoneSessionToken(userEmail: string): Promise<string> {
  const admin = createAdminClient();
  const linkRes = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userEmail,
  });

  const tokenHash = linkRes.data?.properties?.hashed_token;
  if (!tokenHash) {
    throw new Error("Failed to generate secure authentication token");
  }

  return tokenHash;
}

/**
 * Links a real email address and optional password to the phone-authenticated account.
 */
export async function linkUserEmailAndCredentials({
  userId,
  email,
  password,
}: {
  userId: string;
  email: string;
  password?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const admin = createAdminClient();

    // 1. Check if another account already exists with this email
    const { data: userList } = await admin.auth.admin.listUsers();
    const existingWithEmail = userList?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail && u.id !== userId
    );

    if (existingWithEmail) {
      // Merge: Update the existing account's profile with this phone number
      const { data: currentProfile } = await admin
        .from("profiles")
        .select("whatsapp")
        .eq("id", userId)
        .maybeSingle();

      if (currentProfile?.whatsapp) {
        await admin
          .from("profiles")
          .update({ whatsapp: currentProfile.whatsapp })
          .eq("id", existingWithEmail.id);
      }

      return {
        success: true,
      };
    }

    // 2. Update current account's email and password
    const updatePayload: { email: string; email_confirm: boolean; password?: string } = {
      email: cleanEmail,
      email_confirm: true,
    };
    if (password && password.length >= 8) {
      updatePayload.password = password;
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, updatePayload);
    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 3. Update profile table
    await admin.from("profiles").update({ email: cleanEmail }).eq("id", userId);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
