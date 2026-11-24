"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Loader2,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface OutboxItem {
  id: string;
  recipient_phone: string;
  message_type?: string | null;
  status: "sent" | "failed" | "pending" | "processing" | string;
  created_at: string;
  sent_at?: string | null;
  last_error_message?: string | null;
}

interface WhatsAppOutboxActivitiesProps {
  initialOutbox: OutboxItem[];
}

export function WhatsAppOutboxActivities({ initialOutbox }: WhatsAppOutboxActivitiesProps) {
  const [items, setItems] = React.useState<OutboxItem[]>(initialOutbox);
  const [filter, setFilter] = React.useState<"all" | "failed" | "pending" | "sent">("all");
  const [search, setSearch] = React.useState("");
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const [retryingAll, setRetryingAll] = React.useState(false);

  const isDelivered = (s: string) => s === "delivered" || s === "accepted_by_gateway" || s === "sent";

  const failedCount = items.filter((m) => m.status === "failed").length;
  const pendingCount = items.filter((m) => m.status === "pending" || m.status === "processing" || m.status === "queued").length;
  const sentCount = items.filter((m) => isDelivered(m.status)).length;

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (filter === "failed" && item.status !== "failed") return false;
      if (filter === "pending" && item.status !== "pending" && item.status !== "processing" && item.status !== "queued") return false;
      if (filter === "sent" && !isDelivered(item.status)) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const phone = item.recipient_phone.toLowerCase();
        const type = (item.message_type || "").toLowerCase();
        return phone.includes(q) || type.includes(q);
      }
      return true;
    });
  }, [items, filter, search]);

  async function handleRetry(messageId: string) {
    setRetryingId(messageId);
    try {
      const res = await fetch("/api/admin/whatsapp/retry-outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to retry message");
      }

      setItems((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, status: "delivered", sent_at: new Date().toISOString() }
            : msg
        )
      );
      toast.success("Message re-dispatched and status marked as Verified!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetryingId(null);
    }
  }

  async function handleRetryAll() {
    if (failedCount === 0) return;
    setRetryingAll(true);
    try {
      const res = await fetch("/api/admin/whatsapp/retry-outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retryAllFailed: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to retry all messages");
      }

      const nowIso = new Date().toISOString();
      setItems((prev) =>
        prev.map((msg) =>
          msg.status === "failed" ? { ...msg, status: "delivered", sent_at: nowIso } : msg
        )
      );
      toast.success(data.message || `Successfully re-sent ${failedCount} failed messages!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry all failed");
    } finally {
      setRetryingAll(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      {/* Header & Global Action */}
      <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Recent WhatsApp Outbound Activity
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time transactional and member authentication messages.
          </p>
        </div>

        {failedCount > 0 && (
          <Button
            size="sm"
            onClick={handleRetryAll}
            disabled={retryingAll}
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 text-xs shadow-sm"
          >
            {retryingAll ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCw className="size-3.5" />
            )}
            <span>Re-send All Failed ({failedCount})</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="px-5 py-3 bg-zinc-50/60 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              filter === "all"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("failed")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              filter === "failed"
                ? "bg-red-600 text-white"
                : failedCount > 0
                  ? "text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-950/40"
                  : "text-zinc-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
            }`}
          >
            Failed ({failedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              filter === "pending"
                ? "bg-amber-600 text-white"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
            }`}
          >
            Processing ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("sent")}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
              filter === "sent"
                ? "bg-emerald-600 text-white"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
            }`}
          >
            Verified ({sentCount})
          </button>
        </div>

        <div className="relative w-full sm:w-48">
          <Search className="size-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search phone/type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>
      </div>

      {/* Scrollable Table Body */}
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-300">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3">Recipient</th>
              <th className="px-5 py-3">Message Type</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-zinc-400">
                  No matching outbound records found.
                </td>
              </tr>
            ) : (
              filteredItems.map((msg) => {
                const isSent = isDelivered(msg.status);
                const isFailed = msg.status === "failed";
                const isProcessing = msg.status === "processing" || msg.status === "pending" || msg.status === "queued";

                return (
                  <tr key={msg.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                    <td className="px-5 py-3.5 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      +91 {msg.recipient_phone.replace(/\D/g, "").slice(-10)}
                    </td>
                    <td className="px-5 py-3.5 capitalize font-medium text-zinc-700 dark:text-zinc-300">
                      {msg.message_type?.replace(/_/g, " ") || "Notification"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          isSent
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : isProcessing
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {isSent ? (
                          <>
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            <span>Verified</span>
                          </>
                        ) : isProcessing ? (
                          <>
                            <Loader2 className="size-3 animate-spin text-amber-600" />
                            <span>Processing</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="size-3 text-red-600" />
                            <span>Failed</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400">
                      {msg.sent_at
                        ? new Date(msg.sent_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Kolkata",
                          })
                        : new Date(msg.created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Kolkata",
                          })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {isFailed ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(msg.id)}
                          disabled={retryingId === msg.id}
                          className="h-7 px-2 text-[11px] border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 gap-1"
                        >
                          {retryingId === msg.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <RotateCw className="size-3" />
                          )}
                          <span>Re-send</span>
                        </Button>
                      ) : (
                        <span className="text-[11px] text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
