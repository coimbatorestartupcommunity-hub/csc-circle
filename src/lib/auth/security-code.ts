import "server-only";
import crypto from "node:crypto";
import { sendCommunityEmail } from "@/lib/notifications/email";
import { getRedisClient, withRedisTimeout } from "@/lib/redis/client";
import { isRedisEnabled } from "@/lib/redis/config";

// In-memory cache fallback for environments without Redis
const memoryCodeStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

function cleanExpiredCodes() {
  const now = Date.now();
  for (const [key, val] of memoryCodeStore.entries()) {
    if (val.expiresAt < now) {
      memoryCodeStore.delete(key);
    }
  }
}

/**
 * Generates and stores a cryptographically secure 6-digit security code for a user.
 * Valid for 10 minutes.
 */
export async function generateSecurityCode(userId: string): Promise<string> {
  cleanExpiredCodes();
  const code = crypto.randomInt(100000, 999999).toString();
  const ttlSeconds = 600; // 10 minutes

  // 1. Store in memory fallback
  memoryCodeStore.set(userId, {
    code,
    expiresAt: Date.now() + ttlSeconds * 1000,
    attempts: 0,
  });

  // 2. Store in Redis if available
  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (client) {
        await withRedisTimeout(
          Promise.resolve(client.set(`auth:sec_code:${userId}`, code, { ex: ttlSeconds }))
        );
      }
    } catch (err) {
      console.warn("[security-code] Redis store deferred to memory fallback:", err);
    }
  }

  return code;
}

/**
 * Verifies a 6-digit security code for a user. Single-use: deletes upon successful match.
 */
export async function verifySecurityCode(userId: string, inputCode: string): Promise<boolean> {
  const cleanInput = (inputCode || "").trim();
  if (!cleanInput || cleanInput.length < 6) return false;

  let storedCode: string | null = null;

  // 1. Try Redis first
  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (client) {
        const val = await withRedisTimeout(
          Promise.resolve(client.get<string>(`auth:sec_code:${userId}`))
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
    const mem = memoryCodeStore.get(userId);
    if (mem && mem.expiresAt > Date.now()) {
      mem.attempts++;
      if (mem.attempts > 5) {
        memoryCodeStore.delete(userId);
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
    // Invalidate immediately upon successful use
    memoryCodeStore.delete(userId);
    if (isRedisEnabled()) {
      try {
        const client = getRedisClient();
        if (client) {
          void withRedisTimeout(Promise.resolve(client.del(`auth:sec_code:${userId}`)));
        }
      } catch {}
    }
    return true;
  }

  return false;
}

/**
 * Sends a branded security code verification email via the community email transport.
 */
export async function sendSecurityCodeEmail({
  email,
  code,
  name,
}: {
  email: string;
  code: string;
  name?: string | null;
}): Promise<void> {
  const recipientName = name?.trim() || "CSC Circle Member";
  const subject = `Your Security Verification Code: ${code} — CSC Circle`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Security Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="margin-bottom: 24px;">
      <span style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">CSC Circle</span>
      <span style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; margin-top: 2px;">Account Security</span>
    </div>

    <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Password Change Security Verification</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Hello ${recipientName},<br>
      You requested to update your account password on CSC Circle. Use the 6-digit security verification code below to authorize this change:
    </p>

    <div style="background-color: #f1f5f9; border-radius: 14px; border: 1.5px dashed #cbd5e1; padding: 20px; text-align: center; margin-bottom: 24px;">
      <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; display: block;">
        ${code}
      </span>
      <span style="display: block; font-size: 12px; color: #64748b; margin-top: 6px; font-weight: 500;">
        Valid for 10 minutes · Single-use only
      </span>
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 24px 0;">
      If you did not request to change your password, please sign in to your CSC Circle account immediately, check your recent activity, or contact support.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
      Coimbatore Startup Community · Secure Account Verification
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
CSC Circle — Account Security Verification

Hello ${recipientName},

You requested to change your password on CSC Circle.
Your 6-digit security code is: ${code}

This code is valid for 10 minutes and can only be used once.

If you did not request this code, please ignore this email or review your account security.

— Coimbatore Startup Community
  `.trim();

  await sendCommunityEmail({
    to: email,
    subject,
    text,
    html,
    notificationId: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  });
}

/**
 * Sends a password recovery email with a direct link.
 */
export async function sendPasswordRecoveryEmail({
  email,
  actionLink,
  name,
}: {
  email: string;
  actionLink: string;
  name?: string | null;
}): Promise<void> {
  const recipientName = name?.trim() || "CSC Circle Member";
  const subject = "Reset your CSC Circle password";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset your password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="margin-bottom: 24px;">
      <span style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">CSC Circle</span>
      <span style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; margin-top: 2px;">Password Recovery</span>
    </div>

    <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Reset Your Password</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Hello ${recipientName},<br>
      We received a request to reset your password for your CSC Circle account. Click the button below to choose a new password:
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${actionLink}" style="background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 12px; display: inline-block;">
        Reset My Password
      </a>
    </div>

    <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin: 0 0 16px 0;">
      If the button above doesn't work, copy and paste this link into your browser:<br>
      <a href="${actionLink}" style="color: #4f46e5; word-break: break-all;">${actionLink}</a>
    </p>

    <p style="font-size: 12px; color: #94a3b8; margin: 0;">
      This link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
CSC Circle — Password Recovery

Hello ${recipientName},

We received a request to reset your CSC Circle password.
To reset your password, open the link below:

${actionLink}

This link is valid for 1 hour. If you did not request this, you can safely ignore this email.

— Coimbatore Startup Community
  `.trim();

  await sendCommunityEmail({
    to: email,
    subject,
    text,
    html,
    notificationId: `pw-reset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  });
}
