"use client";

import * as React from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { toBlob } from "html-to-image";
import { Download, RefreshCw, Ticket, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/member/status-badge";
import { brandAssets, siteConfig } from "@/lib/content/site";
import { membershipStatusMeta } from "@/lib/content/member-taxonomy";
import { buildMembershipQrPayload } from "@/lib/member/qr";
import { formatEventDate } from "@/lib/format";
import type { MemberCard } from "@/types/member";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountAvatar } from "@/components/layout/account-avatar";
import { clipMembershipCardPng, createMembershipCardExportNode, createMembershipCardPdf, membershipCardCaptureOptions, waitForMembershipCardAssets } from "@/lib/member/card-export";

export function MemberIdCard({
  card,
  isDemo,
}: {
  card: MemberCard;
  isDemo: boolean;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState<"png" | "pdf" | null>(null);
  const [refreshing, startRefresh] = React.useTransition();
  const router = useRouter();
  const statusMeta = membershipStatusMeta[card.status];

  function isAppleMobileBrowser() {
    const userAgent = navigator.userAgent;
    const iOSDevice = /iPhone|iPad|iPod/i.test(userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return iOSDevice;
  }

  React.useEffect(() => {
    let active = true;
    QRCode.toDataURL(buildMembershipQrPayload(card.verificationToken), {
      margin: 1,
      width: 1024,
      color: { dark: "#121826", light: "#ffffff" },
    })
      .then((url) => {
        if (active) setQr(url);
      })
      .catch(() => setQr(null));
    return () => {
      active = false;
    };
  }, [card.verificationToken]);

  async function download(format: "png" | "pdf") {
    if (!cardRef.current) return;
    // iOS Safari may ignore `a[download]` for generated Blob URLs. Reserve a
    // same-gesture tab before rendering so the resulting file can still open
    // in Safari if the native Share sheet is unavailable.
    const appleMobile = isAppleMobileBrowser();
    const fallbackWindow = appleMobile ? window.open("about:blank", "_blank") : null;
    setDownloading(format);
    try {
      const cardElement = cardRef.current;
      if (!qr) throw new Error("The membership verification QR is not ready.");
      await waitForMembershipCardAssets(cardElement);
      const exportNode = await createMembershipCardExportNode(cardElement);
      let rawPng: Blob | null;
      try {
        rawPng = await toBlob(
          exportNode,
          membershipCardCaptureOptions(cardElement.getBoundingClientRect().height),
        );
      } finally {
        exportNode.remove();
      }
      if (!rawPng) throw new Error("Could not render the membership card image.");
      const computedStyle = window.getComputedStyle(cardElement);
      const cornerRadiusCssPx = Number.parseFloat(computedStyle.borderTopLeftRadius) || 0;
      const pngBlob = await clipMembershipCardPng(
        rawPng,
        cornerRadiusCssPx,
        cardElement.getBoundingClientRect().width,
      );
      const suffix = isDemo ? "-DEMO" : "";
      const filename = `CSC-Membership-${card.memberNumber}${suffix}.${format}`;
      let fileBlob: Blob;
      if (format === "png") {
        fileBlob = pngBlob;
      } else {
        const pdfBytes = await createMembershipCardPdf(pngBlob);
        fileBlob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      }

      if (appleMobile) {
        const file = new File([fileBlob], filename, { type: fileBlob.type });
        if (navigator.canShare?.({ files: [file] }) && navigator.share) {
          try {
            await navigator.share({ files: [file], title: "CSC Circle membership card" });
            fallbackWindow?.close();
            return;
          } catch (shareError) {
            if (shareError instanceof DOMException && shareError.name === "AbortError") {
              fallbackWindow?.close();
              return;
            }
            // Continue to Safari's native file preview fallback below.
          }
        }

        const objectUrl = URL.createObjectURL(fileBlob);
        if (fallbackWindow && !fallbackWindow.closed) {
          fallbackWindow.location.replace(objectUrl);
        } else {
          // Popup blocking should not make the export inaccessible on iOS.
          window.location.assign(objectUrl);
        }
        toast.info(format === "pdf"
          ? "Your card is open in Safari. Use Share, then Save to Files."
          : "Your card image is open in Safari. Touch and hold it to save or share.");
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        return;
      }

      const objectUrl = URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Safari may consume Blob URLs after a download event has returned.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      fallbackWindow?.close();
      toast.error(`Could not download the membership card as ${format.toUpperCase()}. Please try again.`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* The exportable card node (buttons are outside this ref) */}
      <div
        ref={cardRef}
        className="relative flex aspect-[4/5] w-full max-w-[18rem] flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_22px_55px_-28px_rgba(52,48,108,0.55)] ring-1 ring-brand-border transition-transform duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_28px_62px_-28px_rgba(52,48,108,0.62)] motion-reduce:transition-none sm:max-w-[21rem]"
      >
        {/* Brand header */}
        <div className="relative flex h-[25%] shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden bg-gradient-to-br from-[#f5efff] via-[#e9f3ff] to-[#fbfaff] px-3 text-center sm:px-5">
          <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-8 size-28 rounded-full bg-white/55 blur-2xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-14 -left-8 size-32 rounded-full bg-[#d7d1ff]/45 blur-2xl" />
          <Image
            src={brandAssets.cscIcon}
            alt="CSC Circle logo"
            width={256}
            height={256}
            unoptimized
            className="relative size-10 rounded-full bg-white/95 object-contain p-1 shadow-sm ring-1 ring-white sm:size-12"
          />
          <p className="relative max-w-full text-[10px] font-bold leading-tight tracking-[0.06em] text-brand-ink sm:text-[11px]">
            {siteConfig.legalName}
          </p>
          <p className="relative font-mono text-[8px] font-medium tracking-[0.22em] text-brand-muted uppercase sm:text-[9px]">
            ESTD {siteConfig.established}
          </p>
        </div>

        {/* Member identity */}
        <div className="flex h-[30%] shrink-0 flex-col items-center justify-center gap-0.5 bg-white px-4 text-center sm:px-6">
          <span className="mb-1 flex size-[3.35rem] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#eee8ff] to-[#e3f0ff] text-lg font-bold text-brand-ink ring-[3px] ring-white shadow-[0_0_0_1px_rgba(111,100,186,0.22),0_5px_15px_-7px_rgba(55,48,119,0.55)] sm:size-[3.7rem]">
            <AccountAvatar name={card.fullName} src={card.avatarUrl} className="size-full text-lg sm:text-xl" />
          </span>
          <p className="max-w-full break-words text-center text-[15px] font-bold leading-tight text-brand-ink sm:text-base">{card.fullName}</p>
          <p className="max-w-full break-words text-[10px] font-semibold leading-tight text-[#6557b4] sm:text-[11px]">
            {card.designationLabel}
          </p>
          {card.startupName ? (
            <p className="max-w-full break-words text-center text-[9px] leading-tight text-brand-muted sm:text-[10px]">{card.startupName}</p>
          ) : null}
        </div>

        {/* Membership details and verification */}
        <div className="flex min-h-0 flex-1 items-center justify-between gap-2 bg-gradient-to-br from-[#fbfaff] via-[#f5f8ff] to-[#fff8fc] px-4 py-2 sm:gap-3 sm:px-5">
          <div className="flex min-w-0 flex-col gap-1.5 text-left sm:gap-2">
            <div>
              <p className="text-[8px] font-semibold tracking-[0.16em] text-brand-muted uppercase sm:text-[9px]">
                Member number
              </p>
              <p className="break-all font-mono text-[11px] font-bold tracking-tight text-brand-ink sm:text-xs">
                {card.memberNumber}
              </p>
            </div>
            <StatusBadge label={statusMeta.label} tone={statusMeta.tone} className="px-2 py-0.5 text-[9px]" />
            <p className="text-[8px] leading-tight text-brand-muted sm:text-[9px]">
              {card.issuedAt ? `Issued ${formatEventDate(card.issuedAt)}` : "Issued date unavailable"}
              {card.expiresAt ? ` · Expires ${formatEventDate(card.expiresAt)}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center rounded-xl border border-white bg-white p-1.5 shadow-sm ring-1 ring-[#dfe4f0] sm:p-2">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Scan to verify CSC membership" className="size-[4.35rem] [image-rendering:pixelated] sm:size-[4.65rem]" />
            ) : (
              <span className="flex size-[4.35rem] items-center justify-center rounded-md bg-brand-cloud sm:size-[4.65rem]">
                <Loader2 className="size-5 animate-spin text-brand-muted" />
              </span>
            )}
            <span className="mt-1 text-[7px] font-semibold tracking-[0.14em] text-brand-muted uppercase">Verify ID</span>
          </div>
        </div>

        {/* Premium footer band */}
        <div className="flex h-[11%] shrink-0 items-center justify-center bg-gradient-to-r from-[#171b35] via-[#262749] to-[#171b35] px-3 text-center">
          <p className="font-serif text-xs font-medium tracking-wide text-white sm:text-sm">
            Connect. Build. Grow.
          </p>
        </div>

        {/* DEMO watermark */}
        {isDemo ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rotate-[-24deg] rounded-md bg-brand-ink/5 px-4 py-1 text-xs font-bold tracking-widest text-brand-ink/40 uppercase ring-1 ring-brand-ink/10">
              Demo preview · not an official credential
            </span>
          </div>
        ) : null}
      </div>

      {/* Controls (excluded from export) */}
      <div className="grid w-full max-w-sm grid-cols-2 gap-2">
        <Button onClick={() => download("png")} disabled={downloading !== null || !qr} className="h-11 w-full gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
          {downloading === "png" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download as PNG
        </Button>
        <Button onClick={() => download("pdf")} disabled={downloading !== null || !qr} variant="outline" className="h-11 w-full gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
          {downloading === "pdf" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileDown className="size-4" />
          )}
          Download as PDF
        </Button>
        <div className="col-span-2 flex gap-2">
          <Button
            variant="outline"
            className="h-10 flex-1 gap-2"
            render={<Link href="/member/events" />}
          >
            <Ticket className="size-4" /> My event passes
          </Button>
          <Button
            variant="outline"
            disabled={refreshing}
            onClick={() => startRefresh(() => router.refresh())}
            className="h-10 flex-1 gap-2"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing…" : "Refresh status"}
          </Button>
        </div>
        {isDemo ? (
          <p className="col-span-2 text-center text-xs text-brand-muted">
            This is a DEMO card. Official credentials are issued only after your
            membership is verified and active.
          </p>
        ) : null}
      </div>
    </div>
  );
}
