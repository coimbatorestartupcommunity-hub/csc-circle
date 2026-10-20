"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Draft = { title: string; message: string; actionLabel: string; eventPath: string; bannerPath: string; expiresAt?: string | null };
const emptyDraft: Draft = { title: "", message: "", actionLabel: "Register for event", eventPath: "/events", bannerPath: "", expiresAt: null };

function dateValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : new Date(date.valueOf() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function EventNoticeEditor({ isDemo, canPublish }: { isDemo: boolean; canPublish: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [published, setPublished] = React.useState(false);
  const [loading, setLoading] = React.useState(!isDemo);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (isDemo) return;
    let active = true;
    void fetch("/api/admin/announcement", { cache: "no-store" }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load notice.");
      if (!active) return;
      if (data.notice) setDraft({ ...emptyDraft, ...data.notice });
      setPreviewUrl(data.previewUrl ?? "");
      setPublished(Boolean(data.published));
    }).catch((error: unknown) => {
      if (active) setMessage(error instanceof Error ? error.message : "Could not load notice.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isDemo]);

  async function uploadBanner(file?: File) {
    if (!file || isDemo || !canPublish) return;
    setUploading(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/announcement/banner", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Banner upload failed.");
      setDraft((current) => ({ ...current, bannerPath: data.bannerPath }));
      setPreviewUrl(data.previewUrl);
      setMessage(`Banner uploaded and normalized to ${data.width} × ${data.height} (4:3). Save the notice to keep this banner.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Banner upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save(publish: boolean) {
    if (isDemo) { setMessage("Preview only. No public notice was changed."); return; }
    if (!canPublish) { setMessage("You do not have permission to publish notices."); return; }
    if (publish && !draft.bannerPath) { setMessage("Upload a 4:3 event banner before publishing."); return; }
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, expiresAt: draft.expiresAt || null, publish }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Notice was not saved.");
      setPublished(publish);
      setMessage(publish ? "Event notice published. Visitors can open the event page and register." : "Event notice saved as a draft.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Notice could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="mb-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-brand-border sm:p-7" aria-labelledby="event-notice-heading">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h2 id="event-notice-heading" className="text-lg font-semibold text-brand-ink">Publish an event notice</h2>
          <p className="mt-1 text-sm leading-6 text-brand-muted">Create the bottom-of-page event banner shown across CSC public pages. Visitors can open the event page from the notice and register there.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${published ? "bg-emerald-50 text-emerald-800" : "bg-brand-cloud text-brand-secondary"}`}>{published ? "Published" : "Draft"}</span>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink sm:col-span-2">
            Notice title <span className="text-xs font-normal text-brand-muted">Shown as the announcement heading (3–100 characters).</span>
            <Input value={draft.title} maxLength={100} placeholder="e.g., CSC Founder Meetup — Registration Open" onChange={(e) => update("title", e.target.value)} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink sm:col-span-2">
            Event page path <span className="text-xs font-normal text-brand-muted">Use a valid internal CSC route. The current registration page is /events.</span>
            <Input value={draft.eventPath} placeholder="/events" onChange={(e) => update("eventPath", e.target.value)} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink sm:col-span-2">
            Notice message <span className="text-xs font-normal text-brand-muted">Include date, time, location, who should attend, and any registration deadline (8–500 characters).</span>
            <Textarea rows={4} maxLength={500} value={draft.message} placeholder="Tell members what the event is, when and where it happens, who can attend, and how to register." onChange={(e) => update("message", e.target.value)} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink">
            Button label <span className="text-xs font-normal text-brand-muted">Call to action, such as Register for event (2–40 characters).</span>
            <Input value={draft.actionLabel} maxLength={40} placeholder="Register for event" onChange={(e) => update("actionLabel", e.target.value)} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-medium text-brand-ink">
            Optional expiry date <span className="text-xs font-normal text-brand-muted">The notice stops appearing after this time.</span>
            <Input type="datetime-local" value={dateValue(draft.expiresAt)} onChange={(e) => update("expiresAt", e.target.value ? new Date(e.target.value).toISOString() : null)} />
          </label>
        </div>

        <div className="min-w-0 rounded-2xl bg-brand-cloud p-4 ring-1 ring-brand-border">
          <div className="mb-3">
            <h3 className="font-semibold text-brand-ink">Event banner image (4:3)</h3>
            <p className="mt-1 text-xs leading-5 text-brand-muted">Required to publish. JPEG, PNG or WebP, up to 5 MB, at least 640 × 480 px. The server safely normalizes it to a 4:3 WebP banner.</p>
          </div>
          {previewUrl ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-white ring-1 ring-brand-border">
              {/* Signed preview URLs are short-lived and point to the private CSC media bucket. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Preview of the event notice banner, cropped to 4:3" className="size-full object-cover" />
            </div>
          ) : (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-brand-border bg-white text-center text-sm text-brand-muted">
              <ImagePlus className="size-7" aria-hidden="true" />
              <span>No event banner selected</span>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <label className={`inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-brand-cloud ${uploading || loading || !canPublish ? "pointer-events-none opacity-60" : ""}`}>
              {uploading ? "Uploading banner…" : previewUrl ? "Replace banner" : "Upload 4:3 banner"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading || loading || !canPublish} onChange={(e) => { void uploadBanner(e.currentTarget.files?.[0]); e.currentTarget.value = ""; }} />
            </label>
            {draft.bannerPath ? <Button type="button" variant="outline" disabled={saving || uploading} onClick={() => { update("bannerPath", ""); setPreviewUrl(""); }}> <Trash2 className="size-4" aria-hidden="true" /> Remove banner</Button> : null}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={saving || uploading || loading} onClick={() => void save(false)}>{saving ? "Saving…" : "Save draft"}</Button>
        <Button type="button" disabled={saving || uploading || loading} onClick={() => void save(true)}>{saving ? "Publishing…" : published ? "Update & publish" : "Publish event notice"}</Button>
        {published && <Button type="button" variant="ghost" disabled={saving || uploading} onClick={() => void save(false)}>Unpublish</Button>}
      </div>
      {loading && <p className="mt-3 text-sm text-brand-muted">Loading saved notice…</p>}
      {message && <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-brand-cloud p-3 text-sm text-brand-secondary">{message}</p>}
    </section>
  );
}
