import "server-only";
import crypto from "node:crypto";
import { sendCommunityEmail } from "@/lib/notifications/email";
import { emailConfiguration } from "@/lib/notifications/config";
import { renderMerakiEditorialEmail } from "@/lib/notifications/template-meraki";
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
 * Sends a branded security code verification email formatted with Master Template A (Meraki Editor).
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
  const config = emailConfiguration();
  const recipientName = name?.trim() || "CSC Circle Member";
  const subject = `Your Security Verification Code: ${code} — CSC Circle`;

  const codeBoxMarkup = `
    <div style="background-color: #FAF8F5; border-radius: 16px; border: 2px dashed #94A3B8; padding: 22px 16px; text-align: center; margin: 20px 0; box-sizing: border-box;">
      <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #0F172A; display: block;">
        ${code}
      </span>
      <span style="display: block; font-size: 11px; color: #64748B; margin-top: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
        Valid for 10 minutes · Single-use authorization code
      </span>
    </div>
    <p style="font-size: 12px; line-height: 1.6; color: #64748B; margin: 0 0 16px 0; text-align: center;">
      If you did not request to change your password, please sign in to your CSC Circle account immediately, check your recent activity, or contact support.
    </p>
  `;

  const html = renderMerakiEditorialEmail({
    base: config.base,
    support: config.support,
    badgeText: "CSC ACCOUNT SECURITY",
    headline: "Security Verification Code",
    headlineItalic: "Authorized Account Protection",
    greeting: `Hello ${recipientName},`,
    body: "You requested to update your account password on CSC Circle. Use the 6-digit security verification code below to authorize this change:",
    customMarkup: codeBoxMarkup,
    buttonText: "Sign In to CSC Circle",
    buttonUrl: `${config.base}/login`,
    thumbtackNote: "Keep your credentials secure. Never share your verification code.",
  });

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
 * Sends a password recovery email formatted with Master Template A (Meraki Editor).
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
  const config = emailConfiguration();
  const recipientName = name?.trim() || "CSC Circle Member";
  const subject = "Reset your CSC Circle password";

  const recoveryMarkup = `
    <div style="background-color: #FAF8F5; border-radius: 16px; border: 1px solid #E2E8F0; padding: 18px 16px; text-align: center; margin: 18px 0; box-sizing: border-box;">
      <p style="font-size: 12px; line-height: 1.6; color: #64748B; margin: 0;">
        This password reset link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;

  const html = renderMerakiEditorialEmail({
    base: config.base,
    support: config.support,
    badgeText: "CSC PASSWORD RECOVERY",
    headline: "Reset Your Password",
    headlineItalic: "Authorized Account Recovery",
    greeting: `Hello ${recipientName},`,
    body: "We received a request to reset your password for your CSC Circle account. Click the button below to choose a new password:",
    customMarkup: recoveryMarkup,
    buttonText: "Reset My Password",
    buttonUrl: actionLink,
    thumbtackNote: "This single-use password reset link remains active for 1 hour.",
  });

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
