"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Wrench, Clock, ShieldAlert, X } from "lucide-react";
import Link from "next/link";

export function MaintenanceGlobalBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [maintenance, setMaintenance] = React.useState<{
    active: boolean;
    title?: string;
    message?: string;
    unlockEpochMs?: number | null;
  }>({ active: false });

  const [upcoming, setUpcoming] = React.useState<{
    active: boolean;
    startEpochMs?: number;
    endEpochMs?: number;
    title?: string;
    message?: string;
  }>({ active: false });

  // Do not show on the actual maintenance page or admin workspace
  const isMaintenancePage = pathname === "/maintenance";
  const isAdminPage = pathname.startsWith("/admin");

  React.useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/maintenance/status");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.maintenance) {
          setMaintenance({
            active: true,
            title: data.config?.title,
            message: data.config?.message,
            unlockEpochMs: data.config?.unlockEpochMs,
          });

          // If visitor is on public/member routes (and not admin or login), redirect to /maintenance
          if (!isAdminPage && pathname !== "/login" && pathname !== "/maintenance") {
            // Check if user is an admin bypassing
            const authCheck = await fetch("/api/member/header").catch(() => null);
            const authData = await authCheck?.json().catch(() => null);
            if (!authData?.isAdmin) {
              router.replace("/maintenance");
            }
          }
        } else if (mounted) {
          setMaintenance({ active: false });
        }

        if (mounted && data.upcomingDowntime && !data.maintenance) {
          setUpcoming({
            active: true,
            startEpochMs: data.upcomingDowntime.startEpochMs,
            endEpochMs: data.upcomingDowntime.endEpochMs,
            title: data.upcomingDowntime.title,
            message: data.upcomingDowntime.message,
          });
        } else if (mounted) {
          setUpcoming({ active: false });
        }
      } catch {}
    };

    void checkStatus();
    const interval = setInterval(checkStatus, 30000); // 30s check
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pathname, isAdminPage, router]);

  if (isMaintenancePage) return null;

  // Render Advance Warning Banner if scheduled downtime is within 24h
  if (upcoming.active && !maintenance.active) {
    const formattedDate = upcoming.startEpochMs
      ? new Date(upcoming.startEpochMs).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) + " IST"
      : "Upcoming Window";

    return (
      <aside aria-label="Advance Maintenance Notice" className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white px-4 py-2 text-xs font-medium shadow-md z-40 sticky top-0 border-b border-purple-500/30">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="size-3.5 shrink-0 text-purple-300" />
            <span className="font-bold tracking-tight shrink-0">Advance Notice:</span>
            <span className="truncate text-purple-100">
              Scheduled platform enhancements on <strong className="text-white underline underline-offset-2">{formattedDate}</strong>. All tickets, badges, and accounts remain 100% secure.
            </span>
          </div>
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-purple-900/60 text-[10px] font-mono uppercase tracking-wider text-purple-200 border border-purple-400/30 shrink-0">
            24h Public Notice Active
          </span>
        </div>
      </aside>
    );
  }

  if (!maintenance.active) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md z-50 sticky top-0">
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
        <Wrench className="size-3.5 shrink-0 animate-spin" />
        <span className="font-bold">Scheduled Maintenance Window Active:</span>
        <span className="truncate">{maintenance.message || "Platform updates in progress."}</span>
        {isAdminPage && (
          <span className="ml-auto bg-amber-800/80 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide">
            Admin Session (Bypass Active)
          </span>
        )}
      </div>
    </div>
  );
}
