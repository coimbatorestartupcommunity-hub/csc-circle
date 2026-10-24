"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OPPORTUNITY_CATEGORIES, type OpportunityRecord } from "@/types/cms";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);

export function OpportunityEditor({ initial }: { initial?: OpportunityRecord }) {
  const router = useRouter();
  const [v, setV] = React.useState({
    id: initial?.id ?? null as string | null,
    slug: initial?.slug ?? "",
    title: initial?.title ?? "",
    category: initial?.category ?? OPPORTUNITY_CATEGORIES[3],
    summary: initial?.summary ?? "",
    description: initial?.description ?? "",
    organization: initial?.organization ?? "",
    audience: initial?.audience ?? "",
    eligibility: initial?.eligibility ?? "",
    skills: initial?.skills ?? "",
    location: initial?.location ?? "",
    participationMode: initial?.participationMode ?? "",
    startsOn: initial?.startsOn ?? "",
    deadline: initial?.deadline ?? "",
    endsOn: initial?.endsOn ?? "",
    applicationUrl: initial?.applicationUrl ?? "",
    applicationInstructions: initial?.applicationInstructions ?? "",
    contact: initial?.contact ?? "",
    bannerPath: initial?.bannerPath ?? "",
    orgLogoPath: initial?.orgLogoPath ?? "",
    source: initial?.source ?? "",
    organizationVerified: initial?.organizationVerified ?? false,
    publicationConsent: initial?.publicationConsent ?? false,
    seoTitle: initial?.seoTitle ?? "",
    metaDescription: initial?.metaDescription ?? "",
  });
  const [status, setStatus] = React.useState(initial?.status ?? "draft");
  const [busy, setBusy] = React.useState(false);
  const [uploading, setUploading] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ error: boolean; text: string } | null>(null);
  const set = (k: keyof typeof v, val: unknown) => setV((cur) => ({ ...cur, [k]: val }));

  async function upload(kind: "banner" | "logo", file?: File) {
    if (!file) return;
    setUploading(kind); setNotice(null);
    try {
      const body = new FormData(); body.append("file", file); body.append("kind", kind);
      const res = await fetch("/api/admin/cms/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      if (kind === "banner") set("bannerPath", data.path); else set("orgLogoPath", data.path);
    } catch (e) { setNotice({ error: true, text: e instanceof Error ? e.message : "Upload failed." }); }
    finally { setUploading(null); }
  }

  async function save(): Promise<string | null> {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch("/api/admin/opportunities", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(v) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      if (!v.id) set("id", data.id);
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
      const res = await fetch(`/api/admin/opportunities/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed.");
      setStatus(action === "publish" ? "published" : action === "unpublish" ? "draft" : "archived");
      setNotice({ error: false, text: action === "publish" ? (data.wasFirst ? "Opportunity published. The Opportunities page is now displaying published content." : "Opportunity published.") : action === "unpublish" ? "Opportunity unpublished." : "Opportunity archived." });
      router.refresh();
    } catch (e) { setNotice({ error: true, text: e instanceof Error ? e.message : "Action failed." }); }
    finally { setBusy(false); }
  }

  async function preview() {
    const id = await save();
    if (id) router.push(`/admin/opportunities/${id}/preview`);
  }

  return (
    <div className="flex flex-col gap-5">
      {notice ? <p role={notice.error ? "alert" : "status"} className={`rounded-xl p-3 text-sm ${notice.error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>{notice.text}</p> : null}
      <p className="text-sm text-brand-muted">Status: <span className="font-semibold text-brand-ink capitalize">{status}</span></p>

      <section className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="o-title">Title</Label><Input id="o-title" value={v.title} onChange={(e) => { set("title", e.target.value); if (!v.id && !v.slug) set("slug", slugify(e.target.value)); }} maxLength={140} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="o-slug">Slug</Label><Input id="o-slug" value={v.slug} onChange={(e) => set("slug", slugify(e.target.value))} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="o-cat">Category</Label><select id="o-cat" value={v.category} onChange={(e) => set("category", e.target.value)} className="h-11 rounded-lg border border-brand-border bg-white px-3 text-sm">{OPPORTUNITY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="o-org">Organization</Label><Input id="o-org" value={v.organization} onChange={(e) => set("organization", e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="o-mode">Participation mode</Label><select id="o-mode" value={v.participationMode} onChange={(e) => set("participationMode", e.target.value)} className="h-11 rounded-lg border border-brand-border bg-white px-3 text-sm"><option value="">—</option><option value="onsite">On-site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option></select></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="o-loc">Location</Label><Input id="o-loc" value={v.location} onChange={(e) => set("location", e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="o-aud">Audience</Label><Input id="o-aud" value={v.audience} onChange={(e) => set("audience", e.target.value)} /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="o-sum">Summary</Label><Textarea id="o-sum" rows={2} value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={400} /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="o-desc">Full description</Label><Textarea id="o-desc" rows={5} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={8000} /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="o-elig">Eligibility</Label><Textarea id="o-elig" rows={2} value={v.eligibility} onChange={(e) => set("eligibility", e.target.value)} maxLength={1000} /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="o-skills">Skills / requirements</Label><Textarea id="o-skills" rows={2} value={v.skills} onChange={(e) => set("skills", e.target.value)} maxLength={600} /></div>
      </section>

      <section className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:grid-cols-3">
        <div className="flex flex-col gap-1.5"><Label htmlFor="o-start">Starts on</Label><Input id="o-start" type="date" value={v.startsOn} onChange={(e) => set("startsOn", e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="o-dead">Application deadline</Label><Input id="o-dead" type="date" value={v.deadline} onChange={(e) => set("deadline", e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="o-end">Ends on</Label><Input id="o-end" type="date" value={v.endsOn} onChange={(e) => set("endsOn", e.target.value)} /></div>
      </section>

      <section className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="o-url">Application URL</Label><Input id="o-url" value={v.applicationUrl} onChange={(e) => set("applicationUrl", e.target.value)} placeholder="https://" /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="o-instr">Application instructions</Label><Textarea id="o-instr" rows={2} value={v.applicationInstructions} onChange={(e) => set("applicationInstructions", e.target.value)} maxLength={1000} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="o-contact">Authorized contact</Label><Input id="o-contact" value={v.contact} onChange={(e) => set("contact", e.target.value)} /></div>
        <div className="flex flex-col gap-1.5"><Label htmlFor="o-src">Source</Label><Input id="o-src" value={v.source} onChange={(e) => set("source", e.target.value)} /></div>
        <div className="flex flex-col gap-2"><Label>Banner (5:3)</Label>{v.bannerPath ? <p className="text-xs text-green-700">Banner attached.</p> : null}<Button type="button" variant="outline" disabled={uploading === "banner"} onClick={() => document.getElementById("o-banner")?.click()}>{uploading === "banner" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}Upload banner</Button><input id="o-banner" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void upload("banner", e.target.files?.[0])} /></div>
        <div className="flex flex-col gap-2"><Label>Organization logo</Label>{v.orgLogoPath ? <p className="text-xs text-green-700">Logo attached.</p> : null}<Button type="button" variant="outline" disabled={uploading === "logo"} onClick={() => document.getElementById("o-logo")?.click()}>{uploading === "logo" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}Upload logo</Button><input id="o-logo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void upload("logo", e.target.files?.[0])} /></div>
        <label className="flex items-start gap-2 text-sm text-brand-ink sm:col-span-2"><input type="checkbox" className="mt-1" checked={v.organizationVerified} onChange={(e) => set("organizationVerified", e.target.checked)} /><span>I have verified the organization and this opportunity.</span></label>
        <label className="flex items-start gap-2 text-sm text-brand-ink sm:col-span-2"><input type="checkbox" className="mt-1" checked={v.publicationConsent} onChange={(e) => set("publicationConsent", e.target.checked)} /><span>I confirm this opportunity may be published by CSC Circle.</span></label>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} disabled={busy} variant="outline">{busy ? <Loader2 className="size-4 animate-spin" /> : null}{v.id ? "Save changes" : "Save draft"}</Button>
        <Button type="button" onClick={() => void preview()} disabled={busy} variant="outline">Preview</Button>
        {status !== "published" ? <Button type="button" onClick={() => void act("publish")} disabled={busy}>Publish opportunity</Button> : <Button type="button" variant="outline" onClick={() => void act("unpublish")} disabled={busy}>Unpublish</Button>}
        <Button type="button" variant="outline" onClick={() => void act("archive")} disabled={busy}>Archive</Button>
        {v.id && status === "published" ? <a href={`/opportunities/${v.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-ink hover:bg-brand-cloud">View public page</a> : null}
      </div>
    </div>
  );
}
