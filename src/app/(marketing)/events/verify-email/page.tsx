"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ShieldCheck, Loader2, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";

function VerifyGuestEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = searchParams.get("id");
  const token = searchParams.get("token");
  const eventParam = searchParams.get("event") || "csc-joint-online-meeting";

  const [state, setState] = React.useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [verifiedEmail, setVerifiedEmail] = React.useState("");
  const [targetSlug, setTargetSlug] = React.useState(eventParam);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (!id || !token) {
      setState("error");
      setErrorMessage("Missing verification parameters. Please use the full link received in your email.");
      return;
    }

    let isMounted = true;

    async function performVerification() {
      try {
        const response = await fetch("/api/payments/guest-email/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationId: id, token }),
        });

        const data = await response.json();

        if (!isMounted) return;

        if (!response.ok || !data.ok) {
          setState("error");
          setErrorMessage(data.error || "The email verification link has expired or has already been used.");
          return;
        }

        const email = data.email || "";
        const slug = data.eventSlug || eventParam || "csc-joint-online-meeting";
        setVerifiedEmail(email);
        setTargetSlug(slug);
        setState("success");

        // Save in localStorage for automatic form recovery
        try {
          localStorage.setItem(
            "csc_guest_verification",
            JSON.stringify({
              id,
              token,
              email: email.toLowerCase(),
              eventSlug: slug,
              verifiedAt: Date.now(),
            })
          );
        } catch {
          // Ignore storage quota error
        }

        // Animate progress bar to 100% and auto-redirect
        const startTime = Date.now();
        const duration = 1800; // 1.8 seconds

        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const pct = Math.min(100, Math.round((elapsed / duration) * 100));
          setProgress(pct);

          if (pct >= 100) {
            clearInterval(interval);
            const redirectUrl = `/events/${encodeURIComponent(slug)}?verified=true&guestId=${encodeURIComponent(id!)}&guestToken=${encodeURIComponent(token!)}&email=${encodeURIComponent(email)}`;
            router.replace(redirectUrl);
          }
        }, 30);
      } catch {
        if (isMounted) {
          setState("error");
          setErrorMessage("Network error during verification. Please check your internet connection.");
        }
      }
    }

    const timer = setTimeout(performVerification, 600);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [id, token, eventParam, router]);

  const targetUrl = `/events/${encodeURIComponent(targetSlug)}?verified=true&guestId=${encodeURIComponent(id || "")}&guestToken=${encodeURIComponent(token || "")}&email=${encodeURIComponent(verifiedEmail)}`;

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Decorative ambient gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-teal-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-indigo-200/40 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl bg-white/95 p-6 sm:p-8 shadow-2xl ring-1 ring-slate-900/10 backdrop-blur-xl">
          {/* Header Brand */}
          <div className="flex flex-col items-center text-center mb-6">
            <BrandLogo showWordmark={false} href={null} markSize={36} priority={false} />
            <span className="mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">
              Coimbatore Startup Community
            </span>
          </div>

          <AnimatePresence mode="wait">
            {/* 1. VERIFYING STATE */}
            {state === "verifying" && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center py-6"
              >
                {/* Glowing Spinner with Shield */}
                <div className="relative flex size-20 items-center justify-center">
                  <div className="absolute inset-0 animate-ping rounded-full bg-teal-400/20" />
                  <div className="absolute inset-0 animate-spin rounded-full border-3 border-teal-500 border-t-transparent" />
                  <div className="relative flex size-14 items-center justify-center rounded-full bg-teal-50 text-teal-700 shadow-inner">
                    <ShieldCheck className="size-7" />
                  </div>
                </div>

                <h1 className="mt-6 text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Verifying Your Email
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs">
                  Confirming your single-use verification token with CSC Circle security…
                </p>

                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Securing checkout session…</span>
                </div>
              </motion.div>
            )}

            {/* 2. SUCCESS STATE */}
            {state === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                className="flex flex-col items-center text-center py-4"
              >
                {/* Checkmark Animation with celebration badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                  className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xl shadow-teal-500/25 ring-8 ring-emerald-50"
                >
                  <CheckCircle2 className="size-11" strokeWidth={2.5} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="absolute -top-1 -right-1 rounded-full bg-amber-400 p-1 text-slate-950 shadow-md"
                  >
                    <Sparkles className="size-3.5 fill-current" />
                  </motion.div>
                </motion.div>

                <h1 className="mt-5 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Email Verified!
                </h1>

                {verifiedEmail && (
                  <p className="mt-1 text-xs font-mono font-semibold text-teal-800 bg-teal-50/80 px-2.5 py-1 rounded-md border border-teal-200/60 truncate max-w-[280px]">
                    {verifiedEmail}
                  </p>
                )}

                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Your email has been securely confirmed. Redirecting you directly back to your event registration to proceed with UPI checkout…
                </p>

                {/* Animated progress bar */}
                <div className="mt-6 w-full flex flex-col gap-1.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-900/5">
                    <motion.div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                      style={{ width: `${progress}%` }}
                      transition={{ ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10.5px] font-semibold text-slate-400 px-0.5">
                    <span>Redirecting automatically…</span>
                    <span>{progress}%</span>
                  </div>
                </div>

                {/* Instant fallback button */}
                <div className="mt-5 w-full">
                  <Link
                    href={targetUrl}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-[0.99]"
                  >
                    <span>Proceed to Payment Now</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* 3. ERROR STATE */}
            {state === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center py-4"
              >
                <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                  <AlertCircle className="size-8" />
                </div>

                <h1 className="mt-4 text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Verification Link Expired
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {errorMessage || "For your security, verification links expire in 10 minutes. Please return to the event page to request a fresh code."}
                </p>

                <div className="mt-6 w-full">
                  <Link
                    href={`/events/${encodeURIComponent(eventParam)}`}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-md transition"
                  >
                    <span>Return to Event Registration</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function VerifyGuestEmailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <VerifyGuestEmailContent />
    </React.Suspense>
  );
}
