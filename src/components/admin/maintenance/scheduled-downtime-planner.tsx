"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarCheck,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { ScheduledDowntimeConfig } from "@/lib/services/system-settings";

export interface ScheduledDowntimePlannerProps {
  initialConfig: ScheduledDowntimeConfig;
}

export function ScheduledDowntimePlanner({ initialConfig }: ScheduledDowntimePlannerProps) {
  const [config, setConfig] = React.useState<ScheduledDowntimeConfig>(initialConfig);
  const [loading, setLoading] = React.useState(false);

  // Form State
  const [startDateTime, setStartDateTime] = React.useState(
    config.startEpochMs ? new Date(config.startEpochMs).toISOString().slice(0, 16) : ""
  );
  const [endDateTime, setEndDateTime] = React.useState(
    config.endEpochMs ? new Date(config.endEpochMs).toISOString().slice(0, 16) : ""
  );
  const [showNotice24h, setShowNotice24h] = React.useState(config.showNotice24h);
  const [title, setTitle] = React.useState(config.title);
  const [tamilTitle, setTamilTitle] = React.useState(config.tamilTitle);
  const [message, setMessage] = React.useState(config.message);
  const [tamilMessage, setTamilMessage] = React.useState(config.tamilMessage);

  const isScheduled = config.scheduled && config.startEpochMs && Date.now() < config.endEpochMs!;
  const isUnderway = config.scheduled && config.startEpochMs && Date.now() >= config.startEpochMs && Date.now() <= (config.endEpochMs || Infinity);

  async function handleSaveSchedule(enable: boolean) {
    if (enable) {
      if (!startDateTime || !endDateTime) {
        toast.error("Please specify both start and end times for the maintenance window.");
        return;
      }
      const startMs = new Date(startDateTime).getTime();
      const endMs = new Date(endDateTime).getTime();
      if (endMs <= startMs) {
        toast.error("End time must be after the start time.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_scheduled_downtime",
          scheduled: enable,
          startEpochMs: enable ? new Date(startDateTime).getTime() : null,
          endEpochMs: enable ? new Date(endDateTime).getTime() : null,
          showNotice24h,
          title,
          tamilTitle,
          message,
          tamilMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update scheduled downtime");
      }

      setConfig(data.scheduledDowntime);
      if (enable) {
        toast.success("Downtime window successfully scheduled with 24-hour public notice active.");
      } else {
        toast.info("Scheduled downtime has been cancelled.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update schedule");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 sm:p-7 shadow-xs space-y-6 w-full max-w-full overflow-hidden min-w-0">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <CalendarCheck className="size-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Scheduled Downtime Planner
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl">
            Schedule future system maintenance in advance. Automatically broadcasts a polite, non-intrusive advance warning banner across the public portal 24 hours prior.
          </p>
        </div>

        <div className="shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
              isUnderway
                ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300"
                : isScheduled
                ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border border-purple-300"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}
          >
            <Clock className="size-3.5" />
            <span>
              {isUnderway
                ? "Window Currently Active"
                : isScheduled
                ? "Downtime Scheduled"
                : "No Scheduled Downtime"}
            </span>
          </span>
        </div>
      </div>

      {/* Form Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Window Start Time (IST)
              </Label>
              <Input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Target Restoration Time (IST)
              </Label>
              <Input
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="h-9 text-xs bg-zinc-50 dark:bg-zinc-900 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Bell className="size-3.5 text-purple-500" />
                24-Hour Public Advance Notice Banner
              </span>
              <p className="text-[11px] text-zinc-500">
                Display warning banner on the website 24 hours before the window begins.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showNotice24h}
              onClick={() => setShowNotice24h(!showNotice24h)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showNotice24h ? "bg-purple-600" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  showNotice24h ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Bilingual Message Inputs */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Public Notice (English)
              </Label>
              <Textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-xs bg-zinc-50 dark:bg-zinc-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Public Notice (தமிழ்)
              </Label>
              <Textarea
                rows={2}
                value={tamilMessage}
                onChange={(e) => setTamilMessage(e.target.value)}
                className="text-xs bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => handleSaveSchedule(true)}
              disabled={loading}
              className="h-9 px-4 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck className="size-4" />}
              <span>Save &amp; Arm Downtime Schedule</span>
            </Button>

            {config.scheduled && (
              <Button
                variant="outline"
                onClick={() => handleSaveSchedule(false)}
                disabled={loading}
                className="h-9 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900 hover:bg-rose-50 rounded-xl gap-1.5"
              >
                <Trash2 className="size-3.5" />
                <span>Cancel Schedule</span>
              </Button>
            )}
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="size-3.5 text-purple-500" />
            Public Notice Banner Preview:
          </span>

          <div className="p-4 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-100 shadow-md space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-white">
                {title}
              </span>
            </div>
            <p className="text-[11px] text-purple-200/90 leading-relaxed">
              {message}
            </p>
            <p className="text-[10px] text-purple-300/80 leading-relaxed border-t border-purple-500/20 pt-2 font-sans">
              {tamilMessage}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1">
            <span className="font-bold text-zinc-700 dark:text-zinc-300 block">
              Governance Automation:
            </span>
            <p>
              When the start time arrives, visitors attempting to initiate transactions will see the scheduled upgrade notice. Zero data loss is guaranteed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
