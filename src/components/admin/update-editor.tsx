"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CommunityUpdateRecord, UpdateGalleryImage } from "@/types/cms";
import { UPDATE_CATEGORIES } from "@/types/cms";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);

export function UpdateEditor({ initial }: { initial?: CommunityUpdateRecord }) {
  const router = useRouter();
  const [value, setValue] = React.useState({
    id: initial?.id ?? null as string | null, slug: initial?.slug ?? "", title: initial?.title ?? "",
    category: initial?.category ?? UPDATE_CATEGORIES[0], summary: initial?.summary ?? "", body: initial?.body ?? "",
    featured: initial?.featured ?? false, coverImagePath: initial?.coverImagePath ?? "", coverImageAlt: initial?.coverImageAlt ?? "",
    gallery: initial?.gallery ?? [] as UpdateGalleryImage[], author: initial?.author ?? "", source: initial?.source ?? "",
    publicationConsent: initial?.publicationConsent ?? false, relatedEventId: initial?.relatedEventId ?? "",
    relatedCollaborationId: initial?.relatedCollaborationId ?? "", seoTitle: initial?.seoTitle ?? "", metaDescription: initial?.metaDescription ?? "",
  });
  const [status, setStatus] = React.useState(initial?.status ?? "draft");
  const [busy, setBusy] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [notice, setNotice] = React.useState<{ error: boolean; text: string } | null>(null);
  const set = (key: keyof typeof value, next: unknown) => setValue((current) => ({ ...current, [key]: next }));

  async function upload(file?: File, gallery = false) {
    if (!file) return;
    setUploading(true); setNotice(null);
    try {
      const form = new FormData(); form.append("file", file); form.append("kind", "updateImage");
      const response = await fetch("/api/admin/cms/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Image upload failed.");
      if (gallery) set("gallery", [...value.gallery, { path: result.path as string, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") }]);
      else set("coverImagePath", result.path);
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "Image upload failed." });
    } finally { setUploading(false); }
  }

  async function save(): Promise<string | null> {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/admin/updates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The update could not be saved.");
      if (!value.id) set("id", result.id);
      setNotice({ error: false, text: status === "published" ? "Changes saved; this published update remains visible." : "Draft saved." });
      router.refresh();
      return result.id as string;
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "The update could not be saved." });
      return null;
    } finally { setBusy(false); }
  }

  async function act(action: "publish" | "unpublish" | "archive") {
    const id = action === "publish" ? await save() : value.id ?? await save();
    if (!id) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(`/api/admin/updates/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The update status could not be changed.");
      setStatus(action === "publish" ? "published" : action === "unpublish" ? "draft" : "archived");
      const message = action === "publish" ? result.wasFirst ? "Update published. The Updates page is now displaying published content." : "Update published." : action === "unpublish" ? "Update unpublished." : "Update archived.";
      setNotice({ error: false, text: message }); router.refresh();
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "The update status could not be changed." });
    } finally { setBusy(false); }
  }

  async function preview() {
    const id = await save();
    if (id) router.push(`/admin/updates/${id}/preview`);
  }

  return <div className="flex flex-col gap-5">
    {notice ? <p role={notice.error ? "alert" : "status"} aria-live="polite" className={`rounded-xl p-3 text-sm ${notice.error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>{notice.text}</p> : null}
    <p className="text-sm text-brand-muted">Status: <span className="font-semibold capitalize text-brand-ink">{status}</span></p>
    <section className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="update-title">Title</Label><Input id="update-title" maxLength={160} value={value.title} onChange={(e) => { set("title", e.target.value); if (!value.id && !value.slug) set("slug", slugify(e.target.value)); }} /></div>
      <div className="flex flex-col gap-1.5"><Label htmlFor="update-slug">URL slug</Label><Input id="update-slug" maxLength={90} value={value.slug} onChange={(e) => set("slug", slugify(e.target.value))} /></div>
      <div className="flex flex-col gap-1.5"><Label htmlFor="update-category">Category</Label><select id="update-category" value={value.category} onChange={(e) => set("category", e.target.value)} className="h-11 rounded-lg border border-brand-border bg-white px-3 text-sm">{UPDATE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
      <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="update-summary">Short summary</Label><Textarea id="update-summary" rows={2} maxLength={500} value={value.summary} onChange={(e) => set("summary", e.target.value)} /></div>
      <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="update-body">Article</Label><Textarea id="update-body" rows={12} maxLength={20000} value={value.body} onChange={(e) => set("body", e.target.value)} /><p className="text-xs text-brand-muted">Plain text with paragraph breaks. Script and raw HTML are not accepted.</p></div>
      <label className="flex items-start gap-2 text-sm text-brand-ink sm:col-span-2"><input type="checkbox" className="mt-1 size-4" checked={value.featured} onChange={(e) => set("featured", e.target.checked)} /><span>Feature this update at the top of the public Updates page.</span></label>
    </section>
    <section className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:grid-cols-2">
      <div className="flex flex-col gap-2 sm:col-span-2"><Label>Cover image</Label>{value.coverImagePath ? <div className="relative aspect-[5/3] max-w-xl overflow-hidden rounded-xl bg-brand-cloud"><Image src={`/api/admin/cms/media?path=${encodeURIComponent(value.coverImagePath)}`} alt="Cover preview" fill unoptimized sizes="(max-width: 768px) 100vw, 600px" className="object-cover" /></div> : <p className="text-sm text-brand-muted">Optional. Use an approved community photograph or graphic.</p>}<Button type="button" variant="outline" disabled={busy || uploading} onClick={() => document.getElementById("update-cover")?.click()}>{uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{value.coverImagePath ? "Replace cover" : "Upload cover"}</Button><input id="update-cover" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void upload(e.target.files?.[0])} />{value.coverImagePath ? <div className="flex flex-col gap-1.5"><Label htmlFor="update-cover-alt">Cover alt text</Label><Input id="update-cover-alt" maxLength={250} value={value.coverImageAlt} onChange={(e) => set("coverImageAlt", e.target.value)} /></div> : null}</div>
      <div className="flex flex-col gap-2 sm:col-span-2"><Label>Additional photographs</Label>{value.gallery.map((image, index) => <div key={image.path} className="grid gap-3 rounded-xl border border-brand-border p-3 sm:grid-cols-[8rem_1fr_auto]"><div className="relative aspect-[5/3] overflow-hidden rounded-lg bg-brand-cloud"><Image src={`/api/admin/cms/media?path=${encodeURIComponent(image.path)}`} alt={image.alt} fill unoptimized sizes="128px" className="object-cover" /></div><div className="flex flex-col gap-2"><Label htmlFor={`gallery-alt-${index}`}>Alt text</Label><Input id={`gallery-alt-${index}`} value={image.alt} onChange={(e) => set("gallery", value.gallery.map((item, i) => i === index ? { ...item, alt: e.target.value } : item))} /><Label htmlFor={`gallery-caption-${index}`}>Caption</Label><Input id={`gallery-caption-${index}`} value={image.caption ?? ""} onChange={(e) => set("gallery", value.gallery.map((item, i) => i === index ? { ...item, caption: e.target.value } : item))} /><Label htmlFor={`gallery-credit-${index}`}>Attribution / photo credit</Label><Input id={`gallery-credit-${index}`} value={image.attribution ?? ""} onChange={(e) => set("gallery", value.gallery.map((item, i) => i === index ? { ...item, attribution: e.target.value } : item))} /></div><Button type="button" variant="outline" aria-label={`Remove photograph ${index + 1}`} onClick={() => set("gallery", value.gallery.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button></div>)}<Button type="button" variant="outline" disabled={busy || uploading || value.gallery.length >= 20} onClick={() => document.getElementById("update-gallery")?.click()}>{uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}Add photograph</Button><input id="update-gallery" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void upload(e.target.files?.[0], true)} /></div>
      <div className="flex flex-col gap-1.5"><Label htmlFor="update-author">Author / organization</Label><Input id="update-author" maxLength={140} value={value.author} onChange={(e) => set("author", e.target.value)} /></div>
      <div className="flex flex-col gap-1.5"><Label htmlFor="update-source">Source / attribution</Label><Input id="update-source" maxLength={500} value={value.source} onChange={(e) => set("source", e.target.value)} /></div>
      <div className="flex flex-col gap-1.5"><Label htmlFor="update-event">Related event ID (optional)</Label><Input id="update-event" placeholder="Event UUID" value={value.relatedEventId} onChange={(e) => set("relatedEventId", e.target.value)} /></div>
      <div className="flex flex-col gap-1.5"><Label htmlFor="update-collaboration">Related collaboration ID (optional)</Label><Input id="update-collaboration" placeholder="Collaboration UUID" value={value.relatedCollaborationId} onChange={(e) => set("relatedCollaborationId", e.target.value)} /></div>
      <label className="flex items-start gap-2 text-sm text-brand-ink sm:col-span-2"><input type="checkbox" className="mt-1 size-4" checked={value.publicationConsent} onChange={(e) => set("publicationConsent", e.target.checked)} /><span>I confirm CSC Circle has permission to publish this content and the attached media.</span></label>
    </section>
    <section className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:grid-cols-2"><div className="flex flex-col gap-1.5"><Label htmlFor="update-seo-title">SEO title</Label><Input id="update-seo-title" maxLength={160} value={value.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></div><div className="flex flex-col gap-1.5"><Label htmlFor="update-meta">Meta description</Label><Input id="update-meta" maxLength={300} value={value.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} /></div></section>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy || uploading} onClick={() => void save()}>{busy ? <Loader2 className="size-4 animate-spin" /> : null}{value.id ? "Save changes" : "Save draft"}</Button><Button type="button" variant="outline" disabled={busy || uploading} onClick={() => void preview()}>Preview</Button>{status === "published" ? <Button type="button" variant="outline" disabled={busy || uploading} onClick={() => void act("unpublish")}>Unpublish</Button> : <Button type="button" disabled={busy || uploading} onClick={() => void act("publish")}>Publish update</Button>}<Button type="button" variant="outline" disabled={busy || uploading} onClick={() => void act("archive")}>Archive</Button>{value.id && status === "published" ? <a href={`/updates/${value.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-ink">View public update</a> : null}</div>
  </div>;
}
