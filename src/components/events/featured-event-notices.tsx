"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Megaphone } from "lucide-react";

type Notice = { id: string; title: string; message: string; buttonLabel: string; bannerUrl: string | null; eventPath: string; eventTitle: string; eventStartsAt: string; venue: string | null; priority: number; visibleUntil: string | null };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export function FeaturedEventNotices() {
  const [notices, setNotices] = React.useState<Notice[]>([]);
  const [error, setError] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  const load = React.useCallback(async () => {
    try {
      const response = await fetch("/api/announcements/active", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unavailable");
      setNotices(Array.isArray(data.notices) ? data.notices as Notice[] : []);
      setError(false);
    } catch {
      setNotices([]);
      setError(true);
    }
  }, []);
  React.useEffect(() => {
    let active = true;
    const refresh = () => { if (active) void load(); };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [load, retry]);
  React.useEffect(() => {
    const nextExpiry = notices.map((notice) => notice.visibleUntil ? Date.parse(notice.visibleUntil) : Infinity).filter((time) => time > Date.now()).sort((a, b) => a - b)[0];
    if (!Number.isFinite(nextExpiry)) return;
    const timeout = window.setTimeout(() => { void load(); }, Math.min(nextExpiry - Date.now() + 25, 2_147_000_000));
    return () => window.clearTimeout(timeout);
  }, [load, notices]);
  if (notices.length === 0 && !error) return null;
  if (error) return <p role="status" className="w-full rounded-2xl bg-brand-cloud p-4 text-sm text-brand-secondary">Featured event notices are temporarily unavailable. <button type="button" className="font-semibold text-brand-ink underline underline-offset-2" onClick={() => setRetry((count) => count + 1)}>Retry</button></p>;
  return (
    <section aria-labelledby="featured-event-notices" className="w-full space-y-5">
      <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-accent">Community announcements</p><h2 id="featured-event-notices" className="mt-1 text-2xl font-semibold text-brand-ink sm:text-3xl">Featured Event Notices</h2></div><span className="hidden rounded-full bg-brand-cloud px-3 py-1 text-xs font-medium text-brand-secondary sm:inline-flex">{notices.length} active {notices.length === 1 ? "notice" : "notices"}</span></div>
      <div className="grid gap-5 xl:grid-cols-2">
        {notices.map((notice) => <article key={notice.id} className="flex min-w-0 flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-brand-border">
          {notice.bannerUrl ? <div className="relative aspect-[4/3] w-full min-w-0 overflow-hidden bg-brand-cloud"><Image src={notice.bannerUrl} alt={`${notice.title} banner`} fill sizes="(max-width: 1280px) 100vw, 600px" className="object-cover" unoptimized /></div> : null}
          <div className="flex min-w-0 flex-col p-5 sm:p-6">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent"><Megaphone className="size-4" />Event announcement</p>
            <h3 className="mt-3 break-words text-xl font-semibold leading-tight text-brand-ink sm:text-2xl">{notice.title}</h3>
            <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-brand-secondary">{notice.message}</p>
            <div className="mt-4 grid gap-2 text-xs text-brand-muted sm:text-sm"><p className="flex items-start gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0" /><span>{formatDate(notice.eventStartsAt)}</span></p>{notice.venue ? <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0" /><span>{notice.venue}</span></p> : null}<p className="text-brand-secondary">For: {notice.eventTitle}</p></div>
            <Link href={notice.eventPath} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-brand-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink">{notice.buttonLabel}<ArrowRight className="size-4" /></Link>
          </div>
        </article>)}
      </div>
    </section>
  );
}
