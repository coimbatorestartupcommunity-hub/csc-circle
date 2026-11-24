"use client";

import * as React from "react";
import {
  Layers,
  Globe,
  Activity,
  CalendarCheck,
  Radio,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { SubsystemsKillSwitchControl } from "@/components/admin/maintenance/subsystems-kill-switch-control";
import { WebsiteMaintenanceControl } from "@/components/admin/maintenance/website-maintenance-control";
import { InfrastructureHealthMonitor } from "@/components/admin/maintenance/infrastructure-health-monitor";
import { ScheduledDowntimePlanner } from "@/components/admin/maintenance/scheduled-downtime-planner";
import { WhatsAppLockControl } from "@/components/admin/whatsapp/whatsapp-lock-control";
import { MaintenanceAuditAndCacheOps } from "@/components/admin/maintenance/maintenance-audit-and-cache-ops";
import type {
  WebsiteMaintenanceConfig,
  WhatsAppLockConfig,
  SubsystemMaintenanceConfig,
  ScheduledDowntimeConfig,
  MaintenanceAuditLogEntry,
} from "@/lib/services/system-settings";

export type MaintenanceTabKey =
  | "subsystems"
  | "website"
  | "health"
  | "planner"
  | "whatsapp"
  | "audit";

interface TabDefinition {
  id: MaintenanceTabKey;
  label: string;
  icon: LucideIcon;
  badge?: string | null;
}

const TABS: TabDefinition[] = [
  // Row 1 (3 Buttons)
  {
    id: "subsystems",
    label: "Kill-Switches",
    icon: Layers,
  },
  {
    id: "website",
    label: "Global Screen",
    icon: Globe,
  },
  {
    id: "health",
    label: "Service Health",
    icon: Activity,
    badge: "Live",
  },
  // Row 2 (3 Buttons)
  {
    id: "planner",
    label: "Downtime Plan",
    icon: CalendarCheck,
  },
  {
    id: "whatsapp",
    label: "WhatsApp Lock",
    icon: Radio,
  },
  {
    id: "audit",
    label: "Audit & Ops",
    icon: FileText,
  },
];

export interface MaintenanceCommandCenterProps {
  websiteConfig: WebsiteMaintenanceConfig;
  waConfig: WhatsAppLockConfig;
  subsystemsConfig: SubsystemMaintenanceConfig;
  downtimeConfig: ScheduledDowntimeConfig;
  auditLogs: MaintenanceAuditLogEntry[];
}

export function MaintenanceCommandCenter({
  websiteConfig,
  waConfig,
  subsystemsConfig,
  downtimeConfig,
  auditLogs,
}: MaintenanceCommandCenterProps) {
  const [activeTab, setActiveTab] = React.useState<MaintenanceTabKey>("subsystems");

  return (
    <div className="w-full space-y-6 sm:space-y-8 min-w-0">
      {/* Precision 3 + 3 Action Button Grid */}
      <div className="w-full">
        <div
          role="tablist"
          aria-label="Maintenance Operations Modules"
          className="grid grid-cols-3 gap-2 sm:gap-3.5 w-full"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative group flex items-center justify-center gap-1.5 sm:gap-2.5 py-3 px-2 sm:px-4 rounded-xl text-center select-none cursor-pointer transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 min-w-0 h-12 sm:h-13",
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-md border-2 border-zinc-900 dark:border-white"
                    : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-850 shadow-xs font-semibold"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0 transition-transform duration-150 group-hover:scale-105",
                    isActive
                      ? "text-emerald-400 dark:text-emerald-600"
                      : "text-zinc-500 dark:text-zinc-400"
                  )}
                  aria-hidden="true"
                />

                <span className="text-xs sm:text-sm font-semibold tracking-tight truncate">
                  {tab.label}
                </span>

                {tab.badge ? (
                  <span
                    className={cn(
                      "hidden md:inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                      isActive
                        ? "bg-emerald-500/20 text-emerald-300 dark:text-emerald-700"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                    )}
                  >
                    {tab.badge}
                  </span>
                ) : null}

                {/* Subtle active indicator accent line */}
                {isActive ? (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-emerald-500" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Layer Gap & Tab Panels */}
      <div className="w-full min-w-0 pt-1">
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="focus-visible:outline-none min-w-0 space-y-4"
        >
          {activeTab === "subsystems" && (
            <SubsystemsKillSwitchControl initialConfig={subsystemsConfig} />
          )}

          {activeTab === "website" && (
            <WebsiteMaintenanceControl initialConfig={websiteConfig} />
          )}

          {activeTab === "health" && <InfrastructureHealthMonitor />}

          {activeTab === "planner" && (
            <ScheduledDowntimePlanner initialConfig={downtimeConfig} />
          )}

          {activeTab === "whatsapp" && (
            <WhatsAppLockControl initialConfig={waConfig} />
          )}

          {activeTab === "audit" && (
            <MaintenanceAuditAndCacheOps initialLogs={auditLogs} />
          )}
        </div>
      </div>
    </div>
  );
}
