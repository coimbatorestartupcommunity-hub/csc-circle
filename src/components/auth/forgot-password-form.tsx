"use client";

import * as React from "react";
import { Captcha } from "@/components/auth/captcha";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authRequest } from "@/lib/auth/request";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [captchaToken, setCaptchaToken] = React.useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const [formError, setFormError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);
    const result = await authRequest("recover", { ...values, captchaToken });
    if (result.error) { setFormError(result.error); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex w-full flex-col items-center gap-3 rounded-xl bg-green-50 px-4 py-6 text-center text-sm text-green-800">
        <MailCheck className="size-7" />
        <p className="font-medium">Check your email</p>
        <p className="text-green-700">
          If an account exists for that email, you&apos;ll receive password
          recovery instructions shortly.
        </p>
        <Link href="/login" className="mt-1 font-medium text-green-800 underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3 text-left">
      {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fp-email">Email</Label>
        <Input id="fp-email" type="email" className="h-11" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>
      <Captcha onToken={setCaptchaToken} />
        <Button type="submit" disabled={isSubmitting || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken)} className="h-11 w-full gap-2">
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Send recovery link
      </Button>
      <Link href="/login" className="text-center text-sm text-brand-muted hover:text-brand-ink">
        Back to sign in
      </Link>
    </form>
  );
}
