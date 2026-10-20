"use client";

import * as React from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
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
import { AccountAvatar } from "@/components/layout/account-avatar";
import { clipMembershipCardPng, createMembershipCardPdf, membershipCardCaptureOptions, pngDataUrlToBlob } from "@/lib/member/card-export";

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
      const rawPng = await toPng(
        cardElement,
        membershipCardCaptureOptions(cardElement.getBoundingClientRect().height),
      );
      const computedStyle = window.getComputedStyle(cardElement);
      const cornerRadiusCssPx = Number.parseFloat(computedStyle.borderTopLeftRadius) || 0;
      const dataUrl = await clipMembershipCardPng(
        rawPng,
        cornerRadiusCssPx,
        cardElement.getBoundingClientRect().width,
      );
      const suffix = isDemo ? "-DEMO" : "";
      const filename = `CSC-Membership-${card.memberNumber}${suffix}.${format}`;
      let fileBlob: Blob;
      if (format === "png") {
        fileBlob = pngDataUrlToBlob(dataUrl);
      } else {
        const pdfBytes = await createMembershipCardPdf(dataUrl);
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
        className="relative flex aspect-4/5 w-full max-w-[21rem] flex-col overflow-hidden rounded-[1.75rem] bg-brand-white ring-1 ring-brand-border sm:max-w-sm"
      >
        {/* Header */}
        <div className="flex shrink-0 flex-col items-center gap-1 bg-gradient-to-br from-brand-purple via-brand-blue to-brand-lilac px-4 pt-4 pb-3 text-center sm:px-6 sm:pt-7 sm:pb-6">
          <Image
            src={brandAssets.cscIcon}
            alt=""
            width={64}
            height={64}
            unoptimized
            className="size-12 rounded-full bg-brand-white/80 ring-1 ring-brand-border sm:size-16"
          />
          <p className="mt-1 text-xs font-bold tracking-tight text-brand-ink sm:text-sm">
            {siteConfig.legalName}
          </p>
          <p className="font-mono text-[9px] tracking-widest text-brand-muted uppercase sm:text-[10px]">
            estd {siteConfig.established}
          </p>
        </div>

        {/* Profile */}
        <div className="flex shrink-0 flex-col items-center gap-1 px-4 pt-3 sm:px-6 sm:pt-4">
          <span className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-brand-purple text-lg font-bold text-brand-ink ring-2 ring-brand-white sm:size-16 sm:text-xl">
            <AccountAvatar name={card.fullName} src={card.avatarUrl} className="size-14 text-lg sm:size-16 sm:text-xl" />
          </span>
          <p className="mt-1 max-w-full break-words text-center text-base font-bold leading-tight text-brand-ink sm:text-lg">{card.fullName}</p>
          <p className="text-[11px] font-medium text-brand-accent sm:text-xs">
            {card.designationLabel}
          </p>
          {card.startupName ? (
            <p className="max-w-full break-words text-center text-[11px] text-brand-muted sm:text-xs">{card.startupName}</p>
          ) : null}
        </div>

        {/* Membership info + QR */}
        <div className="mt-2 flex shrink-0 items-end justify-between gap-2 px-4 sm:mt-3 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 flex-col gap-1 text-left sm:gap-1.5">
            <div>
              <p className="text-[9px] tracking-wide text-brand-muted uppercase sm:text-[10px]">
                Member number
              </p>
              <p className="break-all font-mono text-xs font-semibold text-brand-ink sm:text-sm">
                {card.memberNumber}
              </p>
            </div>
            <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
            <p className="text-[9px] leading-tight text-brand-muted sm:text-[11px]">
              Issued {formatEventDate(card.issuedAt)}
              {card.expiresAt ? ` · Expires ${formatEventDate(card.expiresAt)}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Membership QR code" className="size-16 rounded-md sm:size-20" />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-md bg-brand-cloud sm:size-20">
                <Loader2 className="size-5 animate-spin text-brand-muted" />
              </span>
            )}
          </div>
        </div>

        <p className="mt-auto px-4 pt-1 pb-2 text-center text-[9px] leading-tight text-brand-muted sm:px-6 sm:text-[10px]">
          Present at eligible CSC community events.
        </p>

        {/* Footer */}
        <div className="shrink-0 bg-brand-ink py-1.5 text-center sm:py-2">
          <p className="font-serif text-xs font-medium text-brand-white sm:text-sm">
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
        <Button onClick={() => download("png")} disabled={downloading !== null} className="h-11 w-full gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
          {downloading === "png" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download as PNG
        </Button>
        <Button onClick={() => download("pdf")} disabled={downloading !== null} variant="outline" className="h-11 w-full gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
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
            className="h-10 flex-1 gap-2"
            render={<Link href="/member/id-card" />}
          >
            <RefreshCw className="size-4" /> Refresh status
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
