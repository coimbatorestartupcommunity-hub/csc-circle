"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Input } from "@/components/ui/input";
import {
  type PaymentDeepLinks,
  detectPlatform,
  type ClientPlatform,
  buildAndroidIntentUri,
  ANDROID_UPI_PACKAGES,
} from "@/lib/payments/upi";
import { UpiQr } from "./upi-qr";

export type ModalPaymentState =
  | "creating"
  | "awaiting_payment"
  | "verifying"
  | "pending_review"
  | "confirmed"
  | "failed";

export interface PaymentOrderDetails {
  id: string;
  orderReference: string;
  amountPaise: number;
  totalRupees: number;
  payeeName: string;
  payeeVpa: string;
  upiUri: string;
  status: string;
  expiresAt: string;
  attendeeCount?: number;
}

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PaymentOrderDetails | null;
  deepLinks: PaymentDeepLinks | null;
  eventTitle: string;
  attendeeName: string;
  eventDates?: { startsAt: string; endsAt?: string; location?: string };
  initialState?: ModalPaymentState;
  onResetOrder?: () => void;
}

function deriveStateFromOrderStatus(status?: string): ModalPaymentState {
  if (status === "verified" || status === "reconciled") return "confirmed";
  if (status === "expired" || status === "failed" || status === "cancelled") return "failed";
  if (status === "needs_review") return "pending_review";
  if (status === "processing") return "verifying";
  return "awaiting_payment";
}

export function PaymentModal({
  isOpen,
  onClose,
  order,
  deepLinks,
  eventTitle,
  attendeeName,
  eventDates,
  initialState = "awaiting_payment",
  onResetOrder,
}: PaymentModalProps) {
  const reduceMotion = useReducedMotion();

  // Authoritative state derivation with user action override support
  const [internalState, setInternalState] = React.useState<ModalPaymentState | null>(null);
  const [prevOrderStatus, setPrevOrderStatus] = React.useState<string | undefined>(order?.status);

  if (order?.status !== prevOrderStatus) {
    setPrevOrderStatus(order?.status);
    setInternalState(null);
  }

  const modalState =
    internalState ??
    (order?.status ? deriveStateFromOrderStatus(order.status) : initialState);
  const setModalState = setInternalState;

  const [userUtr, setUserUtr] = React.useState("");
  const [submittingUtr, setSubmittingUtr] = React.useState(false);
  const [verifiedPassHref, setVerifiedPassHref] = React.useState<string | null>(null);
  const [verifiedRegRef, setVerifiedRegRef] = React.useState<string | null>(null);

  // Five-minute verification timer state (persisted across tab switch / refresh)
  const [verifyTimerStartedAt, setVerifyTimerStartedAt] = React.useState<number | null>(() => {
    if (typeof window === "undefined" || !order?.id) return null;
    try {
      const stored = sessionStorage.getItem(`csc_verify_timer_${order.id}`);
      if (stored) {
        const startTime = Number(stored);
        if (Number.isFinite(startTime)) return startTime;
      }
    } catch {
      // Ignored
    }
    return null;
  });

  const [verifyTimerSecondsLeft, setVerifyTimerSecondsLeft] = React.useState<number>(() => {
    if (typeof window === "undefined" || !order?.id) return 300;
    try {
      const stored = sessionStorage.getItem(`csc_verify_timer_${order.id}`);
      if (stored) {
        const startTime = Number(stored);
        if (Number.isFinite(startTime)) {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          return Math.max(0, 300 - elapsedSeconds);
        }
      }
    } catch {
      // Ignored
    }
    return 300;
  });

  const [showUtrSection, setShowUtrSection] = React.useState<boolean>(() => {
    if (typeof window === "undefined" || !order?.id) return false;
    try {
      return Boolean(sessionStorage.getItem(`csc_verify_timer_${order.id}`));
    } catch {
      return false;
    }
  });

  // Client platform detection
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const platformInfo = React.useMemo(() => {
    if (!isMounted) {
      return {
        platform: "desktop" as ClientPlatform,
        isAndroid: false,
        isIos: false,
        isDesktop: true,
        isMobile: false,
      };
    }
    return detectPlatform();
  }, [isMounted]);

  // Five-Minute Countdown Interval Handler
  React.useEffect(() => {
    if (!verifyTimerStartedAt || modalState === "confirmed" || modalState === "failed") return;

    const totalWindowSeconds = 5 * 60; // 300 seconds

    const updateTimer = () => {
      const elapsedSeconds = Math.floor((Date.now() - verifyTimerStartedAt) / 1000);
      const remaining = Math.max(0, totalWindowSeconds - elapsedSeconds);
      setVerifyTimerSecondsLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [verifyTimerStartedAt, modalState]);

  const [startingVerification, setStartingVerification] = React.useState(false);

  // Starts the five-minute verification window. The start instant is recorded
  // on the server so the countdown survives refresh, tab suspension, and
  // returning from a UPI app; sessionStorage is only a local fallback.
  const startVerificationTimer = async () => {
    if (!order?.id) return;
    setShowUtrSection(true);
    if (verifyTimerStartedAt) return;
    setStartingVerification(true);
    try {
      const res = await fetch(`/api/payments/orders/${order.id}/start-verification`, {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.ok && typeof data.verificationStartedAt === "string") {
        const startMs = Date.parse(data.verificationStartedAt);
        if (Number.isFinite(startMs)) {
          setVerifyTimerStartedAt(startMs);
          setVerifyTimerSecondsLeft(Math.max(0, 300 - Math.floor((Date.now() - startMs) / 1000)));
          try {
            sessionStorage.setItem(`csc_verify_timer_${order.id}`, String(startMs));
          } catch {
            // Ignored
          }
          return;
        }
      }
    } catch {
      // Fall through to the local persisted countdown below
    } finally {
      setStartingVerification(false);
    }
    const now = Date.now();
    setVerifyTimerStartedAt(now);
    setVerifyTimerSecondsLeft(300);
    try {
      sessionStorage.setItem(`csc_verify_timer_${order.id}`, String(now));
    } catch {
      // Ignored
    }
  };

  const formatTimerDigits = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const failureReason =
    order?.status === "expired" || order?.status === "failed" || order?.status === "cancelled"
      ? order.status
      : "failed";

  const modalRef = React.useRef<HTMLDivElement>(null);
  const triggerElementRef = React.useRef<HTMLElement | null>(null);

  // Focus trapping and keyboard accessibility (WCAG 2.1 AA)
  React.useEffect(() => {
    if (!isOpen) return;
    triggerElementRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalState !== "verifying" && !submittingUtr) {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerElementRef.current?.focus?.();
    };
  }, [isOpen, modalState, submittingUtr, onClose]);

  // Screen reader announcement derived reactively
  const liveAnnouncement = React.useMemo(() => {
    switch (modalState) {
      case "creating":
        return "Initializing secure payment session.";
      case "awaiting_payment":
        return `Payment order created for ₹${order?.totalRupees ?? 0}. Complete payment via UPI app or scan the QR code.`;
      case "verifying":
        return "Checking payment against bank records. Please wait.";
      case "pending_review":
        return "Payment verification is under review. Your registration details are saved.";
      case "confirmed":
        return "Payment successful! Your CSC Circle event registration is confirmed.";
      case "failed":
        return "Payment order expired or failed. Please initiate a new checkout.";
      default:
        return "";
    }
  }, [modalState, order?.totalRupees]);

  // Exponential Backoff Status Polling Engine with Jitter & 429 Handling
  React.useEffect(() => {
    if (!order || !isOpen || modalState === "confirmed" || modalState === "failed") return;

    let timeoutId: NodeJS.Timeout;
    let pollCount = 0;
    let cancelled = false;

    const pollStatus = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/payments/orders/${order.id}/status`, { cache: "no-store" });

        if (res.status === 429) {
          const retryHeader = res.headers.get("Retry-After");
          const retrySeconds = retryHeader ? Number.parseInt(retryHeader, 10) : 5;
          const retryMs =
            Number.isFinite(retrySeconds) && retrySeconds > 0 ? retrySeconds * 1000 : 5000;
          timeoutId = setTimeout(pollStatus, retryMs);
          return;
        }

        if (!res.ok) {
          timeoutId = setTimeout(pollStatus, 4000);
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        // Adopt the server-recorded verification-window start so the
        // countdown survives refresh and returning from a UPI app, even in a
        // new tab where sessionStorage has no value yet.
        if (typeof data.verificationStartedAt === "string" && data.verificationStartedAt) {
          const serverStart = Date.parse(data.verificationStartedAt);
          if (Number.isFinite(serverStart)) {
            setVerifyTimerStartedAt((prev) => {
              if (prev === serverStart) return prev;
              try {
                sessionStorage.setItem(`csc_verify_timer_${order.id}`, String(serverStart));
              } catch {
                // Ignored
              }
              return serverStart;
            });
            setShowUtrSection(true);
          }
        }

        // Terminal state: Confirmed (verified or reconciled)
        if (data.status === "verified" || data.status === "reconciled") {
          setVerifiedPassHref(data.passHref || null);
          setVerifiedRegRef(data.registrationReference || order.orderReference);
          setModalState("confirmed");
          return;
        }

        // Terminal state: Failed / Expired / Cancelled
        if (data.status === "expired" || data.status === "failed" || data.status === "cancelled") {
          setModalState("failed");
          return;
        }

        // Needs Review state
        if (data.status === "needs_review") {
          setModalState("pending_review");
          return;
        }

        pollCount++;
        if (modalState === "verifying" && pollCount > 20) {
          setModalState("pending_review");
          return;
        }

        // Calculate next exponential backoff interval with jitter
        const base = Math.min(2500 * Math.pow(1.2, Math.min(pollCount, 6)), 8000);
        const jitter = (Math.random() - 0.5) * 500;
        const nextDelay = Math.max(2000, Math.round(base + jitter));

        const delay = modalState === "awaiting_payment" ? (showUtrSection ? 5000 : 8000) : nextDelay;
        timeoutId = setTimeout(pollStatus, delay);
      } catch {
        timeoutId = setTimeout(pollStatus, 5000);
      }
    };

    // Immediate check on tab visibility regain (e.g. returning from GPay/PhonePe/Paytm app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timeoutId);
        pollStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    timeoutId = setTimeout(pollStatus, modalState === "verifying" ? 1200 : 5000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [order, isOpen, modalState, showUtrSection, setModalState]);

  if (!isOpen) return null;

  // App buttons targeted deep-link execution (prevents opening WhatsApp).
  // NOTE: launching an app does NOT start the verification window — the
  // five-minute countdown begins only when the attendee explicitly activates
  // "I Have Paid — Enter UTR" after returning from the UPI app.
  const handleAppLaunch = (appName: string, packageId: string, iosScheme: string) => {
    if (!order) return;

    const query = order.upiUri.startsWith("upi://pay?")
      ? order.upiUri.slice("upi://pay?".length)
      : "";

    if (platformInfo.isAndroid) {
      // Direct Android package intent targeting prevents WhatsApp interception
      const intentUri = buildAndroidIntentUri(order.upiUri, packageId);
      window.location.assign(intentUri);
    } else if (platformInfo.isIos) {
      // Specific iOS deep links
      const schemeUri =
        appName === "PhonePe" && deepLinks?.phonepe
          ? deepLinks.phonepe
          : appName === "Paytm" && deepLinks?.paytm
          ? deepLinks.paytm
          : appName === "Google Pay" && deepLinks?.gpay
          ? deepLinks.gpay
          : appName === "BHIM" && deepLinks?.bhim
          ? deepLinks.bhim
          : `${iosScheme}?${query}`;
      window.location.assign(schemeUri);

      // Graceful fallback if app is not installed
      const startTime = Date.now();
      setTimeout(() => {
        if (!document.hidden && Date.now() - startTime >= 1800) {
          toast.info(
            `If ${appName} is not installed, you can scan the QR code below using any UPI app.`
          );
        }
      }, 2000);
    } else {
      // Desktop: inform attendee to scan QR or use mobile
      toast.info(
        `To pay with ${appName}, please scan the QR code below with your mobile device.`
      );
    }
  };

  const handleClaimUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!/^\d{12}$/.test(userUtr.trim())) {
      toast.error("Please enter a valid 12-digit numeric UPI reference (UTR).");
      return;
    }

    setSubmittingUtr(true);
    try {
      const res = await fetch(`/api/payments/orders/${order.id}/claim-utr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utr: userUtr.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not submit UTR claim.");
      }

      toast.success("UTR submitted for bank verification.");
      if (data.status === "verified" || data.status === "reconciled") {
        setModalState("confirmed");
      } else {
        setModalState("verifying");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record UTR.");
    } finally {
      setSubmittingUtr(false);
    }
  };

  const googleCalUrl = eventDates?.startsAt
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        eventTitle
      )}&dates=${new Date(eventDates.startsAt).toISOString().replace(/-|:|\.\d\d\d/g, "")}/${
        eventDates.endsAt
          ? new Date(eventDates.endsAt).toISOString().replace(/-|:|\.\d\d\d/g, "")
          : new Date(eventDates.startsAt).toISOString().replace(/-|:|\.\d\d\d/g, "")
      }&details=${encodeURIComponent(
        `CSC Circle Event Admission Confirmed. Reference: ${verifiedRegRef || order?.orderReference || ""}`
      )}&location=${encodeURIComponent(eventDates.location || "Coimbatore")}`
    : null;

  const downloadIcs = () => {
    if (!eventDates?.startsAt) return;
    const startIso = new Date(eventDates.startsAt).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endIso = eventDates.endsAt
      ? new Date(eventDates.endsAt).toISOString().replace(/-|:|\.\d\d\d/g, "")
      : startIso;

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CSC Circle//Event Admission//EN",
      "BEGIN:VEVENT",
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:CSC Event Admission Confirmed. Reference: ${verifiedRegRef || order?.orderReference || ""}`,
      `LOCATION:${eventDates.location || "Coimbatore"}`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      aria-describedby="payment-modal-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto"
    >
      {/* Screen reader live announcement region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      <motion.div
        ref={modalRef}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0.08 }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 my-6 sm:my-8 max-h-[92vh] flex flex-col"
      >
        {/* Top Header: Complete Your UPI Payment */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-5 sm:px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <BrandLogo showWordmark={false} href={null} markSize={36} priority={false} />
            <div>
              <h3 id="payment-modal-title" className="text-base font-bold text-slate-900 tracking-tight">
                {modalState === "confirmed"
                  ? "Registration Confirmed"
                  : modalState === "failed"
                  ? "Checkout Unavailable"
                  : "Complete Your UPI Payment"}
              </h3>
              {order?.orderReference && (
                <p id="payment-modal-description" className="text-xs text-slate-500 font-mono">
                  {order.orderReference}
                </p>
              )}
            </div>
          </div>
          {modalState !== "verifying" && (
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              aria-label="Close checkout modal"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* 1. CREATING STATE */}
            {modalState === "creating" && (
              <motion.div
                key="creating"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <Loader2 className="size-10 animate-spin text-teal-600" />
                <h4 className="mt-4 text-base font-semibold text-slate-900">
                  Initializing Checkout Session…
                </h4>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  Generating order-specific bank credentials and dynamic UPI QR code.
                </p>
              </motion.div>
            )}

            {/* 2. AWAITING PAYMENT STATE */}
            {modalState === "awaiting_payment" && order && (
              <motion.div
                key="awaiting_payment"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col gap-4"
              >
                {/* Top Section: Event title, Attendee, Payable Amount */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white shadow-inner">
                  <div className="min-w-0 pr-3">
                    <p className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider">
                      Event Admission
                    </p>
                    <p className="font-bold text-sm truncate">{eventTitle}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{attendeeName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-slate-400">Total Payable</p>
                    <p className="text-2xl font-extrabold tracking-tight text-white">
                      ₹{order.totalRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Middle Section: Exactly Four UPI-App Icon Buttons (Exact requested order: 1. GPay, 2. PhonePe, 3. Google Pay, 4. Paytm) */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Pay using supported UPI app:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Position 1: Google Pay (official supplied artwork) */}
                    <button
                      type="button"
                      aria-label="Pay with Google Pay"
                      onClick={() =>
                        handleAppLaunch(
                          "Google Pay",
                          ANDROID_UPI_PACKAGES.GPAY,
                          "gpay://upi/pay"
                        )
                      }
                      className="group flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs hover:bg-slate-50 hover:border-teal-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <Image
                        src="/images/payments/gpay-icon.png"
                        alt=""
                        width={90}
                        height={24}
                        className="h-6 w-auto max-w-[85%] object-contain"
                        unoptimized
                      />
                    </button>

                    {/* Position 2: PhonePe */}
                    <button
                      type="button"
                      aria-label="Pay with PhonePe"
                      onClick={() =>
                        handleAppLaunch(
                          "PhonePe",
                          ANDROID_UPI_PACKAGES.PHONEPE,
                          "phonepe://pay"
                        )
                      }
                      className="group flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs hover:bg-slate-50 hover:border-teal-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <Image
                        src="/images/payments/phonepe-icon.png"
                        alt=""
                        width={90}
                        height={24}
                        className="h-6 w-auto max-w-[85%] object-contain"
                        unoptimized
                      />
                    </button>

                    {/* Position 3: BHIM */}
                    <button
                      type="button"
                      aria-label="Pay with BHIM"
                      onClick={() =>
                        handleAppLaunch(
                          "BHIM",
                          ANDROID_UPI_PACKAGES.BHIM,
                          "bhim://pay"
                        )
                      }
                      className="group flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs hover:bg-slate-50 hover:border-teal-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <Image
                        src="/images/payments/bhim-icon.png"
                        alt=""
                        width={90}
                        height={24}
                        className="h-6 w-auto max-w-[85%] object-contain"
                        unoptimized
                      />
                    </button>

                    {/* Position 4: Paytm */}
                    <button
                      type="button"
                      aria-label="Pay with Paytm"
                      onClick={() =>
                        handleAppLaunch(
                          "Paytm",
                          ANDROID_UPI_PACKAGES.PAYTM,
                          "paytmmp://pay"
                        )
                      }
                      className="group flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs hover:bg-slate-50 hover:border-teal-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                      <Image
                        src="/images/payments/paytm-icon.png"
                        alt=""
                        width={90}
                        height={24}
                        className="h-6 w-auto max-w-[85%] object-contain"
                        unoptimized
                      />
                    </button>
                  </div>
                </div>

                {/* Bottom Section: Order-Specific Dynamic QR Code (QR strictly at bottom) */}
                <UpiQr
                  upiUri={order.upiUri}
                  orderReference={order.orderReference}
                  amountRupees={order.totalRupees}
                  payeeName={order.payeeName}
                  eventTitle={eventTitle}
                />

                {/* Verification Countdown & UTR Confirmation Action */}
                {!showUtrSection ? (
                  <Button
                    type="button"
                    onClick={startVerificationTimer}
                    disabled={startingVerification}
                    className="h-12 w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm mt-1"
                  >
                    {startingVerification ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    {startingVerification ? "Starting Verification…" : "I Have Paid — Enter UTR"}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                    {/* Five-Minute Verification Countdown Timer */}
                    <div
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-semibold ${
                        verifyTimerSecondsLeft === 0
                          ? "bg-amber-50 border-amber-200 text-amber-900"
                          : verifyTimerSecondsLeft < 60
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : "bg-teal-50 border-teal-200 text-teal-800"
                      }`}
                      aria-live="polite"
                    >
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-4 shrink-0 text-teal-700" />
                        Verification Window:
                      </span>
                      <span className="font-mono text-sm font-bold">
                        {formatTimerDigits(verifyTimerSecondsLeft)}
                      </span>
                    </div>

                    {/* Expiration Message when 5-minute timer reaches 00:00 */}
                    {verifyTimerSecondsLeft === 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-left">
                        <p className="text-xs font-bold text-amber-900">
                          Payment Verification Is Taking Longer
                        </p>
                        <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                          Your payment may still be processing. Please do not make another payment while we check the transaction.
                        </p>
                      </div>
                    )}

                    {/* UTR Entry Form (No screenshot required per Section 13) */}
                    <form onSubmit={handleClaimUtr} className="flex flex-col gap-2">
                      <label htmlFor="modal-utr-input" className="text-xs font-semibold text-slate-700">
                        UTR / UPI Transaction Reference
                      </label>
                      <div className="flex gap-2">
                        <Input
                          id="modal-utr-input"
                          placeholder="e.g. 12-digit numeric reference"
                          maxLength={12}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={userUtr}
                          onChange={(e) => setUserUtr(e.target.value.replace(/\D/g, ""))}
                          className="h-11 text-sm font-mono tracking-wider"
                          autoFocus
                        />
                        <Button
                          type="submit"
                          disabled={submittingUtr || userUtr.length !== 12}
                          className="h-11 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shrink-0"
                        >
                          {submittingUtr ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Submit UTR & Verify Payment"
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. VERIFYING STATE */}
            {modalState === "verifying" && order && (
              <motion.div
                key="verifying"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center text-center py-6 px-2"
              >
                <div className="relative flex size-20 items-center justify-center mb-5">
                  <div className="absolute inset-0 rounded-full border-4 border-teal-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-teal-600 border-t-transparent animate-spin"></div>
                  <ShieldCheck className="size-8 text-teal-600 animate-pulse" />
                </div>

                <h4 className="text-lg font-bold text-slate-900">Verifying Your Payment</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  We are reconciling authorized Axis Bank credit evidence for your ₹{order.totalRupees.toFixed(2)} transfer.
                </p>

                {/* Progress Stepper */}
                <div className="mt-6 w-full max-w-xs rounded-xl bg-slate-50 p-4 border border-slate-100 text-left text-xs space-y-2.5">
                  <div className="flex items-center gap-2 text-teal-700 font-medium">
                    <CheckCircle2 className="size-4 shrink-0 text-teal-600" />
                    <span>Order reference created ({order.orderReference})</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Loader2 className="size-4 shrink-0 animate-spin text-teal-600" />
                    <span>Awaiting Axis Bank credit evidence…</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="size-4 rounded-full border border-slate-300 shrink-0"></div>
                    <span>Pass issuance after authorized settlement</span>
                  </div>
                </div>

                {!userUtr && (
                  <div className="mt-5 w-full max-w-xs text-left">
                    <label htmlFor="utr-verifying-input" className="text-[11px] font-medium text-slate-500">
                      Enter 12-digit UTR for faster bank reconciliation:
                    </label>
                    <div className="mt-1 flex gap-2">
                      <Input
                        id="utr-verifying-input"
                        placeholder="12-digit UTR"
                        maxLength={12}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={userUtr}
                        onChange={(e) => setUserUtr(e.target.value.replace(/\D/g, ""))}
                        className="h-10 text-xs font-mono"
                      />
                      <Button
                        size="sm"
                        onClick={handleClaimUtr}
                        disabled={userUtr.length !== 12 || submittingUtr}
                        className="h-10 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs shrink-0"
                      >
                        Submit UTR
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalState("awaiting_payment")}
                  className="mt-6 text-xs text-slate-500 hover:text-slate-800"
                >
                  Back to QR Code &amp; Payment Options
                </Button>
              </motion.div>
            )}

            {/* 4. PENDING REVIEW STATE */}
            {modalState === "pending_review" && order && (
              <motion.div
                key="pending_review"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center text-center py-6 px-2"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4 border border-amber-200">
                  <Clock className="size-7" />
                </div>

                <h4 className="text-base font-bold text-slate-900">Payment Confirmation Pending</h4>
                <p className="mt-2 text-xs text-slate-600 max-w-sm leading-relaxed">
                  Your registration details have been saved securely. Inter-bank alert delivery can sometimes take 2–5
                  minutes. Please avoid paying again while we continue reconciling your payment.
                </p>

                <div className="mt-5 w-full max-w-sm rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Reference:</span>
                    <code className="text-teal-700 font-mono font-medium">{order.orderReference}</code>
                  </div>
                  {userUtr && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Claimed UTR:</span>
                      <code className="font-mono text-slate-800">{userUtr}</code>
                    </div>
                  )}
                  <p className="text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                    An authorized bank-evidence review will link the credit to this exact order. Your UTR reference has been safely logged.
                  </p>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
                  <Button
                    onClick={() => setModalState("verifying")}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-10"
                  >
                    Continue Checking
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="w-full text-slate-700 text-xs h-10"
                  >
                    Close &amp; Check Later
                  </Button>
                </div>
              </motion.div>
            )}

            {/* 5. CONFIRMED STATE (Payment Success Screen) */}
            {modalState === "confirmed" && order && (
              <motion.div
                key="confirmed"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center text-center py-6 px-2"
              >
                {/* Official CSC Circle mark above the success animation */}
                <div className="mb-4">
                  <BrandLogo showWordmark={false} href={null} markSize={56} priority={false} />
                </div>
                {/* Celebratory Checkmark Animation */}
                <div className="relative flex size-20 items-center justify-center mb-5">
                  <svg className="size-20" viewBox="0 0 52 52">
                    <circle
                      className="stroke-teal-500/20"
                      cx="26"
                      cy="26"
                      r="24"
                      fill="none"
                      strokeWidth="3"
                    />
                    <motion.circle
                      className="stroke-teal-600"
                      cx="26"
                      cy="26"
                      r="24"
                      fill="none"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={reduceMotion ? false : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      initial={reduceMotion ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
                    >
                      <Check className="size-10 text-teal-600 stroke-[3]" />
                    </motion.div>
                  </div>
                </div>

                <h4 className="text-xl font-bold text-slate-900 tracking-tight">Payment Successful!</h4>
                <p className="mt-1 text-sm font-semibold text-teal-700">
                  Your payment has been received and your CSC Circle event registration is confirmed.
                </p>

                {/* Details Card */}
                <div className="mt-6 w-full max-w-sm rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Attendee:</span>
                    <span className="font-semibold text-slate-800">{attendeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Event:</span>
                    <span className="font-medium text-slate-800 line-clamp-1">{eventTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-bold text-slate-900">₹{order.totalRupees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Reference:</span>
                    <span className="font-mono text-teal-800 font-bold">
                      {verifiedRegRef || order.orderReference}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pass Status:</span>
                    <span className="text-teal-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> Ready · Emailed to your inbox
                    </span>
                  </div>
                </div>

                {/* Actions: View and Download Event Pass, Calendar, Close */}
                <div className="mt-6 flex flex-col gap-2.5 w-full max-w-sm">
                  {verifiedPassHref ? (
                    <Link
                      href={verifiedPassHref}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
                    >
                      <Ticket className="size-4" /> View and Download Event Pass
                    </Link>
                  ) : (
                    <Link
                      href="/member/events"
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
                    >
                      Go to Member Passes <ArrowRight className="size-4" />
                    </Link>
                  )}

                  {googleCalUrl && (
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
                      >
                        <Calendar className="size-3.5 text-teal-600" /> Google Cal
                      </a>
                      <button
                        type="button"
                        onClick={downloadIcs}
                        className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
                      >
                        <Calendar className="size-3.5 text-teal-600" /> Download .ics
                      </button>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="h-10 text-xs text-slate-600 hover:text-slate-900"
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            )}

            {/* 6. FAILED STATE */}
            {modalState === "failed" && (
              <motion.div
                key="failed"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center text-center py-6 px-2"
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4 border border-rose-200">
                  <AlertTriangle className="size-7" />
                </div>

                <h4 className="text-base font-bold text-slate-900">
                  {failureReason === "expired"
                    ? "Checkout Session Expired"
                    : failureReason === "cancelled"
                    ? "Payment Session Cancelled"
                    : "Payment Unsuccessful"}
                </h4>
                <p className="mt-2 text-xs text-slate-600 max-w-sm leading-relaxed">
                  {failureReason === "expired"
                    ? "Payment sessions are limited to ensure event ticket allocation. If money left your account, it will be automatically reconciled."
                    : failureReason === "cancelled"
                    ? "This payment session was cancelled and no payment was confirmed for this attempt. If money left your account, email support with your order reference and 12-digit UTR."
                    : "You have not paid for this registration. No successful payment was confirmed for this attempt."}
                </p>

                <div className="mt-5 w-full max-w-sm rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-left text-xs">
                  <p className="font-semibold text-slate-800">Did your account get debited?</p>
                  <p className="text-slate-500 text-[11px] mt-1">
                    If money left your account, do not pay again. Email support with your order reference ({order?.orderReference}) and 12-digit UTR for automatic clearance.
                  </p>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
                  <Button
                    onClick={() => {
                      onResetOrder?.();
                      onClose();
                    }}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-10 gap-1.5"
                  >
                    <RotateCcw className="size-3.5" />
                    {failureReason === "expired" ? "Start New Checkout" : "Try Again"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="w-full text-slate-700 text-xs h-10"
                  >
                    {failureReason === "expired" ? "Close" : "Choose Another UPI App"}
                  </Button>
                  {failureReason !== "expired" && (
                    <Button
                      variant="ghost"
                      onClick={onClose}
                      className="w-full text-slate-600 text-xs h-10"
                    >
                      Return to Event
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
