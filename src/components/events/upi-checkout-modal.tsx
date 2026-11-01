"use client";

import * as React from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  QrCode,
  ShieldCheck,
  Smartphone,
  Ticket,
  X,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PaymentDeepLinks } from "@/lib/payments/orders";

export interface OrderInfo {
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

interface UpiCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderInfo | null;
  deepLinks: PaymentDeepLinks | null;
  eventTitle: string;
  attendeeName: string;
}

export function UpiCheckoutModal({
  isOpen,
  onClose,
  order,
  deepLinks,
  eventTitle,
  attendeeName,
}: UpiCheckoutModalProps) {
  const [qrSvg, setQrSvg] = React.useState<string>("");
  const [copiedVpa, setCopiedVpa] = React.useState(false);
  const [viewState, setViewState] = React.useState<"pay" | "verifying" | "success" | "delayed">("pay");
  const [userUtr, setUserUtr] = React.useState("");
  const [submittingUtr, setSubmittingUtr] = React.useState(false);
  const [verifiedPassHref, setVerifiedPassHref] = React.useState<string | null>(null);
  const [verifiedRegRef, setVerifiedRegRef] = React.useState<string | null>(null);
  const [, setPollCount] = React.useState(0);

  // Generate QR SVG when order arrives
  React.useEffect(() => {
    if (order?.upiUri) {
      QRCode.toString(order.upiUri, {
        type: "svg",
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      })
        .then(setQrSvg)
        .catch(() => toast.error("Could not generate UPI QR code."));
    }
  }, [order?.upiUri]);

  // Polling for payment status when in verifying state
  React.useEffect(() => {
    if (!order || viewState === "success") return;

    let timer: NodeJS.Timeout;
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/payments/orders/${order.id}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        if (data.status === "reconciled" || data.status === "verified") {
          setVerifiedPassHref(data.passHref || null);
          setVerifiedRegRef(data.registrationReference || order.orderReference);
          setViewState("success");
          return;
        }

        setPollCount((prev) => {
          const next = prev + 1;
          if (next > 12 && viewState === "verifying") {
            setViewState("delayed");
          }
          return next;
        });
      } catch {
        // ignore network glitches
      }
    };

    if (viewState === "verifying") {
      timer = setInterval(checkStatus, 3500);
      checkStatus();
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [order, viewState]);

  if (!isOpen || !order) return null;

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(order.payeeVpa);
    setCopiedVpa(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleClaimUtr = async (e: React.FormEvent) => {
    e.preventDefault();
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
        throw new Error(data.error || "Could not claim UTR.");
      }

      toast.success("UTR submitted for bank verification.");
      setViewState("verifying");
      if (data.status === "reconciled") {
        setViewState("success");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record UTR.");
    } finally {
      setSubmittingUtr(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all sm:my-8">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-xs shadow-sm">
              CSC
            </div>
            <div>
              <h3 id="checkout-modal-title" className="text-sm font-semibold text-slate-900">
                {viewState === "success" ? "Registration Confirmed" : "CSC UPI Checkout"}
              </h3>
              <p className="text-xs text-slate-500 font-mono">{order.orderReference}</p>
            </div>
          </div>
          {viewState !== "verifying" && (
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {viewState === "pay" && (
            <div className="flex flex-col gap-5">
              {/* Event & Amount Bar */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white shadow-inner">
                <div>
                  <p className="text-xs font-medium text-teal-400 uppercase tracking-wider">Event Admission</p>
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

              {/* QR Code and Instructions */}
              <div className="grid gap-4 sm:grid-cols-[180px_1fr] items-center rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                <div className="flex flex-col items-center justify-center">
                  <div className="size-[170px] overflow-hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 flex items-center justify-center">
                    {qrSvg ? (
                      <div
                        className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                    ) : (
                      <Loader2 className="size-6 animate-spin text-slate-400" />
                    )}
                  </div>
                  <span className="mt-1.5 text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <QrCode className="size-3" /> Scan with any UPI app
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">Payee Name:</span>
                    <p className="font-semibold text-slate-800 text-sm">{order.payeeName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">UPI ID:</span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <code className="rounded bg-white px-2 py-1 font-mono text-slate-900 ring-1 ring-slate-200 text-xs">
                        {order.payeeVpa}
                      </code>
                      <button
                        onClick={handleCopyVpa}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition"
                        title="Copy UPI ID"
                      >
                        {copiedVpa ? <Check className="size-3.5 text-teal-600" /> : <Copy className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 px-2 py-1 rounded-md border border-teal-200/60 mt-1">
                    <ShieldCheck className="size-3.5 shrink-0" />
                    <span>Exact amount required. Verified via Axis Bank.</span>
                  </div>
                </div>
              </div>

              {/* Quick Launch Buttons for Mobile / Desktop */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                  <Smartphone className="size-3.5" /> Pay using supported UPI application:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {deepLinks?.gpay && (
                    <a
                      href={deepLinks.gpay}
                      onClick={() => setViewState("verifying")}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                    >
                      Google Pay
                    </a>
                  )}
                  {deepLinks?.phonepe && (
                    <a
                      href={deepLinks.phonepe}
                      onClick={() => setViewState("verifying")}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                    >
                      PhonePe
                    </a>
                  )}
                  {deepLinks?.paytm && (
                    <a
                      href={deepLinks.paytm}
                      onClick={() => setViewState("verifying")}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                    >
                      Paytm
                    </a>
                  )}
                  {deepLinks?.standardUpi && (
                    <a
                      href={deepLinks.standardUpi}
                      onClick={() => setViewState("verifying")}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition"
                    >
                      Other UPI <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* UTR Entry for Rapid Disambiguation */}
              <form onSubmit={handleClaimUtr} className="pt-2 border-t border-slate-100 flex flex-col gap-2">
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
                    className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium"
                  >
                    {submittingUtr ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
                  </Button>
                </div>
              </form>

              {/* Bottom Action */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setViewState("verifying")}
                  className="w-full text-slate-700 text-xs font-medium h-10"
                >
                  I have sent the payment — Check Bank Confirmation
                </Button>
              </div>
            </div>
          )}

          {viewState === "verifying" && (
            <div className="flex flex-col items-center text-center py-6 px-2 animate-in fade-in duration-300">
              {/* Animated Progress Ring */}
              <div className="relative flex size-20 items-center justify-center mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-teal-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-teal-600 border-t-transparent animate-spin"></div>
                <ShieldCheck className="size-8 text-teal-600 animate-pulse" />
              </div>

              <h4 className="text-lg font-bold text-slate-900">Verifying Your Payment</h4>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">
                We are checking authenticated Axis Bank credit alerts for your ₹{order.totalRupees.toFixed(2)} transfer.
              </p>

              {/* Status Stepper */}
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
                  <span>Automatic event pass generation</span>
                </div>
              </div>

              {/* UTR Input in verification state if not entered yet */}
              {!userUtr && (
                <div className="mt-5 w-full max-w-xs text-left">
                  <label htmlFor="utr-verifying-input" className="text-[11px] font-medium text-slate-500">
                    Enter UTR for faster bank reconciliation:
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
                onClick={() => setViewState("pay")}
                className="mt-6 text-xs text-slate-500 hover:text-slate-800"
              >
                Back to QR Code
              </Button>
            </div>
          )}

          {viewState === "delayed" && (
            <div className="flex flex-col items-center text-center py-6 px-2 animate-in fade-in duration-300">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4 border border-amber-200">
                <Clock className="size-7" />
              </div>

              <h4 className="text-base font-bold text-slate-900">Payment Confirmation Pending</h4>
              <p className="mt-2 text-xs text-slate-600 max-w-sm leading-relaxed">
                Your registration details have been saved securely. Bank notification delivery can sometimes take 2–5
                minutes. Please avoid paying again while we continue reconciling your payment.
              </p>

              <div className="mt-5 w-full max-w-sm rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-left text-xs">
                <p className="font-semibold text-slate-800">Order Reference:</p>
                <code className="text-teal-700 font-mono text-xs">{order.orderReference}</code>
                <p className="text-slate-500 text-[11px] mt-2">
                  Once your Axis Bank credit alert is verified by our scheduler, your pass will be issued automatically
                  and emailed to your address.
                </p>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
                <Button
                  onClick={() => setViewState("verifying")}
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
            </div>
          )}

          {viewState === "success" && (
            <div className="flex flex-col items-center text-center py-6 px-2 animate-in zoom-in-95 duration-500">
              {/* Animated SVG Success Ring & Checkmark */}
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
                  <circle
                    className="stroke-teal-600 transition-all duration-700 ease-out"
                    cx="26"
                    cy="26"
                    r="24"
                    fill="none"
                    strokeWidth="3"
                    strokeDasharray="150"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50 duration-500 delay-200 fill-mode-both">
                  <Check className="size-10 text-teal-600 stroke-[3]" />
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
                  <span className="font-mono text-teal-800 font-medium">{verifiedRegRef || order.orderReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pass Status:</span>
                  <span className="text-teal-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Ready
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
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
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="h-10 text-xs text-slate-600 hover:text-slate-900"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
