"use client";

import * as React from "react";
import Image from "next/image";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Ban,
  ScanLine,
  Loader2,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ResultState =
  | "idle"
  | "verifying"
  | "valid"
  | "invalid"
  | "pending"
  | "payment"
  | "wrong_event"
  | "revoked"
  | "already";

const resultMeta: Record<
  Exclude<ResultState, "idle" | "verifying">,
  { label: string; tone: string; icon: React.ElementType }
> = {
  valid: { label: "Valid — entry allowed", tone: "bg-green-100 text-green-800", icon: CheckCircle2 },
  invalid: { label: "Not registered — no event pass", tone: "bg-brand-red text-brand-ink", icon: XCircle },
  pending: { label: "Pending approval", tone: "bg-brand-gold text-brand-ink", icon: Clock },
  payment: { label: "Payment incomplete", tone: "bg-brand-gold text-brand-ink", icon: CreditCard },
  wrong_event: { label: "Wrong event", tone: "bg-brand-red text-brand-ink", icon: Ban },
  revoked: { label: "Expired / revoked", tone: "bg-brand-red text-brand-ink", icon: Ban },
  already: { label: "Already checked in", tone: "bg-red-100 text-red-800", icon: Ban },
};

/**
 * DEMO-only check-in scanner. It parses a QR credential locally but the scanner
 * NEVER decides admission on its own — in production the trusted API verifies
 * entitlement, payment, revocation and duplicate check-ins, then atomically
 * records attendance. No demo scan records real attendance or grants entry.
 */
export function CheckInScanner({
  events,
  isDemo,
}: {
  events: { id: string; title: string; startsAt: string }[];
  isDemo: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<IScannerControls | null>(null);
  const [eventId, setEventId] = React.useState(events[0]?.id ?? "");
  const [cameraState, setCameraState] = React.useState<"off" | "starting" | "on" | "denied">("off");
  const [result, setResult] = React.useState<ResultState>("idle");
  const [detail, setDetail] = React.useState<string>("");
  const [verifiedMember, setVerifiedMember] = React.useState<{ name: string; memberNumber: string | null; membershipStatus: string | null; designation: string | null; startupName: string | null; portraitUrl: string | null; eventTitle: string | null; registrationReference: string } | null>(null);
  const [manual, setManual] = React.useState("");

  const stop = React.useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraState("off");
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  const verifying = React.useRef(false);

  async function start() {
    setResult("idle");
    setVerifiedMember(null);
    setCameraState("starting");
    try {
      // Faster re-scan cadence so a code is captured the instant it is sharp.
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 80, delayBetweenScanSuccess: 300 });
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1280 } } },
        videoRef.current!,
        (res) => { if (res) void verify(res.getText()); },
      );
      controlsRef.current = controls;
      // Continuous autofocus where supported, so the preview sharpens
      // immediately instead of after a visible focus hunt.
      try {
        const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks?.()[0];
        await track?.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as unknown as MediaTrackConstraints);
      } catch { /* focusMode not supported on this camera */ }
      setCameraState("on");
    } catch {
      setCameraState("denied");
    }
  }

  async function verify(text: string) {
    if (verifying.current) return;
    verifying.current = true;
    // One scan = one result: stop the camera immediately, show the verdict,
    // then "Scan next" reopens the scanner for the next person.
    stop(); setResult("verifying"); setVerifiedMember(null);
    try {
      const payload = JSON.parse(text);
      if (payload.t !== "csc.eventpass" || payload.v !== 1 || !payload.ref) throw new Error("invalid");
      if (isDemo) { setResult("invalid"); setDetail("DEMO only. No entry authorized and no attendance recorded."); return; }
      const res = await fetch("/api/admin/check-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: eventId, payload }) });
      const data = await res.json();
      if (!res.ok || !data.status || !(data.status in resultMeta)) {
        setResult("invalid"); setDetail(data.error ?? "Verification unavailable. No entry authorized."); return;
      }
      // Show the verdict at once; load the attendee pass card afterwards so it
      // never delays the result.
      setResult(data.status as ResultState);
      setDetail(data.status === "valid" ? `${data.name ?? "Attendee"} · ${data.reference} · check-in recorded` : data.status === "already" ? `Previously checked in at ${data.checkedInAt}` : "Entry blocked by the server.");
      if (data.status === "valid" || data.status === "already") {
        void fetch(`/api/admin/check-in/pass?event=${encodeURIComponent(eventId)}&ref=${encodeURIComponent(payload.ref)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((card) => { if (card?.attendee) setVerifiedMember(card.attendee); })
          .catch(() => {});
      }
    } catch { setResult("invalid"); setDetail("Could not verify this credential. Check the code and network connection."); }
    finally { verifying.current = false; }
  }

  const selectedEvent = events.find((e) => e.id === eventId);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-4 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="scan-event" className="text-sm font-medium text-brand-ink">
            Event
          </label>
          <select
            id="scan-event"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>

        <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden rounded-xl bg-brand-ink/90">
          <video ref={videoRef} className="size-full object-cover" muted playsInline />
          {cameraState === "off" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-brand-white/80">
              <ScanLine className="size-10" />
              <p className="text-sm">Camera is off</p>
            </div>
          ) : null}
          {cameraState === "starting" ? (
            <div className="absolute inset-0 flex items-center justify-center text-brand-white">
              <Loader2 className="size-8 animate-spin" />
            </div>
          ) : null}
          {cameraState === "denied" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-brand-white/80">
              <CameraOff className="size-10" />
              <p className="text-sm">Camera permission denied</p>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          {cameraState === "on" ? (
            <Button variant="outline" onClick={stop} className="gap-2">
              <CameraOff className="size-4" /> Stop camera
            </Button>
          ) : (
            <Button onClick={start} className="gap-2">
              <Camera className="size-4" /> Start camera
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-brand-border pt-4">
          <label htmlFor="manual-code" className="text-sm font-medium text-brand-ink">
            Manual code entry
          </label>
          <div className="flex gap-2">
            <Input
              id="manual-code"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder='{"t":"csc.eventpass","v":1,"ref":"…"}'
              className="h-9"
            />
            <Button variant="outline" onClick={() => manual && verify(manual)}>
              Verify
            </Button>
          </div>
        </div>
      </div>

      {/* Result panel */}
      <div className="flex flex-col gap-4 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-brand-ink">Verification result</h2>
          <p className="text-xs text-brand-muted">
            {selectedEvent ? `Scanning for: ${selectedEvent.title}` : "Select an event"}
          </p>
        </div>

        {result === "idle" ? (
          <p className="py-8 text-center text-sm text-brand-muted">
            Scan a pass QR or enter a code to verify.
          </p>
        ) : result === "verifying" ? (
          <div className="flex flex-col items-center gap-2 py-8 text-brand-muted">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Verifying…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium", resultMeta[result].tone)}>
              {React.createElement(resultMeta[result].icon, { className: "size-5" })}
              {resultMeta[result].label}
            </div>
            <p className="text-sm text-brand-secondary">{detail}</p>
            {verifiedMember && (result === "valid" || result === "already") ? <div className="flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-cloud p-3 sm:gap-4 sm:p-4">
              {verifiedMember.portraitUrl ? <Image src={verifiedMember.portraitUrl} alt={`${verifiedMember.name} membership portrait`} width={80} height={100} unoptimized className="aspect-4/5 w-20 shrink-0 rounded-xl object-cover ring-1 ring-brand-border" /> : <span className="flex aspect-4/5 w-20 shrink-0 items-center justify-center rounded-xl bg-brand-purple text-lg font-bold text-brand-ink">{verifiedMember.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>}
              <div className="min-w-0 flex-1"><div className="rounded-xl bg-white p-3 ring-1 ring-brand-border"><div className="flex items-center gap-2"><Image src="/brand/csc-icon.png" alt="CSC Circle" width={32} height={32} unoptimized className="size-8 rounded-full object-cover" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">CSC membership card</p><p className="font-semibold break-words text-brand-ink">{verifiedMember.name}</p></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs font-semibold text-brand-ink">{verifiedMember.memberNumber ?? "Membership ID unavailable"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${verifiedMember.membershipStatus === "active" ? "bg-emerald-50 text-emerald-800" : "bg-brand-cloud text-brand-secondary"}`}>{verifiedMember.membershipStatus?.replaceAll("_", " ") ?? "Member record"}</span></div><p className="mt-1 text-xs text-brand-secondary">{verifiedMember.designation ?? "CSC member"}{verifiedMember.startupName ? ` · ${verifiedMember.startupName}` : ""}</p></div><p className="mt-2 text-xs font-medium text-emerald-700">Event pass verified · {verifiedMember.eventTitle ?? selectedEvent?.title}</p><p className="mt-0.5 font-mono text-[11px] break-all text-emerald-700">{verifiedMember.registrationReference}</p></div>
            </div> : null}
            <Button variant="outline" onClick={() => { void start(); }} className="gap-2">
              <ScanLine className="size-4" /> Scan next
            </Button>
          </div>
        )}

        <div className="mt-auto rounded-xl bg-brand-cloud p-3 text-xs text-brand-muted">
          A QR&apos;s presence alone never grants entry. The server verifies
          staff permission, event match, eligibility, payment and revocation,
          prevents duplicate check-ins, and records attendance atomically.
        </div>
      </div>
    </div>
  );
}
