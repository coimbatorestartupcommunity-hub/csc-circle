"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
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
        <section id="member-notification-panel" aria-label="Your notifications" style={{ top: panelPosition.top, left: panelPosition.left, width: panelPosition.width, maxHeight: panelPosition.height }} className="fixed z-[100] flex flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-xl">
          <header className="flex items-center justify-between gap-3 border-b border-brand-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-brand-ink">Notifications</h2>
              <p className="text-xs text-brand-muted">{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</p>
            </div>
            <button type="button" disabled={working || unreadCount === 0} onClick={() => void markRead()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-accent hover:bg-brand-cloud disabled:opacity-50">
              {working ? <Loader2 className="size-3 animate-spin" /> : <CheckCheck className="size-3.5" />}
              Mark all read
            </button>
          </header>

          {error ? <div role="alert" className="border-b border-brand-border px-4 py-3 text-sm text-red-700">{error}<button type="button" onClick={() => { setLoading(true); void load(); }} className="ml-2 font-semibold underline">Retry</button></div> : null}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? <div className="flex justify-center px-4 py-8"><Loader2 className="size-5 animate-spin text-brand-muted" aria-label="Loading notifications" /></div> : null}
            {!loading && !error && items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-brand-muted">You have no notifications yet.</p> : null}
            {!loading ? items.map((item) => {
              const action = notificationAction(item.type, item.action_url);
              const content = <>
                <span className={cn("mt-1 size-2 shrink-0 rounded-full", item.read_at ? "bg-transparent" : "bg-brand-accent")} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-brand-ink">{item.title || "CSC account update"}</span>
                  <span className="mt-0.5 block text-sm leading-5 text-brand-secondary">{item.message}</span>
                  <span className="mt-1.5 block text-xs text-brand-muted">{displayDate(item.delivered_at ?? item.created_at)}</span>
                </span>
              </>;
              return <div key={item.id} className={cn("flex gap-2 border-b border-brand-border px-4 py-3 last:border-0", !item.read_at && "bg-brand-purple/10")}>
                <div className="flex min-w-0 flex-1 gap-3">{content}</div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {action ? <Link href={action.href} onClick={() => { if (!item.read_at) void markRead(item.id); setOpen(false); }} className="inline-flex min-h-9 items-center rounded-lg bg-brand-ink px-3 py-2 text-xs font-semibold text-white hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2">{action.label}</Link> : null}
                {!item.read_at ? <button type="button" aria-label="Mark as read" title="Mark as read" disabled={working} onClick={() => void markRead(item.id)} className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-brand-muted hover:bg-white hover:text-brand-accent disabled:opacity-50"><Check className="size-4" /></button> : null}
                </div>
              </div>;
            }) : null}
          </div>
        </section>
      ), document.body) : null}
    </div>
  );
}
