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
      } catch {}
    };

    void checkStatus();
    const interval = setInterval(checkStatus, 30000); // 30s check
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pathname, isAdminPage, router]);

  if (!maintenance.active || isMaintenancePage) return null;

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
