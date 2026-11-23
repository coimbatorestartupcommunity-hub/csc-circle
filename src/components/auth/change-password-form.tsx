"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ShieldCheck, Mail, CheckCircle2, Loader2, ArrowRight, Lock } from "lucide-react";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/validations/auth";
import { authRequest } from "@/lib/auth/request";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm({ isDedicatedPage = false }: { isDedicatedPage?: boolean }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const password = useWatch({ control, name: "newPassword", defaultValue: "" });
  const [nonce, setNonce] = useState("");
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  async function sendCode() {
    setSending(true);
    const result = await authRequest("reauthenticate", {});
    setSending(false);

    if (result.error) {
      toast.error(result.error);
      setMessage(result.error);
    } else {
      setCodeSent(true);
      toast.success("Security verification code dispatched to your registered email.");
      setMessage("A 6-digit security code has been sent to your verified email address.");
    }
  }

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, "").slice(0, 6);
      if (digits) {
        setNonce(digits);
        toast.success(`Security code pasted (${digits})`);
      } else {
        toast.error("Clipboard does not contain numeric code.");
      }
    } catch {
      toast.error("Please paste the code manually.");
    }
  };

  async function submit(values: ChangePasswordValues) {
    if (!nonce.trim()) {
      toast.error("Please enter the email security verification code first.");
      return;
    }

    const result = await authRequest("change-password", { ...values, nonce: nonce.trim() });
    if (result.error) {
      toast.error(result.error);
      setMessage(result.error);
      return;
    }

    setIsSuccess(true);
    reset();
    setNonce("");
    toast.success("Password updated successfully!");

    const statusMsg = result.sessionsRevoked
      ? "Password updated. Please sign in again with your new password."
      : "Password updated successfully.";
    setMessage(statusMsg);

    if (isDedicatedPage) {
      setTimeout(() => {
        router.push("/profile/settings");
      }, 1800);
    }
  }

  return (
    <section className={`flex w-full flex-col gap-5 ${isDedicatedPage ? "" : "rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border"}`}>
      {!isDedicatedPage && (
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-teal-600" />
          <h2 className="font-semibold text-brand-ink">Account Security &amp; Password</h2>
        </div>
      )}

      {!isDedicatedPage && (
        <p className="max-w-4xl text-sm leading-relaxed text-brand-secondary">
          Change your password or add one to your existing Google account. Your CSC identity and membership stay linked to the same account. Verify your email with a security code first.
        </p>
      )}

      {isSuccess ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-7" />
          </div>
          <h3 className="text-base font-bold text-emerald-950">Password Updated Successfully</h3>
          <p className="mt-1 text-xs text-emerald-800">{message}</p>
          {isDedicatedPage && (
            <p className="mt-3 text-[11px] font-semibold text-emerald-700">
              Redirecting back to Settings…
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
          {/* Step 1: Email Security Code */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="security-code" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="size-3.5 text-teal-600" />
                Step 1: Email Security Verification
              </Label>
              {nonce.length === 6 && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="size-3" /> Code Entered
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Click &quot;Send security code&quot; to receive a 6-digit verification code at your registered email address.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  id="security-code"
                  placeholder="6-digit security code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={nonce}
                  onChange={(e) => setNonce(e.target.value.replace(/\D/g, ""))}
                  required
                  className="h-11 text-base sm:text-sm font-mono tracking-wider pr-14 bg-white"
                />
                <button
                  type="button"
                  onClick={handlePasteCode}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-md border border-teal-200 transition"
                >
                  Paste
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={sendCode}
                disabled={sending}
                className="h-11 shrink-0 bg-white hover:bg-slate-50 sm:min-w-44 text-xs font-semibold"
              >
                {sending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                {sending ? "Sending Code…" : codeSent ? "Resend Code" : "Send Security Code"}
              </Button>
            </div>
          </div>

          {/* Step 2: Set New Password */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-1.5">
              <Lock className="size-3.5 text-teal-600" />
              <span className="text-xs font-bold text-slate-800">Step 2: Choose Your New Password</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField
                id="change-password"
                label="New password"
                autoComplete="new-password"
                {...register("newPassword")}
                value={password}
                showStrength
                error={errors.newPassword?.message}
              />
              <PasswordField
                id="change-confirm"
                label="Confirm password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {message ? (
              <p role="status" className="text-xs text-slate-600" aria-live="polite">
                {message}
              </p>
            ) : <div />}

            <Button
              type="submit"
              disabled={isSubmitting || nonce.length === 0}
              className="h-11 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm"
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              {isSubmitting ? "Updating Password…" : "Update Password"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
