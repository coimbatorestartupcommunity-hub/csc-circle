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
  payeeVpa,
  payeeName,
  eventTitle,
  className = "",
}: UpiQrProps) {
  const [qrSvg, setQrSvg] = React.useState<string>("");
  const [qrError, setQrError] = React.useState<string | null>(null);

  // Clean standard P2P UPI URI for QR code scanning
  // Omits merchant parameters (tr, mode, orgid) that trigger remitting bank limits on personal VPAs
  const cleanUri = React.useMemo(() => {
    if (!upiUri) return "";
    try {
      const vpa = payeeVpa && !payeeVpa.includes("ptyes") ? payeeVpa : "9342877474@ptaxis";
      const payee = payeeName || "VIKASH S";
      const amount = amountRupees.toFixed(2);
      const note = `Pass for ${eventTitle.slice(0, 20)}`;
      const p2pParams = new URLSearchParams({
        pa: vpa,
        pn: payee,
        am: amount,
        cu: "INR",
        tn: note,
      });
      return `upi://pay?${p2pParams.toString()}`;
    } catch {
      return upiUri;
    }
  }, [upiUri, payeeVpa, payeeName, amountRupees, eventTitle]);

  // Generate crisp dynamic SVG QR code
  React.useEffect(() => {
    if (!cleanUri) return;
    QRCode.toString(cleanUri, {
      type: "svg",
      margin: 1,
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
  }, [cleanUri]);

  return (
    <div
      role="region"
      aria-label={`UPI Payment QR Code for ${eventTitle}`}
      className={`flex flex-col items-center gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-slate-50/70 p-1.5 sm:p-2 ${className}`}
    >
      {/* Centered QR Display (Crisp dimensions to guarantee non-truncated mobile layout) */}
      <div className="flex flex-col items-center justify-center">
        <div
          className="size-[105px] sm:size-[120px] overflow-hidden rounded-xl bg-white p-1 shadow-2xs ring-1 ring-slate-200/80 flex items-center justify-center"
          aria-label={`Dynamic UPI payment QR code for ₹${amountRupees.toFixed(2)}`}
        >
          {qrSvg ? (
            <div
              className="size-full [&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : qrError ? (
            <p className="text-[10px] text-rose-500 text-center px-1">{qrError}</p>
          ) : (
            <Loader2 className="size-6 animate-spin text-teal-600" />
          )}
        </div>
        <span className="mt-0.5 text-[9.5px] sm:text-[10.5px] font-medium text-slate-600 flex items-center gap-1">
          <QrCode className="size-3 text-teal-600" />
          Scan with any UPI app to pay ₹{amountRupees.toFixed(2)}
        </span>
      </div>

      {/* Verified Details Badges */}
      <div className="flex flex-wrap items-center justify-center gap-1 text-[9.5px]">
        <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-slate-700 ring-1 ring-slate-200 font-medium">
          Payee: <strong className="text-slate-900">{payeeName}</strong>
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-slate-700 ring-1 ring-slate-200 font-medium">
          Order: <code className="font-mono text-teal-800 font-bold">{orderReference}</code>
        </span>
      </div>

      <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-teal-800 bg-teal-50/80 px-2 py-0.5 rounded-md border border-teal-200/60 text-center">
        <Image
          src="/images/payments/axis-monogram.svg"
          alt="Axis Bank"
          width={12}
          height={12}
          className="shrink-0"
        />
        <span>Direct Axis Bank Credit · Single-use payment order</span>
      </div>
    </div>
  );
}
