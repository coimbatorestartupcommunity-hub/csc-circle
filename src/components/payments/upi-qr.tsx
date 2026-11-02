"use client";

import * as React from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Loader2,
  QrCode,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import {
  type PaymentDeepLinks,
  detectPlatform,
  type ClientPlatform,
  buildAndroidIntentUri,
  ANDROID_UPI_PACKAGES,
} from "@/lib/payments/upi";

export interface UpiQrProps {
  upiUri: string;
  orderReference: string;
  amountRupees: number;
  payeeVpa: string;
  payeeName: string;
  eventTitle: string;
  deepLinks: PaymentDeepLinks | null;
  onInitiatedPayment?: () => void;
  className?: string;
}

export function UpiQr({
  upiUri,
  orderReference,
  amountRupees,
  payeeVpa,
  payeeName,
  eventTitle,
  deepLinks,
  onInitiatedPayment,
  className = "",
}: UpiQrProps) {
  const [qrSvg, setQrSvg] = React.useState<string>("");
  const [qrError, setQrError] = React.useState<string | null>(null);
  const [copiedVpa, setCopiedVpa] = React.useState(false);
  const [copiedAmount, setCopiedAmount] = React.useState(false);
  const [copiedRef, setCopiedRef] = React.useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = React.useState<string>("");

  // SSR-safe platform resolution using useSyncExternalStore
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
        isMounted: false,
      };
    }
    const detected = detectPlatform();
    return { ...detected, isMounted: true };
  }, [isMounted]);

  // Generate crisp SVG QR code
  React.useEffect(() => {
    if (!upiUri) return;
    QRCode.toString(upiUri, {
      type: "svg",
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((svg) => {
        setQrSvg(svg);
        setQrError(null);
      })
      .catch(() => {
        setQrError("Could not render QR code.");
        toast.error("Failed to generate dynamic UPI QR code.");
      });
  }, [upiUri]);

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(payeeVpa);
    setCopiedVpa(true);
    setLiveAnnouncement("UPI ID copied to clipboard");
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => {
      setCopiedVpa(false);
      setLiveAnnouncement("");
    }, 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amountRupees.toFixed(2));
    setCopiedAmount(true);
    setLiveAnnouncement(`Amount ₹${amountRupees.toFixed(2)} copied to clipboard`);
    toast.success("Amount copied to clipboard!");
    setTimeout(() => {
      setCopiedAmount(false);
      setLiveAnnouncement("");
    }, 2000);
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(orderReference);
    setCopiedRef(true);
    setLiveAnnouncement(`Order reference ${orderReference} copied to clipboard`);
    toast.success("Order reference copied!");
    setTimeout(() => {
      setCopiedRef(false);
      setLiveAnnouncement("");
    }, 2000);
  };

  // Launch handler with fallback timer for iOS Safari
  const handleAppLaunch = (e: React.MouseEvent<HTMLAnchorElement>, _href: string, appName: string) => {
    if (onInitiatedPayment) {
      onInitiatedPayment();
    }

    if (platformInfo.isIos) {
      const startTime = Date.now();
      setTimeout(() => {
        // If document is still visible after 2 seconds, app likely not installed
        if (!document.hidden && Date.now() - startTime >= 1900) {
          toast.info(`Could not open ${appName}. You can scan the QR code or copy the UPI ID below.`);
        }
      }, 2000);
    }
  };

  return (
    <div
      role="region"
      aria-label={`UPI Payment Details and QR Code for ${eventTitle}`}
      className={`flex flex-col gap-4 ${className}`}
    >
      {/* Accessible live region for screen readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Main Container: QR Code & Payee Information */}
      <div className="grid gap-4 sm:grid-cols-[180px_1fr] items-center rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
        {/* QR Code Column */}
        <div className="flex flex-col items-center justify-center">
          <div
            className="size-[170px] overflow-hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 flex items-center justify-center"
            aria-label={`Dynamic UPI payment QR code for ₹${amountRupees.toFixed(2)}`}
          >
            {qrSvg ? (
              <div
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : qrError ? (
              <p className="text-xs text-red-500 text-center px-2">{qrError}</p>
            ) : (
              <Loader2 className="size-6 animate-spin text-slate-400" />
            )}
          </div>
          <span className="mt-1.5 text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <QrCode className="size-3" /> Scan with any UPI app
          </span>
        </div>

        {/* Payee & Order Details Column */}
        <div className="flex flex-col gap-2 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 text-[11px]">Payee Name</span>
            <p className="font-semibold text-slate-900 text-sm">{payeeName}</p>
          </div>

          <div>
            <span className="text-slate-400 text-[11px]">UPI ID (VPA)</span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <code className="rounded bg-white px-2 py-1 font-mono text-slate-900 ring-1 ring-slate-200 text-xs">
                {payeeVpa}
              </code>
              <button
                type="button"
                onClick={handleCopyVpa}
                className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label="Copy UPI ID"
                title="Copy UPI ID"
              >
                {copiedVpa ? <Check className="size-3.5 text-teal-600" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-slate-400 text-[11px]">Exact Amount</span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-sm">₹{amountRupees.toFixed(2)}</span>
              <button
                type="button"
                onClick={handleCopyAmount}
                className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label="Copy exact amount"
                title="Copy exact amount"
              >
                {copiedAmount ? <Check className="size-3.5 text-teal-600" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-slate-400 text-[11px]">Order Reference</span>
            <div className="mt-0.5 flex items-center gap-1.5">
              <code className="rounded bg-white px-2 py-1 font-mono text-slate-900 ring-1 ring-slate-200 text-xs">
                {orderReference}
              </code>
              <button
                type="button"
                onClick={handleCopyRef}
                className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label="Copy order reference"
                title="Copy order reference"
              >
                {copiedRef ? <Check className="size-3.5 text-teal-600" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-teal-800 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-200/60 mt-0.5">
            <Image
              src="/images/payments/axis-monogram.svg"
              alt="Axis Bank"
              width={14}
              height={14}
              className="shrink-0"
            />
            <span>Exact amount required. Verified via Axis Bank.</span>
          </div>
        </div>
      </div>

      {/* Platform-Specific UPI Launching Actions */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
          <Smartphone className="size-3.5 text-slate-500" />
          {platformInfo.isMobile ? "Tap to open installed UPI application:" : "Or pay using supported UPI application:"}
        </p>

        {/* Primary One-Tap Button for Mobile Devices */}
        {platformInfo.isMobile && (
          <a
            href={
              platformInfo.isAndroid && deepLinks?.androidIntent
                ? deepLinks.androidIntent
                : deepLinks?.standardUpi || upiUri
            }
            onClick={(e) => handleAppLaunch(e, deepLinks?.standardUpi || upiUri, "UPI App")}
            className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs py-3 px-4 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <Smartphone className="size-4" />
            <span>Pay ₹{amountRupees.toFixed(2)} via Any UPI App</span>
            <ExternalLink className="size-3.5 opacity-80" />
          </a>
        )}

        {/* Supported UPI Apps Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {deepLinks?.gpay && (
            <a
              href={
                platformInfo.isAndroid
                  ? buildAndroidIntentUri(upiUri, ANDROID_UPI_PACKAGES.GPAY)
                  : deepLinks.gpay
              }
              onClick={(e) => handleAppLaunch(e, deepLinks.gpay, "Google Pay")}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Image
                src="/images/payments/gpay-icon.png"
                alt="Google Pay"
                width={16}
                height={16}
                className="shrink-0 object-contain"
              />
              Google Pay
            </a>
          )}

          {deepLinks?.phonepe && (
            <a
              href={
                platformInfo.isAndroid
                  ? buildAndroidIntentUri(upiUri, ANDROID_UPI_PACKAGES.PHONEPE)
                  : deepLinks.phonepe
              }
              onClick={(e) => handleAppLaunch(e, deepLinks.phonepe, "PhonePe")}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Image
                src="/images/payments/phonepe-icon.png"
                alt="PhonePe"
                width={16}
                height={16}
                className="shrink-0 object-contain"
              />
              PhonePe
            </a>
          )}

          {deepLinks?.paytm && (
            <a
              href={
                platformInfo.isAndroid
                  ? buildAndroidIntentUri(upiUri, ANDROID_UPI_PACKAGES.PAYTM)
                  : deepLinks.paytm
              }
              onClick={(e) => handleAppLaunch(e, deepLinks.paytm, "Paytm")}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Image
                src="/images/payments/paytm-icon.png"
                alt="Paytm"
                width={16}
                height={16}
                className="shrink-0 object-contain"
              />
              Paytm
            </a>
          )}

          {deepLinks?.bhim && (
            <a
              href={
                platformInfo.isAndroid
                  ? buildAndroidIntentUri(upiUri, ANDROID_UPI_PACKAGES.BHIM)
                  : deepLinks.bhim
              }
              onClick={(e) => handleAppLaunch(e, deepLinks.bhim, "BHIM")}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Image
                src="/images/payments/bhim-icon.png"
                alt="BHIM"
                width={16}
                height={16}
                className="shrink-0 object-contain"
              />
              BHIM
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
