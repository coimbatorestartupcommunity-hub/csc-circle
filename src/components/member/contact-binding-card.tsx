"use client";

import * as React from "react";
import {
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  KeyRound,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CircularSocialIcon } from "@/components/common/brand-icons";
import { AnimatedOtpInput } from "@/components/common/verification-success-animation";

interface ContactBindingCardProps {
  initialPhone?: string | null;
  initialEmail?: string | null;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
}

export function ContactBindingCard({
  initialPhone = "",
  initialEmail = "",
  isPhoneVerified: initPhoneVerified,
  isEmailVerified: initEmailVerified,
}: ContactBindingCardProps) {
  const router = useRouter();

  // State
  const [phone, setPhone] = React.useState(initialPhone || "");
  const [email, setEmail] = React.useState(
    initialEmail && !initialEmail.endsWith("@login.csc.internal") ? initialEmail : ""
  );
  const [isPhoneVerified, setIsPhoneVerified] = React.useState(initPhoneVerified);
  const isProvisional = Boolean(!initialEmail || initialEmail.endsWith("@login.csc.internal"));

  // Phone verification state
  const [isChangingPhone, setIsChangingPhone] = React.useState(!initPhoneVerified);
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [sendingOtp, setSendingOtp] = React.useState(false);
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);
  const [countdown, setCountdown] = React.useState(0);
  const [phoneError, setPhoneError] = React.useState<string | null>(null);

  // Email binding state
  const [isBindingEmail, setIsBindingEmail] = React.useState(isProvisional);
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [savingEmail, setSavingEmail] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);

  // Timer countdown
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle send WhatsApp OTP
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setPhoneError(null);
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setPhoneError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/member/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch verification code.");

      setOtpSent(true);
      setCountdown(30);
      toast.success("Verification code dispatched via WhatsApp! (Resend available in 30s)");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch code.";
      setPhoneError(msg);
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  }

  // Handle verify WhatsApp OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError(null);
    const cleanCode = otpCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setPhoneError("Please enter the 6-digit code received on WhatsApp.");
      return;
    }

    setVerifyingOtp(true);
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
      if (!res.ok) throw new Error(data.error || "Invalid verification code.");

      toast.success("Mobile number verified successfully!");
      setIsPhoneVerified(true);
      setIsChangingPhone(false);
      setOtpSent(false);
      setOtpCode("");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed.";
      setPhoneError(msg);
      toast.error(msg);
    } finally {
      setVerifyingOtp(false);
    }
  }

  // Handle Link / Bind Email Address
  async function handleLinkEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setEmailError("Password must be at least 8 characters long.");
      return;
    }

    setSavingEmail(true);
    try {
      const res = await fetch("/api/auth/phone/link-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean, password: newPassword || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to link email.");

      toast.success("Account unified! Email and mobile number are permanently bound.");
      setEmail(clean);
      setIsBindingEmail(false);
      setNewEmail("");
      setNewPassword("");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to link email.";
      setEmailError(msg);
      toast.error(msg);
    } finally {
      setSavingEmail(false);
    }
  }

  const isDualVerified = isPhoneVerified && Boolean(email) && !isProvisional;

  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-brand-border bg-brand-white p-6 sm:p-8 shadow-xs ring-1 ring-brand-border/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-brand-ink">
              Unified Account Credentials &amp; Contacts
            </h2>
            <p className="text-xs text-brand-secondary">
              Bind your mobile number and email ID to sign in seamlessly using either method.
            </p>
          </div>
        </div>

        {isDualVerified && (
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 className="size-3.5 text-emerald-600" /> Multi-Channel Login Active
          </span>
        )}
      </div>

      {/* Dual Login Active Alert */}
      {isDualVerified ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-950">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <strong className="block font-semibold">Dual-Login Bound to Single Account</strong>
            <p className="mt-0.5 leading-relaxed text-emerald-800">
              Your WhatsApp mobile number (<strong>+91 {phone.replace(/\D/g, "").slice(-10)}</strong>) and email ID (
              <strong>{email}</strong>) are securely unified. You can sign in using either credential at any time with 0 duplicate accounts.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-950">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <strong className="block font-semibold">Complete Your Contact Verification</strong>
            <p className="mt-0.5 leading-relaxed text-amber-800">
              Verify both your WhatsApp mobile number and your email address below so your profile, event tickets, and digital membership are accessible across all devices.
            </p>
          </div>
        </div>
      )}

      {/* 2-Column Contact Cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Card 1: Mobile Number (WhatsApp) */}
        <div className="flex flex-col justify-between rounded-2xl border border-brand-border bg-brand-cloud/30 p-5 shadow-xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-ink">
                <CircularSocialIcon network="whatsapp" size={20} /> Mobile Number (WhatsApp)
              </span>
              {isPhoneVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="size-3 text-emerald-600" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                  Unverified
                </span>
              )}
            </div>

            {!isChangingPhone && isPhoneVerified ? (
              <div className="mt-2 flex flex-col gap-1">
                <span className="font-mono text-base font-bold text-brand-ink">
                  +91 {phone.replace(/\D/g, "").slice(-10)}
                </span>
                <p className="text-xs text-brand-muted">
                  Used for automated WhatsApp pass delivery and passwordless 6-digit login.
                </p>
              </div>
            ) : (
              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="mt-2 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="contact-phone" className="text-xs font-semibold text-brand-ink">
                    10-Digit Mobile Number
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-brand-muted">
                      +91
                    </span>
                    <Input
                      id="contact-phone"
                      type="tel"
                      value={phone.replace(/\D/g, "").slice(-10)}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setOtpSent(false);
                      }}
                      disabled={otpSent || sendingOtp || verifyingOtp}
                      placeholder="9876543210"
                      maxLength={10}
                      className="h-10 pl-11 font-mono text-sm bg-white"
                    />
                  </div>
                </div>

                {otpSent && (
                  <div className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-brand-border">
                    <Label className="text-xs font-semibold text-brand-ink">
                      Enter 6-Digit WhatsApp Code
                    </Label>
                    <AnimatedOtpInput
                      length={6}
                      value={otpCode}
                      onChange={setOtpCode}
                      disabled={verifyingOtp}
                      autoFocus
                    />
                    <div className="flex items-center justify-between text-[11px] text-brand-muted pt-1">
                      <span>Received on WhatsApp</span>
                      {countdown > 0 ? (
                        <span>Resend in {countdown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          className="font-semibold text-brand-accent hover:underline"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {phoneError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{phoneError}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {!otpSent ? (
                    <Button
                      type="submit"
                      disabled={sendingOtp || phone.replace(/\D/g, "").length < 10}
                      className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {sendingOtp ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="size-3.5" />}
                      Send Verification Code
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={verifyingOtp || otpCode.length !== 6}
                      className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {verifyingOtp ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                      Verify &amp; Save
                    </Button>
                  )}
                  {isPhoneVerified && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsChangingPhone(false);
                        setOtpSent(false);
                      }}
                      className="h-9 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>

          {!isChangingPhone && isPhoneVerified && (
            <div className="mt-4 border-t border-brand-border/60 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsChangingPhone(true);
                  setOtpSent(false);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:underline"
              >
                <RefreshCw className="size-3" /> Change Mobile Number
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Email Address */}
        <div className="flex flex-col justify-between rounded-2xl border border-brand-border bg-brand-cloud/30 p-5 shadow-xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-ink">
                <Mail className="size-4 text-brand-accent" /> Email ID Credentials
              </span>
              {email && !isProvisional ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="size-3 text-emerald-600" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                  Unlinked
                </span>
              )}
            </div>

            {!isBindingEmail && email && !isProvisional ? (
              <div className="mt-2 flex flex-col gap-1">
                <span className="text-sm sm:text-base font-bold text-brand-ink truncate">
                  {email}
                </span>
                <p className="text-xs text-brand-muted">
                  Used for password sign-in, Google SSO, receipt deliveries, and official notifications.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLinkEmail} className="mt-2 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="contact-email" className="text-xs font-semibold text-brand-ink">
                    Email Address
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={savingEmail}
                    placeholder="founder@yourstartup.com"
                    required
                    className="h-10 text-sm bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="contact-pwd" className="text-xs font-semibold text-brand-ink">
                    Password (Optional — for direct password login)
                  </Label>
                  <Input
                    id="contact-pwd"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={savingEmail}
                    placeholder="Minimum 8 characters"
                    className="h-10 text-sm bg-white"
                  />
                </div>

                {emailError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{emailError}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="submit"
                    disabled={savingEmail || !newEmail.includes("@")}
                    className="h-9 gap-1.5 text-xs font-semibold bg-brand-ink hover:bg-brand-ink/90 text-white"
                  >
                    {savingEmail ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
                    Save &amp; Bind Email
                  </Button>
                  {!isProvisional && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsBindingEmail(false)}
                      className="h-9 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>

          {!isBindingEmail && email && !isProvisional && (
            <div className="mt-4 border-t border-brand-border/60 pt-3">
              <button
                type="button"
                onClick={() => {
                  setNewEmail(email);
                  setIsBindingEmail(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:underline"
              >
                <RefreshCw className="size-3" /> Update Email Address
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
