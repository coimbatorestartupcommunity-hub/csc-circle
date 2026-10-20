"use client";

import * as React from "react";
import { Captcha } from "@/components/auth/captcha";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PasswordField } from "@/components/auth/password-field";
import { GoogleButton } from "@/components/auth/google-button";
import { authRequest } from "@/lib/auth/request";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import { safeNext } from "@/lib/auth/redirects";

export function LoginForm() {
  const [captchaToken, setCaptchaToken] = React.useState("");
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const authCause = params.get("cause");
  const [formError, setFormError] = React.useState<string | null>(
    params.get("error")
      ? authCause === "provider"
        ? "Google could not complete authorization for this sign-in. Please try again or use email and password."
        : authCause === "exchange"
          ? "CSC could not complete the secure Google sign-in exchange. Please try again; if it repeats, contact support."
          : "Sign-in didn't complete. Please try again."
      : null,
  );
  const [needsConfirm, setNeedsConfirm] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    setNeedsConfirm(values.email);
    const result = await authRequest("login", { ...values, captchaToken });
    if (result.error) { setFormError(result.error); return; }
    // The completion route verifies the cookie written by the auth API before
    // it redirects to the success transition.
    router.push(`/auth/complete?next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  async function resendConfirmation() {
    if (!needsConfirm) return;
    const result = await authRequest("resend", { email: needsConfirm, captchaToken });
    if (result.error) toast.error(result.error);
    else toast.message("If eligible, verification instructions will arrive by email.");
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {formError ? (
        <p role="alert" className="rounded-xl bg-brand-red/60 px-3 py-2 text-sm text-brand-ink">
          {formError}
        </p>
      ) : null}
      {needsConfirm ? (
        <div className="rounded-xl bg-brand-gold/70 px-3 py-2 text-left text-sm text-brand-ink">
          If your email is unverified, request a verification link.{" "}
          <button type="button" onClick={resendConfirmation} className="font-medium underline underline-offset-2">
            Resend verification
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 text-left">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" type="email" autoComplete="email" className="h-11" {...register("email")} aria-invalid={!!errors.email} />
          {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        </div>
        <PasswordField id="login-password" label="Password" autoComplete="current-password" {...register("password")} error={errors.password?.message} />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-brand-accent underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Captcha onToken={setCaptchaToken} />
        <Button type="submit" disabled={isSubmitting || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken)} className="h-11 w-full gap-2">
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-brand-muted">
        <Separator className="flex-1" /> or <Separator className="flex-1" />
      </div>

      <GoogleButton next={next} />

      <p className="text-sm text-brand-muted">
        New to CSC Circle?{" "}
        <Link href="/signup" className="font-medium text-brand-accent underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
