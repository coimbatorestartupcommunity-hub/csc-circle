"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, CheckCircle2 } from "lucide-react";

export function ClaimCountdown({ submittedAt }: { submittedAt?: string | null }) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null);
  const [isApproving, setIsApproving] = React.useState(false);

  React.useEffect(() => {
    const submittedTime = submittedAt ? new Date(submittedAt).getTime() : Date.now();
    const targetTime = submittedTime + 5 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((targetTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsApproving(true);
        // Refresh page after a brief moment to pick up the auto-approved status
        const timeout = setTimeout(() => {
          router.refresh();
        }, 3000);
        return () => clearTimeout(timeout);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [submittedAt, router]);

  const minutes = timeLeft !== null ? Math.floor(timeLeft / 60) : 5;
  const seconds = timeLeft !== null ? timeLeft % 60 : 0;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-brand-cloud p-8 sm:p-10 text-center ring-1 ring-brand-border">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-gold text-brand-ink">
        {isApproving ? (
          <Loader2 className="size-7 animate-spin" />
        ) : (
          <Clock className="size-7" />
        )}
      </span>

      <div className="flex flex-col gap-1.5 max-w-md">
        <h2 className="text-2xl font-bold text-brand-ink">
          {isApproving
            ? "Activating Your Digital ID…"
            : "Your Membership Request Is Under Auto-Review"}
        </h2>
        <p className="text-sm text-brand-secondary leading-relaxed">
          {isApproving
            ? "Your 5-minute automated verification has completed. Your digital membership ID is being activated now."
            : "Membership claims are automatically approved within 5 minutes. You will receive an email confirmation and an in-app inbox notification as soon as your digital ID is activated."}
        </p>
      </div>

      {!isApproving ? (
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-border bg-brand-white px-6 py-3.5 shadow-xs">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-brand-muted">
            Auto-Approval Countdown
          </span>
          <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-brand-accent">
            {formattedTime}
          </span>
          <span className="text-[11px] text-brand-secondary">
            Estimated time remaining until instant activation
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 px-4 py-2 rounded-xl">
          <CheckCircle2 className="size-4" />
          <span>Finalizing approval...</span>
        </div>
      )}
    </div>
  );
}
