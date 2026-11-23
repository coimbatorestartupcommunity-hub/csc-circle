"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, Check, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { cn } from "cn";
import { notificationAction } from "@/lib/notifications/actions";

type InboxItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
  delivered_at: string | null;
};

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

export function MemberNotificationMenu() {
  const [open, setOpen] = React.useState(false);
  const [panelPosition, setPanelPosition] = React.useState({ top: 0, left: 12, width: 360, height: 400 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [category, setCategory] = React.useState<"all" | "events" | "passes" | "updates">("all");

  const load = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/member/notifications", { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Notifications are unavailable.");
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(Number(data.unreadCount) || 0);
      setError(null);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Notifications are unavailable.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const request = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(request);
      controller.abort();
    };
  }, [load]);

  const positionPanel = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 12;
    // Mobile Safari can have a layout viewport wider than the visible viewport
    // (for example while zoomed). Position and size the portal against the
    // visible viewport so the panel never opens partly off-screen.
    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportWidth = visualViewport?.width || document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const width = Math.max(1, Math.min(384, viewportWidth - margin * 2));
    const maxPanelHeight = Math.max(180, Math.min(viewportHeight * 0.7, 448));
    const minLeft = viewportLeft + margin;
    const maxLeft = viewportLeft + viewportWidth - width - margin;
    const left = Math.min(Math.max(minLeft, rect.right - width), maxLeft);
    const below = rect.bottom + 8;
    const top = below + maxPanelHeight > viewportTop + viewportHeight - margin
      ? Math.max(viewportTop + margin, rect.top - maxPanelHeight - 8)
      : below;
    setPanelPosition({ top, left, width, height: maxPanelHeight });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    positionPanel();
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    window.visualViewport?.addEventListener("resize", positionPanel);
    window.visualViewport?.addEventListener("scroll", positionPanel);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
      window.visualViewport?.removeEventListener("resize", positionPanel);
      window.visualViewport?.removeEventListener("scroll", positionPanel);
    };
  }, [open, positionPanel]);

  async function markRead(id?: string) {
    setWorking(true);
    try {
      const response = await fetch("/api/member/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { action: "read", id } : { action: "read_all" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update notification status.");
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => !id || item.id === id ? { ...item, read_at: item.read_at ?? now } : item));
      setUnreadCount((current) => id ? Math.max(0, current - (items.some((item) => item.id === id && !item.read_at) ? 1 : 0)) : 0);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update notification status.");
    } finally {
      setWorking(false);
    }
  }

  async function deleteNotification(id: string) {
    setWorking(true);
    try {
      const response = await fetch("/api/member/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!response.ok) throw new Error("Could not delete notification.");
      setItems((current) => current.filter((item) => item.id !== id));
      setUnreadCount((current) => Math.max(0, current - (items.some((item) => item.id === id && !item.read_at) ? 1 : 0)));
    } catch {
      // optimistic ignore
    } finally {
      setWorking(false);
    }
  }

  async function clearAllNotifications() {
    setWorking(true);
    try {
      const response = await fetch("/api/member/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all" }),
      });
      if (!response.ok) throw new Error("Could not clear notifications.");
      setItems([]);
      setUnreadCount(0);
    } catch {
      // optimistic ignore
    } finally {
      setWorking(false);
    }
  }

  const filteredItems = items.filter((item) => {
    if (category === "all") return true;
    const t = (item.type || item.title || "").toLowerCase();
    if (category === "events") return t.includes("event") || t.includes("rsvp");
    if (category === "passes") return t.includes("pass") || t.includes("membership") || t.includes("card") || t.includes("check");
    if (category === "updates") return !t.includes("event") && !t.includes("pass") && !t.includes("membership");
    return true;
  });

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls="member-notification-panel"
        onClick={() => {
          if (!open) positionPanel();
          setOpen((value) => !value);
        }}
        className="relative flex size-9 items-center justify-center rounded-full text-brand-secondary ring-1 ring-brand-border transition hover:bg-brand-cloud hover:text-brand-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Bell className="size-4" aria-hidden="true" />
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] leading-4 font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {open ? createPortal((
        <section id="member-notification-panel" aria-label="Your notifications" style={{ top: panelPosition.top, left: panelPosition.left, width: panelPosition.width, maxHeight: panelPosition.height }} className="fixed z-[100] flex flex-col overflow-hidden rounded-3xl border border-brand-border bg-white shadow-2xl ring-1 ring-black/5">
          <header className="flex items-center justify-between gap-2 border-b border-brand-border px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-brand-ink">Notifications</h2>
              <p className="text-xs text-brand-muted">{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={working || unreadCount === 0}
                onClick={() => void markRead()}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-brand-accent hover:bg-brand-cloud disabled:opacity-40 transition cursor-pointer"
                title="Mark all notifications as read"
              >
                {working ? <Loader2 className="size-3 animate-spin" /> : <CheckCheck className="size-3.5" />}
                <span>Read all</span>
              </button>
              {items.length > 0 && (
                <button
                  type="button"
                  disabled={working}
                  onClick={() => void clearAllNotifications()}
                  className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Clear all notifications"
                >
                  <Trash2 className="size-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </header>

          {/* Curved Pill Filter Tabs — Zero Overflow */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-brand-border/70 bg-brand-cloud/30 px-3 py-2 no-scrollbar">
            {(
              [
                ["all", "All"],
                ["events", "Events"],
                ["passes", "Passes"],
                ["updates", "Updates"],
              ] as const
            ).map(([key, label]) => {
              const active = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition shrink-0 cursor-pointer",
                    active
                      ? "bg-brand-ink text-white shadow-xs"
                      : "bg-white text-brand-secondary ring-1 ring-brand-border hover:bg-brand-cloud hover:text-brand-ink"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {error ? <div role="alert" className="border-b border-brand-border px-4 py-3 text-sm text-red-700">{error}<button type="button" onClick={() => { setLoading(true); void load(); }} className="ml-2 font-semibold underline">Retry</button></div> : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? <div className="flex justify-center px-4 py-8"><Loader2 className="size-5 animate-spin text-brand-muted" aria-label="Loading notifications" /></div> : null}
            {!loading && !error && filteredItems.length === 0 ? <p className="px-4 py-8 text-center text-sm text-brand-muted">No notifications in this category.</p> : null}
            {!loading ? filteredItems.map((item) => {
              const action = notificationAction(item.type, item.action_url);
              return <div key={item.id} className={cn("group border-b border-brand-border px-4 py-3 last:border-0 transition", !item.read_at && "bg-brand-purple/10")}>
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.read_at ? "bg-transparent" : "bg-brand-accent")} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-brand-ink">{item.title || "CSC account update"}</span>
                      <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-0.5">
                        {!item.read_at ? (
                          <button type="button" aria-label="Mark as read" title="Mark as read" disabled={working} onClick={() => void markRead(item.id)} className="flex size-7 items-center justify-center rounded-full text-brand-muted hover:bg-white hover:text-brand-accent disabled:opacity-50 cursor-pointer">
                            <Check className="size-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          aria-label="Delete notification"
                          title="Delete notification"
                          disabled={working}
                          onClick={() => void deleteNotification(item.id)}
                          className="flex size-7 items-center justify-center rounded-full text-brand-muted hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 cursor-pointer opacity-70 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-0.5 text-sm leading-5 text-brand-secondary">{item.message}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-brand-muted">{displayDate(item.delivered_at ?? item.created_at)}</span>
                      {action ? <Link href={action.href} onClick={() => { if (!item.read_at) void markRead(item.id); setOpen(false); }} className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md bg-brand-ink px-3 py-1.5 text-[11px] font-semibold leading-tight text-white hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2">{action.label}</Link> : null}
                    </div>
                  </div>
                </div>
              </div>;
            }) : null}
          </div>
        </section>
      ), document.body) : null}
    </div>
  );
}
