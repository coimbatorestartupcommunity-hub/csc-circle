"use client";

import * as React from "react";
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
  invalid: { label: "Invalid credential", tone: "bg-brand-red text-brand-ink", icon: XCircle },
  pending: { label: "Pending approval", tone: "bg-brand-gold text-brand-ink", icon: Clock },
  payment: { label: "Payment incomplete", tone: "bg-brand-gold text-brand-ink", icon: CreditCard },
  wrong_event: { label: "Wrong event", tone: "bg-brand-red text-brand-ink", icon: Ban },
  revoked: { label: "Expired / revoked", tone: "bg-brand-red text-brand-ink", icon: Ban },
  already: { label: "Already checked in", tone: "bg-brand-blue text-brand-ink", icon: CheckCircle2 },
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
  const [manual, setManual] = React.useState("");

  const stop = React.useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraState("off");
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  async function start() {
    setResult("idle");
    setCameraState("starting");
    try {
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (res) => {
          if (res) {
            verify(res.getText());
          }
        },
      );
      controlsRef.current = controls;
      setCameraState("on");
    } catch {
      setCameraState("denied");
    }
  }

  function verify(text: string) {
    // Stop scanning while we show a result.
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraState("off");
    setResult("verifying");

    // Parse the opaque payload. Real verification happens server-side (Phase 1).
    window.setTimeout(() => {
      try {
        const payload = JSON.parse(text) as { t?: string; ref?: string };
        if (payload.t !== "csc.eventpass" || !payload.ref) {
          setResult("invalid");
          setDetail("Not a CSC event pass credential.");
          return;
        }
        setResult("valid");
        setDetail(
          isDemo
            ? `DEMO: parsed pass ${payload.ref}. No attendance was recorded — the trusted API performs real verification and atomic check-in in Phase 1.`
            : `Pass ${payload.ref} submitted for server verification.`,
        );
      } catch {
        setResult("invalid");
        setDetail("Could not read a valid QR credential.");
      }
    }, 600);
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

        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-brand-ink/90">
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
            <Button variant="outline" onClick={() => { setResult("idle"); start(); }} className="gap-2">
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
