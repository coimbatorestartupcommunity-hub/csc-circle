"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RESOURCE_TYPES, RESOURCE_CATEGORIES, type ResourceRecord } from "@/types/cms";
import { createClient } from "@/lib/supabase/client";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);

export function ResourceEditor({ initial }: { initial?: ResourceRecord }) {
  const router = useRouter();
  const [v, setV] = React.useState({
    id: initial?.id ?? null as string | null,
    slug: initial?.slug ?? "",
    title: initial?.title ?? "",
    category: initial?.category ?? RESOURCE_CATEGORIES[5],
    resourceType: initial?.resourceType ?? "document",
    summary: initial?.summary ?? "",
    description: initial?.description ?? "",
    audience: initial?.audience ?? "",
    tags: (initial?.tags ?? []).join(", "),
    coverImagePath: initial?.coverImagePath ?? "",
    documentPath: initial?.documentPath ?? "",
    documentFilename: initial?.documentFilename ?? "",
    documentMime: initial?.documentMime ?? "",
    documentSize: initial?.documentSize ?? null as number | null,
    externalUrl: initial?.externalUrl ?? "",
    sourceOrganization: initial?.sourceOrganization ?? "",
    sourceUrl: initial?.sourceUrl ?? "",
    author: initial?.author ?? "",
    license: initial?.license ?? "",
    attribution: initial?.attribution ?? "",
    publicationConsent: initial?.publicationConsent ?? false,
    seoTitle: initial?.seoTitle ?? "",
    metaDescription: initial?.metaDescription ?? "",
  });
  const [status, setStatus] = React.useState(initial?.status ?? "draft");
  const [busy, setBusy] = React.useState(false);
  const [uploading, setUploading] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ error: boolean; text: string } | null>(null);
  const set = (k: keyof typeof v, val: unknown) => setV((cur) => ({ ...cur, [k]: val }));

  async function upload(kind: "cover" | "document", file?: File) {
    if (!file) return;
    setUploading(kind); setNotice(null);
    try {
      if (kind === "document") {
        if (file.type !== "application/pdf" || file.size < 8 || file.size > 8 * 1024 * 1024) throw new Error("Choose a PDF document under 8 MB.");
        const ticketResponse = await fetch("/api/admin/cms/upload-ticket", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, contentType: file.type, size: file.size, filename: file.name }) });
        const ticket = await ticketResponse.json();
        if (!ticketResponse.ok) throw new Error(ticket.error ?? "Secure upload could not be prepared.");
        const { error } = await createClient().storage.from("member-portraits").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: "application/pdf", upsert: false, cacheControl: "0" });
        if (error) throw new Error("The document could not be stored securely.");
        set("documentPath", ticket.path); set("documentFilename", ticket.filename); set("documentMime", ticket.mime); set("documentSize", ticket.size);
        return;
      }
      const body = new FormData(); body.append("file", file); body.append("kind", kind);
      const res = await fetch("/api/admin/cms/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      if (kind === "cover") set("coverImagePath", data.path);
      else { set("documentPath", data.path); set("documentFilename", data.filename); set("documentMime", data.mime); set("documentSize", data.size); }
    } catch (e) { setNotice({ error: true, text: e instanceof Error ? e.message : "Upload failed." }); }
    finally { setUploading(null); }
  }

  async function save(): Promise<string | null> {
    setBusy(true); setNotice(null);
    try {
      const payload = {
        ...v,
        tags: v.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const res = await fetch("/api/admin/resources", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      if (!v.id) { set("id", data.id); }
      setNotice({ error: false, text: "Saved." });
      return data.id as string;
    } catch (e) { setNotice({ error: true, text: e instanceof Error ? e.message : "Could not save." }); return null; }
    finally { setBusy(false); }
  }

  async function act(action: "publish" | "unpublish" | "archive") {
    // Publishing must persist the latest form values first. For unpublish and
    // archive, retain the saved record even if an unrelated edit is invalid.
    const id = action === "publish" ? await save() : (v.id ?? (await save()));
    if (!id) return;
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`/api/admin/resources/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed.");
      setStatus(action === "publish" ? "published" : action === "unpublish" ? "draft" : "archived");
      setNotice({ error: false, text: action === "publish" ? (data.wasFirst ? "Resource published. The Resources page is now displaying published content." : "Resource published.") : action === "unpublish" ? "Resource unpublished." : "Resource archived." });
      router.refresh();
    } catch (e) { setNotice({ error: true, text: e instanceof Error ? e.message : "Action failed." }); }
    finally { setBusy(false); }
  }

  async function preview() {
    const id = await save();
    if (id) router.push(`/admin/resources/${id}/preview`);
  }

  return (
    <div className="flex flex-col gap-5">
      {notice ? <p role={notice.error ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${notice.error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>{notice.text}</p> : null}
      <p className="text-sm text-brand-muted">Status: <span className="font-semibold text-brand-ink capitalize">{status}</span></p>

      <section className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="r-title">Title</Label><Input id="r-title" value={v.title} onChange={(e) => { set("title", e.target.value); if (!v.id && !v.slug) set("slug", slugify(e.target.value)); }} maxLength={140} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="r-slug">Slug</Label><Input id="r-slug" value={v.slug} onChange={(e) => set("slug", slugify(e.target.value))} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="r-cat">Category</Label><select id="r-cat" value={v.category} onChange={(e) => set("category", e.target.value)} className="h-11 rounded-lg border border-brand-border bg-white px-3 text-sm">{RESOURCE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="r-type">Resource type</Label><select id="r-type" value={v.resourceType} onChange={(e) => set("resourceType", e.target.value)} className="h-11 rounded-lg border border-brand-border bg-white px-3 text-sm capitalize">{RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="r-aud">Intended audience</Label><Input id="r-aud" value={v.audience} onChange={(e) => set("audience", e.target.value)} maxLength={200} /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="r-sum">Short summary</Label><Textarea id="r-sum" rows={2} value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={400} /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="r-desc">Detailed description</Label><Textarea id="r-desc" rows={6} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={8000} /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="r-tags">Tags (comma-separated)</Label><Input id="r-tags" value={v.tags} onChange={(e) => set("tags", e.target.value)} /></div>
      </section>

      <section className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:grid-cols-2">
        <div className="flex flex-col gap-2"><Label>Cover image (5:3)</Label>{v.coverImagePath ? <p className="text-xs text-green-700">Image attached.</p> : null}<Button type="button" variant="outline" disabled={uploading === "cover"} onClick={() => document.getElementById("r-cover")?.click()}>{uploading === "cover" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{v.coverImagePath ? "Replace image" : "Upload image"}</Button><input id="r-cover" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void upload("cover", e.target.files?.[0])} /></div>
        <div className="flex flex-col gap-2"><Label>Document (PDF)</Label><p className="text-xs text-brand-muted">PDF files up to 8 MB stay private until publication.</p>{v.documentPath ? <p className="text-xs text-green-700">{v.documentFilename || "Document attached."}</p> : null}<Button type="button" variant="outline" disabled={uploading === "document"} onClick={() => document.getElementById("r-doc")?.click()}>{uploading === "document" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{v.documentPath ? "Replace PDF" : "Upload PDF"}</Button><input id="r-doc" type="file" accept="application/pdf" className="sr-only" onChange={(e) => void upload("document", e.target.files?.[0])} /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="r-ext">External resource URL (for link-type resources)</Label><Input id="r-ext" value={v.externalUrl} onChange={(e) => set("externalUrl", e.target.value)} placeholder="https://" /></div>
      </section>

      <section className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:grid-cols-2">
        <div className="flex flex-col gap-1.5"><Label htmlFor="r-org">Source organization</Label><Input id="r-org" value={v.sourceOrganization} onChange={(e) => set("sourceOrganization", e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="r-author">Author / publisher</Label><Input id="r-author" value={v.author} onChange={(e) => set("author", e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="r-surl">Source URL</Label><Input id="r-surl" value={v.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://" /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="r-lic">License / usage rights</Label><Input id="r-lic" value={v.license} onChange={(e) => set("license", e.target.value)} /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="r-attr">Attribution / acknowledgment</Label><Input id="r-attr" value={v.attribution} onChange={(e) => set("attribution", e.target.value)} /></div>
        <label className="flex items-start gap-2 text-sm text-brand-ink sm:col-span-2"><input type="checkbox" className="mt-1" checked={v.publicationConsent} onChange={(e) => set("publicationConsent", e.target.checked)} /><span>I confirm this resource may be published and shared by CSC Circle.</span></label>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} disabled={busy} variant="outline">{busy ? <Loader2 className="size-4 animate-spin" /> : null}{v.id ? "Save changes" : "Save draft"}</Button>
        <Button type="button" onClick={() => void preview()} disabled={busy} variant="outline">Preview</Button>
        {status !== "published" ? <Button type="button" onClick={() => void act("publish")} disabled={busy}>Publish resource</Button> : <Button type="button" variant="outline" onClick={() => void act("unpublish")} disabled={busy}>Unpublish</Button>}
        <Button type="button" variant="outline" onClick={() => void act("archive")} disabled={busy}>Archive</Button>
        {v.id && status === "published" ? <a href={`/resources/${v.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-ink hover:bg-brand-cloud">View public page</a> : null}
      </div>
    </div>
  );
}
