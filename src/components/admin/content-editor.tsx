"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Globe2, Save, Trash2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ContentBlock } from "@/types/admin";

const contentOptions = [
  { key: "homepage.announcement", label: "Homepage announcement" },
  { key: "community.introduction", label: "Community introduction" },
  { key: "about.mission", label: "About · Mission" },
  { key: "about.vision", label: "About · Vision" },
] as const;
type ContentKey = (typeof contentOptions)[number]["key"];
type ContentAction = "save" | "publish" | "unpublish" | "delete";

export function ContentEditor({ isDemo, initialContent = [] }: { isDemo: boolean; initialContent?: ContentBlock[] }) {
  const router = useRouter();
  const [key, setKey] = React.useState<ContentKey>("homepage.announcement");
  const selected = initialContent.find((item) => item.key === key);
  const [value, setValue] = React.useState(selected?.value ?? "");
  const [savedValue, setSavedValue] = React.useState(selected?.value ?? "");
  const [visibleFrom, setVisibleFrom] = React.useState(formatKolkataInput(selected?.visibleFrom));
  const [visibleUntil, setVisibleUntil] = React.useState(formatKolkataInput(selected?.visibleUntil));
  const [savedVisibleFrom, setSavedVisibleFrom] = React.useState(formatKolkataInput(selected?.visibleFrom));
  const [savedVisibleUntil, setSavedVisibleUntil] = React.useState(formatKolkataInput(selected?.visibleUntil));
  const [saving, setSaving] = React.useState(false);
  const [savingAction, setSavingAction] = React.useState<ContentAction | null>(null);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState(false);
  const dirty = value !== savedValue || visibleFrom !== savedVisibleFrom || visibleUntil !== savedVisibleUntil;
  const isLive = selected?.status === "published" || selected?.status === "scheduled" || selected?.status === "expired";

  async function persist(action: ContentAction) {
    if (isDemo) { setError(false); setMessage("Preview mode cannot change saved website content."); return; }
    if ((action === "save" || action === "publish") && !value.trim()) { setError(true); setMessage("Add content before saving or publishing."); return; }
    if (visibleFrom && visibleUntil && toKolkataIso(visibleFrom) >= toKolkataIso(visibleUntil)) { setError(true); setMessage("Visibility end must be later than the start."); return; }
    if (action === "delete" && !window.confirm(`Delete ${contentOptions.find((item) => item.key === key)?.label}? It will be removed from the website immediately.`)) return;

    setSaving(true); setSavingAction(action); setError(false); setMessage(actionMessage(action));
    try {
      const response = await fetch("/api/admin/content", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          content_key: key,
          content_value: value,
          visible_from: visibleFrom ? toKolkataIso(visibleFrom) : null,
          visible_until: visibleUntil ? toKolkataIso(visibleUntil) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Content could not be updated.");
      if (action === "delete") {
        setValue(""); setSavedValue(""); setVisibleFrom(""); setVisibleUntil(""); setSavedVisibleFrom(""); setSavedVisibleUntil("");
        setMessage("Content was removed from the website. The change is recorded in the audit history.");
      } else {
        setSavedValue(value);
        setSavedVisibleFrom(visibleFrom); setSavedVisibleUntil(visibleUntil);
        setMessage(action === "publish"
          ? visibleFrom && toKolkataIso(visibleFrom) > new Date().toISOString() ? "Content scheduled. It will appear when the visibility window opens." : "Content published and visible on the website."
          : action === "unpublish" ? "Content unpublished and removed from the website." : "Draft saved. Publish it when it is ready.");
      }
      router.refresh();
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "Content could not be updated. Please try again.");
    } finally { setSaving(false); setSavingAction(null); }
  }

  function selectContent(nextKey: ContentKey) {
    const next = initialContent.find((item) => item.key === nextKey);
    setKey(nextKey); setValue(next?.value ?? ""); setSavedValue(next?.value ?? "");
    setVisibleFrom(formatKolkataInput(next?.visibleFrom)); setVisibleUntil(formatKolkataInput(next?.visibleUntil));
    setSavedVisibleFrom(formatKolkataInput(next?.visibleFrom)); setSavedVisibleUntil(formatKolkataInput(next?.visibleUntil));
    setMessage(""); setError(false);
  }

  const label = contentOptions.find((item) => item.key === key)?.label ?? key;

  return (
    <section className="mt-6 grid min-w-0 gap-5 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-6" aria-labelledby="content-editor-heading">
      <div className="grid gap-1">
        <h2 id="content-editor-heading" className="font-semibold text-brand-ink">Edit website content</h2>
        <p className="text-sm text-brand-secondary">Save a draft, publish now, schedule a visibility window, unpublish, or remove content.</p>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="grid min-w-0 content-start gap-3">
          <Label htmlFor="content-key">Content section</Label>
          <select id="content-key" className="min-h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-purple" value={key} onChange={(event) => selectContent(event.target.value as ContentKey)} disabled={saving}>
            {contentOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
          <Label htmlFor="content-value">Text</Label>
          <Textarea id="content-value" value={value} onChange={(event) => setValue(event.target.value)} maxLength={4000} rows={5} disabled={saving} />
          <p className="text-right text-xs text-brand-muted">{value.length}/4000</p>
          <div className="grid gap-3 rounded-xl border border-brand-border bg-brand-cloud/50 p-4 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label htmlFor="content-visible-from">Visibility start · Asia/Kolkata</Label><input id="content-visible-from" type="datetime-local" value={visibleFrom} onChange={(e) => setVisibleFrom(e.target.value)} disabled={saving} className="min-h-10 w-full min-w-0 rounded-lg border border-brand-border bg-white px-2.5 text-sm" /></div>
            <div className="grid gap-1.5"><Label htmlFor="content-visible-until">Visibility end · Asia/Kolkata</Label><input id="content-visible-until" type="datetime-local" value={visibleUntil} onChange={(e) => setVisibleUntil(e.target.value)} disabled={saving} className="min-h-10 w-full min-w-0 rounded-lg border border-brand-border bg-white px-2.5 text-sm" /></div>
            <p className="text-xs leading-5 text-brand-muted sm:col-span-2">Leave either field blank for an open-ended window. Scheduled content stays hidden before its start and expires automatically at its end.</p>
          </div>
        </div>

        <div className="grid min-w-0 content-start gap-2 rounded-2xl border border-brand-border bg-white p-4" aria-label="Live content preview">
          <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Live preview</p><span className="rounded-full bg-brand-purple px-2.5 py-1 text-xs font-medium text-brand-ink">{label}</span></div>
          <p className="break-words whitespace-pre-wrap rounded-xl bg-brand-cloud p-4 text-sm leading-6 text-brand-secondary">{value || "Preview appears here as you type."}</p>
          {(visibleFrom || visibleUntil) && <p className="text-xs text-brand-muted">Shown {visibleFrom ? `from ${visibleFrom.replace("T", " ")}` : "immediately"}{visibleUntil ? ` until ${visibleUntil.replace("T", " ")}` : " with no end date"} (Asia/Kolkata)</p>}
          {selected ? <p className="text-xs text-brand-muted">Saved state: {selected.status}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={saving || !dirty || !value.trim()} onClick={() => void persist("save")}><Save className="size-4" aria-hidden="true" />{savingAction === "save" ? "Saving…" : "Save Draft"}</Button>
        <Button type="button" disabled={saving || !value.trim() || (isLive && !dirty && selected?.status === "published")} onClick={() => void persist("publish")}><Globe2 className="size-4" aria-hidden="true" />{savingAction === "publish" ? "Publishing…" : isLive ? "Update & Publish" : "Publish Content"}</Button>
        {isLive ? <Button type="button" variant="outline" disabled={saving} onClick={() => void persist("unpublish")}><EyeOff className="size-4" aria-hidden="true" />{savingAction === "unpublish" ? "Unpublishing…" : "Unpublish"}</Button> : null}
        {selected && selected.status !== "deleted" ? <Button type="button" variant="destructive" disabled={saving} onClick={() => void persist("delete")}><Trash2 className="size-4" aria-hidden="true" />{savingAction === "delete" ? "Removing…" : "Delete Content"}</Button> : null}
        {isLive && selected?.status === "published" && !dirty ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700"><CheckCircle2 className="size-4" aria-hidden="true" />Live</span> : null}
      </div>
      {message ? <p role={error ? "alert" : "status"} aria-live="polite" className={`rounded-xl p-3 text-sm ${error ? "bg-red-50 text-red-800" : "bg-brand-cloud text-brand-secondary"}`}>{message}</p> : null}
    </section>
  );
}

function toKolkataIso(value: string): string {
  return new Date(`${value}:00+05:30`).toISOString();
}

function formatKolkataInput(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function actionMessage(action: ContentAction): string {
  return { save: "Saving draft…", publish: "Publishing content…", unpublish: "Unpublishing content…", delete: "Removing content…" }[action];
}
