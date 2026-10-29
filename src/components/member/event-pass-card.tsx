"use client";

import * as React from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { toBlob } from "html-to-image";
import { Check, Copy, Download, ExternalLink, Loader2, MapPin, CalendarDays, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/member/status-badge";
import { AccountAvatar } from "@/components/layout/account-avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brandAssets, siteConfig } from "@/lib/content/site";
import { registrationStatusMeta } from "@/lib/content/member-taxonomy";
import { buildEventPassQrPayload } from "@/lib/member/qr";
import { eventPassViewModel } from "@/lib/member/event-pass-view-model";
import { createEventPassPdf, createEventPassExportNode, eventPassCaptureOptions, waitForEventPassAssets } from "@/lib/member/card-export";
import { formatEventRange } from "@/lib/format";
import type { EventPass } from "@/types/member";

type PendingMobileExport = { file: File; objectUrl: string; filename: string; format: "png" | "pdf" };

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function EventPassCard({ pass, isDemo }: { pass: EventPass; isDemo: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState<"png" | "pdf" | null>(null);
  const [pendingMobileExport, setPendingMobileExport] = React.useState<PendingMobileExport | null>(null);
  const [copied, setCopied] = React.useState(false);
  const meta = registrationStatusMeta[pass.status];
  const fields = eventPassViewModel(pass);

  React.useEffect(() => {
    let active = true;
    QRCode.toDataURL(buildEventPassQrPayload(pass.verificationToken), {
      margin: 1,
      width: 512,
      color: { dark: "#121826", light: "#ffffff" },
    })
      .then((url) => active && setQr(url))
      .catch(() => setQr(null));
    return () => { active = false; };
  }, [pass.verificationToken]);

  React.useEffect(() => () => {
    if (pendingMobileExport) URL.revokeObjectURL(pendingMobileExport.objectUrl);
  }, [pendingMobileExport]);

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

      if (isMobileBrowser()) {
        const pendingFile = new File([file], filename, { type: file.type });
        setPendingMobileExport({ file: pendingFile, objectUrl: URL.createObjectURL(file), filename, format });
        toast.success(`Your high-resolution ${format.toUpperCase()} pass is ready to save.`);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not prepare the event pass as ${format.toUpperCase()}.`);
    } finally {
      setDownloading(null);
    }
  }

  function shareOrSaveMobileExport() {
    if (!pendingMobileExport) return;
    const { file, format } = pendingMobileExport;
    const shareApi = Reflect.get(navigator, "share") as Navigator["share"] | undefined;
    const canShareApi = Reflect.get(navigator, "canShare") as Navigator["canShare"] | undefined;
    if (!shareApi || (canShareApi && !canShareApi.call(navigator, { files: [file] }))) {
      openMobileExportInSameTab();
      return;
    }
    try {
      void Promise.resolve(shareApi.call(navigator, { files: [file], title: "CSC Circle event pass" }))
        .then(() => setPendingMobileExport(null))
        .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          toast.info("Sharing cancelled. Your pass is still ready here.");
          return;
        }
        toast.error(`Could not open the Share sheet for your ${format.toUpperCase()} pass. Use Open file in this tab to save it.`);
        });
    } catch {
      toast.error(`Could not open the Share sheet for your ${format.toUpperCase()} pass. Use Open file in this tab to save it.`);
    }
  }

  function openMobileExportInSameTab() {
    if (pendingMobileExport) window.location.assign(pendingMobileExport.objectUrl);
  }

  async function copyUid() {
    try {
      await navigator.clipboard.writeText(fields.uid);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3 sm:gap-5">
      <div ref={ref} className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] bg-brand-white ring-1 ring-brand-border">
        <div className="flex items-center gap-3 bg-gradient-to-r from-brand-blue to-brand-lilac px-4 py-3 sm:px-6 sm:py-4">
          <Image src={brandAssets.cscIcon} alt="" width={40} height={40} unoptimized className="size-10 rounded-full bg-brand-white/80 object-cover ring-1 ring-brand-border" />
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold tracking-wide text-brand-ink uppercase">CSC Event Pass</span>
            <span className="text-[10px] text-brand-muted">{siteConfig.legalName}</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span role="img" aria-label="Attendee profile picture" className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#eee8ff] to-[#e3f0ff] ring-4 ring-white shadow-[0_0_0_1px_rgba(111,100,186,0.22),0_5px_15px_-7px_rgba(55,48,119,0.55)]">
              <AccountAvatar name={fields.name} src={pass.avatarUrl} className="size-full text-2xl" />
            </span>
            <h3 className="max-w-full break-words text-center text-lg font-bold leading-tight text-brand-ink text-balance sm:text-xl">{pass.eventTitle}</h3>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <p className="flex min-w-0 items-center gap-2 text-sm text-brand-muted">
              <CalendarDays className="size-5 shrink-0" aria-hidden />
              <span className="min-w-0 break-words">{formatEventRange(pass.startsAt, pass.endsAt)}</span>
            </p>
            <p className="flex min-w-0 items-start gap-2 text-sm text-brand-muted">
              <MapPin className="mt-0.5 size-7 shrink-0 text-brand-accent" aria-hidden />
              <span className="min-w-0 break-words"><span className="font-semibold text-brand-ink">Location:</span> {fields.location}</span>
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_4rem] items-center gap-3 rounded-2xl bg-brand-cloud p-3 sm:grid-cols-[minmax(0,1fr)_6rem] sm:gap-4 sm:p-4">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="min-w-0"><p className="text-[10px] tracking-wide text-brand-muted uppercase">Name</p><p className="break-words text-sm font-semibold text-brand-ink">{fields.name}</p></div>
              <div className="min-w-0"><p className="text-[10px] tracking-wide text-brand-muted uppercase">Email</p><p className="break-all text-xs font-medium text-brand-ink">{fields.email}</p></div>
              <div className="min-w-0"><p className="text-[10px] tracking-wide text-brand-muted uppercase">Phone</p><p className="break-words text-xs font-medium text-brand-ink">{fields.phone}</p></div>
              <div className="min-w-0"><p className="text-[10px] tracking-wide text-brand-muted uppercase">UID</p><p className="whitespace-nowrap font-mono text-[7px] font-semibold tracking-[-0.1em] text-brand-ink sm:text-[10px]" title={fields.uid}>{fields.uid}</p></div>
              <StatusBadge label={meta.label} tone={meta.tone} />
            </div>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Event pass QR code" className="size-16 shrink-0 rounded-md bg-white sm:size-24" />
            ) : <span className="flex size-16 items-center justify-center rounded-md bg-brand-white sm:size-24"><Loader2 className="size-5 animate-spin text-brand-muted" /></span>}
          </div>

          <p className="text-center text-[11px] text-brand-muted">Show this pass at the entrance. All times in India Standard Time.</p>
        </div>

        {isDemo ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="rotate-[-18deg] rounded-md bg-brand-ink/5 px-4 py-1 text-xs font-bold tracking-widest text-brand-ink/40 uppercase ring-1 ring-brand-ink/10">Demo · not a valid pass</span></div> : null}
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={copyUid} className="h-8 gap-2" aria-label="Copy UID">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy UID"}</Button>
      <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
        <Button onClick={() => void download("png")} disabled={downloading !== null} className="h-11 min-w-0 flex-1 gap-2"><span className="shrink-0">{downloading === "png" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}</span>Download pass as PNG</Button>
        <Button onClick={() => void download("pdf")} disabled={downloading !== null} variant="outline" className="h-11 min-w-0 flex-1 gap-2"><span className="shrink-0">{downloading === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}</span>Download pass as PDF</Button>
      </div>

      <Dialog open={pendingMobileExport !== null} onOpenChange={(open) => { if (!open) setPendingMobileExport(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Your event pass is ready</DialogTitle><DialogDescription>Tap Share, then choose Save to Files (or another destination). This preserves the full-resolution {pendingMobileExport?.format.toUpperCase()} file.</DialogDescription></DialogHeader>
          <p className="break-all rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{pendingMobileExport?.filename}</p>
          <DialogFooter className="sm:flex-col">
            <Button onClick={shareOrSaveMobileExport} className="w-full gap-2"><Share2 className="size-4" />Share or Save to Files</Button>
            <Button variant="outline" onClick={openMobileExportInSameTab} className="w-full gap-2"><ExternalLink className="size-4" />Open file in this tab</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
