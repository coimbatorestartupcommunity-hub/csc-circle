"use client";

import * as React from "react";
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
import { Input } from "@/components/ui/input";
import type { PaymentDeepLinks } from "@/lib/payments/upi";
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

  const failureReason =
    order?.status === "expired" || order?.status === "failed" || order?.status === "cancelled"
      ? order.status
      : "failed";

  // Countdown timer in seconds initialized lazily
  const [remainingSeconds, setRemainingSeconds] = React.useState<number>(() => {
    if (!order?.expiresAt) return 15 * 60;
    const expiry = new Date(order.expiresAt).getTime();
    return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
  });

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

  // 15-Minute Countdown Timer
  React.useEffect(() => {
    if (!order?.expiresAt || modalState === "confirmed" || modalState === "failed") return;

    const calculateRemaining = () => {
      const expiry = new Date(order.expiresAt).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((expiry - now) / 1000));
    };

    const timer = setInterval(() => {
      const left = calculateRemaining();
      setRemainingSeconds(left);
      if (left <= 0) {
        clearInterval(timer);
        setModalState("failed");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order?.expiresAt, modalState, setModalState]);

  // Screen reader announcement derived reactively
  const liveAnnouncement = React.useMemo(() => {
    switch (modalState) {
      case "creating":
        return "Initializing secure payment session.";
      case "awaiting_payment":
        return `Payment order created for ₹${order?.totalRupees ?? 0}. Scan the QR code or use a UPI app.`;
      case "verifying":
        return "Verifying payment with Axis Bank credit alerts. Please wait.";
      case "pending_review":
        return "Payment confirmation pending bank alert review. Your registration details are saved.";
      case "confirmed":
        return "Payment verified and registration confirmed! Your pass is ready.";
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

        // Handle HTTP 429 Retry-After header
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
        // If actively verifying, transition to pending_review after ~15 polls (approx 60s)
        if (modalState === "verifying" && pollCount > 15) {
          setModalState("pending_review");
          return;
        }

        // Calculate next exponential backoff interval with jitter (3s -> 10s ± 400ms)
        const base = Math.min(3000 * Math.pow(1.25, Math.min(pollCount, 8)), 10000);
        const jitter = (Math.random() - 0.5) * 800;
        const nextDelay = Math.max(2500, Math.round(base + jitter));

        // When in awaiting_payment, poll at low frequency (8s); when verifying, poll with backoff
        const delay = modalState === "awaiting_payment" ? 8000 : nextDelay;
        timeoutId = setTimeout(pollStatus, delay);
      } catch {
        timeoutId = setTimeout(pollStatus, 5000);
      }
    };

    // Immediate check on tab visibility regain (e.g. returning from GPay/PhonePe app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timeoutId);
        pollStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start polling: rapid if verifying, background if awaiting_payment
    timeoutId = setTimeout(pollStatus, modalState === "verifying" ? 1500 : 6000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [order, isOpen, modalState, setModalState]);

  if (!isOpen) return null;

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
      setModalState("verifying");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record UTR.");
    } finally {
      setSubmittingUtr(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
    >
      {/* Screen reader live announcement region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      <motion.div
        ref={modalRef}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0.08 }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-xs shadow-sm">
              CSC
            </div>
            <div>
              <h3 id="payment-modal-title" className="text-sm font-semibold text-slate-900">
                {modalState === "confirmed"
                  ? "Registration Confirmed"
                  : modalState === "failed"
                  ? "Checkout Unavailable"
                  : "CSC UPI Checkout"}
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
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              aria-label="Close checkout modal"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Content Body with Animated Cross-fading */}
        <div className="p-6">
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
                  Validating attendee details and generating a single-use bank order reference.
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
                {/* Event & Amount Bar */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white shadow-inner">
                  <div>
                    <p className="text-xs font-medium text-teal-400 uppercase tracking-wider">
                      Event Admission
                    </p>
                    <p className="font-semibold text-sm line-clamp-1">{eventTitle}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{attendeeName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Total Payable</p>
                    <p className="text-2xl font-bold tracking-tight text-white">
                      ₹{order.totalRupees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Expiry Countdown Timer Bar */}
                <div
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl border text-xs font-medium ${
                    remainingSeconds < 180
                      ? "bg-rose-50 border-rose-200 text-rose-700"
                      : "bg-slate-50 border-slate-200/80 text-slate-600"
                  }`}
                  aria-live="polite"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" /> Session Expiry:
                  </span>
                  <span className="font-mono font-semibold">
                    {formatCountdown(remainingSeconds)} remaining
                    <span className="sr-only">
                      {Math.floor(remainingSeconds / 60)} minutes and {remainingSeconds % 60} seconds remaining
                    </span>
                  </span>
                </div>

                {/* Rendered UpiQr Component */}
                <UpiQr
                  upiUri={order.upiUri}
                  orderReference={order.orderReference}
                  amountRupees={order.totalRupees}
                  payeeVpa={order.payeeVpa}
                  payeeName={order.payeeName}
                  eventTitle={eventTitle}
                  deepLinks={deepLinks}
                  onInitiatedPayment={() => setModalState("verifying")}
                />

                {/* UTR Form */}
                <form
                  onSubmit={handleClaimUtr}
                  className="pt-2 border-t border-slate-100 flex flex-col gap-2"
                >
                  <label htmlFor="user-utr-input" className="text-xs font-medium text-slate-600">
                    Already paid? Enter 12-digit UPI reference (UTR):
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="user-utr-input"
                      placeholder="e.g. 630722119955"
                      maxLength={12}
                      value={userUtr}
                      onChange={(e) => setUserUtr(e.target.value.replace(/\D/g, ""))}
                      className="h-10 text-sm font-mono tracking-wider"
                    />
                    <Button
                      type="submit"
                      disabled={submittingUtr || userUtr.length !== 12}
                      className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs"
                    >
                      {submittingUtr ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                </form>

                {/* Primary Action Button */}
                <Button
                  variant="outline"
                  onClick={() => setModalState("verifying")}
                  className="w-full text-slate-700 text-xs font-medium h-10 mt-1"
                >
                  I have sent the payment — Check Bank Confirmation
                </Button>
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
                        value={userUtr}
                        onChange={(e) => setUserUtr(e.target.value.replace(/\D/g, ""))}
                        className="h-9 text-xs font-mono"
                      />
                      <Button
                        size="sm"
                        onClick={handleClaimUtr}
                        disabled={userUtr.length !== 12 || submittingUtr}
                        className="h-9 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs"
                      >
                        Submit
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
                  Back to QR Code
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
                    An authorized bank-evidence review must link the credit to this exact order before admission
                    passes are issued. Your UTR claim alone cannot confirm payment.
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
                    Close & Check Later
                  </Button>
                </div>
              </motion.div>
            )}

            {/* 5. CONFIRMED STATE */}
            {modalState === "confirmed" && order && (
              <motion.div
                key="confirmed"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center text-center py-6 px-2"
              >
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
                <p className="mt-1 text-sm font-medium text-teal-700">Your CSC Event Registration Is Confirmed</p>

                {/* Details Card */}
                <div className="mt-6 w-full max-w-sm rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 text-left text-xs space-y-2">
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
                    <span className="font-mono text-teal-800 font-medium">
                      {verifiedRegRef || order.orderReference}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pass Status:</span>
                    <span className="text-teal-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Ready · Emailed to your inbox
                    </span>
                  </div>
                </div>

                {/* Pass Download & Calendar CTAs */}
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
                    : "Payment Verification Failed"}
                </h4>
                <p className="mt-2 text-xs text-slate-600 max-w-sm leading-relaxed">
                  {failureReason === "expired"
                    ? "Payment sessions are limited to 15 minutes to guarantee event ticket allocation. No matching bank credit was confirmed before the window closed."
                    : "The bank transaction could not be reconciled with this order reference."}
                </p>

                <div className="mt-5 w-full max-w-sm rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-left text-xs">
                  <p className="font-semibold text-slate-800">Did your account get debited?</p>
                  <p className="text-slate-500 text-[11px] mt-1">
                    If money left your account, do not worry. Email{" "}
                    <a
                      href={`mailto:support@csccircle.com?subject=Payment Inquiry: ${order?.orderReference ?? ""}&body=Hello CSC Team,%0D%0A%0D%0AMy account was debited for order ${order?.orderReference ?? ""}.%0D%0AMy UTR is: ${userUtr || "[Enter UTR]"}%0D%0A`}
                      className="text-teal-700 underline font-medium"
                    >
                      support@csccircle.com
                    </a>{" "}
                    with your UTR reference for manual reconciliation.
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
                    <RotateCcw className="size-3.5" /> Start New Checkout
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="w-full text-slate-700 text-xs h-10"
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
