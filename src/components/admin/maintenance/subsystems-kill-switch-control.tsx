"use client";

import * as React from "react";
import {
  CreditCard,
  CalendarCheck,
  BadgeCheck,
  Bot,
  Power,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Shield,
  Layers,
  HelpCircle,
  BellRing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { SubsystemMaintenanceConfig, SubsystemKey } from "@/lib/services/system-settings";

export interface SubsystemsKillSwitchControlProps {
  initialConfig: SubsystemMaintenanceConfig;
}

interface SubsystemMeta {
  key: SubsystemKey;
  name: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultPauseReason: string;
}

const SUBSYSTEMS_META: SubsystemMeta[] = [
  {
    key: "payments",
    name: "Payment & UTR Verification Gateway",
    category: "Financial Infrastructure",
    description: "Controls ticket purchasing, corporate UPI QR generation, UTR manual claims, and bank ledger auto-matching.",
    icon: CreditCard,
    defaultPauseReason: "Payment gateway temporarily paused for routine bank ledger reconciliation.",
  },
  {
    key: "eventRegistrations",
    name: "Event Registrations & RSVP Engine",
    category: "Community Events",
    description: "Controls public attendee sign-ups, ticket bookings, Google Meet invites, and attendee roster sync.",
    icon: CalendarCheck,
    defaultPauseReason: "Event bookings temporarily paused while organizers finalize venue seating quotas.",
  },
  {
    key: "idCardGeneration",
    name: "Member Digital ID Card & Wallet Generator",
    category: "Credentialing",
    description: "Controls on-demand cryptographic badge generation, Apple Wallet (.pkpass), and Google Wallet passes.",
    icon: BadgeCheck,
    defaultPauseReason: "Digital credential generation temporarily paused for scheduled cryptographic certificate update.",
  },
  {
    key: "whatsappBot",
    name: "Inbound AI WhatsApp Assistant",
    category: "Conversational AI",
    description: "Controls the automated 24/7 WhatsApp AI agent, knowledge queries, and inbound message responses.",
    icon: Bot,
    defaultPauseReason: "Inbound AI agent temporarily sleeping during live event check-in peak to prioritize pass delivery.",
  },
  {
    key: "messagingAutomations",
    name: "Automated WhatsApp & Team Group Dispatch",
    category: "Messaging Infrastructure",
    description: "Controls automated email-to-WhatsApp dual dispatch, viaSocket workflow triggers, and Core Leadership Team WhatsApp Group alerts.",
    icon: BellRing,
    defaultPauseReason: "Automated WhatsApp notifications & Team Group alerts temporarily paused during maintenance.",
  },
];

export function SubsystemsKillSwitchControl({ initialConfig }: SubsystemsKillSwitchControlProps) {
  const [config, setConfig] = React.useState<SubsystemMaintenanceConfig>(initialConfig);
  const [loadingKey, setLoadingKey] = React.useState<SubsystemKey | null>(null);
  const [editingReasonKey, setEditingReasonKey] = React.useState<SubsystemKey | null>(null);
  const [reasonInput, setReasonInput] = React.useState<string>("");

  async function toggleSubsystem(key: SubsystemKey, shouldPause: boolean, reasonText?: string) {
    setLoadingKey(key);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_subsystems",
          updates: {
            [key]: {
              paused: shouldPause,
              reason: reasonText || config[key].reason || SUBSYSTEMS_META.find((m) => m.key === key)?.defaultPauseReason,
            },
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update subsystem status");
      }

      setConfig(data.subsystems);
      setEditingReasonKey(null);
      if (shouldPause) {
        toast.warning(`${SUBSYSTEMS_META.find((m) => m.key === key)?.name} is now PAUSED.`);
      } else {
        toast.success(`${SUBSYSTEMS_META.find((m) => m.key === key)?.name} is now OPERATIONAL.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle subsystem");
    } finally {
      setLoadingKey(null);
    }
  }

  const allActive = Object.values(config).every((s) => !s.paused);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 sm:p-7 shadow-xs space-y-6 w-full max-w-full overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="size-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Granular Subsystem Kill-Switches
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl">
            Selectively pause individual high-traffic services during routine maintenance without taking down the entire community portal.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
              allActive
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                allActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span>{allActive ? "All 4 Subsystems Operational" : "Selective Maintenance Active"}</span>
          </span>
        </div>
      </div>

      {/* Grid of 4 Subsystems */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SUBSYSTEMS_META.map((meta) => {
          const status = config[meta.key];
          const isPaused = status.paused;
          const isLoading = loadingKey === meta.key;
          const Icon = meta.icon;

          return (
            <div
              key={meta.key}
              className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                isPaused
                  ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs"
                  : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`p-2 rounded-xl shrink-0 ${
                        isPaused
                          ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                          : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                        {meta.category}
                      </span>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                        {meta.name}
                      </h3>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                      isPaused
                        ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                        : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                    }`}
                  >
                    {isPaused ? (
                      <>
                        <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
                        <span>PAUSED</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                        <span>ACTIVE</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mt-2 mb-3">
                  {meta.description}
                </p>

                {isPaused && (
                  <div className="p-3 rounded-xl bg-amber-100/60 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 mb-3 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                      <Clock className="size-3" />
                      Notice shown to visitors:
                    </span>
                    <p className="italic leading-normal break-words">
                      &ldquo;{status.reason || meta.defaultPauseReason}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                <span className="text-[10px] text-zinc-400 truncate">
                  Updated: {new Date(status.updatedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST
                </span>

                <div className="flex items-center gap-2">
                  {isPaused ? (
                    <Button
                      size="sm"
                      onClick={() => toggleSubsystem(meta.key, false)}
                      disabled={isLoading}
                      className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-lg"
                    >
                      {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
                      <span>Resume Service</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingReasonKey(meta.key);
                        setReasonInput(meta.defaultPauseReason);
                      }}
                      disabled={isLoading}
                      className="h-8 px-3 text-xs font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1.5 rounded-lg"
                    >
                      {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <AlertTriangle className="size-3.5" />}
                      <span>Pause Subsystem</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* In-place Reason Dialog */}
              {editingReasonKey === meta.key && (
                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/60 space-y-2">
                  <Label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Custom Maintenance Notice for Visitors:
                  </Label>
                  <Input
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="Enter reason for pausing..."
                    className="h-8 text-xs bg-white dark:bg-zinc-950"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingReasonKey(null)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => toggleSubsystem(meta.key, true, reasonInput)}
                      className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Confirm Pause
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
