"use client";

import * as React from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { Download, RefreshCw, Ticket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/member/status-badge";
import { brandAssets, siteConfig } from "@/lib/content/site";
import { membershipStatusMeta } from "@/lib/content/member-taxonomy";
import { buildMembershipQrPayload } from "@/lib/member/qr";
import { formatEventDate } from "@/lib/format";
import type { MemberCard } from "@/types/member";
import Link from "next/link";
import { AccountAvatar } from "@/components/layout/account-avatar";

export function MemberIdCard({
  card,
  isDemo,
}: {
  card: MemberCard;
  isDemo: boolean;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState(false);
  const statusMeta = membershipStatusMeta[card.status];

  React.useEffect(() => {
    let active = true;
    QRCode.toDataURL(buildMembershipQrPayload(card.verificationToken), {
      margin: 1,
      width: 320,
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

  async function download() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `CSC-Membership-${card.memberNumber}${isDemo ? "-DEMO" : ""}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* The exportable card node (buttons are outside this ref) */}
      <div
        ref={cardRef}
        className="relative aspect-4/5 w-full max-w-sm overflow-hidden rounded-[1.75rem] bg-brand-white ring-1 ring-brand-border"
      >
        {/* Header */}
        <div className="relative flex flex-col items-center gap-1 bg-gradient-to-br from-brand-purple via-brand-blue to-brand-lilac px-6 pt-7 pb-6 text-center">
          <Image
            src={brandAssets.cscIcon}
            alt=""
            width={56}
            height={56}
            className="rounded-full bg-brand-white/80 ring-1 ring-brand-border"
          />
          <p className="mt-1 text-sm font-bold tracking-tight text-brand-ink">
            {siteConfig.legalName}
          </p>
          <p className="font-mono text-[10px] tracking-widest text-brand-muted uppercase">
            estd {siteConfig.established}
          </p>
        </div>

        {/* Profile */}
        <div className="flex flex-col items-center gap-1 px-6 pt-4">
          <span className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-brand-purple text-xl font-bold text-brand-ink ring-2 ring-brand-white">
            <AccountAvatar name={card.fullName} src={card.avatarUrl} className="size-16 text-xl" />
          </span>
          <p className="mt-1 text-lg font-bold text-brand-ink">{card.fullName}</p>
          <p className="text-xs font-medium text-brand-accent">
            {card.designationLabel}
          </p>
          {card.startupName ? (
            <p className="text-xs text-brand-muted">{card.startupName}</p>
          ) : null}
        </div>

        {/* Membership info + QR */}
        <div className="mt-3 flex items-end justify-between gap-3 px-6">
          <div className="flex flex-col gap-1.5 text-left">
            <div>
              <p className="text-[10px] tracking-wide text-brand-muted uppercase">
                Member number
              </p>
              <p className="font-mono text-sm font-semibold text-brand-ink">
                {card.memberNumber}
              </p>
            </div>
            <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
            <p className="text-[11px] text-brand-muted">
              Issued {formatEventDate(card.issuedAt)}
              {card.expiresAt ? ` · Expires ${formatEventDate(card.expiresAt)}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Membership QR code" className="size-20 rounded-md" />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-md bg-brand-cloud">
                <Loader2 className="size-5 animate-spin text-brand-muted" />
              </span>
            )}
          </div>
        </div>

        <p className="mt-2 px-6 text-center text-[10px] text-brand-muted">
          Present at eligible CSC community events.
        </p>

        {/* Footer */}
        <div className="absolute inset-x-0 bottom-0 bg-brand-ink py-2 text-center">
          <p className="font-serif text-sm font-medium text-brand-white">
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
      <div className="flex w-full max-w-sm flex-col gap-2">
        <Button onClick={download} disabled={downloading} className="h-11 w-full gap-2">
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download as PNG
        </Button>
        <div className="flex gap-2">
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
          <p className="text-center text-xs text-brand-muted">
            This is a DEMO card. Official credentials are issued only after your
            membership is verified and active.
          </p>
        ) : null}
      </div>
    </div>
  );
}
