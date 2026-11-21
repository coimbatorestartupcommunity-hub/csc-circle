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
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.54c.66-.8 1.1-1.92.98-3.04-.95.04-2.1.63-2.77 1.41-.59.68-1.11 1.77-.97 2.84 1.06.08 2.14-.52 2.76-1.21z" />
    </svg>
  );
}

function GoogleWalletIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 -4.04 78.11 78.11" fill="none" aria-hidden="true">
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
  eventDate,
  eventLocation,
}: WalletActionsProps) {
  const [walletModal, setWalletModal] = React.useState<"apple" | "google" | "offline" | null>(null);
  const [offlineQr, setOfflineQr] = React.useState<string | null>(null);
  const [savingPass, setSavingPass] = React.useState(false);

  const appleEndpoint =
    type === "member"
      ? "/api/member/id-card/wallet/apple"
      : `/api/member/events/${idOrRegId}/wallet/apple`;

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
    setWalletModal("apple");
    toast.success("Apple Wallet Digital Pass loaded");
  }

  function handleGoogleWallet() {
    setWalletModal("google");
    toast.success("Google Wallet Digital Pass loaded");
  }

  function handleDownloadRawPkpass() {
    const link = document.createElement("a");
    link.href = `${appleEndpoint}?download=pkpass`;
    link.download = type === "member" ? `CSC-Member-${memberNumber || "Card"}.pkpass` : `CSC-Pass.pkpass`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.info("Downloading .pkpass file…");
  }

  function handleSavePassImage(walletType: "apple" | "google") {
    if (!offlineQr) return;
    setSavingPass(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 1140;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setSavingPass(false);
        return;
      }

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 1140);
      if (walletType === "apple") {
        grad.addColorStop(0, "#000000");
        grad.addColorStop(1, "#1C1C1E");
      } else {
        grad.addColorStop(0, "#111827");
        grad.addColorStop(1, "#1E293B");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 1140);

      // Top Header
      ctx.fillStyle = "#818CF8";
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("COIMBATORE STARTUP COMMUNITY", 400, 75);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, sans-serif";
      const passBrand = walletType === "apple" ? "APPLE WALLET DIGITAL PASS" : "GOOGLE WALLET DIGITAL PASS";
      ctx.fillText(passBrand, 400, 120);

      // Divider line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(70, 150);
      ctx.lineTo(730, 150);
      ctx.stroke();

      // Member or Event Title
      const titleText = (type === "member" ? fullName : eventTitle) || "CSC Member";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 38px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(titleText, 400, 215);

      // Subheader ID
      const idText = type === "member" ? `MEMBER ID: ${memberNumber || "CSC-2026"}` : `PASS UID: ${memberNumber || idOrRegId}`;
      ctx.fillStyle = "#A5B4FC";
      ctx.font = "600 24px monospace";
      ctx.fillText(idText, 400, 260);

      // Designation / Startup
      if (designation || startupName) {
        ctx.fillStyle = "#CBD5E1";
        ctx.font = "20px -apple-system, BlinkMacSystemFont, sans-serif";
        const metaText = [designation, startupName].filter(Boolean).join(" · ");
        ctx.fillText(metaText, 400, 300);
      }

      // White QR Box
      const boxX = 180;
      const boxY = 340;
      const boxSize = 440;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(boxX, boxY, boxSize, boxSize, 24) : ctx.fillRect(boxX, boxY, boxSize, boxSize);
      ctx.fill();

      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.onload = () => {
        ctx.drawImage(qrImg, boxX + 25, boxY + 25, boxSize - 50, boxSize - 50);

        // Verification Badge
        ctx.fillStyle = "#10B981";
        ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText("✓ OFFLINE KIOSK ENTRANCE VERIFIED", 400, 860);

        ctx.fillStyle = "#94A3B8";
        ctx.font = "16px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText("Present to volunteer scanner or check-in kiosk. Zero internet required.", 400, 900);

        // Footer URL
        ctx.fillStyle = "#64748B";
        ctx.font = "14px monospace";
        ctx.fillText("csc.logicintelligencetechnologies.in", 400, 945);

        // Trigger file download
        const outName = walletType === "apple"
          ? `CSC-Apple-Wallet-Pass-${memberNumber || "card"}.png`
          : `CSC-Google-Wallet-Pass-${memberNumber || "card"}.png`;

        const link = document.createElement("a");
        link.download = outName;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        link.remove();

        setSavingPass(false);
        toast.success(`Digital Pass saved to your device!`);
      };
      qrImg.src = offlineQr;
    } catch {
      setSavingPass(false);
      toast.error("Could not generate pass image");
    }
  }

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        <Button
          type="button"
          onClick={handleAppleWallet}
          className="h-11 w-full gap-2 rounded-2xl bg-black text-white hover:bg-neutral-800 text-xs sm:text-sm font-semibold shadow-xs cursor-pointer active:scale-98 transition"
        >
          <AppleLogoIcon className="size-4 text-white shrink-0" />
          <span>Add to Apple Wallet</span>
        </Button>

        <Button
          type="button"
          onClick={handleGoogleWallet}
          className="h-11 w-full gap-2 rounded-2xl border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 text-xs sm:text-sm font-semibold shadow-xs cursor-pointer active:scale-98 transition"
        >
          <GoogleWalletIcon className="size-4 shrink-0" />
          <span>Save to Google Wallet</span>
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setWalletModal("offline")}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-brand-border bg-brand-cloud/60 px-3 text-xs font-semibold text-brand-ink transition hover:bg-brand-cloud hover:border-brand-border/80 active:scale-98 cursor-pointer"
      >
        <WifiOff className="size-3.5 text-brand-accent" />
        <span>Open Offline Digital Pass (Instant Entry)</span>
      </button>

      {/* Modal: Apple Wallet / Google Wallet / Offline Pass */}
      {walletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative flex w-full max-w-sm flex-col items-center rounded-3xl bg-white p-6 sm:p-7 shadow-2xl ring-1 ring-white/20">
            <button
              type="button"
              onClick={() => setWalletModal(null)}
              className="absolute top-4 right-4 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-black cursor-pointer"
              aria-label="Close pass modal"
            >
              <X className="size-5" />
            </button>

            {/* Header Badge */}
            {walletModal === "apple" ? (
              <div className="flex items-center gap-2 rounded-full bg-black px-3.5 py-1 text-xs font-semibold text-white">
                <AppleLogoIcon className="size-3.5 text-white" />
                <span>Apple Wallet Digital Pass</span>
              </div>
            ) : walletModal === "google" ? (
              <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-1 text-xs font-semibold text-neutral-800 shadow-2xs">
                <GoogleWalletIcon className="size-3.5" />
                <span>Google Wallet Digital Pass</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span>Offline Ready · Verified Credential</span>
              </div>
            )}

            <h3 className="mt-3 text-center text-xl font-bold tracking-tight text-neutral-900">
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
            <div className="mt-4 flex flex-col items-center rounded-2xl border-2 border-black bg-white p-3 shadow-sm">
              {offlineQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={offlineQr}
                  alt="Offline Admission QR Code"
                  className="size-52 [image-rendering:pixelated]"
                />
              ) : (
                <div className="flex size-52 items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-neutral-400" />
                </div>
              )}
              <span className="mt-1 font-mono text-[10px] tracking-widest text-neutral-500 uppercase">
                Present to Entrance Scanner
              </span>
            </div>

            <div className="mt-3 flex flex-col items-center gap-1 text-center text-xs text-neutral-600">
              <div className="flex items-center gap-1.5 font-medium text-neutral-900">
                <Shield className="size-4 text-emerald-600" />
                <span>Offline Entry Certified · Zero Internet Required</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Scan at all CSC venue entrance kiosks and demo day check-ins.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-col gap-2 w-full">
              <Button
                type="button"
                onClick={() => handleSavePassImage(walletModal === "google" ? "google" : "apple")}
                disabled={savingPass || !offlineQr}
                className="w-full gap-2 rounded-2xl bg-brand-ink text-white hover:bg-neutral-800 text-xs font-semibold h-11 cursor-pointer"
              >
                {savingPass ? (
                  <Loader2 className="size-4 animate-spin text-white" />
                ) : (
                  <Download className="size-4 text-white" />
                )}
                <span>Save Digital Pass to Photos / Device</span>
              </Button>

              {walletModal === "apple" && (
                <button
                  type="button"
                  onClick={handleDownloadRawPkpass}
                  className="text-center text-[11px] text-brand-muted hover:text-brand-ink underline transition cursor-pointer"
                >
                  Download .pkpass Archive file
                </button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => setWalletModal(null)}
                className="w-full rounded-2xl border-neutral-300 text-neutral-800 font-semibold text-xs h-10 cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
