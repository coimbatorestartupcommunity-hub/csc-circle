"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { memberRequest } from "@/lib/services/member/request";
import { memberStartupSchema, type MemberStartupInput } from "@/lib/validations/member-startup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock3, ImagePlus, Loader2 } from "lucide-react";

type StartupValues = Partial<MemberStartupInput>;
const textFields = [
  ["category", "Startup category", "e.g. Software, manufacturing, services"],
  ["stage", "Startup stage", "Idea, prototype, early revenue, growth"],
  ["city", "City", "Coimbatore"], ["state", "State", "Tamil Nadu"], ["country", "Country", "India"],
  ["yearFounded", "Year founded", "2024"], ["tagline", "Short tagline", "Your startup in one sentence"],
  ["website", "Startup website", "https://example.com"], ["supportEmail", "Support email", "support@example.com"],
  ["additionalSupportEmail", "Additional support email", "Optional"], ["companyEmail", "Company contact email", "hello@example.com"],
  ["companyMobile", "Company mobile", "+91 98765 43210"], ["companyWhatsapp", "Company WhatsApp", "Optional"], ["contactPerson", "Contact person", "Optional"],
  ["founderRole", "Founder designation", "Founder"], ["founderCity", "Founder city", "Coimbatore"],
  ["founderMobile", "Founder mobile", "Optional"], ["founderWhatsapp", "Founder WhatsApp", "Optional"],
  ["founderEmail", "Founder email", "Optional"], ["founderWebsite", "Founder portfolio", "https://example.com"],
  ["founderLinkedin", "Founder LinkedIn", "https://linkedin.com/in/…"],
] as const;
const longFields = [
  ["description", "Startup description", "Explain your startup, the problem it solves, who it serves, and what makes it different."],
  ["whatWeDo", "What we do", "Describe your products, services, solutions, or activities."],
  ["howWeWork", "How we work", "Explain how your startup operates and delivers value."],
  ["mission", "Our mission", "Describe your purpose and long-term goal."],
  ["vision", "Our vision", "What future are you working to create?"],
  ["problemsSolved", "Problems we solve", "What customer challenges does the startup address?"],
  ["targetAudience", "Who we serve", "Describe your customers or target users."],
  ["approach", "Our approach", "Describe the process, technology, or methodology you use."],
  ["founderDescription", "Founder description", "Describe the founder's role and experience."],
] as const;
const tagFields = [
  ["coreSkills", "Core skills"], ["technologies", "Technologies used"], ["technicalExpertise", "Technical expertise"],
  ["services", "Services offered"], ["capabilities", "Business capabilities"], ["industriesServed", "Industries served"],
  ["collaboration", "Collaboration interests"], ["partnershipOpportunities", "Partnership opportunities"],
  ["mentorshipInterests", "Mentorship interests"], ["fundingInterests", "Funding interests"], ["founderSkills", "Founder skills"],
] as const;

function initialValues(initial?: StartupValues): StartupValues {
  return { name: "", slug: "", industry: "", city: "", country: "India", founderRole: "Founder", description: "", coreSkills: [], technologies: [], technicalExpertise: [], services: [], capabilities: [], industriesServed: [], collaboration: [], partnershipOpportunities: [], mentorshipInterests: [], fundingInterests: [], founderSkills: [], publishWebsite: false, publishBusinessEmail: false, publishCompanyPhone: false, publishFounderContact: false, consent: true, ...initial };
}

export function MemberStartupForm({ initial, startupId, initialPreviews }: { initial?: StartupValues; startupId?: string; initialPreviews?: { logo?: string; directory?: string } }) {
  const [values, setValues] = React.useState<StartupValues>(() => initialValues(initial));
  const [startupKey] = React.useState(() => startupId ?? crypto.randomUUID());
  const [previews, setPreviews] = React.useState<{ logo: string; directory: string }>({ logo: initialPreviews?.logo ?? "", directory: initialPreviews?.directory ?? "" });
  const [uploading, setUploading] = React.useState<"logo" | "directory" | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [complete, setComplete] = React.useState("");

  const update = (key: string, value: unknown) => setValues((v) => ({ ...v, [key]: value }));
  const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);

  async function upload(kind: "logo" | "directory", file?: File) {
    if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 8 * 1024 * 1024) { setError("Use a JPEG, PNG or WebP image smaller than 8 MB."); return; }
    setUploading(kind); setError("");
    try {
      const body = new FormData(); body.append("file", file); body.append("kind", kind); body.append("startupId", startupKey);
      const response = await fetch("/api/member/startup-assets", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Image upload failed.");
      update(kind === "logo" ? "logoPath" : "directoryImagePath", result.path);
      setPreviews((p) => ({ ...p, [kind]: result.previewUrl }));
    } catch (e) { setError(e instanceof Error ? e.message : "Image upload failed."); }
    finally { setUploading(null); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const formData = new FormData(event.currentTarget);
    const raw: Record<string, unknown> = { ...values };
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("tag:")) raw[key.slice(4)] = String(value).split(",").map((s) => s.trim()).filter(Boolean);
      else if (key === "yearFounded") raw.yearFounded = String(value) ? Number(value) : null;
      else if (key.startsWith("check:")) raw[key.slice(6)] = value === "on";
      else if (!Object.hasOwn(raw, key)) raw[key] = value;
      else if (key !== "name" && key !== "slug") raw[key] = value;
    }
    raw.id = startupKey; raw.existingId = startupId;
    raw.consent = formData.get("consent") === "on";
    const parsed = memberStartupSchema.safeParse(raw);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Review the required fields."); return; }
    setSaving(true);
    try {
      const response = await memberRequest("startup-save", parsed.data);
      if (!response.ok) { setError(response.error ?? "The startup could not be saved."); return; }
      setComplete(response.id ?? startupKey);
    } finally { setSaving(false); }
  }

  if (complete) return <section className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-brand-border sm:p-10" aria-live="polite">
    <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><CheckCircle2 className="size-7" /></span>
    <h2 className="mt-4 text-2xl font-bold text-brand-ink">Startup submitted</h2>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-brand-secondary">Your startup details have been submitted and are under active CSC administrator review. It will appear in the CSC Founder Directory after approval.</p>
    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-cloud px-4 py-2 text-sm font-medium text-brand-secondary"><Clock3 className="size-4" /> Awaiting CSC administrator review</div>
    <div className="mt-6 flex justify-center gap-3"><Button render={<Link href="/member/startups" />}>My Startups</Button><Button variant="outline" render={<Link href="/member/profile" />}>Profile</Button></div>
  </section>;

  return <form onSubmit={submit} className="mx-auto flex w-full max-w-5xl flex-col gap-5" noValidate>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">{error}</p> : null}
    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7"><h2 className="mb-5 text-lg font-semibold">Startup identity</h2><div className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Startup name" value={values.name} required onChange={(v) => { update("name", v); if (!startupId && !values.slug) update("slug", slugify(v)); }} />
      <Field name="slug" label="Directory URL slug" value={values.slug} required onChange={(v) => update("slug", slugify(v))} />
      <Field name="industry" label="Industry" value={values.industry} required onChange={(v) => update("industry", v)} />
      {textFields.slice(0, 6).map(([name, label, placeholder]) => <Field key={name} name={name} label={label} placeholder={placeholder} value={values[name] as string} onChange={(v) => update(name, v)} />)}
      <Field name="tagline" label="Startup tagline" placeholder="Describe your startup in one sentence" value={values.tagline} onChange={(v) => update("tagline", v)} />
    </div></section>
    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7"><h2 className="mb-5 text-lg font-semibold">Contact information</h2><div className="grid gap-4 sm:grid-cols-2">
      {textFields.slice(7, 14).map(([name, label, placeholder]) => <Field key={name} name={name} label={label} placeholder={placeholder} value={values[name] as string} onChange={(v) => update(name, v)} type={name.toLowerCase().includes("email") ? "email" : name.toLowerCase().includes("website") ? "url" : "text"} />)}
    </div><p className="mt-3 text-xs text-brand-muted">Company contact fields are stored separately and only shown to members when you explicitly enable the matching setting below.</p></section>
    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7"><h2 className="mb-5 text-lg font-semibold">About the startup</h2><div className="grid gap-4 sm:grid-cols-2">
      {longFields.slice(0, 8).map(([name, label, placeholder]) => <label key={name} className="flex min-w-0 flex-col gap-2 text-sm font-medium text-brand-ink">{label}{name === "description" ? " *" : ""}<Textarea name={name} rows={name === "description" ? 5 : 3} maxLength={name === "description" ? 3000 : 2000} required={name === "description"} placeholder={placeholder} defaultValue={values[name] as string} /></label>)}
    </div></section>
    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7"><h2 className="mb-5 text-lg font-semibold">Skills and expertise</h2><div className="grid gap-4 sm:grid-cols-2">
      {tagFields.slice(0, 10).map(([name, label]) => <label key={name} className="flex min-w-0 flex-col gap-2 text-sm font-medium text-brand-ink">{label}<Input name={`tag:${name}`} placeholder="Separate entries with commas" defaultValue={(values[name] as string[] | undefined)?.join(", ")} /></label>)}
    </div></section>
    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7"><h2 className="mb-5 text-lg font-semibold">Founder information</h2><div className="grid gap-4 sm:grid-cols-2">
      {textFields.slice(14).map(([name, label, placeholder]) => <Field key={name} name={name} label={label} placeholder={placeholder} value={values[name] as string} onChange={(v) => update(name, v)} type={name.toLowerCase().includes("email") ? "email" : name.toLowerCase().includes("website") || name.toLowerCase().includes("linkedin") ? "url" : "text"} />)}
      {longFields.slice(8).map(([name, label, placeholder]) => <label key={name} className="flex min-w-0 flex-col gap-2 text-sm font-medium text-brand-ink">{label}<Textarea name={name} rows={3} placeholder={placeholder} defaultValue={values[name] as string} /></label>)}
      <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-brand-ink">Founder skills<Input name="tag:founderSkills" placeholder="Separate entries with commas" defaultValue={(values.founderSkills ?? []).join(", ")} /></label>
    </div><p className="mt-3 text-xs text-brand-muted">Founder name is taken from your verified CSC profile. Other people can only be associated through an accepted CSC invitation.</p></section>
    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7"><h2 className="mb-5 text-lg font-semibold">Startup media</h2><div className="grid gap-5 sm:grid-cols-2">
      <MediaUpload kind="directory" label="Directory image (4:3, required)" path={values.directoryImagePath} preview={previews.directory} uploading={uploading === "directory"} onFile={(f) => upload("directory", f)} />
      <MediaUpload kind="logo" label="Company logo (optional)" path={values.logoPath} preview={previews.logo} uploading={uploading === "logo"} onFile={(f) => upload("logo", f)} />
    </div><p className="mt-3 text-xs text-brand-muted">Each startup has its own image. Uploads are optimized and the directory image is cropped to 1200 × 900 without stretching.</p></section>
    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-7"><h2 className="mb-2 text-lg font-semibold">Publication and privacy</h2><p className="mb-4 text-sm text-brand-secondary">Your listing remains private until a CSC administrator approves it. Choose separately which contact details active CSC members may see.</p><div className="grid gap-3 sm:grid-cols-2">
      <Consent name="publishWebsite" label="Show my startup website" checked={values.publishWebsite} onChange={(v) => update("publishWebsite", v)} />
      <Consent name="publishBusinessEmail" label="Show company email/support email" checked={values.publishBusinessEmail} onChange={(v) => update("publishBusinessEmail", v)} />
      <Consent name="publishCompanyPhone" label="Show company phone/WhatsApp" checked={values.publishCompanyPhone} onChange={(v) => update("publishCompanyPhone", v)} />
      <Consent name="publishFounderContact" label="Show founder contact details" checked={values.publishFounderContact} onChange={(v) => update("publishFounderContact", v)} />
      <label className="flex items-start gap-2 text-sm leading-6 text-brand-secondary sm:col-span-2"><input name="consent" type="checkbox" defaultChecked className="mt-1 accent-[var(--brand-accent)]" required />I consent to CSC reviewing this information and publishing approved directory details.</label>
    </div></section>
    <div className="flex flex-col items-center gap-3"><Button type="submit" disabled={saving || uploading !== null || !values.directoryImagePath} className="min-h-12 w-full gap-2 sm:w-auto sm:min-w-64">{saving ? <Loader2 className="size-4 animate-spin" /> : null}{saving ? "Submitting for review…" : startupId ? "Save changes & resubmit" : "Submit for CSC review"}</Button><p className="text-center text-xs text-brand-muted">You need a saved 4:3 directory image before submitting.</p></div>
  </form>;
}

function Field({ name, label, value, placeholder, required, type = "text", onChange }: { name: string; label: string; value?: string | number | null; placeholder?: string; required?: boolean; type?: string; onChange?: (v: string) => void }) {
  return <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-brand-ink">{label}{required ? " *" : ""}<Input name={name} type={type} value={value ?? ""} placeholder={placeholder} required={required} onChange={onChange ? (e) => onChange(e.target.value) : undefined} /></label>;
}

function Consent({ name, label, checked, onChange }: { name: string; label: string; checked?: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-start gap-2 text-sm leading-6 text-brand-secondary"><input name={`check:${name}`} type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} className="mt-1 accent-[var(--brand-accent)]" />{label}</label>;
}

function MediaUpload({ kind, label, path, preview, uploading, onFile }: { kind: "logo" | "directory"; label: string; path?: string; preview: string; uploading: boolean; onFile: (file?: File) => void }) {
  const id = `startup-${kind}-upload`;
  return <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-brand-cloud p-4 ring-1 ring-brand-border"><label htmlFor={id} className="text-sm font-semibold text-brand-ink">{label}</label>{preview ? <div className={`relative w-full overflow-hidden rounded-lg bg-white ${kind === "directory" ? "aspect-4/3" : "aspect-[4/3]"}`}>{/* URL comes from a short-lived authenticated storage signature. */}<Image src={preview} alt={`${label} preview`} fill unoptimized sizes="(max-width: 640px) 100vw, 50vw" className="object-contain" /></div> : <div className="flex aspect-4/3 items-center justify-center rounded-lg bg-white text-brand-muted ring-1 ring-dashed ring-brand-border"><ImagePlus className="size-7" /></div>}<input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} /><Button type="button" variant="outline" disabled={uploading} onClick={() => document.getElementById(id)?.click()} className="gap-2">{uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{uploading ? "Processing image…" : path ? "Replace image" : "Upload image"}</Button><span className="sr-only">{path ? "Image uploaded" : "Image required"}</span></div>;
}
