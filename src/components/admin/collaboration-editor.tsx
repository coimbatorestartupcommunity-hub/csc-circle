"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { notifySubmissionSuccess } from "@/lib/ui/submission-feedback";
import { Button } from "@/components/ui/button";
import { collaborationSaveSchema, type CollaborationSaveValues } from "@/lib/validations/collaboration";
import type { z } from "zod";

type Values = z.input<typeof collaborationSaveSchema>;
type OrganizationOption = { id: string; name: string; slug: string; logoPath?: string | null };
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
  const [organizationOptions, setOrganizationOptions] = React.useState(organizations);
  const [addingOrganization, setAddingOrganization] = React.useState(false);
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
      notifySubmissionSuccess({ title: checked.publicationStatus === "published" ? "Collaboration published" : "Collaboration saved", message: checked.publicationStatus === "published" ? "The collaboration is now live on the CSC website." : "The collaboration draft was saved." });
      router.push(`/admin/collaborations/${result.id}/edit`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save collaboration.");
    } finally {
      setSaving(false);
    }
  }

  async function addOrganization() {
    if (mode !== "live") return;
    setAddingOrganization(true);
    try {
      const response = await fetch("/api/admin/collaboration-organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newOrganization),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not add organization.");
      const option = {
        id: result.id as string,
        name: result.name as string,
        slug: result.slug as string,
        logoPath: (result.logoPath as string) || null,
      };
      setOrganizationOptions((current) => [...current, option].sort((a, b) => a.name.localeCompare(b.name)));
      form.setValue("partnerIds", [...(form.getValues("partnerIds") ?? []), option.id], { shouldValidate: true });
      setNewOrganization({ name: "", slug: "", organizationType: "community", description: "", logoPath: "", websiteUrl: "", publicationApproved: false });
      notifySubmissionSuccess({ title: "Partner organization added", message: "The approved partner organization was saved." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add organization.");
    } finally {
      setAddingOrganization(false);
    }
  }

  const highlightsText = (form.getValues("highlights") ?? [])
    .map((item) => `${item.icon}|${item.title}|${item.body}`).join("\n");
  const mediaText = (form.getValues("media") ?? [])
    .map((item) => `${item.media_path}|${item.alt_text}|${item.caption}`).join("\n");

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
          {organizationOptions.length ? <div className="grid gap-2 sm:grid-cols-2">{organizationOptions.map((org) => <label key={org.id} className="flex items-center gap-2 rounded-xl border border-brand-border p-3 text-sm"><input type="checkbox" value={org.id} {...form.register("partnerIds")} />{org.name}</label>)}</div> : <p className="text-sm text-brand-muted">No organization records are available.</p>}
          {form.formState.errors.partnerIds ? <p className="mt-1 text-xs text-red-700">Choose two or more partners.</p> : null}
        </fieldset>
        <fieldset className="grid gap-3 rounded-xl bg-brand-cloud p-4 sm:col-span-2 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold text-brand-ink">Add a partner organization</legend>
          <label className={labelClass}>Organization name<input className={inputClass} value={newOrganization.name} onChange={(e) => setNewOrganization({ ...newOrganization, name: e.target.value })} /></label>
          <label className={labelClass}>Unique slug<input className={inputClass} placeholder="partner-name" value={newOrganization.slug} onChange={(e) => setNewOrganization({ ...newOrganization, slug: e.target.value })} /></label>
          <label className={labelClass}>Organization type<select className={inputClass} value={newOrganization.organizationType} onChange={(e) => setNewOrganization({ ...newOrganization, organizationType: e.target.value })}><option value="community">Community</option><option value="startup">Startup</option><option value="company">Company</option><option value="college">College</option><option value="incubator">Incubator</option><option value="accelerator">Accelerator</option><option value="other">Other</option></select></label>
          <label className={labelClass}>Approved logo path (optional)<input className={inputClass} placeholder="/brand/partner-logo.png" value={newOrganization.logoPath} onChange={(e) => setNewOrganization({ ...newOrganization, logoPath: e.target.value })} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Description<textarea rows={2} className={inputClass} value={newOrganization.description} onChange={(e) => setNewOrganization({ ...newOrganization, description: e.target.value })} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Verified official website (optional)<input className={inputClass} placeholder="https://example.org" value={newOrganization.websiteUrl} onChange={(e) => setNewOrganization({ ...newOrganization, websiteUrl: e.target.value })} /></label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-brand-secondary sm:col-span-2"><input type="checkbox" checked={newOrganization.publicationApproved} onChange={(e) => setNewOrganization({ ...newOrganization, publicationApproved: e.target.checked })} /><span>I confirm this organization name and supplied logo/website are approved for public display.</span></label>
          <div className="sm:col-span-2"><Button type="button" variant="outline" disabled={addingOrganization || mode !== "live" || !newOrganization.publicationApproved} onClick={addOrganization}>{addingOrganization ? <Loader2 className="size-4 animate-spin" /> : null}Add approved organization</Button></div>
        </fieldset>
        <label className={`${labelClass} sm:col-span-2`}>Existing event<select className={inputClass} {...form.register("eventId")}><option value="">No linked event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title} · {new Date(event.startsAt).toLocaleDateString("en-IN")}</option>)}</select></label>
        <label className={labelClass}>Verified event date<input type="datetime-local" className={inputClass} {...form.register("eventDate")} /></label>
        <label className={labelClass}>Venue name<input className={inputClass} {...form.register("venueName")} /></label>
        <label className={`${labelClass} sm:col-span-2`}>Venue address<input className={inputClass} {...form.register("venueAddress")} /></label>
      </section>

      <section className="grid gap-4 rounded-2xl border border-brand-border bg-white p-4 sm:grid-cols-2 sm:p-6">
        <h2 className="text-base font-semibold text-brand-ink sm:col-span-2">Images and highlights</h2>
        <label className={`${labelClass} sm:col-span-2`}>Featured image path<input className={inputClass} placeholder="/images/community-outlier.png" {...form.register("featuredImagePath")} /></label>
        <label className={`${labelClass} sm:col-span-2`}>Gallery rows (one per line: path | alt text | caption)<textarea key="media" defaultValue={mediaText} rows={3} className={inputClass} onChange={(event) => {
          const items = event.target.value.split("\n").filter(Boolean).map((line, index) => {
            const [media_path = "", alt_text = "", caption = ""] = line.split("|").map((part) => part.trim());
            return { media_path, alt_text, caption, display_order: index };
          });
          form.setValue("media", items, { shouldValidate: true });
        }} /></label>
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
      <div className="flex justify-end"><Button type="submit" disabled={saving || mode !== "live"} className="gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save collaboration</Button></div>
    </form>
  );
}
