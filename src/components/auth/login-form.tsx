"use client";

import * as React from "react";
import { Captcha } from "@/components/auth/captcha";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Phone, Mail, KeyRound, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PasswordField } from "@/components/auth/password-field";
import { GoogleButton } from "@/components/auth/google-button";
import { LinkEmailModal } from "@/components/auth/link-email-modal";
import { authRequest } from "@/lib/auth/request";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import { safeNext } from "@/lib/auth/redirects";
import { CircularSocialIcon } from "@/components/common/brand-icons";
import {
  VerificationSuccessView,
  AnimatedOtpInput,
} from "@/components/common/verification-success-animation";

export function LoginForm() {
  const [authMode, setAuthMode] = React.useState<"email" | "phone">("phone");
  const [captchaToken, setCaptchaToken] = React.useState("");
  const [isOtpSuccess, setIsOtpSuccess] = React.useState(false);
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

  // Phone WhatsApp OTP State
  const [phone, setPhone] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [sendingOtp, setSendingOtp] = React.useState(false);
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);
  const [channel, setChannel] = React.useState<"whatsapp" | "email">("whatsapp");
  const [countdown, setCountdown] = React.useState(0);
  const [showEmailModal, setShowEmailModal] = React.useState(false);

  // Countdown timer for OTP resend
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onEmailSubmit(values: LoginValues) {
    setFormError(null);
    setNeedsConfirm(values.email);
    const result = await authRequest("login", { ...values, captchaToken });
    if (result.error) {
      setFormError(result.error);
      return;
    }
    router.push(`/auth/complete?next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  async function handleSendPhoneOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setFormError(null);
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, channel }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setFormError(data.error || "Failed to send verification code.");
        return;
      }

      setOtpSent(true);
      setCountdown(30); // 30-second resend cooldown requested by user
      toast.success(
        channel === "email"
          ? "Verification code dispatched to your registered email!"
          : "Verification code dispatched to your WhatsApp! (Resend available in 30s)"
      );
    } catch {
      setFormError("Network error while dispatching code. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6) {
      setFormError("Please enter the 6-digit verification code.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ""), code: cleanCode }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setFormError(data.error || "Invalid verification code.");
        setVerifyingOtp(false);
        return;
      }

      setIsOtpSuccess(true);
      toast.success("Successfully verified! Welcome to CSC Circle.");

      setTimeout(() => {
        if (data.needsEmailPrompt) {
          setShowEmailModal(true);
        } else {
          router.push(`/auth/complete?next=${encodeURIComponent(next)}`);
          router.refresh();
        }
      }, 1600);
    } catch {
      setFormError("Network error during verification. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function resendConfirmation() {
    if (!needsConfirm) return;
    const result = await authRequest("resend", { email: needsConfirm, captchaToken });
    if (result.error) toast.error(result.error);
    else toast.message("If eligible, verification instructions will arrive by email.");
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Mode Switcher Tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-200/80">
        <button
          type="button"
          onClick={() => {
            setAuthMode("phone");
            setFormError(null);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs sm:text-sm font-semibold transition ${
            authMode === "phone"
              ? "bg-white text-black shadow-xs ring-1 ring-black/5"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CircularSocialIcon network="whatsapp" size={20} className="shrink-0" />
          <span className={authMode === "phone" ? "text-black font-semibold" : ""}>WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMode("email");
            setFormError(null);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs sm:text-sm font-semibold transition ${
            authMode === "email"
              ? "bg-white text-black shadow-xs ring-1 ring-black/5"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Mail className="size-4 shrink-0 text-slate-500" />
          <span className={authMode === "email" ? "text-black font-semibold" : ""}>Email & Password</span>
        </button>
      </div>

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

      {/* WhatsApp / Phone OTP Sign-in Mode */}
      {authMode === "phone" ? (
        <div className="flex flex-col gap-3 text-left">
          {isOtpSuccess ? (
            <VerificationSuccessView
              title="Verification Confirmed"
              description="Welcome back to Coimbatore Startup Community! Signing in..."
              badgeLabel="CSC Verified Founder"
            />
          ) : !otpSent ? (
            <form onSubmit={handleSendPhoneOtp} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-phone" className="text-xs font-semibold text-slate-800">
                  Mobile Number
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                    +91
                  </span>
                  <Input
                    id="login-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 pl-12 text-sm font-medium tracking-wide rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  We will send a 6-digit verification code directly to your WhatsApp.
                </p>
              </div>

              {/* Delivery Channel Toggle */}
              <div className="flex items-center gap-3 pt-1 text-xs text-slate-600">
                <span className="font-medium text-slate-700">Send via:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="otp-channel"
                    checked={channel === "whatsapp"}
                    onChange={() => setChannel("whatsapp")}
                    className="accent-slate-900"
                  />
                  <span>WhatsApp</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="otp-channel"
                    checked={channel === "email"}
                    onChange={() => setChannel("email")}
                    className="accent-slate-900"
                  />
                  <span>Email</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={sendingOtp || !phone.trim()}
                className="mt-2 h-11 w-full gap-2"
              >
                {sendingOtp ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Send Verification Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPhoneOtp} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-otp" className="text-xs font-semibold text-slate-800">
                    Enter 6-Digit Code
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    className="text-xs font-medium text-slate-900 hover:underline underline-offset-2"
                  >
                    Change Number
                  </button>
                </div>
                <div className="pt-1 pb-1">
                  <AnimatedOtpInput
                    length={6}
                    value={otpCode}
                    onChange={setOtpCode}
                    disabled={verifyingOtp}
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Code sent to WhatsApp (+91 {phone.replace(/\D/g, "").slice(-10)})</span>
                  {countdown > 0 ? (
                    <span className="font-medium text-slate-400">Resend in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendPhoneOtp()}
                      className="font-semibold text-slate-900 hover:underline underline-offset-2"
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={verifyingOtp || otpCode.length !== 6}
                className="mt-2 h-11 w-full gap-2"
              >
                {verifyingOtp ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                Verify & Sign In
              </Button>
            </form>
          )}
        </div>
      ) : (
        /* Email & Password Sign-in Mode */
        <form onSubmit={handleSubmit(onEmailSubmit)} className="flex flex-col gap-3 text-left">
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
      )}

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

      {/* Link Email Modal on first phone login */}
      <LinkEmailModal
        isOpen={showEmailModal}
        nextUrl={`/auth/complete?next=${encodeURIComponent(next)}`}
        onSuccess={() => {
          setShowEmailModal(false);
          router.push(`/auth/complete?next=${encodeURIComponent(next)}`);
          router.refresh();
        }}
      />
    </div>
  );
}
