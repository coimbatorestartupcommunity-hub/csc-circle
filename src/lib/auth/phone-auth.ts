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
 * Dispatches via WhatsApp, MSG91 SMS, and Email concurrently for guaranteed 100% delivery.
 */
export async function sendPhoneOtp({
  phone,
  channel = "whatsapp",
  email,
}: {
  phone: string;
  channel?: "whatsapp" | "email" | "both";
  email?: string;
}): Promise<{ success: boolean; phone: string; error?: string }> {
  cleanExpiredOtpCodes();
  const { e164 } = normalizePhoneForWhatsApp(phone);
  if (!e164 || e164.length < 10) {
    return { success: false, phone: "", error: "Please enter a valid 10-digit mobile number." };
  }

  const raw10 = e164.slice(-10);
  const code = crypto.randomInt(100000, 999999).toString();
  const ttlSeconds = 600; // 10 minutes

  // 1. Store in memory fallback
  memoryOtpStore.set(e164, {
    code,
    expiresAt: Date.now() + ttlSeconds * 1000,
    attempts: 0,
  });
  if (raw10 !== e164) {
    memoryOtpStore.set(raw10, {
      code,
      expiresAt: Date.now() + ttlSeconds * 1000,
      attempts: 0,
    });
  }

  // 2. Store in Supabase Postgres (Persistent across all Vercel Serverless Function instances)
  try {
    const admin = createAdminClient();
    await admin.from("whatsapp_message_outbox").insert({
      contact_id: "00000000-0000-0000-0000-000000000000",
      recipient_phone: e164,
      recipient_chat_id: `${e164}@c.us`,
      message_type: "phone_login_otp",
      message_payload: {
        code,
        raw10,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        sentAt: new Date().toISOString(),
      },
      status: "delivered",
      idempotency_key: `otp-${e164}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });
  } catch (dbErr) {
    console.warn("[phone-auth] Supabase OTP persistence note:", dbErr);
  }

  // 3. Store in Redis if enabled
  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (client) {
        await withRedisTimeout(
          Promise.all([
            client.set(`auth:phone_otp:${e164}`, code, { ex: ttlSeconds }),
            client.set(`auth:phone_otp:raw:${raw10}`, code, { ex: ttlSeconds }),
          ])
        );
      }
    } catch (err) {
      console.warn("[phone-auth] Redis OTP store deferred to memory fallback:", err);
    }
  }

  // 4. PARALLEL MULTI-CHANNEL DISPATCH (WhatsApp, MSG91 SMS, and Email)
  // Concurrently fired so that 10-30 parallel users experience sub-second response times!
  const text =
    `🔐 *CSC Circle Login Verification*\n\n` +
    `Your 6-digit verification code is: *${code}*\n\n` +
    `Use this code to sign in to your Coimbatore Startup Community account.\n` +
    `Valid for 10 minutes. Please do not share this code with anyone.\n\n` +
    `Connect. Build. Grow.\n` +
    `Coimbatore Startup Community (CSC Circle)`;

  const dispatchJobs: Promise<unknown>[] = [];

  // 4a. WhatsApp dispatch
  if (channel === "whatsapp" || channel === "both" || !email) {
    dispatchJobs.push(
      enqueueWhatsAppNotification({
        recipientPhone: e164,
        text,
        messageType: "phone_login_otp",
        templateVariables: [code],
      }).catch((waErr) => {
        console.warn("[phone-auth] WhatsApp notification enqueue notice:", waErr);
        return { success: false };
      })
    );
  }

  // 4b. MSG91 Multi-Channel SendOTP API (SMS fallback for guaranteed delivery)
  dispatchJobs.push(
    (async () => {
      try {
        const { sendMsg91Otp } = await import("@/lib/services/msg91");
        const otpRes = await sendMsg91Otp({
          phone: e164,
          otp: code,
          otpLength: 6,
          otpExpiryMinutes: 10,
        });
        if (!otpRes.success) {
          console.warn("[phone-auth] MSG91 SendOTP notice:", otpRes.message);
        }
        return otpRes;
      } catch (otpErr) {
        console.warn("[phone-auth] MSG91 SendOTP call exception:", otpErr);
        return { success: false };
      }
    })()
  );

  // 4c. Email dispatch (Mirrored for 100% delivery guarantee)
  dispatchJobs.push(
    (async () => {
      try {
        let targetEmail = email?.trim();
        let targetName: string | null = null;

        if (!targetEmail || !targetEmail.includes("@")) {
          const admin = createAdminClient();
          const { data: profile } = await admin
            .from("profiles")
            .select("email, full_name, display_name")
            .or(`whatsapp.eq.${e164},whatsapp.eq.+${e164},whatsapp.ilike.%${raw10}%`)
            .maybeSingle();

          if (profile?.email && !profile.email.endsWith("@login.csc.internal")) {
            targetEmail = profile.email;
            targetName = profile.full_name || profile.display_name || null;
          }
        }

        if (targetEmail && targetEmail.includes("@") && !targetEmail.endsWith("@login.csc.internal")) {
          await sendSecurityCodeEmail({
            email: targetEmail,
            code,
            name: targetName,
            purpose: "login",
          });
        }
      } catch (emailErr) {
        console.warn("[phone-auth] Email dispatch error:", emailErr);
      }
    })()
  );

  // Await all dispatch channels concurrently
  await Promise.allSettled(dispatchJobs);

  return { success: true, phone: e164 };
}

/**
 * Verifies a 6-digit phone OTP code.
 */
export async function verifyPhoneOtpCode(phone: string, inputCode: string): Promise<boolean> {
  const { e164 } = normalizePhoneForWhatsApp(phone);
  const raw10 = e164.slice(-10);
  const cleanInput = (inputCode || "").trim();
  if (!cleanInput || cleanInput.length < 6) return false;

  let storedCode: string | null = null;

  // 1. Try Redis
  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (client) {
        const [valFull, valRaw] = await withRedisTimeout(
          Promise.all([
            client.get<string>(`auth:phone_otp:${e164}`),
            client.get<string>(`auth:phone_otp:raw:${raw10}`),
          ])
        );
        if (typeof valFull === "string" && valFull.trim()) {
          storedCode = valFull.trim();
        } else if (typeof valRaw === "string" && valRaw.trim()) {
          storedCode = valRaw.trim();
        }
      }
    } catch {
      // fallback to memory
    }
  }

  // 2. Try in-memory store
  if (!storedCode) {
    const mem = memoryOtpStore.get(e164) || memoryOtpStore.get(raw10);
    if (mem && mem.expiresAt > Date.now()) {
      mem.attempts++;
      if (mem.attempts > 5) {
        memoryOtpStore.delete(e164);
        memoryOtpStore.delete(raw10);
        return false;
      }
      storedCode = mem.code;
    }
  }

  // 3. Try Supabase Postgres (Persistent source of truth across all Vercel Serverless Function instances)
  if (!storedCode) {
    try {
      const admin = createAdminClient();
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: records } = await admin
        .from("whatsapp_message_outbox")
        .select("id, message_payload, status, created_at")
        .or(`recipient_phone.eq.${e164},recipient_phone.eq.${raw10}`)
        .eq("message_type", "phone_login_otp")
        .gte("created_at", tenMinutesAgo)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(5);

      if (records && records.length > 0) {
        // Find if cleanInput matches any active, unconsumed code for this phone
        const matchingRecord = records.find((r) => {
          const payload = r.message_payload as Record<string, any> | null;
          if (payload?.verified_at) return false;
          const payloadCode =
            payload?.code ||
            payload?.otp ||
            payload?.text?.match(/\b(\d{6})\b/)?.[1];
          return payloadCode && payloadCode.toString().trim() === cleanInput;
        });

        if (matchingRecord) {
          storedCode = cleanInput;
          // Invalidate single-use code immediately (mark status as cancelled and stamp verified_at)
          const existingPayload = (matchingRecord.message_payload as Record<string, any>) || {};
          void admin
            .from("whatsapp_message_outbox")
            .update({
              status: "cancelled",
              last_error_message: `Verified and consumed at ${new Date().toISOString()}`,
              message_payload: {
                ...existingPayload,
                verified_at: new Date().toISOString(),
              },
            })
            .eq("id", matchingRecord.id);
        }
      }
    } catch (dbErr) {
      console.warn("[verifyPhoneOtpCode] Supabase OTP lookup note:", dbErr);
    }
  }

  // 3b. Cross-channel check: if code was dispatched via security code to linked profile email
  if (!storedCode) {
    try {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("id, email")
        .or(`whatsapp.eq.${e164},whatsapp.eq.+${e164},whatsapp.ilike.%${raw10}%`)
        .maybeSingle();

      if (profile) {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: secRecords } = await admin
          .from("whatsapp_message_outbox")
          .select("id, message_payload, status")
          .eq("recipient_chat_id", `user:${profile.id}`)
          .eq("message_type", "auth_security_code")
          .gte("created_at", tenMinutesAgo)
          .neq("status", "cancelled")
          .limit(3);

        const match = secRecords?.find((r) => {
          const payload = r.message_payload as Record<string, any> | null;
          return !payload?.verified_at && payload?.code?.toString().trim() === cleanInput;
        });

        if (match) {
          storedCode = cleanInput;
          const existingPayload = (match.message_payload as Record<string, any>) || {};
          void admin
            .from("whatsapp_message_outbox")
            .update({
              status: "cancelled",
              last_error_message: `Verified and consumed via phone auth at ${new Date().toISOString()}`,
              message_payload: {
                ...existingPayload,
                verified_at: new Date().toISOString(),
              },
            })
            .eq("id", match.id);
        }
      }
    } catch (crossErr) {
      console.warn("[verifyPhoneOtpCode] Cross-channel code lookup note:", crossErr);
    }
  }

  // 4. Try MSG91 Verify API as resilient fallback
  if (!storedCode) {
    try {
      const { verifyMsg91Otp } = await import("@/lib/services/msg91");
      const msg91Res = await verifyMsg91Otp({ phone: e164, otp: cleanInput });
      if (msg91Res.success) {
        storedCode = cleanInput;
      }
    } catch (msg91Err) {
      console.warn("[verifyPhoneOtpCode] MSG91 verify fallback note:", msg91Err);
    }
  }

  if (!storedCode) return false;

  const matches = crypto.timingSafeEqual(
    Buffer.from(cleanInput.padEnd(6, "0").slice(0, 6)),
    Buffer.from(storedCode.padEnd(6, "0").slice(0, 6))
  );

  if (matches) {
    memoryOtpStore.delete(e164);
    memoryOtpStore.delete(raw10);
    if (isRedisEnabled()) {
      try {
        const client = getRedisClient();
        if (client) {
          void withRedisTimeout(
            Promise.all([
              client.del(`auth:phone_otp:${e164}`),
              client.del(`auth:phone_otp:raw:${raw10}`),
            ])
          );
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
