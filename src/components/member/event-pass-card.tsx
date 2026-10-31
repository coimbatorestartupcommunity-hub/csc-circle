"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { toBlob } from "html-to-image";
import { Check, Copy, Download, Loader2, MapPin, CalendarDays, FileDown, IdCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/member/status-badge";
import { AccountAvatar } from "@/components/layout/account-avatar";
import { brandAssets, siteConfig } from "@/lib/content/site";
import { registrationStatusMeta } from "@/lib/content/member-taxonomy";
import { buildEventPassQrPayload } from "@/lib/member/qr";
import { eventPassViewModel } from "@/lib/member/event-pass-view-model";
import { createEventPassPdf, createEventPassExportNode, eventPassCaptureOptions, waitForEventPassAssets } from "@/lib/member/card-export";
import { formatEventRange } from "@/lib/format";
import type { EventPass } from "@/types/member";

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function EventPassCard({ pass, isDemo }: { pass: EventPass; isDemo: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState<"png" | "pdf" | null>(null);
  const [copied, setCopied] = React.useState(false);
  const meta = registrationStatusMeta[pass.status];
  const fields = eventPassViewModel(pass);

  React.useEffect(() => {
    let active = true;
    QRCode.toDataURL(buildEventPassQrPayload(pass.verificationToken), {
      margin: 1,
      width: 1024,
      color: { dark: "#121826", light: "#ffffff" },
    })
      .then((url) => active && setQr(url))
      .catch(() => setQr(null));
    return () => { active = false; };
  }, [pass.verificationToken]);

  async function download(format: "png" | "pdf") {
    if (!ref.current) return;
    setDownloading(format);
    try {
      const card = ref.current;
      if (!qr) throw new Error("The event pass QR is not ready yet. Please try again in a moment.");
      await waitForEventPassAssets(card);
      const exportNode = await createEventPassExportNode(card, { normalizeMobileMediaEffects: isMobileBrowser() });
      let png: Blob | null;
      try {
        png = await toBlob(exportNode, {
          ...eventPassCaptureOptions(card.getBoundingClientRect().height),
          backgroundColor: "#ffffff",
        });
      } finally {
        exportNode.parentElement?.remove();
      }
      if (!png || png.size === 0) throw new Error("The event pass image could not be rendered. Please try again.");
      const file = format === "png"
        ? png
        : new Blob([new Uint8Array(await createEventPassPdf(png, pass.eventTitle))], { type: "application/pdf" });
      if (file.size === 0) throw new Error(`The ${format.toUpperCase()} file is empty. Please try again.`);
      const uidFilename = fields.uid.replace(/[^A-Za-z0-9_-]/g, "-");
      const filename = `CSC-EventPass-${uidFilename}${isDemo ? "-DEMO" : ""}.${format}`;

      // On iOS devices, Web Share API allows saving PNG directly to Photos or PDF to Files
      const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (isApple && typeof navigator !== "undefined" && "canShare" in navigator && typeof navigator.share === "function") {
        try {
          const passFile = new File([file], filename, { type: file.type });
          if (navigator.canShare({ files: [passFile] })) {
            await navigator.share({
              files: [passFile],
              title: filename,
            });
            toast.success(`Saved ${filename}`);
            return;
          }
        } catch (shareErr) {
          if (shareErr instanceof DOMException && shareErr.name === "AbortError") {
            return;
          }
        }
      }

      // Direct download: Triggers native file download to Downloads folder across Android, Laptops, Desktops and fallback
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not prepare the event pass as ${format.toUpperCase()}.`);
    } finally {
      setDownloading(null);
    }
  }

  async function copyUid() {
    try {
      await navigator.clipboard.writeText(fields.uid);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  }

  return (
    <div className="flex w-full flex-col items-center gap-4 sm:gap-6">
      {/* The exportable card node */}
      <div
        ref={ref}
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_25px_60px_-22px_rgba(52,48,108,0.4)] ring-1 ring-brand-border backdrop-blur-xl transition-transform duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_30px_65px_-22px_rgba(52,48,108,0.48)] motion-reduce:transition-none"
      >
        {/* Brand header matching glass-office design */}
        <div className="relative flex items-center justify-between overflow-hidden bg-gradient-to-r from-[#f5efff] via-[#e9f3ff] to-[#fbfaff] px-4 py-3.5 sm:px-6 sm:py-4 border-b border-brand-border/60">
          <span aria-hidden="true" className="pointer-events-none absolute -top-8 -right-6 size-24 rounded-full bg-white/60 blur-xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 -left-6 size-28 rounded-full bg-[#d7d1ff]/50 blur-xl" />
          <div className="relative flex items-center gap-3">
            <Image
              src={brandAssets.cscIcon}
              alt="CSC Circle logo"
              width={40}
              height={40}
              unoptimized
              className="size-10 rounded-full bg-white/95 object-contain p-1 shadow-xs ring-1 ring-brand-border sm:size-11"
            />
            <div className="flex min-w-0 flex-col">
              <span className="text-xs font-bold tracking-wider text-brand-ink uppercase sm:text-sm">CSC Event Pass</span>
              <span className="text-[10px] font-medium text-brand-muted">{siteConfig.legalName}</span>
            </div>
          </div>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>

        <div className="flex flex-col gap-4 p-5 sm:gap-5 sm:p-6">
          {/* Attendee Profile & Event Title */}
          <div className="flex flex-col items-center gap-2.5 text-center">
            <span role="img" aria-label="Attendee profile picture" className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#eee8ff] to-[#e3f0ff] ring-4 ring-white shadow-[0_0_0_1px_rgba(111,100,186,0.22),0_5px_15px_-7px_rgba(55,48,119,0.55)]">
              <AccountAvatar name={fields.name} src={pass.avatarUrl} className="size-full text-2xl" />
            </span>
            <h3 className="max-w-full break-words text-center text-lg font-bold leading-snug text-brand-ink text-balance sm:text-xl">
              {pass.eventTitle}
            </h3>
          </div>

          {/* Date & Location */}
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl bg-brand-cloud/60 p-3.5 ring-1 ring-brand-border/40">
            <p className="flex min-w-0 items-center gap-2 text-xs sm:text-sm text-brand-secondary">
              <CalendarDays className="size-4 shrink-0 text-brand-muted" aria-hidden />
              <span className="min-w-0 font-medium break-words">{formatEventRange(pass.startsAt, pass.endsAt)}</span>
            </p>
            <p className="flex min-w-0 items-start gap-2 text-xs sm:text-sm text-brand-secondary">
              <MapPin className="mt-0.5 size-7 shrink-0 text-brand-accent" aria-hidden />
              <span className="min-w-0 break-words leading-relaxed"><span className="font-semibold text-brand-ink">Location:</span> {fields.location}</span>
            </p>
          </div>

          {/* Attendee Details Card - Perfectly aligned before the QR code, matching design */}
          <div className="flex min-w-0 flex-col gap-3.5 rounded-[1.5rem] border border-brand-border/60 bg-[#f8faff]/85 p-4 sm:p-5 text-left ring-1 ring-brand-border/30">
            {/* Row 1: Name and Phone */}
            <div className="grid grid-cols-2 gap-4 min-w-0">
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-brand-muted uppercase block">
                  Name
                </span>
                <p className="mt-1 truncate text-xs sm:text-sm font-bold text-brand-ink uppercase no-underline [text-decoration:none]">
                  {fields.name}
                </p>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-brand-muted uppercase block">
                  Phone
                </span>
                <p className="mt-1 truncate text-xs sm:text-sm font-bold text-brand-ink no-underline [text-decoration:none]">
                  {fields.phone}
                </p>
              </div>
            </div>

            {/* Row 2: Email - Centered */}
            <div className="flex w-full min-w-0 flex-col items-center justify-center text-center">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-brand-muted uppercase block text-center">
                Email
              </span>
              <p
                className="mt-1 max-w-full break-all text-center text-xs sm:text-sm font-bold text-brand-ink no-underline [text-decoration:none] border-none"
                style={{ textDecoration: "none", textDecorationLine: "none", borderBottom: "none" }}
              >
                {fields.email}
              </p>
            </div>

            {/* Row 3: UID - Centered */}
            <div className="flex w-full min-w-0 flex-col items-center justify-center text-center">
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-brand-muted uppercase block text-center">
                UID
              </span>
              <p
                className="mt-1 max-w-full whitespace-nowrap font-mono text-[9px] sm:text-[11px] font-bold tracking-tight text-brand-ink text-center no-underline [text-decoration:none] overflow-hidden text-ellipsis border-none"
                style={{ textDecoration: "none", textDecorationLine: "none", borderBottom: "none" }}
                title={fields.uid}
              >
                {fields.uid}
              </p>
            </div>
          </div>

          {/* Entrance Verification QR Code Section */}
          <div className="flex flex-col items-center gap-2.5 rounded-[1.5rem] border border-brand-border/60 bg-[#f8faff]/85 p-4 sm:p-5 text-center ring-1 ring-brand-border/30">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] text-brand-muted uppercase">
              Entrance Verification QR
            </span>
            <div className="relative flex size-44 sm:size-52 items-center justify-center rounded-2xl bg-white p-3 shadow-xs ring-1 ring-brand-border">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt="Event pass QR code"
                  className="size-full object-contain"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-brand-muted" />
                </div>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-brand-secondary">
              Scan at Venue Entrance
            </p>
          </div>

          <p className="text-center text-[11px] text-brand-muted">
            Show this pass at the entrance. All times in India Standard Time.
          </p>
        </div>

        {isDemo ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rotate-[-18deg] rounded-md bg-brand-ink/5 px-4 py-1 text-xs font-bold tracking-widest text-brand-ink/40 uppercase ring-1 ring-brand-ink/10">
              Demo · not a valid pass
            </span>
          </div>
        ) : null}
      </div>

      {/* Action Buttons matching Member ID Card design */}
      <div className="grid w-full max-w-md grid-cols-2 gap-2.5">
        <Button
          onClick={() => void download("png")}
          disabled={downloading !== null || !qr}
          className="h-12 w-full gap-2 rounded-xl bg-brand-ink text-sm font-semibold text-white shadow-sm transition hover:bg-brand-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
        >
          {downloading === "png" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download as PNG
        </Button>
        <Button
          onClick={() => void download("pdf")}
          disabled={downloading !== null || !qr}
          variant="outline"
          className="h-12 w-full gap-2 rounded-xl border border-brand-border bg-white text-sm font-semibold text-brand-ink transition hover:bg-brand-cloud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"
        >
          {downloading === "pdf" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileDown className="size-4" />
          )}
          Download as PDF
        </Button>

        <div className="col-span-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyUid}
            className="h-10 flex-1 gap-1.5 rounded-xl text-xs font-medium"
            aria-label="Copy UID"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            {copied ? "Copied UID" : "Copy UID"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            className="h-10 flex-1 gap-1.5 rounded-xl text-xs font-medium"
            render={<Link href="/member/id-card" />}
          >
            <IdCard className="size-3.5" /> Member ID
          </Button>
        </div>
      </div>
    </div>
  );
}
