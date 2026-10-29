"use client";

import * as React from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { toBlob } from "html-to-image";
import { Check, Copy, Download, Loader2, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/member/status-badge";
import { brandAssets, siteConfig } from "@/lib/content/site";
import { registrationStatusMeta } from "@/lib/content/member-taxonomy";
import { buildEventPassQrPayload } from "@/lib/member/qr";
import { eventPassViewModel } from "@/lib/member/event-pass-view-model";
import { createEventPassPdf } from "@/lib/member/card-export";
import { formatEventRange } from "@/lib/format";
import type { EventPass } from "@/types/member";

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
      width: 320,
      color: { dark: "#121826", light: "#ffffff" },
    })
      .then((url) => active && setQr(url))
      .catch(() => setQr(null));
    return () => {
      active = false;
    };
  }, [pass.verificationToken]);

  async function download(format: "png" | "pdf") {
    if (!ref.current) return;
    setDownloading(format);
    try {
      const png = await toBlob(ref.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      if (!png) throw new Error("Could not render the event pass.");
      const file = format === "png"
        ? png
        : new Blob([new Uint8Array(await createEventPassPdf(png, pass.eventTitle))], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.download = `CSC-EventPass-${fields.uid}${isDemo ? "-DEMO" : ""}.${format}`;
      link.href = objectUrl;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } finally {
      setDownloading(null);
    }
  }

  async function copyUid() {
    try {
      await navigator.clipboard.writeText(fields.uid);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        ref={ref}
        className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] bg-brand-white ring-1 ring-brand-border"
      >
        <div className="flex items-center gap-3 bg-gradient-to-r from-brand-blue to-brand-lilac px-6 py-4">
          <Image
            src={brandAssets.cscIcon}
            alt=""
            width={40}
            height={40}
            className="rounded-full bg-brand-white/80 ring-1 ring-brand-border"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-wide text-brand-ink uppercase">
              CSC Event Pass
            </span>
            <span className="text-[10px] text-brand-muted">
              {siteConfig.legalName}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-bold text-brand-ink text-balance">
              {pass.eventTitle}
            </h3>
            <p className="flex items-center gap-2 text-sm text-brand-muted">
              <CalendarDays className="size-4" aria-hidden />
              {formatEventRange(pass.startsAt, pass.endsAt)}
            </p>
            <p className="flex items-start gap-2 text-sm text-brand-muted">
              <MapPin className="size-4" aria-hidden />
              <span><span className="font-semibold text-brand-ink">Location:</span> {fields.location}</span>
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-brand-cloud p-4">
            <div className="flex flex-col gap-1.5">
              <div>
                <p className="text-[10px] tracking-wide text-brand-muted uppercase">
                  Name
                </p>
                <p className="text-sm font-semibold text-brand-ink">
                  {fields.name}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-brand-muted uppercase">
                  UID
                </p>
                <p className="font-mono text-sm font-semibold text-brand-ink">
                  {fields.uid}
                </p>
              </div>
              <StatusBadge label={meta.label} tone={meta.tone} />
            </div>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Event pass QR code" className="size-24 rounded-md" />
            ) : (
              <span className="flex size-24 items-center justify-center rounded-md bg-brand-white">
                <Loader2 className="size-5 animate-spin text-brand-muted" />
              </span>
            )}
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

      <Button type="button" variant="ghost" size="sm" onClick={copyUid} className="h-8 gap-2" aria-label="Copy UID">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy UID"}
      </Button>
      <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
        <Button onClick={() => void download("png")} disabled={downloading !== null} className="h-11 flex-1 gap-2">
          {downloading === "png" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Download pass as PNG
        </Button>
        <Button onClick={() => void download("pdf")} disabled={downloading !== null} variant="outline" className="h-11 flex-1 gap-2">
          {downloading === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Download pass as PDF
        </Button>
      </div>
    </div>
  );
}
