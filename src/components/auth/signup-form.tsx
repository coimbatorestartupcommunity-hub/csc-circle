"use client";

import * as React from "react";
import { Captcha } from "@/components/auth/captcha";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PasswordField } from "@/components/auth/password-field";
import { GoogleButton } from "@/components/auth/google-button";
import { authRequest } from "@/lib/auth/request";
import { signupSchema, type SignupValues } from "@/lib/validations/auth";

export function SignupForm() {
  const [captchaToken, setCaptchaToken] = React.useState("");
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });
  const [formError, setFormError] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const password = useWatch({ control, name: "password", defaultValue: "" });

  async function onSubmit(values: SignupValues) {
    setFormError(null);
    const result = await authRequest("signup", { ...values, captchaToken });
    if (result.error) { setFormError(result.error); return; }
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <div className="flex w-full flex-col items-center gap-3 rounded-xl bg-green-50 px-4 py-6 text-center text-sm text-green-800">
        <MailCheck className="size-7" />
        <p className="font-medium">Check your email</p>
        <p className="text-green-700">
          If this address is eligible, verification instructions will be sent to <strong>{sentTo}</strong>. Confirm your
          email to finish setting up your CSC Circle account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {formError ? (
        <p role="alert" className="rounded-xl bg-brand-red/60 px-3 py-2 text-sm text-brand-ink">
          {formError}
        </p>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 text-left">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-name">Full name</Label>
          <Input id="su-name" className="h-11" autoComplete="name" {...register("fullName")} aria-invalid={!!errors.fullName} />
          {errors.fullName ? <p className="text-sm text-destructive">{errors.fullName.message}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-email">Email</Label>
          <Input id="su-email" type="email" className="h-11" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
          {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        </div>
        <PasswordField id="su-password" label="Password" autoComplete="new-password" showStrength value={password} {...register("password")} error={errors.password?.message} />
        <PasswordField id="su-confirm" label="Confirm password" autoComplete="new-password" {...register("confirmPassword")} error={errors.confirmPassword?.message} />

        <label className="flex items-start gap-2 text-sm text-brand-secondary">
          <input type="checkbox" {...register("acceptTerms")} className="mt-0.5 size-4 accent-[var(--brand-accent)]" />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="underline underline-offset-2">Terms</Link> and{" "}
            <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
          </span>
        </label>
        {errors.acceptTerms ? <p className="text-sm text-destructive">{errors.acceptTerms.message}</p> : null}

        <Captcha onToken={setCaptchaToken} />
        <Button type="submit" disabled={isSubmitting || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken)} className="h-11 w-full gap-2">
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Create account
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-brand-muted">
        <Separator className="flex-1" /> or <Separator className="flex-1" />
      </div>
      <GoogleButton next="/member/onboarding" />

      <p className="text-sm text-brand-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
