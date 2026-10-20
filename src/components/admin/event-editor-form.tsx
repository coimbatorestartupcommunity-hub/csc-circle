"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { notifySubmissionSuccess } from "@/lib/ui/submission-feedback";
import { Loader2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { EventCard } from "@/components/events/event-card";
import {
  eventEditorSchema,
  eventEditorDefaults,
  type EventEditorValues,
} from "@/lib/validations/admin";
import type { EventRecord } from "@/types";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border">
      <legend className="px-1 text-sm font-semibold text-brand-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

export function EventEditorForm({
  initial,
  mode,
  isDemo,
  eventId,
}: {
  initial?: Partial<EventEditorValues>;
  mode: "create" | "edit";
  isDemo: boolean;
  eventId?: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<EventEditorValues>({
    resolver: zodResolver(eventEditorSchema),
    defaultValues: { ...eventEditorDefaults, ...initial },
  });
  const [saving, setSaving] = React.useState(false);
  const [uploadingCover, setUploadingCover] = React.useState(false);
  const [coverPreview, setCoverPreview] = React.useState(() => {
    const value = initial?.coverImage ?? "";
    return value.startsWith("event-covers/") && eventId ? `/api/admin/events/cover?event=${eventId}` : value;
  });
  const coverInput = React.useRef<HTMLInputElement>(null);
  const values = useWatch({ control }) as Partial<EventEditorValues>;
  const coverImagePreview = values.coverImage?.startsWith("event-covers/")
    ? coverPreview || (eventId ? `/api/admin/events/cover?event=${eventId}` : "")
    : values.coverImage || undefined;

  const previewEvent: EventRecord = {
    id: "preview",
    slug: values.slug || "preview",
    title: values.title || "Event title",
    category: (values.category as EventRecord["category"]) || "meetup",
    description: values.summary || values.description || "Event summary appears here.",
    coverImage: coverImagePreview || undefined,
    startsAt: toIso(values.date, values.startTime),
    endsAt: toIso(values.date, values.endTime),
    location: values.venueName || (values.format === "online" ? "Online" : "Coimbatore"),
    venue: values.venueName || undefined,
    capacity: values.capacity ? Number(values.capacity) || undefined : undefined,
    status: values.status === "published" ? "published" : "draft",
    admission: values.admission || "free",
    registrationState: values.status === "published" ? "open" : "coming-soon",
    isFixture: false,
  };

  async function uploadCover(file?: File) {
    if (!file || isDemo) return;
    setUploadingCover(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("alt", getValues("imageAlt")?.trim() || `${getValues("title")?.trim() || "CSC event"} event cover`);
      const response = await fetch("/api/admin/events/cover", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Event image could not be uploaded.");
      setValue("coverImage", result.path, { shouldDirty: true, shouldValidate: true });
      setValue("imageAlt", result.alt, { shouldDirty: true });
      setCoverPreview(result.previewUrl);
      toast.success("4:3 event cover uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Event image could not be uploaded.");
    } finally { setUploadingCover(false); }
  }

  async function onSubmit(v: EventEditorValues) {
    if (isDemo) { toast.info("DEMO preview. No event was saved or published."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: v, id: eventId }) });
      const data = await res.json();
      if (!res.ok || !data.ok) { toast.error(data.error ?? "Event was not saved."); return; }
      notifySubmissionSuccess({ title: v.status === "published" ? "Event published" : "Event draft saved", message: v.status === "published" ? "The event is now available on the CSC website." : "The event draft was saved." });
      router.push(`/admin/events/${data.id}`); router.refresh();
    } catch { toast.error("Could not save the event."); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <div className="flex flex-col gap-5">
        <Section title="A · Basic information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="e-title">Title</FieldLabel>
              <Input id="e-title" {...register("title")} aria-invalid={!!errors.title} />
              {errors.title ? <FieldError>{errors.title.message}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="e-slug">Slug</FieldLabel>
              <Input id="e-slug" placeholder="founder-meetup" {...register("slug")} aria-invalid={!!errors.slug} />
              {errors.slug ? <FieldError>{errors.slug.message}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="e-cat">Category</FieldLabel>
              <select id="e-cat" className={selectClass} {...register("category")}>
                <option value="meetup">Meetup</option>
                <option value="pitch-session">Pitch Session</option>
                <option value="workshop">Workshop</option>
                <option value="networking">Networking</option>
                <option value="consultation">Consultation</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="e-org">Organizer</FieldLabel>
              <Input id="e-org" {...register("organizer")} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="e-sum">Short summary</FieldLabel>
            <Input id="e-sum" {...register("summary")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="e-desc">Detailed description</FieldLabel>
            <Textarea id="e-desc" rows={4} {...register("description")} aria-invalid={!!errors.description} />
            {errors.description ? <FieldError>{errors.description.message}</FieldError> : null}
          </Field>
        </Section>

        <Section title="B · Media">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="e-cover">Event cover image (Optional)</FieldLabel>
              <Input id="e-cover" placeholder="https://" {...register("coverImage")} aria-invalid={!!errors.coverImage} />
              {errors.coverImage ? <FieldError>{errors.coverImage.message}</FieldError> : null}
              <p className="text-xs text-brand-muted">Or upload a JPEG, PNG or WebP image. It will be safely prepared as a 4:3 banner.</p>
              <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void uploadCover(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={uploadingCover || isDemo} onClick={() => coverInput.current?.click()}>{uploadingCover ? <Loader2 className="size-4 animate-spin" /> : null}{uploadingCover ? "Uploading…" : coverPreview || values.coverImage ? "Replace uploaded image" : "Upload 4:3 image"}</Button>
                {(coverPreview || values.coverImage) ? <Button type="button" variant="ghost" disabled={uploadingCover} onClick={() => { setValue("coverImage", "", { shouldDirty: true, shouldValidate: true }); setValue("imageAlt", "", { shouldDirty: true }); setCoverPreview(""); }}>Remove image</Button> : null}
              </div>
              {coverPreview ? <div className="relative mt-2 aspect-4/3 w-full max-w-sm overflow-hidden rounded-xl ring-1 ring-brand-border"><Image src={coverPreview} alt="Event cover preview" fill unoptimized sizes="(max-width: 640px) 100vw, 384px" className="object-cover" /></div> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="e-alt">Image alt text</FieldLabel>
              <Input id="e-alt" {...register("imageAlt")} />
            </Field>
          </div>
        </Section>

        <Section title="C · Scheduling (Asia/Kolkata)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="e-date">Date</FieldLabel>
              <Input id="e-date" type="date" {...register("date")} aria-invalid={!!errors.date} />
              {errors.date ? <FieldError>{errors.date.message}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="e-regdl">Registration deadline</FieldLabel>
              <Input id="e-regdl" type="date" {...register("registrationDeadline")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="e-start">Start time</FieldLabel>
              <Input id="e-start" type="time" {...register("startTime")} aria-invalid={!!errors.startTime} />
              {errors.startTime ? <FieldError>{errors.startTime.message}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="e-end">End time</FieldLabel>
              <Input id="e-end" type="time" {...register("endTime")} aria-invalid={!!errors.endTime} />
              {errors.endTime ? <FieldError>{errors.endTime.message}</FieldError> : null}
            </Field>
          </div>
        </Section>

        <Section title="D · Location">
          <Field>
            <FieldLabel htmlFor="e-format">Format</FieldLabel>
            <select id="e-format" className={selectClass} {...register("format")}>
              <option value="offline">Offline</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="e-venue">Venue name</FieldLabel>
              <Input id="e-venue" {...register("venueName")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="e-maps">Google Maps URL</FieldLabel>
              <Input id="e-maps" placeholder="https://" {...register("mapsUrl")} aria-invalid={!!errors.mapsUrl} />
              {errors.mapsUrl ? <FieldError>{errors.mapsUrl.message}</FieldError> : null}
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="e-addr">Venue address</FieldLabel>
            <Input id="e-addr" {...register("venueAddress")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="e-online">Online meeting info</FieldLabel>
            <Input id="e-online" {...register("onlineInfo")} />
          </Field>
        </Section>

        <Section title="F · Registration">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="e-cap">Capacity</FieldLabel>
              <Input id="e-cap" type="number" min={0} {...register("capacity")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="e-approval">Approval</FieldLabel>
              <select id="e-approval" className={selectClass} {...register("approvalMode")}>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="e-canc">Cancellation deadline</FieldLabel>
              <Input id="e-canc" type="date" {...register("cancellationDeadline")} />
            </Field>
            <label className="flex items-center gap-2 pt-7 text-sm text-brand-secondary">
              <input type="checkbox" {...register("allowWaitlist")} className="size-4 accent-[var(--brand-accent)]" />
              Allow waitlist
            </label>
          </div>
          <Field>
            <FieldLabel htmlFor="e-special">Special instructions</FieldLabel>
            <Textarea id="e-special" rows={2} {...register("specialInstructions")} />
          </Field>
        </Section>

        <Section title="G · Payments">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="e-adm">Admission</FieldLabel>
              <select id="e-adm" className={selectClass} {...register("admission")}>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="e-price">Ticket price</FieldLabel>
              <Input id="e-price" type="number" min={0} {...register("price")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="e-cur">Currency</FieldLabel>
              <Input id="e-cur" {...register("currency")} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="e-payinfo">Payment instructions</FieldLabel>
            <Textarea id="e-payinfo" rows={2} {...register("paymentInstructions")} />
          </Field>
        </Section>

        <Section title="H · Publication">
          <Field>
            <FieldLabel htmlFor="e-status">Status</FieldLabel>
            <select id="e-status" className={selectClass} {...register("status")}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </Field>
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={saving || uploadingCover} className="h-11 gap-2 sm:w-fit sm:px-8">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "create" ? "Create event" : "Save changes"}
            </Button>
            {isDemo ? (
              <p className="text-xs text-brand-muted">
                DEMO — validates the form; saving/publishing is performed by the
                trusted backend in Phase 1.
              </p>
            ) : null}
          </div>
        </Section>
      </div>

      {/* Live preview */}
      <div className="lg:sticky lg:top-20">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-brand-muted">
          <Eye className="size-4" /> Live preview (public EventCard)
        </div>
        <div className="max-w-sm">
          <EventCard event={previewEvent} />
        </div>
      </div>
    </form>
  );
}

function toIso(date?: string, time?: string): string {
  if (!date) return new Date().toISOString();
  const t = time || "00:00";
  const parsed = new Date(`${date}T${t}:00+05:30`);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}
