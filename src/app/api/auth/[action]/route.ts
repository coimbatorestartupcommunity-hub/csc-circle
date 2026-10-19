import { createClient } from "@/lib/supabase/server";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { hasRecovery, clearRecovery } from "@/lib/auth/recovery";
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from "@/lib/validations/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { z } from "zod";

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!["login", "signup", "recover", "reset", "reauthenticate", "change-password", "resend"].includes(action)) return authResponse({ error: "Not found." }, 404);
  const limit = rateLimit(`auth:${action}:${clientIp(request)}`, 5, 60_000);
  if (!limit.allowed) return authResponse({ error: "Too many attempts. Please wait before trying again." }, 429);
  try {
    const body = await readAuthBody(request);
    if (!body) return authResponse({ error: "Invalid request." }, 400);
    const sb = await createClient();
    const origin = new URL(request.url).origin;
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : undefined;
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken && ["login", "signup", "recover"].includes(action))
      return authResponse({ error: "Complete the verification challenge." }, 422);
    if (action === "login") {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your email and password." }, 422);
      const { error } = await sb.auth.signInWithPassword({ ...parsed.data, options: { captchaToken } });
      if (error) return authResponse({ error: "Sign-in failed. Check your credentials and verify your email." }, 401);
      return authResponse({ ok: true });
    }
    if (action === "signup") {
      const parsed = signupSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check your details and password requirements." }, 422);
      const v = parsed.data;
      const { error } = await sb.auth.signUp({ email: v.email, password: v.password, options: {
        captchaToken, emailRedirectTo: `${origin}/auth/confirm`,
        data: { full_name: v.fullName, name: v.fullName, accepted_terms: true },
      } });
      if (error && error.code !== "user_already_exists") return authResponse({ error: "Unable to complete signup. Try again later or sign in if you already have an account." }, 400);
      return authResponse({ ok: true });
    }
    if (action === "recover" || action === "resend") {
      const parsed = forgotPasswordSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Enter a valid email address." }, 422);
      const result = action === "recover"
        ? await sb.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${origin}/auth/confirm`, captchaToken })
        : await sb.auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: `${origin}/auth/confirm`, captchaToken } });
      // Same response for unknown/existing accounts. Delivery is independently verified.
      if (result.error && ["over_email_send_rate_limit", "over_request_rate_limit", "captcha_failed"].includes(result.error.code ?? ""))
        return authResponse({ error: "The request could not be processed. Please wait and try again." }, 429);
      return authResponse({ ok: true });
    }
    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user?.email_confirmed_at) return authResponse({ error: "Sign in again to continue." }, 401);
    if (action === "reauthenticate") {
      const { error } = await sb.auth.reauthenticate();
      return error ? authResponse({ error: "Could not send the security code. Try again later." }, 400) : authResponse({ ok: true });
    }
    if (action === "reset") {
      const parsed = resetPasswordSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Check the password requirements and confirmation." }, 422);
      if (!await hasRecovery(user.id)) return authResponse({ error: "Recovery link is invalid or expired. Request a new link." }, 403);
      const { error } = await sb.auth.updateUser({ password: parsed.data.password });
      if (error) return authResponse({ error: "Could not update your password. Request a new recovery link." }, 400);
      await clearRecovery();
      const { error: signoutError } = await sb.auth.signOut({ scope: "global" });
      return authResponse({ ok: true, sessionsRevoked: !signoutError });
    }
    const parsed = changePasswordSchema.safeParse(body);
    const nonce = z.string().regex(/^\d{6,10}$/).safeParse(body.nonce);
    if (!parsed.success || !nonce.success) return authResponse({ error: "Check the password, confirmation, and emailed security code." }, 422);
    const { error } = await sb.auth.updateUser({ password: parsed.data.newPassword, nonce: nonce.data });
    if (error) return authResponse({ error: "Could not update your password. Request a new security code and try again." }, 400);
    const { error: signoutError } = await sb.auth.signOut({ scope: "global" });
    return authResponse({ ok: true, sessionsRevoked: !signoutError });
  } catch {
    return authResponse({ error: "Authentication is temporarily unavailable. Please try again later." }, 503);
  }
}
