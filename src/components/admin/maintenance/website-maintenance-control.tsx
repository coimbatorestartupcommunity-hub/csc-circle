"use client";

import * as React from "react";
import {
  ShieldAlert,
  Power,
  Clock,
  Globe,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ShieldCheck,
  Lock,
  Eye,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface WebsiteMaintenanceControlProps {
  initialConfig: {
    enabled: boolean;
    unlockEpochMs: number | null;
    title: string;
    tamilTitle: string;
    message: string;
    tamilMessage: string;
    contactEmail: string;
    allowAdminBypass: boolean;
    updatedAt: string;
  };
}

// Immutable official locked presets per platform policy
const LOCKED_PRESETS = {
  title: "Scheduled Platform Upgrade in Progress",
  tamilTitle: "திட்டமிடப்பட்ட தள மேம்பாட்டுப் பணி நடைபெறுகிறது",
  message:
    "We are currently upgrading our core platform, payment reconciliation infrastructure, and founder directory to deliver a faster and more secure experience. All member accounts, verified event passes, and data remain safe. Service will be restored shortly.",
  tamilMessage:
    "எங்கள் கட்டமைப்பு, கட்டண தீர்வு முறைமை மற்றும் நிறுவனர்களின் அடைவு சேவைகளை மேலும் வேகமாகவும் பாதுகாப்பாகவும் மேம்படுத்தும் பணி நடைபெற்று வருகிறது. உங்கள் உறுப்பினர் கணக்குகள் மற்றும் நிகழ்வு அனுமதிச் சீட்டுகள் முற்றிலும் பாதுகாப்பாக உள்ளன. விரைவில் தளம் இயல்பு நிலைக்குத் திரும்பும்.",
  contactEmail: "coimbatorestartupcommunity@gmail.com",
};

export function WebsiteMaintenanceControl({ initialConfig }: WebsiteMaintenanceControlProps) {
  const router = useRouter();
  const [config, setConfig] = React.useState(initialConfig);
  const [loading, setLoading] = React.useState(false);
  const [customDateTime, setCustomDateTime] = React.useState(
    config.unlockEpochMs ? new Date(config.unlockEpochMs).toISOString().slice(0, 16) : ""
  );
  const [countdownText, setCountdownText] = React.useState("");

  React.useEffect(() => {
    const updateCountdown = () => {
      if (!config.enabled) {
        setCountdownText("Website is Publicly Live");
        return;
      }
      if (!config.unlockEpochMs) {
        setCountdownText("Maintenance Active (Until Manually Turned Off)");
        return;
      }
      const diff = config.unlockEpochMs - Date.now();
      if (diff <= 0) {
        setCountdownText("Maintenance Auto-Expired (Live)");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdownText(`${hours}h ${minutes}m ${seconds}s remaining`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [config.enabled, config.unlockEpochMs]);

  const isLiveMaintenance =
    config.enabled && (!config.unlockEpochMs || Date.now() < config.unlockEpochMs);

  async function handleToggle(newEnabledState: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_website_maintenance",
          enabled: newEnabledState,
          unlockEpochMs: newEnabledState
            ? customDateTime
              ? new Date(customDateTime).getTime()
              : null
            : null,
          title: LOCKED_PRESETS.title,
          tamilTitle: LOCKED_PRESETS.tamilTitle,
          message: LOCKED_PRESETS.message,
          tamilMessage: LOCKED_PRESETS.tamilMessage,
          contactEmail: LOCKED_PRESETS.contactEmail,
          allowAdminBypass: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to toggle maintenance mode");
      }

      setConfig(data.websiteMaintenance);
      if (newEnabledState) {
        toast.warning("Website Maintenance Mode is now ACTIVE for public visitors.");
      } else {
        toast.success("Website is now PUBLICLY LIVE for all visitors and members.");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving maintenance state");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDuration(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_website_maintenance",
          enabled: config.enabled,
          unlockEpochMs: customDateTime ? new Date(customDateTime).getTime() : null,
          title: LOCKED_PRESETS.title,
          tamilTitle: LOCKED_PRESETS.tamilTitle,
          message: LOCKED_PRESETS.message,
          tamilMessage: LOCKED_PRESETS.tamilMessage,
          contactEmail: LOCKED_PRESETS.contactEmail,
          allowAdminBypass: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update maintenance settings");
      }

      setConfig(data.websiteMaintenance);
      toast.success("Maintenance auto-unlock duration updated successfully!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating maintenance duration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Primary Toggle Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div
              className={`size-11 sm:size-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isLiveMaintenance
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              }`}
            >
              {isLiveMaintenance ? <ShieldAlert className="size-6" /> : <Globe className="size-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  Global Website Maintenance Mode
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                    isLiveMaintenance
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      isLiveMaintenance ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  {isLiveMaintenance ? "ACTIVE (WEBSITE LOCKED)" : "LIVE (ACCESSIBLE)"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                When active, all visitors and members see the official bilingual maintenance screen with HTTP 503 headers.
              </p>
            </div>
          </div>

          <div className="flex items-center shrink-0 w-full sm:w-auto">
            <Button
              type="button"
              disabled={loading}
              onClick={() => handleToggle(!isLiveMaintenance)}
              className={`w-full sm:w-auto gap-2 text-xs font-bold px-5 h-11 rounded-xl shadow-xs transition-all ${
                isLiveMaintenance
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }`}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isLiveMaintenance ? (
                <Power className="size-4" />
              ) : (
                <ShieldAlert className="size-4" />
              )}
              {isLiveMaintenance ? "Deactivate & Re-Open Website" : "Activate Maintenance Mode"}
            </Button>
          </div>
        </div>

        {/* Live Status Banner */}
        <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock className="size-4 text-zinc-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Live Operating Status</p>
              <p className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-300 truncate">
                {countdownText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
            <ShieldCheck className="size-4 shrink-0" />
            <span>Admins bypass lock automatically</span>
          </div>
        </div>
      </div>

      {/* Auto-Unlock Scheduler Card */}
      <form
        onSubmit={handleSaveDuration}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm space-y-4 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Calendar className="size-4 text-indigo-600" />
              Auto-Unlock Timer &amp; Schedule Window
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Set an automated target time for the website to automatically re-open to the public.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <Input
              id="m-unlock-date"
              type="datetime-local"
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
              className="text-xs h-10 w-full"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 px-5 h-10 shrink-0"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            Save Auto-Unlock Schedule
          </Button>
          {customDateTime && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCustomDateTime("");
              }}
              className="text-xs font-semibold h-10 shrink-0"
            >
              Clear Timer
            </Button>
          )}
        </div>
      </form>

      {/* LOCKED OFFICIAL BILINGUAL DISPLAY NOTICE (READ-ONLY PRESETS) */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-sm space-y-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Official Maintenance Display Notice
              </h4>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Lock className="size-3" />
                LOCKED POLICY PRESET · READ-ONLY
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Standardized bilingual notice shown to all visitors on <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-[11px]">/maintenance</code>. Immutable to prevent text corruption or unauthorized changes.
            </p>
          </div>

          <a
            href="/maintenance"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
          >
            <Eye className="size-3.5" />
            Preview Live Maintenance Page &rarr;
          </a>
        </div>

        {/* 5 Locked Policy Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* 1. English Headline */}
          <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                1. English Headline
              </span>
              <Lock className="size-3 text-zinc-400" />
            </div>
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {LOCKED_PRESETS.title}
            </p>
          </div>

          {/* 2. Tamil Headline */}
          <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                2. Tamil Headline (தமிழ்)
              </span>
              <Lock className="size-3 text-zinc-400" />
            </div>
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {LOCKED_PRESETS.tamilTitle}
            </p>
          </div>

          {/* 3. English Description */}
          <div className="md:col-span-2 p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                3. English Description / Public Notice
              </span>
              <Lock className="size-3 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {LOCKED_PRESETS.message}
            </p>
          </div>

          {/* 4. Tamil Description */}
          <div className="md:col-span-2 p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                4. Tamil Description / பொது அறிவிப்பு (தமிழ்)
              </span>
              <Lock className="size-3 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
              {LOCKED_PRESETS.tamilMessage}
            </p>
          </div>

          {/* 5. Governance & Support Email */}
          <div className="md:col-span-2 p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="size-3" />
                5. Official Governance &amp; Support Desk
              </span>
              <Lock className="size-3 text-zinc-400" />
            </div>
            <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {LOCKED_PRESETS.contactEmail}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-2.5">
          <Info className="size-4 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
            These 5 fields are protected by CSC Circle Governance Policy. Whenever you toggle Maintenance Mode on, this exact professional bilingual notice is rendered with HTTP 503 Service Unavailable headers.
          </p>
        </div>
      </div>
    </div>
  );
}
