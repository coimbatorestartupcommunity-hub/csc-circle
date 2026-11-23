"use client";

import * as React from "react";
import { Loader2, ShieldCheck, CheckCircle2, Phone, KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CircularSocialIcon } from "@/components/common/brand-icons";

export interface PhoneVerificationCardProps {
  initialPhone?: string | null;
  isVerified?: boolean;
}

export function PhoneVerificationCard({
  initialPhone = "",
  isVerified: initialVerified = false,
}: PhoneVerificationCardProps) {
  const router = useRouter();
  const [phone, setPhone] = React.useState(initialPhone || "");
  const [isVerified, setIsVerified] = React.useState(initialVerified);
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/member/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch verification code.");
      }

      setOtpSent(true);
      setCountdown(60);
      toast.success("Verification code dispatched via WhatsApp!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dispatch code.");
      toast.error(err instanceof Error ? err.message : "Dispatch error");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanCode = otpCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setError("Please enter the 6-digit code received on WhatsApp.");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/member/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ""),
          code: cleanCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code.");
      }

      setIsVerified(true);
      setOtpSent(false);
      setOtpCode("");
      toast.success("Mobile number verified successfully!");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <section className="flex flex-col rounded-2xl bg-brand-white p-6 ring-1 ring-brand-border">
      <div className="flex items-center justify-between gap-3 border-b border-brand-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <CircularSocialIcon network="whatsapp" className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-brand-ink">Mobile Number Verification</h2>
            <p className="text-xs text-brand-muted">
              Required for automated WhatsApp pass delivery and identity verification.
            </p>
          </div>
        </div>

        {isVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="size-3.5" /> Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            Unverified
          </span>
        )}
      </div>

      {isVerified && !otpSent ? (
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl bg-brand-cloud/40 p-4 text-sm ring-1 ring-brand-border/40">
            <div>
              <span className="text-xs font-medium text-brand-muted">Registered WhatsApp Number</span>
              <p className="font-mono text-sm font-semibold text-brand-ink mt-0.5">
                +91 {phone.replace(/\D/g, "").slice(-10)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsVerified(false)}
              className="text-xs text-brand-muted hover:text-brand-ink"
            >
              Update Number
            </Button>
          </div>
          <p className="text-xs text-brand-muted leading-relaxed">
            Your WhatsApp number is verified. You will receive real-time event entry passes, digital ID notifications, and meetup invitations directly.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="settings-phone" className="text-xs font-semibold text-brand-ink">
                  10-Digit Mobile Number
                </Label>
                <div className="relative flex rounded-xl border border-brand-border bg-brand-cloud/30 shadow-2xs focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/20">
                  <span className="inline-flex items-center px-3.5 text-xs font-bold text-brand-muted border-r border-brand-border select-none">
                    🇮🇳 +91
                  </span>
                  <Input
                    id="settings-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="border-0 bg-transparent h-11 text-sm font-medium tracking-wide focus-visible:ring-0 shadow-none"
                    required
                  />
                </div>
              </div>

              {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

              <Button
                type="submit"
                disabled={sending || phone.replace(/\D/g, "").length < 10}
                className="h-10 w-full gap-2 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800"
              >
                {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="size-3.5" />}
                {sending ? "Sending OTP via WhatsApp..." : "Send Verification OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="rounded-xl bg-teal-50/70 p-3.5 ring-1 ring-teal-200/60">
                <p className="text-xs text-teal-900 leading-relaxed">
                  We sent a 6-digit verification code to <span className="font-bold">+91 {phone}</span> via WhatsApp.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-otp" className="text-xs font-semibold text-brand-ink">
                  Enter 6-Digit WhatsApp Code
                </Label>
                <div className="relative">
                  <Input
                    id="settings-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="h-11 border-brand-border bg-white text-center font-mono text-base tracking-widest sm:text-lg focus-visible:ring-brand-accent/20"
                    autoFocus
                    required
                  />
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-muted" />
                </div>
              </div>

              {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={verifying || otpCode.replace(/\D/g, "").length !== 6}
                  className="h-10 flex-1 gap-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {verifying ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  {verifying ? "Verifying..." : "Verify & Save Mobile Number"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSendOtp()}
                  disabled={sending || countdown > 0}
                  className="h-10 text-xs text-brand-muted hover:text-brand-ink"
                >
                  {countdown > 0 ? `Resend (${countdown}s)` : "Resend OTP"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
