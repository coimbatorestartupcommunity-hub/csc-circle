"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { notifySubmissionSuccess } from "@/lib/ui/submission-feedback";
import { Button } from "@/components/ui/button";
import { CompleteContentButton } from "@/components/admin/complete-content-button";
import { collaborationSaveSchema, type CollaborationSaveValues } from "@/lib/validations/collaboration";
import type { z } from "zod";

type Values = z.input<typeof collaborationSaveSchema>;
type OrganizationOption = { id: string; name: string; slug: string; logoPath?: string | null; organizationType?: string; description?: string | null; websiteUrl?: string | null };
type EventOption = { id: string; title: string; startsAt: string };

const inputClass = "min-w-0 rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";
const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-brand-ink";

export function CollaborationEditor({
  initial,
  organizations,
  events,
  mode,
}: {
  initial?: Partial<Values>;
  organizations: OrganizationOption[];
  events: EventOption[];
  mode: "live" | "preview";
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [featuredImagePreview, setFeaturedImagePreview] = React.useState(() => {
    const path = initial?.featuredImagePath ?? "";
    return path.startsWith("/") ? path : path.startsWith("collaboration-featured/") ? `/api/admin/collaborations/featured-image?path=${encodeURIComponent(path)}` : "";
  });
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [imageMessage, setImageMessage] = React.useState("");
  const [organizationOptions, setOrganizationOptions] = React.useState(organizations);
  const [addingOrganization, setAddingOrganization] = React.useState(false);
  const [editingOrganizationId, setEditingOrganizationId] = React.useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [logoMessage, setLogoMessage] = React.useState("");
  const [logoPreview, setLogoPreview] = React.useState("");
  const [uploadingGalleryImage, setUploadingGalleryImage] = React.useState(false);
  const [galleryMessage, setGalleryMessage] = React.useState("");
  const [galleryReplaceIndex, setGalleryReplaceIndex] = React.useState<number | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const [newOrganization, setNewOrganization] = React.useState({
    name: "", slug: "", organizationType: "community", description: "",
    logoPath: "", websiteUrl: "", publicationApproved: false,
  });
  const form = useForm<Values>({
    resolver: zodResolver(collaborationSaveSchema),
    defaultValues: {
      id: initial?.id,
      slug: initial?.slug ?? "",
      title: initial?.title ?? "",
      tagline: initial?.tagline ?? "",
      summary: initial?.summary ?? "",
      story: initial?.story ?? "",
      category: initial?.category ?? "Community Collaboration",
      status: initial?.status ?? "completed",
      publicationStatus: initial?.publicationStatus ?? "draft",
      featuredImagePath: initial?.featuredImagePath ?? "",
      partnerIds: initial?.partnerIds ?? [],
      eventId: initial?.eventId ?? "",
      eventDate: initial?.eventDate ?? "",
      venueName: initial?.venueName ?? "",
      venueAddress: initial?.venueAddress ?? "",
      seoTitle: initial?.seoTitle ?? "",
      metaDescription: initial?.metaDescription ?? "",
      highlights: initial?.highlights ?? [],
      media: initial?.media ?? [],
    },
  });

  async function uploadFeaturedImage(file?: File) {
    if (!file || mode !== "live") return;
    setUploadingImage(true);
    setImageMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/collaborations/featured-image", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Could not upload the image.");
      form.setValue("featuredImagePath", result.path, { shouldValidate: true });
      setFeaturedImagePreview(result.previewUrl);
      setImageMessage(`Image saved as ${result.width} × ${result.height} (5:3).`);
    } catch (error) {
      setImageMessage(error instanceof Error ? error.message : "Could not upload the image.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function uploadPartnerLogo(file?: File) {
    if (!file || mode !== "live") return;
    setUploadingLogo(true);
    setLogoMessage("");
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/admin/collaboration-organizations/logo", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Could not upload the partner logo.");
      setNewOrganization((current) => ({ ...current, logoPath: result.path }));
      setLogoPreview(result.previewUrl);
      setLogoMessage("Logo uploaded and ready to save with this organization.");
    } catch (error) {
      setLogoMessage(error instanceof Error ? error.message : "Could not upload the partner logo.");
    } finally { setUploadingLogo(false); }
  }

  async function removePartnerLogo() {
    const path = newOrganization.logoPath;
    if (!path) { setLogoPreview(""); return; }
    if (path.startsWith("collaboration-logos/") && !editingOrganizationId) {
      const response = await fetch("/api/admin/collaboration-organizations/logo", {
        method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ path }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setLogoMessage(result.error ?? "The uploaded logo could not be removed.");
        return;
      }
    }
    setNewOrganization((current) => ({ ...current, logoPath: "" }));
    setLogoPreview("");
    setLogoMessage("Logo removed from this organization.");
  }

  function editOrganization(org: OrganizationOption) {
    const path = org.logoPath ?? "";
    const stored = path.match(/^collaboration-logos\/([0-9a-f-]{36})\.webp$/i);
    setEditingOrganizationId(org.id);
    setNewOrganization({
      name: org.name, slug: org.slug, organizationType: org.organizationType ?? "other",
      description: org.description ?? "", logoPath: path, websiteUrl: org.websiteUrl ?? "", publicationApproved: true,
    });
    setLogoPreview(stored ? `/api/collaborations/logo/${stored[1]}` : path);
    setLogoMessage("");
  }

  function resetOrganizationEditor() {
    setEditingOrganizationId(null);
    setNewOrganization({ name: "", slug: "", organizationType: "community", description: "", logoPath: "", websiteUrl: "", publicationApproved: false });
    setLogoPreview("");
    setLogoMessage("");
  }

  async function saveOrganization() {
    if (mode !== "live") return;
    setAddingOrganization(true);
    const previous = editingOrganizationId ? organizationOptions.find((item) => item.id === editingOrganizationId)?.logoPath : null;
    try {
      const response = await fetch("/api/admin/collaboration-organizations", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...newOrganization, ...(editingOrganizationId ? { id: editingOrganizationId } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save organization.");
      const option: OrganizationOption = {
        id: result.id, name: result.name, slug: result.slug, logoPath: result.logoPath || null,
        organizationType: result.organizationType, description: result.description, websiteUrl: result.websiteUrl,
      };
      setOrganizationOptions((current) => current.some((item) => item.id === option.id)
        ? current.map((item) => item.id === option.id ? option : item).sort((a, b) => a.name.localeCompare(b.name))
        : [...current, option].sort((a, b) => a.name.localeCompare(b.name)));
      if (!editingOrganizationId) form.setValue("partnerIds", [...(form.getValues("partnerIds") ?? []), option.id], { shouldValidate: true });
      if (previous && previous !== option.logoPath && previous.startsWith("collaboration-logos/")) {
        await fetch("/api/admin/collaboration-organizations/logo", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: previous }) });
      }
      resetOrganizationEditor();
      notifySubmissionSuccess({ title: editingOrganizationId ? "Partner organization updated" : "Partner organization added", message: "The organization details were saved." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save organization.");
    } finally { setAddingOrganization(false); }
  }

  async function uploadGalleryImage(file?: File, replaceIndex?: number) {
    if (!file || mode !== "live") return;
    setUploadingGalleryImage(true); setGalleryMessage("");
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/admin/collaborations/featured-image", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Could not upload gallery image.");
      const media = form.getValues("media") ?? [];
      if (media.length >= 20) throw new Error("A collaboration can have at most 20 gallery images.");
      if (replaceIndex === undefined) {
        form.setValue("media", [...media, { media_path: result.path, alt_text: "", caption: "", display_order: media.length }], { shouldValidate: true });
      } else {
        updateGalleryItem(replaceIndex, { media_path: result.path });
      }
      setGalleryMessage(`Image normalized to ${result.width} × ${result.height} (5:3).`);
    } catch (error) {
      setGalleryMessage(error instanceof Error ? error.message : "Could not upload gallery image.");
    } finally { setUploadingGalleryImage(false); }
  }

  function updateGalleryItem(index: number, patch: Partial<CollaborationSaveValues["media"][number]>) {
    const media = [...(form.getValues("media") ?? [])];
    media[index] = { ...media[index], ...patch };
    form.setValue("media", media.map((item, order) => ({ ...item, display_order: order })), { shouldValidate: true });
  }

  function moveGalleryItem(index: number, direction: -1 | 1) {
    const media = [...(form.getValues("media") ?? [])];
    const next = index + direction;
    if (next < 0 || next >= media.length) return;
    [media[index], media[next]] = [media[next], media[index]];
    form.setValue("media", media.map((item, order) => ({ ...item, display_order: order })), { shouldValidate: true });
  }

  async function onSubmit(values: Values) {
    if (mode !== "live") {
      toast.error("DEMO preview cannot save records.");
      return;
    }
    setSaving(true);
    try {
      const checked = collaborationSaveSchema.parse(values) as CollaborationSaveValues;
      const response = await fetch("/api/admin/collaborations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(checked),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save collaboration.");
      const retainedPaths = new Set([checked.featuredImagePath, ...checked.media.map((item) => item.media_path)]);
      const priorPaths = [initial?.featuredImagePath ?? "", ...(initial?.media ?? []).map((item) => item.media_path)];
      for (const path of priorPaths) {
        if (path.startsWith("collaboration-featured/") && !retainedPaths.has(path)) {
          await fetch("/api/admin/collaborations/featured-image", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ path }) });
        }
      }
      notifySubmissionSuccess({ title: checked.publicationStatus === "published" ? "Collaboration published" : "Collaboration saved", message: checked.publicationStatus === "published" ? "The collaboration is now live on the CSC website." : "The collaboration draft was saved." });
      router.push(`/admin/collaborations/${result.id}/edit`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save collaboration.");
    } finally {
      setSaving(false);
    }
  }

  const highlightsText = (form.getValues("highlights") ?? [])
    .map((item) => `${item.icon}|${item.title}|${item.body}`).join("\n");
  const galleryItems = useWatch({ control: form.control, name: "media" }) ?? [];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {mode === "preview" ? <p className="rounded-xl bg-brand-gold px-4 py-3 text-sm text-brand-ink">DEMO preview — saving is disabled.</p> : null}
      <section className="grid gap-4 rounded-2xl border border-brand-border bg-white p-4 sm:grid-cols-2 sm:p-6">
        <h2 className="text-base font-semibold text-brand-ink sm:col-span-2">Story</h2>
        <label className={labelClass}>Title<input className={inputClass} {...form.register("title")} />{form.formState.errors.title ? <span className="text-xs text-red-700">{form.formState.errors.title.message}</span> : null}</label>
        <label className={labelClass}>URL slug<input className={inputClass} placeholder="csc-outlier" {...form.register("slug")} />{form.formState.errors.slug ? <span className="text-xs text-red-700">Use lowercase letters, numbers and hyphens.</span> : null}</label>
        <label className={labelClass}>Tagline<input className={inputClass} {...form.register("tagline")} /></label>
        <label className={labelClass}>Category<input className={inputClass} {...form.register("category")} /></label>
        <label className={`${labelClass} sm:col-span-2`}>Short summary<textarea rows={2} className={inputClass} {...form.register("summary")} /></label>
        <label className={`${labelClass} sm:col-span-2`}>Story<textarea rows={6} className={inputClass} {...form.register("story")} /></label>
      </section>

      <section className="grid gap-4 rounded-2xl border border-brand-border bg-white p-4 sm:grid-cols-2 sm:p-6">
        <h2 className="text-base font-semibold text-brand-ink sm:col-span-2">Partners and related event</h2>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium text-brand-ink">Participating organizations (choose at least two)</legend>
          {organizationOptions.length ? <div className="grid gap-2 sm:grid-cols-2">{organizationOptions.map((org) => {
            const logo = org.logoPath?.match(/^collaboration-logos\/([0-9a-f-]{36})\.webp$/i);
            const logoSrc = logo ? `/api/collaborations/logo/${logo[1]}` : org.logoPath;
            return <div key={org.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-brand-border p-3 text-sm">
              <input type="checkbox" value={org.id} aria-label={`Select ${org.name}`} {...form.register("partnerIds")} />
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-cloud p-1 ring-1 ring-brand-border">
                {logoSrc ? <Image src={logoSrc} alt="" width={40} height={40} unoptimized className="size-full object-contain" /> : <span aria-hidden="true" className="text-xs font-bold text-brand-muted">CSC</span>}
              </span>
              <span className="min-w-0 flex-1 truncate">{org.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => editOrganization(org)}>Edit</Button>
            </div>;
          })}</div> : <p className="text-sm text-brand-muted">No organization records are available.</p>}
          {form.formState.errors.partnerIds ? <p className="mt-1 text-xs text-red-700">Choose two or more partners.</p> : null}
        </fieldset>
        <fieldset className="grid gap-3 rounded-xl bg-brand-cloud p-4 sm:col-span-2 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold text-brand-ink">{editingOrganizationId ? "Edit partner organization" : "Add a partner organization"}</legend>
          <label className={labelClass}>Organization name<input className={inputClass} value={newOrganization.name} onChange={(e) => setNewOrganization({ ...newOrganization, name: e.target.value })} /></label>
          <label className={labelClass}>Unique slug<input className={inputClass} placeholder="partner-name" value={newOrganization.slug} onChange={(e) => setNewOrganization({ ...newOrganization, slug: e.target.value })} /></label>
          <label className={labelClass}>Organization type<select className={inputClass} value={newOrganization.organizationType} onChange={(e) => setNewOrganization({ ...newOrganization, organizationType: e.target.value })}><option value="community">Community</option><option value="startup">Startup</option><option value="company">Company</option><option value="college">College</option><option value="incubator">Incubator</option><option value="accelerator">Accelerator</option><option value="other">Other</option></select></label>
          <div className={`${labelClass} sm:col-span-2`}>
            <span>Partner organization logo <span className="font-normal text-brand-muted">(optional)</span></span>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-border bg-white p-3">
              <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-cloud p-2 ring-1 ring-brand-border">
                {logoPreview ? <Image src={logoPreview} alt="Partner logo preview" width={80} height={80} unoptimized className="size-full object-contain" /> : <ImagePlus className="size-6 text-brand-muted" aria-hidden="true" />}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={uploadingLogo || mode !== "live"} onClick={() => logoInputRef.current?.click()}>{uploadingLogo ? <Loader2 className="size-4 animate-spin" /> : null}{logoPreview ? "Replace logo" : "Upload logo"}</Button>
                {logoPreview ? <Button type="button" variant="ghost" disabled={uploadingLogo || addingOrganization} onClick={() => void removePartnerLogo()}>Remove logo</Button> : null}
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingLogo || mode !== "live"} onChange={(event) => { void uploadPartnerLogo(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
              </div>
              <p className="basis-full text-xs leading-5 text-brand-muted">JPEG, PNG or WebP up to 5 MB. Rectangular artwork is preserved inside a clean circular preview without stretching or cropping.</p>
              {logoMessage ? <p role="status" aria-live="polite" className="basis-full text-xs text-brand-secondary">{logoMessage}</p> : null}
            </div>
          </div>
          <label className={`${labelClass} sm:col-span-2`}>Description<textarea rows={2} className={inputClass} value={newOrganization.description} onChange={(e) => setNewOrganization({ ...newOrganization, description: e.target.value })} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Verified official website (optional)<input className={inputClass} placeholder="https://example.org" value={newOrganization.websiteUrl} onChange={(e) => setNewOrganization({ ...newOrganization, websiteUrl: e.target.value })} /></label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-brand-secondary sm:col-span-2"><input type="checkbox" checked={newOrganization.publicationApproved} onChange={(e) => setNewOrganization({ ...newOrganization, publicationApproved: e.target.checked })} /><span>I confirm this organization name and supplied logo/website are approved for public display.</span></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="button" variant="outline" disabled={addingOrganization || uploadingLogo || mode !== "live" || !newOrganization.publicationApproved} onClick={() => void saveOrganization()}>{addingOrganization ? <Loader2 className="size-4 animate-spin" /> : null}{editingOrganizationId ? "Save organization changes" : "Add approved organization"}</Button>{editingOrganizationId ? <Button type="button" variant="ghost" disabled={addingOrganization} onClick={resetOrganizationEditor}>Cancel edit</Button> : null}</div>
        </fieldset>
        <label className={`${labelClass} sm:col-span-2`}>Existing event<select className={inputClass} {...form.register("eventId")}><option value="">No linked event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title} · {new Date(event.startsAt).toLocaleDateString("en-IN")}</option>)}</select></label>
        <label className={labelClass}>Verified event date<input type="datetime-local" className={inputClass} {...form.register("eventDate")} /></label>
        <label className={labelClass}>Venue name<input className={inputClass} {...form.register("venueName")} /></label>
        <label className={`${labelClass} sm:col-span-2`}>Venue address<input className={inputClass} {...form.register("venueAddress")} /></label>
      </section>

      <section className="grid gap-4 rounded-2xl border border-brand-border bg-white p-4 sm:grid-cols-2 sm:p-6">
        <h2 className="text-base font-semibold text-brand-ink sm:col-span-2">Images and highlights</h2>
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[minmax(10rem,14rem)_1fr] sm:items-center">
          <div className="relative aspect-[5/3] w-full max-w-72 overflow-hidden rounded-2xl border border-brand-border bg-brand-cloud">
            {featuredImagePreview ? <Image src={featuredImagePreview} alt="5:3 collaboration image preview" fill unoptimized sizes="288px" className="object-cover" /> : <div className="flex size-full flex-col items-center justify-center gap-2 text-sm text-brand-muted"><ImagePlus className="size-7" aria-hidden="true" />No image selected</div>}
          </div>
          <div className="grid content-center justify-items-start gap-2">
            <p className="text-sm font-semibold text-brand-ink">Featured collaboration image (5:3)</p>
            <p className="max-w-xl text-sm leading-6 text-brand-secondary">Upload a clear JPEG, PNG or WebP image up to 5 MB. CSC safely normalizes it to 1600 × 1200 for collaboration cards and pages. A featured image is required before publishing.</p>
            <label className={`inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-brand-cloud ${uploadingImage || mode !== "live" ? "pointer-events-none opacity-60" : ""}`}>
              {uploadingImage ? "Uploading image…" : featuredImagePreview ? "Replace featured image" : "Upload 5:3 image"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingImage || mode !== "live"} onChange={(event) => { void uploadFeaturedImage(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            {featuredImagePreview && <Button type="button" variant="ghost" disabled={saving || uploadingImage} onClick={() => { form.setValue("featuredImagePath", "", { shouldValidate: true }); setFeaturedImagePreview(""); }}>Remove image</Button>}
            {imageMessage && <p role="status" aria-live="polite" className="text-xs text-brand-secondary">{imageMessage}</p>}
          </div>
        </div>
        <div className="grid gap-3 sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-brand-ink">5:3 collaboration gallery</h3><Button type="button" variant="outline" disabled={uploadingGalleryImage || mode !== "live" || galleryItems.length >= 20} onClick={() => { setGalleryReplaceIndex(null); galleryInputRef.current?.click(); }}>{uploadingGalleryImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}Add gallery image</Button><input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploadingGalleryImage || mode !== "live"} onChange={(event) => { const replaceIndex = galleryReplaceIndex; setGalleryReplaceIndex(null); void uploadGalleryImage(event.currentTarget.files?.[0], replaceIndex ?? undefined); event.currentTarget.value = ""; }} /></div>
          {galleryMessage ? <p role="status" aria-live="polite" className="text-xs text-brand-secondary">{galleryMessage}</p> : null}
          {galleryItems.length ? <div className="grid gap-3 sm:grid-cols-2">{galleryItems.map((item, index) => {
            const stored = item.media_path.match(/^collaboration-featured\/([0-9a-f-]{36})\.webp$/i);
            const src = stored ? `/api/admin/collaborations/featured-image?path=${encodeURIComponent(item.media_path)}` : item.media_path;
            return <article key={`${item.media_path}-${index}`} className="grid gap-3 rounded-xl border border-brand-border p-3">
              <div className="relative aspect-[5/3] overflow-hidden rounded-lg bg-brand-cloud">{src ? <Image src={src} alt={item.alt_text || "Collaboration gallery preview"} fill unoptimized sizes="(max-width: 640px) 100vw, 400px" className="object-cover" /> : null}</div>
              <label className={labelClass}>Alt text<input className={inputClass} value={item.alt_text} onChange={(event) => updateGalleryItem(index, { alt_text: event.target.value })} placeholder="Describe what is visible" /></label>
              <label className={labelClass}>Caption (optional)<input className={inputClass} value={item.caption} onChange={(event) => updateGalleryItem(index, { caption: event.target.value })} /></label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={uploadingGalleryImage} onClick={() => { setGalleryReplaceIndex(index); galleryInputRef.current?.click(); }}>Replace</Button>
                <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => moveGalleryItem(index, -1)}>Move up</Button>
                <Button type="button" variant="ghost" size="sm" disabled={index === galleryItems.length - 1} onClick={() => moveGalleryItem(index, 1)}>Move down</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue("media", galleryItems.filter((_, itemIndex) => itemIndex !== index).map((mediaItem, order) => ({ ...mediaItem, display_order: order })), { shouldValidate: true })}>Remove</Button>
              </div>
            </article>;
          })}</div> : <p className="text-sm text-brand-muted">No gallery images yet.</p>}
        </div>
        <label className={`${labelClass} sm:col-span-2`}>Highlights (one per line: icon | title | description)<textarea key="highlights" defaultValue={highlightsText} rows={4} className={inputClass} onChange={(event) => {
          const items = event.target.value.split("\n").filter(Boolean).map((line) => {
            const [icon = "Sparkles", title = "", body = ""] = line.split("|").map((part) => part.trim());
            return { icon, title, body };
          });
          form.setValue("highlights", items, { shouldValidate: true });
        }} /></label>
      </section>

      <section className="grid gap-4 rounded-2xl border border-brand-border bg-white p-4 sm:grid-cols-2 sm:p-6">
        <h2 className="text-base font-semibold text-brand-ink sm:col-span-2">Publishing and search preview</h2>
        <label className={labelClass}>Activity state<select className={inputClass} {...form.register("status")}><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
        <label className={labelClass}>Publication state<select className={inputClass} {...form.register("publicationStatus")}><option value="draft">Draft</option><option value="pending">Review</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label className={labelClass}>SEO title<input className={inputClass} {...form.register("seoTitle")} /></label>
        <label className={labelClass}>Meta description<input className={inputClass} {...form.register("metaDescription")} /></label>
      </section>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {initial?.id ? (
          <CompleteContentButton
            kind="collaboration"
            id={initial.id}
            isCompleted={form.watch("status") === "completed"}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={saving || mode !== "live"}
            onClick={() => {
              form.setValue("status", "completed");
              form.setValue("publicationStatus", "published");
              void form.handleSubmit(onSubmit)();
            }}
            className="gap-2 border-emerald-600 text-emerald-800 hover:bg-emerald-50"
          >
            <CheckCircle2 className="size-4" />
            Completed
          </Button>
        )}
        <Button type="submit" disabled={saving || mode !== "live"} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save collaboration
        </Button>
      </div>
    </form>
  );
}
