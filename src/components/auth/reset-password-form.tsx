"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/auth/password-field";
import { authRequest } from "@/lib/auth/request";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validations/auth";

export function ResetPasswordForm() {
  const router = useRouter();
  const [state, setState] = React.useState<"checking" | "ready" | "invalid" | "done">("checking");
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });
  const [formError, setFormError] = React.useState<string | null>(null);
  const password = useWatch({ control, name: "password", defaultValue: "" });

  // A valid recovery session must already exist (set by /auth/callback).
  React.useEffect(() => {
    fetch("/api/auth/recovery-status", { cache: "no-store" }).then(r => r.json()).then(data => {
      setState(data.ok ? "ready" : "invalid");
    }).catch(() => setState("invalid"));
  }, []);

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);
    const result = await authRequest("reset", values);
    if (result.error) { setFormError(result.error); return; }
    setState("done");
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1500);
  }

  if (state === "checking") {
    return (
      <div className="flex items-center justify-center py-6 text-brand-muted">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  if (state === "invalid") {
    return (
      <div className="flex w-full flex-col items-center gap-3 rounded-xl bg-brand-red/60 px-4 py-6 text-center text-sm text-brand-ink">
        <AlertTriangle className="size-7" />
        <p className="font-medium">This recovery link is invalid or expired.</p>
        <Link href="/forgot-password" className="font-medium underline underline-offset-4">
          Request a new link
        </Link>
      </div>
    );
  }
  if (state === "done") {
    return (
      <div className="flex w-full flex-col items-center gap-3 rounded-xl bg-green-50 px-4 py-6 text-center text-sm text-green-800">
        <CheckCircle2 className="size-7" />
        <p className="font-medium">Password updated.</p>
        <p className="text-green-700">Sign in again using your new password.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3 text-left">
      {formError ? (
        <p role="alert" className="rounded-xl bg-brand-red/60 px-3 py-2 text-sm text-brand-ink">
          {formError}
        </p>
      ) : null}
      <PasswordField id="rp-password" label="New password" autoComplete="new-password" showStrength value={password} {...register("password")} error={errors.password?.message} />
      <PasswordField id="rp-confirm" label="Confirm new password" autoComplete="new-password" {...register("confirmPassword")} error={errors.confirmPassword?.message} />
      <Button type="submit" disabled={isSubmitting} className="h-11 w-full gap-2">
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Update password
      </Button>
    </form>
  );
}
