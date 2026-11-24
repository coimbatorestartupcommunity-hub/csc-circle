"use client";

import * as React from "react";
import {
  FileText,
  Download,
  Zap,
  Trash2,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Server,
  Layers,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { MaintenanceAuditLogEntry } from "@/lib/services/system-settings";

export interface MaintenanceAuditAndCacheOpsProps {
  initialLogs: MaintenanceAuditLogEntry[];
}

export function MaintenanceAuditAndCacheOps({ initialLogs }: MaintenanceAuditAndCacheOpsProps) {
  const [logs, setLogs] = React.useState<MaintenanceAuditLogEntry[]>(initialLogs);
  const [purgingCache, setPurgingCache] = React.useState(false);
  const [flushingLimits, setFlushingLimits] = React.useState(false);
  const [exportingCsv, setExportingCsv] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [pingingTeam, setPingingTeam] = React.useState(false);

  async function handleTestTeamAlert() {
    setPingingTeam(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_team_alert" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to dispatch test alert");
      toast.success("Broadcast dispatched to Core Leadership WhatsApp Group (7 members) & viaSocket flow!");
      void refreshLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test broadcast failed");
    } finally {
      setPingingTeam(false);
    }
  }

  async function handlePurgeCache() {
    setPurgingCache(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge_cache" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to purge cache");
      toast.success(data.message || "Edge caches revalidated successfully.");
      void refreshLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cache purge failed");
    } finally {
      setPurgingCache(false);
    }
  }

  async function handleFlushRateLimits() {
    setFlushingLimits(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "flush_rate_limits" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to flush rate limits");
      toast.success(data.message || "Rate limits cleared successfully.");
      void refreshLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rate limit flush failed");
    } finally {
      setFlushingLimits(false);
    }
  }

  async function refreshLogs() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/maintenance");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.auditLogs)) {
        setLogs(data.auditLogs);
      }
    } catch {}
    finally {
      setRefreshing(false);
    }
  }

  async function handleExportCsv() {
    setExportingCsv(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_audit_csv" }),
      });
      if (!res.ok) throw new Error("Could not generate CSV");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `csc-maintenance-audit-trail-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Audit log CSV exported successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingCsv(false);
    }
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden min-w-0">
      {/* Feature 4: Emergency Cache Purge & Rate Limit Operations */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="space-y-1 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Zap className="size-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Emergency Cache Purge &amp; Rate-Limit Ops
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            One-click recovery actions to unblock accidental admin lockouts or refresh stale edge-cached pages after hotfixes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Action Card 1: Purge ISR Cache */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                Purge Next.js Edge ISR Cache
              </span>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Immediately clears cached HTML/JSON for static pages (<code className="px-1 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 font-mono text-[10px]">/</code>, <code className="px-1 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 font-mono text-[10px]">/events</code>, <code className="px-1 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 font-mono text-[10px]">/directory</code>).
              </p>
            </div>
            <Button
              size="sm"
              onClick={handlePurgeCache}
              disabled={purgingCache}
              className="h-8 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 gap-1.5 rounded-lg w-full justify-center"
            >
              {purgingCache ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              <span>Purge All Edge Caches</span>
            </Button>
          </div>

          {/* Action Card 2: Flush Rate Limits */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                Flush Rate Limits &amp; Unblock IPs
              </span>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Clears active Redis sliding-window blocks, immediately resetting rate limits for admin testing or false-positive attendee blocks.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleFlushRateLimits}
              disabled={flushingLimits}
              className="h-8 text-xs font-bold text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1.5 rounded-lg w-full justify-center"
            >
              {flushingLimits ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              <span>Flush Active Rate Limits</span>
            </Button>
          </div>

          {/* Action Card 3: Ping Leadership WhatsApp Group */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                Ping Leadership WhatsApp Group (7 Members)
              </span>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Dispatches a live telemetry test broadcast to the 7-member leadership group and viaSocket webhook pipeline.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestTeamAlert}
              disabled={pingingTeam}
              className="h-8 text-xs font-bold text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5 rounded-lg w-full justify-center"
            >
              {pingingTeam ? <Loader2 className="size-3.5 animate-spin" /> : <Radio className="size-3.5" />}
              <span>Send Test Team Ping</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Feature 5: Maintenance Audit Trail & Incident Logs */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <FileText className="size-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Maintenance Audit Trail &amp; Incident Logs
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Immutable operational ledger tracking every maintenance toggle, admin identity, duration, and reason.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshLogs}
              disabled={refreshing}
              className="h-8 px-2.5 text-xs text-zinc-600 dark:text-zinc-400 gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExportCsv}
              disabled={exportingCsv}
              className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-lg"
            >
              {exportingCsv ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              <span>Export Audit CSV</span>
            </Button>
          </div>
        </div>

        {/* Audit Table */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Timestamp (IST)</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Subsystem</th>
                  <th className="py-2.5 px-3">Admin</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-sans">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-zinc-400">
                      No maintenance actions recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                          {log.subsystem || "General"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        <span className="font-semibold block">{log.adminName}</span>
                        {log.adminEmail && <span className="text-[10px] text-zinc-400 block">{log.adminEmail}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400 text-[11px] max-w-md break-words">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
