"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EventOption = { id: string; slug: string; title: string; status: string; startsAt: string; endsAt: string; venue: string | null; location: string; registrationState: string };
type Notice = { id: string; eventId: string; eventTitle: string; eventStatus: string; eventSlug: string; title: string; message: string; buttonLabel: string; bannerPath: string; previewUrl: string | null; status: string; startsAt: string | null; stopsAt: string | null; priority: number; updatedAt: string };
type Draft = { id: string; eventId: string; title: string; message: string; buttonLabel: string; bannerPath: string | null; startsAt: string | null; stopsAt: string | null; priority: number };
type Data = { events: EventOption[]; notices: Notice[] };

const KOLKATA_OFFSET_MS = 330 * 60_000;
const emptyDraft = (): Draft => ({ id: crypto.randomUUID(), eventId: "", title: "", message: "", buttonLabel: "View Event", bannerPath: null, startsAt: null, stopsAt: null, priority: 0 });

function dateValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : new Date(date.valueOf() + KOLKATA_OFFSET_MS).toISOString().slice(0, 16);
}

function dateIso(value: string) {
  return value ? new Date(`${value}:00+05:30`).toISOString() : null;
}

function eventTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function EventNoticeEditor({ isDemo, canPublish, canEditEvents, initialEventId }: { isDemo: boolean; canPublish: boolean; canEditEvents: boolean; initialEventId?: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<Data>({ events: [], notices: [] });
  const [draft, setDraft] = React.useState<Draft>(() => emptyDraft());
  const [selectedId, setSelectedId] = React.useState("");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(!isDemo);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const selectedEvent = data.events.find((event) => event.id === draft.eventId);
  const selectedNotice = data.notices.find((notice) => notice.id === selectedId);

  const reload = React.useCallback(async (preferId?: string) => {
    const response = await fetch("/api/admin/event-notices", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load event notices.");
    const next = result as Data;
    setData(next);
    const target = preferId ?? selectedId;
    const item = next.notices.find((notice) => notice.id === target);
    if (item) {
      setSelectedId(item.id);
      setDraft({ id: item.id, eventId: item.eventId, title: item.title, message: item.message, buttonLabel: item.buttonLabel, bannerPath: item.bannerPath || null, startsAt: item.startsAt, stopsAt: item.stopsAt, priority: item.priority });
      setPreviewUrl(item.previewUrl);
    } else if (preferId) {
      setSelectedId("");
      setDraft({ ...emptyDraft(), eventId: initialEventId ?? "" });
      setPreviewUrl(null);
    }
  }, [initialEventId, selectedId]);

  React.useEffect(() => {
    if (isDemo) return;
    let active = true;
    void fetch("/api/admin/event-notices", { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load event notices.");
      if (!active) return;
      const next = result as Data;
      setData(next);
      if (initialEventId) {
        setDraft((current) => ({ ...current, eventId: initialEventId }));
      } else if (next.notices[0]) {
        const item = next.notices[0];
        setSelectedId(item.id);
        setDraft({ id: item.id, eventId: item.eventId, title: item.title, message: item.message, buttonLabel: item.buttonLabel, bannerPath: item.bannerPath || null, startsAt: item.startsAt, stopsAt: item.stopsAt, priority: item.priority });
        setPreviewUrl(item.previewUrl);
      }
    }).catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Could not load event notices."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialEventId, isDemo]);

  function chooseNotice(id: string) {
    setSelectedId(id);
    const item = data.notices.find((notice) => notice.id === id);
    if (!item) return;
    setDraft({ id: item.id, eventId: item.eventId, title: item.title, message: item.message, buttonLabel: item.buttonLabel, bannerPath: item.bannerPath || null, startsAt: item.startsAt, stopsAt: item.stopsAt, priority: item.priority });
    setPreviewUrl(item.previewUrl);
    setMessage("");
  }

  function startNew() {
    setSelectedId("");
    setDraft({ ...emptyDraft(), eventId: initialEventId ?? "" });
    setPreviewUrl(null);
    setMessage("");
  }

  async function uploadBanner(file?: File) {
    if (!file || isDemo || !canPublish) return;
    setUploading(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/announcement/banner", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Banner upload failed.");
      setDraft((current) => ({ ...current, bannerPath: result.bannerPath }));
      setPreviewUrl(result.previewUrl);
      setMessage(`Banner prepared at ${result.width} × ${result.height} (4:3). Save the notice to keep this image.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Banner upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function mutate(operation: "save" | "publish" | "unpublish" | "delete") {
    if (isDemo || !canPublish) return;
    if (operation === "delete" && !window.confirm("Delete this event notice? The event, registrations and tickets will remain unchanged.")) return;
    if (["save", "publish"].includes(operation) && !draft.eventId) { setMessage("Select an existing event first."); return; }
    if (["save", "publish"].includes(operation) && (!draft.title.trim() || !draft.message.trim() || !draft.buttonLabel.trim())) { setMessage("Enter a title, message and button label."); return; }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/event-notices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(["save", "publish"].includes(operation)
          ? { operation, id: draft.id, eventId: draft.eventId, title: draft.title, message: draft.message, buttonLabel: draft.buttonLabel, bannerPath: draft.bannerPath, startsAt: draft.startsAt, stopsAt: draft.stopsAt, priority: draft.priority }
          : { operation, id: draft.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Event notice was not saved.");
      if (operation === "delete") {
        setMessage("Event notice deleted. The actual event remains unchanged.");
        startNew();
        await reload("");
      } else {
        setSelectedId(draft.id);
        await reload(draft.id);
        setMessage(operation === "publish" ? "Event notice published or scheduled." : operation === "unpublish" ? "Event notice unpublished. The event remains published." : "Event notice saved as a draft.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Event notice could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => ({ ...current, [key]: value })); }

  return (
    <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-brand-border sm:p-7" aria-labelledby="event-notice-heading">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h2 id="event-notice-heading" className="text-lg font-semibold text-brand-ink">Publish an event notice</h2>
          <p className="mt-1 text-sm leading-6 text-brand-muted">Promote an existing event in Featured Event Notices on Events &amp; Booking. The notice schedule never changes the event, registration or tickets.</p>
        </div>
        <Button type="button" variant="outline" disabled={loading || !canPublish} onClick={startNew}><Plus className="size-4" />Create Event Notice</Button>
      </div>

      {data.notices.length > 0 ? <div className="mb-6 flex flex-wrap gap-2" aria-label="Existing event notices">
        {data.notices.map((notice) => <button type="button" key={notice.id} onClick={() => chooseNotice(notice.id)} aria-pressed={selectedId === notice.id} className={`rounded-xl border px-3 py-2 text-left text-sm ${selectedId === notice.id ? "border-brand-ink bg-brand-cloud text-brand-ink" : "border-brand-border bg-white text-brand-secondary"}`}>
          <span className="block max-w-64 truncate font-semibold">{notice.title}</span><span className="block text-xs text-brand-muted">{notice.eventTitle} · notice {notice.status} · event {notice.eventStatus}</span>
        </button>)}
      </div> : null}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div className="grid min-w-0 content-start gap-4 sm:grid-cols-2">
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink sm:col-span-2">Select existing event
            <select className="min-h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm" value={draft.eventId} disabled={loading || saving || !canPublish} onChange={(event) => { const selected = data.events.find((item) => item.id === event.target.value); update("eventId", event.target.value); if (selected && !selectedId) update("title", selected.title); }}>
              <option value="">Choose an event</option>{data.events.filter((event) => !["cancelled", "archived"].includes(event.status)).map((event) => <option key={event.id} value={event.id}>{event.title} — {eventTime(event.startsAt)} — {event.status}</option>)}
            </select><span className="text-xs font-normal text-brand-muted">Publishing requires the linked event to be published. A notice never creates an event.</span>
            {selectedEvent ? <span className="flex flex-wrap gap-3 text-xs font-semibold"><Link className="text-brand-accent underline underline-offset-2" href={selectedEvent.status === "published" ? `/events/${selectedEvent.slug}` : `/admin/events/${selectedEvent.id}`}>{selectedEvent.status === "published" ? "View Event" : "View Event in Admin"}</Link>{canEditEvents ? <Link className="text-brand-accent underline underline-offset-2" href={`/admin/events/${selectedEvent.id}/edit`}>Edit Event</Link> : null}</span> : null}
          </label>
          <div className="grid gap-1.5 text-sm font-medium text-brand-ink sm:col-span-2">Event page path
            <div className="flex min-h-11 items-center rounded-xl border border-brand-border bg-brand-cloud px-3 text-sm text-brand-secondary">{selectedEvent ? `/events/${selectedEvent.slug}` : "Select an event to generate its link"}</div>
          </div>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink sm:col-span-2">Notice title<Input value={draft.title} maxLength={100} placeholder="e.g., Registration now open — Founder Meetup" disabled={saving || !canPublish} onChange={(event) => update("title", event.target.value)} /></label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink sm:col-span-2">Notice message<Textarea rows={4} maxLength={500} value={draft.message} placeholder="Write a short announcement explaining why CSC members should attend." disabled={saving || !canPublish} onChange={(event) => update("message", event.target.value)} /></label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink">Button label<Input value={draft.buttonLabel} maxLength={40} placeholder="View Event" disabled={saving || !canPublish} onChange={(event) => update("buttonLabel", event.target.value)} /></label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink">Display priority<Input type="number" min={0} max={1000} value={draft.priority} disabled={saving || !canPublish} onChange={(event) => update("priority", Number(event.target.value))} /></label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink">Start Showing · Asia/Kolkata<Input type="datetime-local" value={dateValue(draft.startsAt)} disabled={saving || !canPublish} onChange={(event) => update("startsAt", dateIso(event.target.value))} /></label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink">Stop Showing · Asia/Kolkata<Input type="datetime-local" value={dateValue(draft.stopsAt)} disabled={saving || !canPublish} onChange={(event) => update("stopsAt", dateIso(event.target.value))} /><span className="text-xs font-normal text-brand-muted">Optional. The event itself stays available when its promotion ends.</span></label>
        </div>

        <div className="min-w-0 rounded-2xl bg-brand-cloud p-4 ring-1 ring-brand-border">
          <div className="mb-3"><h3 className="font-semibold text-brand-ink">Event banner image (optional · 4:3)</h3><p className="mt-1 text-xs leading-5 text-brand-muted">JPEG, PNG or WebP, up to 5 MB. It is separate from the event cover. No banner? The notice uses a text-only layout.</p></div>
          {previewUrl ? <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-white ring-1 ring-brand-border"><Image src={previewUrl} alt="Preview of event notice banner" fill sizes="(max-width: 1024px) 100vw, 400px" className="object-cover" unoptimized /></div> : <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-brand-border bg-white text-center text-sm text-brand-muted"><ImagePlus className="size-7" aria-hidden="true" /><span>No notice banner selected</span></div>}
          <div className="mt-3 flex flex-wrap gap-2"><label className={`inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-brand-cloud ${uploading || loading || !canPublish ? "pointer-events-none opacity-60" : ""}`}>{uploading ? "Uploading banner…" : previewUrl ? "Replace banner" : "Upload 4:3 banner"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading || loading || !canPublish} onChange={(event) => { void uploadBanner(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label>{draft.bannerPath ? <Button type="button" variant="outline" disabled={saving || uploading} onClick={() => { update("bannerPath", null); setPreviewUrl(null); }}><Trash2 className="size-4" />Remove banner</Button> : null}</div>

          <div className="mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-brand-border" aria-label="Live event notice preview">
            {previewUrl ? <div className="relative aspect-[4/3] w-full overflow-hidden"><Image src={previewUrl} alt="" fill sizes="(max-width: 1024px) 100vw, 400px" className="object-cover" unoptimized /></div> : null}
            <div className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent">Featured Event Notice</p><h3 className="mt-2 text-lg font-semibold text-brand-ink">{draft.title || selectedEvent?.title || "Your notice title"}</h3><p className="mt-2 text-sm leading-6 text-brand-secondary">{draft.message || "Your event message will appear here."}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-brand-border pt-4"><span className="flex items-center gap-2 text-xs text-brand-muted"><CalendarDays className="size-4" />{selectedEvent ? eventTime(selectedEvent.startsAt) : "Select an event"}</span><span className="inline-flex items-center gap-1 rounded-xl bg-brand-ink px-3 py-2 text-sm font-semibold text-white">{draft.buttonLabel || "View Event"}<ArrowUpRight className="size-4" /></span></div></div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={saving || uploading || loading || !canPublish} onClick={() => void mutate("save")}>{saving ? "Saving…" : "Save draft"}</Button>
        <Button type="button" disabled={saving || uploading || loading || !canPublish} onClick={() => void mutate("publish")}>{saving ? "Saving…" : selectedNotice?.status === "published" ? "Update & publish" : "Publish Event Notice"}</Button>
        {selectedNotice?.status === "published" ? <Button type="button" variant="outline" disabled={saving || uploading} onClick={() => void mutate("unpublish")}>Unpublish Event Notice</Button> : null}
        {selectedNotice ? <Button type="button" variant="ghost" disabled={saving || uploading} onClick={() => void mutate("delete")}>Delete Event Notice</Button> : null}
      </div>
      {loading && <p className="mt-3 text-sm text-brand-muted">Loading events and notices…</p>}
      {message && <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-brand-cloud p-3 text-sm text-brand-secondary">{message}</p>}
    </section>
  );
}
