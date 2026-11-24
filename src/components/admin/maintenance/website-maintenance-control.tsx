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
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

export function WebsiteMaintenanceControl({ initialConfig }: WebsiteMaintenanceControlProps) {
  const router = useRouter();
  const [config, setConfig] = React.useState(initialConfig);
  const [loading, setLoading] = React.useState(false);
  const [title, setTitle] = React.useState(config.title);
  const [message, setMessage] = React.useState(config.message);
  const [tamilTitle, setTamilTitle] = React.useState(config.tamilTitle);
  const [tamilMessage, setTamilMessage] = React.useState(config.tamilMessage);
  const [contactEmail, setContactEmail] = React.useState(config.contactEmail);
  const [allowAdminBypass, setAllowAdminBypass] = React.useState(config.allowAdminBypass);
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
          title,
          message,
          tamilTitle,
          tamilMessage,
          contactEmail,
          allowAdminBypass,
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

  async function handleSaveSettings(e: React.FormEvent) {
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
          title,
          message,
          tamilTitle,
          tamilMessage,
          contactEmail,
          allowAdminBypass,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update maintenance settings");
      }

      setConfig(data.websiteMaintenance);
      toast.success("Maintenance notice and duration saved successfully!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating maintenance settings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Primary Toggle Card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <div
              className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isLiveMaintenance
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              }`}
            >
              {isLiveMaintenance ? <ShieldAlert className="size-6" /> : <Globe className="size-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Global Website Maintenance Mode
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isLiveMaintenance
                      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  }`}
                >
                  <span
                    className={`size-2 rounded-full ${
                      isLiveMaintenance ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  {isLiveMaintenance ? "ACTIVE (WEBSITE LOCKED)" : "LIVE (ACCESSIBLE)"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                When active, all visitors and members see a full-page maintenance screen with HTTP 503 headers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              disabled={loading}
              onClick={() => handleToggle(!isLiveMaintenance)}
              className={`gap-2 text-xs font-bold px-5 h-10 shadow-xs ${
                isLiveMaintenance
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isLiveMaintenance ? (
                <Power className="size-3.5" />
              ) : (
                <ShieldAlert className="size-3.5" />
              )}
              {isLiveMaintenance ? "Deactivate Maintenance & Open Website" : "Activate Maintenance Mode"}
            </Button>
          </div>
        </div>

        {/* Live Status Banner */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Clock className="size-4 text-zinc-500" />
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Current Status</p>
              <p className="text-xs font-mono font-medium text-zinc-600 dark:text-zinc-400">
                {countdownText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Admins with active session bypass maintenance lock automatically</span>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSaveSettings} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-6">
        <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Maintenance Display Notice & Settings
          </h4>
          <p className="text-xs text-zinc-500 mt-0.5">
            Customize the message and contact details shown to users while the website is locked.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="m-title" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              English Headline
            </Label>
            <Input
              id="m-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="We will be right back!"
              className="text-xs h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-tamil-title" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Tamil Headline (தமிழ்)
            </Label>
            <Input
              id="m-tamil-title"
              value={tamilTitle}
              onChange={(e) => setTamilTitle(e.target.value)}
              placeholder="விரைவில் மீண்டும் வருகிறோம்!"
              className="text-xs h-10"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="m-message" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              English Description / Notice
            </Label>
            <Textarea
              id="m-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="m-tamil-message" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Tamil Description / Notice (தமிழ்)
            </Label>
            <Textarea
              id="m-tamil-message"
              rows={3}
              value={tamilMessage}
              onChange={(e) => setTamilMessage(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Grievance & Support Email
            </Label>
            <Input
              id="m-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="text-xs h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-unlock-date" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Auto-Unlock Date & Time (Optional)
            </Label>
            <Input
              id="m-unlock-date"
              type="datetime-local"
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
              className="text-xs h-10"
            />
            <p className="text-[11px] text-zinc-400">Leave blank to keep active until manually turned off.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <Button
            type="submit"
            disabled={loading}
            className="text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 px-6 h-10"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            Save Maintenance Notice Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
