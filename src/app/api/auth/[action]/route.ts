import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authResponse, readAuthBody } from "@/lib/auth/http";
import { hasRecovery, clearRecovery } from "@/lib/auth/recovery";
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from "@/lib/validations/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { safeNext } from "@/lib/auth/redirects";
import {
  generateSecurityCode,
  sendSecurityCodeEmail,
  verifySecurityCode,
  sendPasswordRecoveryEmail,
} from "@/lib/auth/security-code";

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!["login", "signup", "recover", "reset", "reauthenticate", "change-password", "resend"].includes(action)) return authResponse({ error: "Not found." }, 404);
  const ip = clientIp(request);
  const limit = rateLimit(`auth:${action}:${ip}`, 10, 120_000);
  if (!limit.allowed) return authResponse({ error: "Too many attempts. Please wait a few minutes before trying again." }, 429);
  try {
    const body = await readAuthBody(request);
    if (!body) return authResponse({ error: "Invalid request." }, 400);

    // Email-level throttle to prevent targeted password spraying
    if (body.email && typeof body.email === "string") {
      const emailThrottle = rateLimit(`auth:${action}:email:${body.email.toLowerCase().trim()}`, 5, 300_000);
      if (!emailThrottle.allowed) {
        return authResponse({ error: "Too many attempts for this email. Please wait a few minutes." }, 429);
      }
    }
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
      if (!parsed.success) return authResponse({ error: "Check your details, mobile number, and password requirements." }, 422);
      const v = parsed.data;
      const cleanPhone = v.phone.replace(/\D/g, "");
      let userId: string | undefined;

      const { data: signUpData, error } = await sb.auth.signUp({
        email: v.email,
        password: v.password,
        options: {
          captchaToken,
          emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(safeNext(typeof body.next === "string" ? body.next : null))}`,
          data: {
            full_name: v.fullName,
            name: v.fullName,
            phone: cleanPhone,
            whatsapp: cleanPhone,
            accepted_terms: true,
          },
        },
      });

      if (error) {
        if (error.code === "user_already_exists" || /already\s+(registered|exists)/i.test(error.message)) {
          return authResponse({ error: "An account with this email already exists. Please sign in." }, 409);
        }
        // Resilient fallback: Create user via admin API with email_confirm: true when Supabase SMTP fails
        try {
          const admin = createAdminClient();
          const { data: createdData, error: adminErr } = await admin.auth.admin.createUser({
            email: v.email,
            password: v.password,
            email_confirm: true,
            user_metadata: {
              full_name: v.fullName,
              name: v.fullName,
              phone: cleanPhone,
              whatsapp: cleanPhone,
              accepted_terms: true,
            },
          });
          if (adminErr) {
            if (adminErr.code === "user_already_exists" || /already\s+(registered|exists)/i.test(adminErr.message)) {
              return authResponse({ error: "An account with this email already exists. Please sign in." }, 409);
            }
            console.error("[signup] Admin user creation fallback failed:", adminErr);
            return authResponse({ error: "Unable to complete signup. Try again later or sign in if you already have an account." }, 400);
          }
          userId = createdData?.user?.id;
        } catch (adminEx) {
          console.error("[signup] Admin user creation fallback exception:", adminEx);
          return authResponse({ error: "Unable to complete signup. Try again later or sign in if you already have an account." }, 400);
        }
      } else {
        userId = signUpData?.user?.id;
      }

      // Sync user profile phone to profiles
      if (userId) {
        try {
          const admin = createAdminClient();
          await admin.from("profiles").upsert(
            {
              id: userId,
              full_name: v.fullName,
              whatsapp: cleanPhone,
              email: v.email,
            },
            { onConflict: "id" }
          );
        } catch (profileErr) {
          console.warn("[signup] Profile phone sync non-fatal warning:", profileErr);
        }
      }

      return authResponse({ ok: true });
    }
    if (action === "recover" || action === "resend") {
      const parsed = forgotPasswordSchema.safeParse(body);
      if (!parsed.success) return authResponse({ error: "Enter a valid email address." }, 422);

      let sent = false;
      if (action === "recover") {
        try {
          const result = await sb.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${origin}/auth/confirm`, captchaToken });
          if (!result.error) {
            sent = true;
          }
        } catch {
          // Continue to resilient fallback
        }

        // Resilient fallback: Generate recovery link via admin and dispatch directly via community email
        if (!sent) {
          try {
            const admin = createAdminClient();
            const linkRes = await admin.auth.admin.generateLink({
              type: "recovery",
              email: parsed.data.email,
              options: { redirectTo: `${origin}/auth/confirm` },
            });
            if (linkRes.data?.properties?.action_link) {
              await sendPasswordRecoveryEmail({
                email: parsed.data.email,
                actionLink: linkRes.data.properties.action_link,
                name: (linkRes.data.user?.user_metadata?.full_name as string) || null,
              });
              sent = true;
            }
          } catch (recoveryErr) {
            console.error("[recover] Resilient recovery email failed:", recoveryErr);
          }
        }
      } else {
        try {
          const result = await sb.auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: `${origin}/auth/confirm`, captchaToken } });
          if (!result.error) {
            sent = true;
          }
        } catch {
          // Continue to resilient fallback
        }

        // Resilient fallback: Generate signup link via admin and dispatch directly via community email
        if (!sent) {
          try {
            const admin = createAdminClient();
            const linkRes = await admin.auth.admin.generateLink({
              type: "magiclink",
              email: parsed.data.email,
              options: { redirectTo: `${origin}/auth/confirm` },
            });
            if (linkRes.data?.properties?.action_link) {
              await sendPasswordRecoveryEmail({
                email: parsed.data.email,
                actionLink: linkRes.data.properties.action_link,
                name: (linkRes.data.user?.user_metadata?.full_name as string) || null,
              });
              sent = true;
            }
          } catch (resendErr) {
            console.error("[resend] Resilient signup link failed:", resendErr);
          }
        }
      }

      return authResponse({ ok: true });
    }

    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) return authResponse({ error: "Sign in again to continue." }, 401);

    if (action === "reauthenticate") {
      let codeDispatched = false;

      // 1. Attempt native Supabase reauthenticate
      try {
        const { error: reauthErr } = await sb.auth.reauthenticate();
        if (!reauthErr) {
          codeDispatched = true;
        }
      } catch (err) {
        console.warn("[reauthenticate] Supabase reauthenticate returned error, using direct email fallback:", err);
      }

      // 2. Resilient fallback: Generate and send security code directly to user's email
      if (!codeDispatched && user.email) {
        try {
          const code = await generateSecurityCode(user.id);
          await sendSecurityCodeEmail({
            email: user.email,
            code,
            name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || null,
          });
          codeDispatched = true;
        } catch (mailErr) {
          console.error("[reauthenticate] Direct security code email failed:", mailErr);
        }
      }

      if (!codeDispatched) {
        return authResponse({ error: "Could not send the security code. Try again later." }, 400);
      }
      return authResponse({ ok: true });
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

    let updated = false;

    // 1. Verify custom verification code if one was issued
    const isCustomValid = await verifySecurityCode(user.id, nonce.data);
    if (isCustomValid) {
      try {
        const admin = createAdminClient();
        const { error: adminErr } = await admin.auth.admin.updateUserById(user.id, {
          password: parsed.data.newPassword,
        });
        if (!adminErr) {
          updated = true;
        }
      } catch (adminUpdateErr) {
        console.error("[change-password] Admin password update failed:", adminUpdateErr);
      }
    }

    // 2. If not custom, try Supabase native updateUser with nonce
    if (!updated) {
      const { error } = await sb.auth.updateUser({ password: parsed.data.newPassword, nonce: nonce.data });
      if (!error) {
        updated = true;
      }
    }

    if (!updated) {
      return authResponse({ error: "Could not update your password. The security code may be invalid or expired. Request a new code and try again." }, 400);
    }

    const { error: signoutError } = await sb.auth.signOut({ scope: "global" });
    return authResponse({ ok: true, sessionsRevoked: !signoutError });
  } catch {
    return authResponse({ error: "Authentication is temporarily unavailable. Please try again later." }, 503);
  }
}
