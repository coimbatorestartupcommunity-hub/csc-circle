"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Globe2, Save } from "lucide-react";
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

export function ContentEditor({ isDemo, initialContent = [] }: { isDemo: boolean; initialContent?: ContentBlock[] }) {
  const router = useRouter();
  const [key, setKey] = React.useState<ContentKey>("homepage.announcement");
  const selected = initialContent.find((item) => item.key === key);
  const [value, setValue] = React.useState(selected?.value ?? "");
  const [savedValue, setSavedValue] = React.useState(selected?.value ?? "");
  const [published, setPublished] = React.useState(selected?.status === "published");
  const [saving, setSaving] = React.useState(false);
  const [savingAction, setSavingAction] = React.useState<"draft" | "publish" | null>(null);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState(false);
  const dirty = value !== savedValue;
  async function persist(shouldPublish: boolean) {
    if (isDemo) {
      setError(false);
      setMessage("Demo only. No public content was changed.");
      return;
    }
    if (!value.trim()) {
      setError(true);
      setMessage("Add content before saving or publishing.");
      return;
    }

    setSaving(true);
    setSavingAction(shouldPublish ? "publish" : "draft");
    setError(false);
    setMessage(shouldPublish ? "Publishing content…" : "Saving draft…");
    try {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_key: key, content_value: value, publish: shouldPublish }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Content could not be saved.");

      setSavedValue(value);
      setPublished(Boolean(data.published));
      setMessage(data.published
        ? key === "homepage.announcement" ? "Published. The announcement is now visible on the homepage." : "Published. The updated content is now live."
        : "Draft saved. Review it, then select Publish Content to make it live.");
      router.refresh();
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error ? cause.message : "Content could not be saved. Please try again.");
    } finally {
      setSaving(false);
      setSavingAction(null);
    }
  }

  return (
    <section className="mt-6 grid min-w-0 gap-5 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-6" aria-labelledby="content-editor-heading">
      <div className="grid gap-1">
        <h2 id="content-editor-heading" className="font-semibold text-brand-ink">Edit website content</h2>
        <p className="text-sm text-brand-secondary">Save a draft for review, or publish it to update the live website.</p>
      </div>

      <div className="grid min-w-0 gap-3">
        <Label htmlFor="content-key">Content section</Label>
        <select
          id="content-key"
          className="min-h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
          value={key}
          onChange={(event) => {
            const nextKey = event.target.value as ContentKey;
            const nextContent = initialContent.find((item) => item.key === nextKey);
            setKey(nextKey);
            setValue(nextContent?.value ?? "");
            setSavedValue(nextContent?.value ?? "");
            setPublished(nextContent?.status === "published");
            setMessage("");
            setError(false);
          }}
          disabled={saving}
        >
          {contentOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
        <Label htmlFor="content-value">Text</Label>
        <Textarea id="content-value" value={value} onChange={(event) => setValue(event.target.value)} maxLength={4000} rows={5} disabled={saving} />
        <p className="text-right text-xs text-brand-muted">{value.length}/4000</p>
        <div className="rounded-xl bg-brand-cloud p-4 text-sm text-brand-secondary ring-1 ring-brand-border" aria-label="Content preview">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">Preview</p>
          <p className="whitespace-pre-wrap break-words">{value || "Preview appears here as you type."}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={saving || !dirty || !value.trim()} onClick={() => void persist(false)}>
          <Save className="size-4" aria-hidden="true" />{savingAction === "draft" ? "Saving…" : "Save Draft"}
        </Button>
        <Button type="button" disabled={saving || !value.trim() || (published && !dirty)} onClick={() => void persist(true)}>
          <Globe2 className="size-4" aria-hidden="true" />
          {savingAction === "publish" ? "Publishing…" : published && !dirty ? "Published" : published ? "Update & Publish" : "Publish Content"}
        </Button>
        {published && !dirty ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700"><CheckCircle2 className="size-4" aria-hidden="true" />Live</span> : null}
      </div>

      {message ? <p role={error ? "alert" : "status"} aria-live="polite" className={`rounded-xl p-3 text-sm ${error ? "bg-red-50 text-red-800" : "bg-brand-cloud text-brand-secondary"}`}>{message}</p> : null}
    </section>
  );
}
