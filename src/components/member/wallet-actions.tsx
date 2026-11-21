"use client";

import * as React from "react";
import { QrCode, Smartphone, Download, X, CheckCircle2, Shield, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    <svg className={className} viewBox="0 0 170 170" fill="currentColor" aria-hidden="true">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.73-7.97-12.13-14.68-6.19-9.4-11.13-20.2-14.82-32.41-3.69-12.21-5.54-23.77-5.54-34.69 0-14.54 3.73-26.68 11.19-36.42 7.46-9.74 16.71-14.75 27.76-15.03 4.35 0 9.4 1.15 15.16 3.45 5.76 2.3 9.48 3.51 11.16 3.63 2.12-.22 6.02-1.51 11.7-3.86 5.68-2.35 10.59-3.41 14.73-3.17 11.4.58 20.67 4.67 27.81 12.27-9.94 6.01-14.82 14.38-14.64 25.12.18 8.4 3.32 15.53 9.42 21.39 6.1 5.86 13.4 9.17 21.9 9.94-2.23 6.94-5.11 14.07-8.63 21.39zM119.22 31.84c0-7.39 2.65-14.42 7.95-21.09 5.3-6.67 11.83-10.75 19.59-12.25.33 1.34.5 2.68.5 4.02 0 7.39-2.73 14.63-8.19 21.72-5.46 7.09-12.08 11.23-19.85 12.43z" />
    </svg>
  );
}

function GoogleWalletIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.35 11.1h-9.17v2.98h5.36c-.23 1.25-.94 2.31-2 2.98v2.48h3.24c1.89-1.74 2.98-4.31 2.98-7.36 0-.71-.06-1.39-.17-2.08z" fill="#4285F4"/>
      <path d="M12.18 20.5c2.7 0 4.96-.9 6.61-2.44l-3.24-2.48c-.9.6-2.04.95-3.37.95-2.59 0-4.79-1.75-5.57-4.1H3.25v2.56C4.89 18.25 8.27 20.5 12.18 20.5z" fill="#34A853"/>
      <path d="M6.61 12.43c-.2-.6-.31-1.24-.31-1.93s.11-1.33.31-1.93V6.01H3.25C2.58 7.34 2.2 8.86 2.2 10.5s.38 3.16 1.05 4.49l3.36-2.56z" fill="#FBBC05"/>
      <path d="M12.18 4.44c1.47 0 2.78.51 3.82 1.49l2.86-2.86C17.13 1.47 14.87.5 12.18.5 8.27.5 4.89 2.75 3.25 5.99l3.36 2.56c.78-2.35 2.98-4.11 5.57-4.11z" fill="#EA4335"/>
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
  eventDate,
  eventLocation,
}: WalletActionsProps) {
  const [downloadingApple, setDownloadingApple] = React.useState(false);
  const [loadingGoogle, setLoadingGoogle] = React.useState(false);
  const [showOfflineModal, setShowOfflineModal] = React.useState(false);
  const [offlineQr, setOfflineQr] = React.useState<string | null>(null);

  const appleEndpoint =
    type === "member"
      ? "/api/member/id-card/wallet/apple"
      : `/api/member/events/${idOrRegId}/wallet/apple`;

  const googleEndpoint =
    type === "member"
      ? "/api/member/id-card/wallet/google"
      : `/api/member/events/${idOrRegId}/wallet/google`;

  // Pre-generate offline QR for instant offline mode
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

  function handleAppleWallet() {
    setDownloadingApple(true);
    // Direct browser navigation to .pkpass endpoint triggers native Apple Wallet prompt on iOS Safari
    const link = document.createElement("a");
    link.href = appleEndpoint;
    link.download = type === "member" ? `CSC-Member-${memberNumber || "Card"}.pkpass` : `CSC-Pass.pkpass`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("Opening Apple Wallet pass…");
    setTimeout(() => setDownloadingApple(false), 2000);
  }

  async function handleGoogleWallet() {
    setLoadingGoogle(true);
    try {
      const res = await fetch(googleEndpoint);
      const data = await res.json();
      if (data.saveUrl) {
        window.open(data.saveUrl, "_blank", "noopener,noreferrer");
        toast.success("Opening Google Wallet pass…");
      } else {
        toast.error("Google Wallet pass is currently being generated. Please use the Offline Pass.");
      }
    } catch {
      toast.error("Could not generate Google Wallet pass. Use the Offline Entry Pass instead.");
    } finally {
      setLoadingGoogle(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        <Button
          type="button"
          onClick={handleAppleWallet}
          disabled={downloadingApple}
          className="h-11 w-full gap-2 rounded-2xl bg-black text-white hover:bg-neutral-800 text-xs sm:text-sm font-semibold shadow-xs cursor-pointer active:scale-98 transition"
        >
          {downloadingApple ? (
            <Loader2 className="size-4 animate-spin text-white" />
          ) : (
            <AppleLogoIcon className="size-4 text-white" />
          )}
          Add to Apple Wallet
        </Button>

        <Button
          type="button"
          onClick={handleGoogleWallet}
          disabled={loadingGoogle}
          className="h-11 w-full gap-2 rounded-2xl border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 text-xs sm:text-sm font-semibold shadow-xs cursor-pointer active:scale-98 transition"
        >
          {loadingGoogle ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleWalletIcon className="size-4" />
          )}
          Save to Google Wallet
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setShowOfflineModal(true)}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-brand-border bg-brand-cloud/60 px-3 text-xs font-semibold text-brand-ink transition hover:bg-brand-cloud hover:border-brand-border/80 active:scale-98 cursor-pointer"
      >
        <WifiOff className="size-3.5 text-brand-accent" />
        <span>Open Offline Digital Pass (Instant Entry)</span>
      </button>

      {/* Full-screen high-contrast Offline Entry Pass Modal */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative flex w-full max-w-sm flex-col items-center rounded-3xl bg-white p-6 sm:p-7 shadow-2xl ring-1 ring-white/20">
            <button
              type="button"
              onClick={() => setShowOfflineModal(false)}
              className="absolute top-4 right-4 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-black cursor-pointer"
              aria-label="Close offline pass"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span>Offline Ready · Verified Credential</span>
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
                <span>Zero Internet Required for Entry</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Kiosks and volunteer scanners verify cryptographic hash offline.
              </p>
            </div>

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
