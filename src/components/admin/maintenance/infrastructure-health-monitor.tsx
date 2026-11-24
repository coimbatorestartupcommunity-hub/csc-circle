"use client";

import * as React from "react";
import {
  Activity,
  Database,
  Zap,
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Clock,
  ShieldCheck,
  Server,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ServiceHealthMetric } from "@/app/api/admin/maintenance/health/route";

export function InfrastructureHealthMonitor() {
  const [metrics, setMetrics] = React.useState<ServiceHealthMetric[]>([]);
  const [overallHealth, setOverallHealth] = React.useState<"healthy" | "degraded">("healthy");
  const [loading, setLoading] = React.useState(true);
  const [lastCheck, setLastCheck] = React.useState<string>("");
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  const fetchHealth = React.useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance/health");
      if (!res.ok) throw new Error("Health check endpoint responded with error");
      const data = await res.json();
      setMetrics(data.metrics || []);
      setOverallHealth(data.overallHealth || "healthy");
      setLastCheck(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      if (isManual) {
        toast.success("Infrastructure health audit completed.");
      }
    } catch {
      if (isManual) toast.error("Could not complete health check.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchHealth(false);
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void fetchHealth(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth, autoRefresh]);

  const getIcon = (category: string) => {
    switch (category) {
      case "database":
        return Database;
      case "cache":
        return Zap;
      case "email":
        return Mail;
      case "worker":
        return RefreshCw;
      case "whatsapp":
        return Radio;
      default:
        return Server;
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 sm:p-7 shadow-xs space-y-6 w-full max-w-full overflow-hidden min-w-0">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Activity className="size-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Real-time Infrastructure &amp; Service Health
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl">
            Live latency telemetry, connection pool status, and worker heartbeats across all core dependencies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-8 px-2.5 text-xs font-semibold rounded-lg gap-1.5 ${
              autoRefresh ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300" : ""
            }`}
          >
            <span className={`size-1.5 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
            <span>{autoRefresh ? "Auto-Refresh (15s)" : "Auto-Refresh Paused"}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => void fetchHealth(true)}
            disabled={loading}
            className="h-8 px-3 text-xs font-bold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Audit Now</span>
          </Button>
        </div>
      </div>

      {/* Global Status Bar */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
          overallHealth === "healthy"
            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200"
            : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <span className="text-xs font-bold block">
              {overallHealth === "healthy"
                ? "All Core Subsystems Operational & Protected"
                : "Operational Warnings Detected on Monitored Services"}
            </span>
            <span className="text-[11px] opacity-80">
              5 of 5 core services audited · Last live ping at {lastCheck || "just now"} IST
            </span>
          </div>
        </div>

        <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white dark:bg-zinc-900 border border-current shrink-0">
          {overallHealth === "healthy" ? "HEALTHY" : "ATTENTION"}
        </span>
      </div>

      {/* 5 Service Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((service) => {
          const Icon = getIcon(service.category);
          const isHealthy = service.status === "healthy";
          const isPaused = service.status === "paused";

          return (
            <div
              key={service.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30 p-4 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {service.name}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      isHealthy
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                        : isPaused
                        ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800"
                        : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                    }`}
                  >
                    {isHealthy ? (
                      <>
                        <CheckCircle2 className="size-2.5" />
                        <span>LIVE</span>
                      </>
                    ) : isPaused ? (
                      <>
                        <Clock className="size-2.5" />
                        <span>PROTECTED</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="size-2.5" />
                        <span>DEGRADED</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                  {service.message}
                </p>
              </div>

              {/* Latency & Key Metrics */}
              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5 text-[10px]">
                {service.latencyMs !== null && (
                  <div className="flex items-center justify-between text-zinc-500">
                    <span>Round-Trip Latency:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-200">
                      {service.latencyMs} ms
                    </span>
                  </div>
                )}

                {Object.entries(service.details).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-zinc-500">
                    <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-300 truncate max-w-[140px]">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
