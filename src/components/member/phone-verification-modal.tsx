"use client";

import * as React from "react";
import { Loader2, ShieldCheck, ArrowRight, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircularSocialIcon } from "@/components/common/brand-icons";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { WHATSAPP_MAINTENANCE_LOCK } from "@/lib/whatsapp/maintenance-config";

export interface PhoneVerificationModalProps {
  isVerified: boolean;
  initialPhone?: string;
}

export function PhoneVerificationModal({
  isVerified,
  initialPhone = "",
}: PhoneVerificationModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [phone, setPhone] = React.useState(initialPhone);
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  // Check on mount if modal should appear - prompts on every profile navigation until verified
  React.useEffect(() => {
    // If WhatsApp is in 24-hour maintenance lock, suppress modal prompt
    if (WHATSAPP_MAINTENANCE_LOCK.isLocked()) {
      setOpen(false);
      return;
    }
    if (isVerified) return;
    // Delay slightly so layout finishes rendering smoothly
    const timer = setTimeout(() => setOpen(true), 1000);
    return () => clearTimeout(timer);
  }, [isVerified]);

  // Resend countdown
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  function handleDismiss() {
    setOpen(false);
  }

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
      if (!res.ok || data.error) {
        setError(data.error || "Failed to dispatch verification code.");
        return;
      }

      setOtpSent(true);
      setCountdown(300); // 5-minute timer (300 seconds)
      toast.success("Verification code dispatched to your WhatsApp! (Valid for 5 minutes)");
    } catch {
      setError("Network error while dispatching code. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/member/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ""), code: cleanCode }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Invalid verification code.");
        return;
      }

      toast.success("Mobile number verified successfully! Your account is secured.");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error during verification. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (!open || isVerified) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-left">
        {/* Header with WhatsApp Logo */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <CircularSocialIcon network="whatsapp" size={32} className="shrink-0" />
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Verify Your Mobile Number
            </h3>
            <p className="text-xs text-slate-500">
              Coimbatore Startup Community (CSC Circle)
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          Please verify your mobile number to activate <strong>instant event entry passes</strong>, <strong>Digital ID Card generation</strong>, and <strong>24/7 WhatsApp concierge assistance</strong>.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100">
            {error}
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="modal-phone" className="text-xs font-semibold text-slate-800">
                Mobile Number
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                  +91
                </span>
                <Input
                  id="modal-phone"
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 pl-12 text-sm font-medium tracking-wide rounded-xl"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-500">
                We will send a 6-digit verification code directly to your WhatsApp.
              </p>
            </div>

            <Button
              type="submit"
              disabled={sending || !phone.trim()}
              className="h-11 w-full gap-2 rounded-xl text-sm font-semibold"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Send Code via WhatsApp
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="modal-otp" className="text-xs font-semibold text-slate-800">
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
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="modal-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="h-11 pl-10 text-center text-lg font-bold tracking-[6px] rounded-xl font-mono"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Dispatched to +91 {phone.replace(/\D/g, "").slice(-10)}</span>
                {countdown > 0 ? (
                  <span className="font-medium text-slate-400">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="font-semibold text-slate-900 hover:underline underline-offset-2"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={verifying || otpCode.length !== 6}
              className="h-11 w-full gap-2 rounded-xl text-sm font-semibold"
            >
              {verifying ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              Verify & Secure Account
            </Button>
          </form>
        )}

        {/* Remind Me Later */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
