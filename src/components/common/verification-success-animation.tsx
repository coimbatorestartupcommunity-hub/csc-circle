"use client";

import * as React from "react";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

/**
 * Plays a crisp, satisfying, soft two-tone "tick" chime using the Web Audio API.
 * 100% lightweight (zero audio files to download, zero latency, runs offline and on mobile).
 */
export function playSuccessChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5) - gentle starter chime
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.19);

    // Tone 2: 880 Hz (A5) - crisp confirmation "tick"
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08);

    gain2.gain.setValueAtTime(0.001, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.28, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.46);

    // Clean up context after sound completes
    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 600);
  } catch {
    // Graceful fallback if Web Audio is restricted by browser policy
  }
}

export interface VerificationSuccessViewProps {
  title?: string;
  description?: string;
  badgeLabel?: string;
}

/**
 * Animated "Verification Confirmed" screen with drawing checkmark and glowing ring.
 */
export function VerificationSuccessView({
  title = "Verification Confirmed",
  description = "Your identity has been verified & your account is secured.",
  badgeLabel = "CSC Verified Member",
}: VerificationSuccessViewProps) {
  React.useEffect(() => {
    playSuccessChime();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center animate-in zoom-in-95 fade-in duration-300">
      {/* Animated Tick Circle with Radial Glow */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Ambient Pulsing Aura */}
        <div className="absolute size-24 rounded-full bg-emerald-400/20 blur-xl animate-pulse" />

        {/* SVG Drawing Checkmark Circle */}
        <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-100">
          <svg
            className="size-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              className="origin-center animate-[dash_0.6s_ease-in-out_forwards]"
              strokeDasharray="24"
              strokeDashoffset="0"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      {/* Animated Text */}
      <div className="space-y-1.5 animate-in slide-in-from-bottom-3 duration-500 delay-150 fill-mode-both">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20 mb-1">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          <span>{badgeLabel}</span>
        </div>
        <h3 className="text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h3>
        <p className="max-w-xs text-xs text-slate-600 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export interface AnimatedOtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * High-touch animated 6-box OTP input with digit focus pulse
 */
export function AnimatedOtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = true,
}: AnimatedOtpInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const digits = (value || "").slice(0, length).split("");
  while (digits.length < length) {
    digits.push("");
  }

  function handleContainerClick() {
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full" onClick={handleContainerClick}>
      {/* Hidden real input capturing user keystrokes & paste */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => {
          const clean = e.target.value.replace(/\D/g, "").slice(0, length);
          onChange(clean);
        }}
        className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto"
        aria-label="Verification code digits"
      />

      {/* Visual Boxes with Pulse & Active Border Animation */}
      <div className="flex items-center justify-between gap-2">
        {digits.map((digit, index) => {
          const isCurrent = isFocused && (index === value.length || (index === length - 1 && value.length === length));
          const isFilled = Boolean(digit);

          return (
            <div
              key={index}
              className={`flex h-12 flex-1 items-center justify-center rounded-xl border text-lg font-bold transition-all duration-200 select-none ${
                isCurrent
                  ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-3 ring-emerald-500/20 shadow-xs scale-105"
                  : isFilled
                  ? "border-slate-300 bg-white text-slate-900 shadow-2xs"
                  : "border-slate-200 bg-slate-50/60 text-slate-400"
              }`}
            >
              {digit ? (
                <span className="animate-in zoom-in-75 duration-150">{digit}</span>
              ) : isCurrent ? (
                <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
