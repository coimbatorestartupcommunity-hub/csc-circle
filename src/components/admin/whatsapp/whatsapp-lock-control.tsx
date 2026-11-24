"use client";

import * as React from "react";
import {
  Lock,
  Unlock,
  Clock,
  ShieldAlert,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface WhatsAppLockControlProps {
  initialConfig: {
    locked: boolean;
    unlockEpochMs: number;
    reason?: string;
    tamilReason?: string;
    updatedAt: string;
  };
}

export function WhatsAppLockControl({ initialConfig }: WhatsAppLockControlProps) {
  const router = useRouter();
  const [config, setConfig] = React.useState(initialConfig);
  const [loading, setLoading] = React.useState(false);
  const [customDateTime, setCustomDateTime] = React.useState("");
  const [timeLeft, setTimeLeft] = React.useState<string>("");

  // Calculate live countdown
  React.useEffect(() => {
    const updateTime = () => {
      if (!config.locked) {
        setTimeLeft("Unlocked (Active)");
        return;
      }
      const now = Date.now();
      const diff = config.unlockEpochMs - now;
      if (diff <= 0) {
        setTimeLeft("Unlocked (Auto-expired)");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s remaining`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [config.locked, config.unlockEpochMs]);

  const isCurrentlyLocked = config.locked && Date.now() < config.unlockEpochMs;

  async function handleLock(durationHours: number) {
    setLoading(true);
    const targetEpoch = Date.now() + durationHours * 60 * 60 * 1000;
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_whatsapp_lock",
          locked: true,
          unlockEpochMs: targetEpoch,
          reason: `Scheduled ${durationHours}-hour maintenance & rate limit cooldown window`,
          tamilReason: `WhatsApp சேவைகள் ${durationHours} மணி நேரம் பராமரிப்பில் உள்ளன`,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update WhatsApp lock");
      }

      setConfig(data.whatsappLock);
      toast.success(`WhatsApp gateway locked for ${durationHours} hours.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating lock");
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomLock(e: React.FormEvent) {
    e.preventDefault();
    if (!customDateTime) {
      toast.error("Please pick a valid date and time.");
      return;
    }

    const selectedEpoch = new Date(customDateTime).getTime();
    if (isNaN(selectedEpoch) || selectedEpoch <= Date.now()) {
      toast.error("Unlock time must be in the future.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_whatsapp_lock",
          locked: true,
          unlockEpochMs: selectedEpoch,
          reason: "Custom scheduled maintenance window",
          tamilReason: "WhatsApp சேவைகள் பராமரிப்பில் உள்ளன",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to set custom lock");
      }

      setConfig(data.whatsappLock);
      toast.success("WhatsApp custom lock successfully applied.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error applying custom lock");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_whatsapp_lock",
          locked: false,
          unlockEpochMs: Date.now() - 1000,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to unlock WhatsApp");
      }

      setConfig(data.whatsappLock);
      toast.success("WhatsApp services unlocked! Outbox and inbound active.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error unlocking WhatsApp");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm space-y-6 w-full max-w-full overflow-hidden min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div
            className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
              isCurrentlyLocked
                ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {isCurrentlyLocked ? <Lock className="size-5" /> : <Unlock className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 break-words">
              WhatsApp Gateway Operational Lock
            </h3>
            <p className="text-xs text-zinc-500 break-words mt-0.5">
              Pause all inbound responses, automated OTPs, and outbound queue dispatches.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isCurrentlyLocked
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                isCurrentlyLocked ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
            {isCurrentlyLocked ? "LOCKED (MAINTENANCE)" : "OPERATIONAL (LIVE)"}
          </span>
        </div>
      </div>

      {/* Live Status Countdown & Notice */}
      <div
        className={`rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full min-w-0 overflow-hidden ${
          isCurrentlyLocked
            ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900"
            : "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Clock
            className={`size-4.5 shrink-0 ${
              isCurrentlyLocked ? "text-amber-600" : "text-emerald-600"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {isCurrentlyLocked ? "Active Cooldown Window" : "Gateway Ready"}
            </p>
            <p className="text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400 break-words">
              {timeLeft}
            </p>
          </div>
        </div>

        {isCurrentlyLocked && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleUnlock}
            disabled={loading}
            className="w-full sm:w-auto text-xs font-semibold gap-1.5 shrink-0"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Unlock className="size-3.5" />}
            Unlock WhatsApp Now
          </Button>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-3 w-full min-w-0">
        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
          One-Click Lock Presets
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handleLock(1)}
            className="w-full h-auto py-2.5 px-2 text-center text-[11px] sm:text-xs font-semibold hover:border-amber-500 hover:text-amber-600 whitespace-normal leading-tight"
          >
            Lock 1 Hour
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handleLock(6)}
            className="w-full h-auto py-2.5 px-2 text-center text-[11px] sm:text-xs font-semibold hover:border-amber-500 hover:text-amber-600 whitespace-normal leading-tight"
          >
            Lock 6 Hours
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handleLock(12)}
            className="w-full h-auto py-2.5 px-2 text-center text-[11px] sm:text-xs font-semibold hover:border-amber-500 hover:text-amber-600 whitespace-normal leading-tight"
          >
            Lock 12 Hours
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={() => handleLock(24)}
            className="w-full h-auto py-2.5 px-2 text-center text-[11px] sm:text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs whitespace-normal leading-tight"
          >
            Lock 24 Hours
          </Button>
        </div>
      </div>

      {/* Custom Date & Time Picker */}
      <form onSubmit={handleCustomLock} className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 w-full min-w-0">
        <Label htmlFor="custom-lock-time" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
          Or Lock Until Exact Date &amp; Time
        </Label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
          <Input
            id="custom-lock-time"
            type="datetime-local"
            value={customDateTime}
            onChange={(e) => setCustomDateTime(e.target.value)}
            className="h-10 text-xs w-full sm:max-w-xs min-w-0 flex-1"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !customDateTime}
            variant="secondary"
            className="h-10 text-xs font-semibold gap-1.5 w-full sm:w-auto shrink-0"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Calendar className="size-3.5" />}
            Set Custom Lock Time
          </Button>
        </div>
      </form>
    </div>
  );
}
