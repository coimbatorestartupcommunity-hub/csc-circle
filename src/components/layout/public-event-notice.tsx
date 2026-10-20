"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Notice = { title: string; message: string; actionLabel: string; eventPath: string; id: string };

export function PublicEventNotice() {
  const pathname = usePathname();
  const router = useRouter();
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [dismissed, setDismissed] = React.useState(false);
  const privateRoute = pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/member" || pathname.startsWith("/member/") || ["/login", "/signup", "/forgot-password", "/reset-password", "/auth"].some((p) => pathname === p || pathname.startsWith(`${p}/`));

  React.useEffect(() => {
    if (privateRoute) return;
    let active = true;
    void fetch("/api/announcements/active", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      if (!active || !data.notice) return;
      setNotice(data.notice);
      try { setDismissed(window.localStorage.getItem("csc-event-notice-dismissed") === data.notice.id); } catch { setDismissed(false); }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [privateRoute]);

  if (privateRoute || !notice || dismissed) return null;
  function dismiss() {
    setDismissed(true);
    try { window.localStorage.setItem("csc-event-notice-dismissed", notice!.id); } catch { /* private browsing may disable storage */ }
  }
  return (
    <aside aria-label="Community event announcement" aria-live="polite" className="fixed inset-x-3 bottom-3 z-[70] mx-auto w-auto max-w-3xl animate-in slide-in-from-bottom-4 fade-in duration-300 sm:inset-x-6 sm:bottom-6">
      <div className="relative flex flex-col gap-4 rounded-3xl border border-brand-border bg-white/95 p-5 shadow-[0_18px_70px_-20px_rgba(18,24,38,0.32)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <button aria-label="Dismiss announcement" onClick={dismiss} className="absolute right-3 top-3 rounded-full p-2 text-brand-muted hover:bg-brand-cloud hover:text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink sm:static sm:order-3"><X className="size-4" /></button>
        <div className="flex min-w-0 gap-3 pr-8 sm:pr-0">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-purple text-brand-ink"><BellRing className="size-5" /></span>
          <div className="min-w-0"><p className="font-semibold text-brand-ink">{notice.title}</p><p className="mt-1 text-sm leading-relaxed text-brand-secondary">{notice.message}</p></div>
        </div>
        <Button className="shrink-0 rounded-xl" onClick={() => { dismiss(); router.push(notice.eventPath); }}>{notice.actionLabel}<ArrowRight className="size-4" /></Button>
      </div>
    </aside>
  );
}
