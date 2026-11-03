"use client";

import * as React from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Loader2, QrCode } from "lucide-react";
import type { PaymentDeepLinks } from "@/lib/payments/upi";

export interface UpiQrProps {
  upiUri: string;
  orderReference: string;
  amountRupees: number;
  payeeVpa?: string;
  payeeName: string;
  eventTitle: string;
  deepLinks?: PaymentDeepLinks | null;
  onInitiatedPayment?: () => void;
  className?: string;
}

export function UpiQr({
  upiUri,
  orderReference,
  amountRupees,
  payeeName,
  eventTitle,
  className = "",
}: UpiQrProps) {
  const [qrSvg, setQrSvg] = React.useState<string>("");
  const [qrError, setQrError] = React.useState<string | null>(null);

  // Generate crisp dynamic SVG QR code
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

  return (
    <div
      role="region"
      aria-label={`UPI Payment QR Code for ${eventTitle}`}
      className={`flex flex-col items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 sm:p-5 ${className}`}
    >
      {/* Centered QR Display (White quiet zone, responsive dimensions) */}
      <div className="flex flex-col items-center justify-center">
        <div
          className="size-[190px] sm:size-[210px] overflow-hidden rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/80 flex items-center justify-center"
          aria-label={`Dynamic UPI payment QR code for ₹${amountRupees.toFixed(2)}`}
        >
          {qrSvg ? (
            <div
              className="size-full [&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : qrError ? (
            <p className="text-xs text-rose-500 text-center px-2">{qrError}</p>
          ) : (
            <Loader2 className="size-8 animate-spin text-teal-600" />
          )}
        </div>
        <span className="mt-2 text-xs font-medium text-slate-600 flex items-center gap-1.5">
          <QrCode className="size-3.5 text-teal-600" />
          Scan with any UPI app to pay ₹{amountRupees.toFixed(2)}
        </span>
      </div>

      {/* Verified Details Badges (Notice: VPA is completely hidden per Section 10) */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
        <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-slate-700 ring-1 ring-slate-200 font-medium">
          Payee: <strong className="text-slate-900">{payeeName}</strong>
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-slate-700 ring-1 ring-slate-200 font-medium">
          Order: <code className="font-mono text-teal-800 font-bold">{orderReference}</code>
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-teal-800 bg-teal-50/80 px-3 py-1.5 rounded-xl border border-teal-200/60 text-center">
        <Image
          src="/images/payments/axis-monogram.svg"
          alt="Axis Bank"
          width={14}
          height={14}
          className="shrink-0"
        />
        <span>Direct Axis Bank Credit · Single-use payment order</span>
      </div>
    </div>
  );
}
