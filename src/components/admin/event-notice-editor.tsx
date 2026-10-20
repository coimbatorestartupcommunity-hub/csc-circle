"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Draft = { title: string; message: string; actionLabel: string; eventPath: string; expiresAt?: string | null };

function dateValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : new Date(date.valueOf() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function EventNoticeEditor({ isDemo, canPublish }: { isDemo: boolean; canPublish: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft>({ title: "Upcoming CSC gathering", message: "Join the community for our next founder meetup.", actionLabel: "Accept & view event", eventPath: "/events" });
  const [published, setPublished] = React.useState(false);
  const [loading, setLoading] = React.useState(!isDemo);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (isDemo) return;
    let active = true;
    void fetch("/api/admin/announcement", { cache: "no-store" }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load notice.");
      if (active && data.notice) setDraft(data.notice);
      if (active) { setPublished(Boolean(data.published)); setLoading(false); }
    }).catch((error: unknown) => { if (active) { setMessage(error instanceof Error ? error.message : "Could not load notice."); setLoading(false); } });
    return () => { active = false; };
  }, [isDemo]);

  async function save(publish: boolean) {
    if (isDemo) { setMessage("Preview only. No public notice was changed."); return; }
    if (!canPublish) { setMessage("You do not have permission to publish notices."); return; }
    setSaving(true); setMessage("");
    try {
      const res = await fetch("/api/admin/announcement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, expiresAt: draft.expiresAt || null, publish }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Notice was not saved.");
      setPublished(publish); setMessage(publish ? "Notice published. It will appear on the website for visitors." : "Notice saved as a draft."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Notice could not be saved."); }
    finally { setSaving(false); }
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  return <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-brand-border sm:p-7">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-brand-ink">Publish an event notice</h2><p className="mt-1 max-w-2xl text-sm text-brand-muted">Create a temporary bottom-of-page announcement for meetups, founder gatherings and other CSC events. The notice opens its event registration page.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${published ? "bg-emerald-50 text-emerald-800" : "bg-brand-cloud text-brand-secondary"}`}>{published ? "Published" : "Draft"}</span></div>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium">Notice title<Input value={draft.title} maxLength={100} onChange={(e) => update("title", e.target.value)} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Event page path<Input value={draft.eventPath} placeholder="/events/founder-meetup" onChange={(e) => update("eventPath", e.target.value)} /><span className="text-xs font-normal text-brand-muted">Use an internal event route such as /events/founder-meetup.</span></label>
      <label className="grid gap-1.5 text-sm font-medium md:col-span-2">Message<Textarea rows={3} maxLength={500} value={draft.message} onChange={(e) => update("message", e.target.value)} /></label>
      <label className="grid gap-1.5 text-sm font-medium">Button label<Input value={draft.actionLabel} maxLength={40} onChange={(e) => update("actionLabel", e.target.value)} /><span className="text-xs font-normal text-brand-muted">This button accepts the notice and opens its event page.</span></label>
      <label className="grid gap-1.5 text-sm font-medium">Optional expiry<Input type="datetime-local" value={dateValue(draft.expiresAt)} onChange={(e) => update("expiresAt", e.target.value ? new Date(e.target.value).toISOString() : null)} /><span className="text-xs font-normal text-brand-muted">Expired notices stop appearing automatically.</span></label>
    </div>
    <div className="mt-5 flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={saving || loading} onClick={() => void save(false)}>{saving ? "Saving…" : "Save draft"}</Button><Button type="button" disabled={saving || loading} onClick={() => void save(true)}>{saving ? "Publishing…" : published ? "Update & publish" : "Publish notice"}</Button>{published && <Button type="button" variant="ghost" disabled={saving} onClick={() => void save(false)}>Unpublish</Button>}</div>
    {loading && <p className="mt-3 text-sm text-brand-muted">Loading saved notice…</p>}
    {message && <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-brand-cloud p-3 text-sm text-brand-secondary">{message}</p>}
  </section>;
}
