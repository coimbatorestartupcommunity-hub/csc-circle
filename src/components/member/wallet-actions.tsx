"use client";

import * as React from "react";
import { Lock, X, CheckCircle2, Shield, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WalletActionsProps {
  type: "member" | "event";
  idOrRegId?: string;
  memberNumber?: string;
  fullName?: string;
  designation?: string;
  startupName?: string;
  qrPayload?: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
}

function AppleLogoIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.54c.66-.8 1.1-1.92.98-3.04-.95.04-2.1.63-2.77 1.41-.59.68-1.11 1.77-.97 2.84 1.06.08 2.14-.52 2.76-1.21z" />
    </svg>
  );
}

function GoogleWalletIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="-4.04 -4.04 86.2 86.2" fill="none" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M0 29.05L49.58 41.24c5.85 1.43 12.09.13 16.88-3.63L78.11 28.53v28.53c0 7.13-5.67 12.97-12.6 12.97H12.6C5.67 70.03 0 64.19 0 57.06V29.05Z"
      />
      <path
        fill="#EA4335"
        d="M12.6 22.04c-4.96 0-9.27 3.01-11.32 7.33L49.57 41.24c5.86 1.43 12.1.13 16.88-3.63l10.43-8.12c-2.03-4.39-6.36-7.45-11.37-7.45H12.6Z"
      />
      <path
        fill="#FBBC04"
        d="M12.6 11.02C5.67 11.02 0 16.86 0 24v5.05l1.28.32c2.05-4.32 6.36-7.32 11.32-7.32h52.91c5.01 0 9.35 3.05 11.38 7.44l1.22-.96v-4.54c0-7.13-5.67-12.97-12.6-12.97H12.6Z"
      />
      <path
        fill="#34A853"
        d="M12.6 0C5.67 0 0 5.84 0 12.97v11.02c0-7.13 5.67-12.97 12.6-12.97h52.91c6.93 0 12.6 5.83 12.6 12.97V12.97C78.11 5.84 72.44 0 65.51 0H12.6Z"
      />
    </svg>
  );
}

export function WalletActions({
  type,
  idOrRegId,
  memberNumber,
  fullName,
  designation,
  startupName,
  qrPayload,
  eventTitle,
}: WalletActionsProps) {
  const [showOfflineModal, setShowOfflineModal] = React.useState(false);
  const [offlineQr, setOfflineQr] = React.useState<string | null>(null);

  // Pre-generate offline QR in client memory for instant zero-network entry
  React.useEffect(() => {
    if (!qrPayload) return;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 1024,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then((url) => setOfflineQr(url))
        .catch(() => {});
    });
  }, [qrPayload]);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        {/* Apple Wallet Button — Locked with original black color and glass-morphism blur */}
        <Button
          type="button"
          disabled
          aria-disabled="true"
          title="Add to Apple Wallet is currently locked pending Apple Developer Program Pass Type Certificate (WWDR CA) enrollment."
          className="h-11 w-full gap-2 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white cursor-not-allowed text-xs sm:text-sm font-semibold shadow-sm pointer-events-none select-none"
        >
          <AppleLogoIcon className="size-4 text-white shrink-0" />
          <span>Add to Apple Wallet</span>
          <Lock className="size-3.5 ml-auto text-white/70" />
        </Button>

        {/* Google Wallet Button — Locked with original white color and glass-morphism blur */}
        <Button
          type="button"
          disabled
          aria-disabled="true"
          title="Save to Google Wallet is currently locked pending Google Pay & Wallet Business Console Issuer ID registration."
          className="h-11 w-full gap-2 rounded-2xl bg-white/85 backdrop-blur-md border border-neutral-300/80 text-neutral-900 cursor-not-allowed text-xs sm:text-sm font-semibold shadow-sm pointer-events-none select-none"
        >
          <GoogleWalletIcon className="size-4 shrink-0" />
          <span>Save to Google Wallet</span>
          <Lock className="size-3.5 ml-auto text-neutral-500" />
        </Button>
      </div>

      {/* Offline Digital Pass Button — Touch/click opens pass directly on website with zero network required, no download */}
      <button
        type="button"
        onClick={() => setShowOfflineModal(true)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-brand-border bg-brand-cloud/70 px-4 text-xs sm:text-sm font-semibold text-brand-ink transition hover:bg-brand-cloud hover:border-brand-border/80 active:scale-98 cursor-pointer shadow-2xs"
      >
        <WifiOff className="size-4 text-brand-accent shrink-0" />
        <span>Open Offline Digital Pass (Instant Entry)</span>
      </button>

      {/* Screen-Only Digital Pass Modal — Opens on touch, works offline without network, zero downloads */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative flex w-full max-w-sm flex-col items-center rounded-3xl bg-white p-6 sm:p-7 shadow-2xl ring-1 ring-white/20">
            <button
              type="button"
              onClick={() => setShowOfflineModal(false)}
              className="absolute top-4 right-4 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-black cursor-pointer"
              aria-label="Close offline digital pass"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span>Offline Verified Entry Pass</span>
            </div>

            <h3 className="mt-4 text-center text-xl font-bold tracking-tight text-neutral-900">
              {type === "member" ? fullName || "CSC Member" : eventTitle || "CSC Event Pass"}
            </h3>
            <p className="font-mono text-xs font-semibold text-neutral-600">
              {type === "member" ? memberNumber : `UID: ${memberNumber || idOrRegId}`}
            </p>
            {designation && (
              <p className="text-xs font-medium text-brand-accent">
                {designation} {startupName ? `· ${startupName}` : ""}
              </p>
            )}

            {/* High-contrast QR Scanner Container */}
            <div className="mt-5 flex flex-col items-center rounded-2xl border-2 border-black bg-white p-3 shadow-sm">
              {offlineQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={offlineQr}
                  alt="Offline Admission QR Code"
                  className="size-56 [image-rendering:pixelated]"
                />
              ) : (
                <div className="flex size-56 items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-neutral-400" />
                </div>
              )}
              <span className="mt-1 font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
                Present to Entrance Scanner
              </span>
            </div>

            <div className="mt-4 flex flex-col items-center gap-1 text-center text-xs text-neutral-600">
              <div className="flex items-center gap-1.5 font-medium text-neutral-900">
                <Shield className="size-4 text-emerald-600" />
                <span>Zero Network Required on Site</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Kiosks and volunteer scanners verify cryptographic hash offline.
              </p>
            </div>

            {/* Pure Close / Done action — Zero downloads */}
            <Button
              type="button"
              onClick={() => setShowOfflineModal(false)}
              className="mt-5 w-full rounded-2xl bg-neutral-900 text-white hover:bg-black font-semibold text-xs h-10 cursor-pointer"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
