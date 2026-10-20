"use client";

import * as React from "react";
import { toast } from "sonner";
import { notifySubmissionSuccess } from "@/lib/ui/submission-feedback";
import { ArrowDown, ArrowUp, Download, Eye, FileText, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resumeSchema, type ResumeData } from "@/lib/resume/schema";

type EntryKey = "experience" | "projects" | "education" | "certifications" | "achievements";
type ResumeEntry = ResumeData[EntryKey][number];
const sectionSpecs: { key: EntryKey; title: string; description: string }[] = [
  { key: "experience", title: "Experience", description: "Roles, internships, volunteering and other experience you choose to include." },
  { key: "projects", title: "Projects", description: "Project details, technologies and outcomes." },
  { key: "education", title: "Education", description: "Degrees, courses and relevant education." },
  { key: "certifications", title: "Certifications", description: "Certificates and issuing organizations." },
  { key: "achievements", title: "Achievements & Highlights", description: "Awards, leadership and measurable accomplishments." },
];
const newEntry = (): ResumeEntry => ({ id: crypto.randomUUID(), title: "", organization: "", location: "", startDate: "", endDate: "", description: "", bullets: [], technologies: "", url: "" });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-brand-ink"><span>{label}</span>{children}</label>;
}

export function MemberResumeBuilder({ initialData, isDemo }: { initialData: ResumeData; isDemo: boolean }) {
  const [data, setData] = React.useState<ResumeData>(initialData);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [version, setVersion] = React.useState(0);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = React.useState(false);

  React.useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  function update<K extends keyof ResumeData>(key: K, value: ResumeData[K]) { setData((old) => ({ ...old, [key]: value })); setDirty(true); }
  function updateEntry(key: EntryKey, index: number, patch: Partial<ResumeEntry>) {
    const list = [...data[key]]; list[index] = { ...list[index], ...patch }; update(key, list);
  }
  function moveEntry(key: EntryKey, index: number, offset: -1 | 1) {
    const next = [...data[key]]; const target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]]; update(key, next);
  }
  async function save() {
    if (isDemo) { toast.error("Sign in with your CSC account to save a private resume."); return; }
    const parsed = resumeSchema.safeParse(data);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Review your resume fields."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/member/resume", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save your resume.");
      setDirty(false); setVersion((n) => n + 1); notifySubmissionSuccess({ title: "Resume saved", message: "Your resume changes are saved securely." });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your resume."); }
    finally { setSaving(false); }
  }
  async function openPdf(download: boolean) {
    if (isDemo || dirty) return;
    setPdfBusy(true);
    try {
      const response = await fetch(`/api/member/resume/pdf?${download ? "download=1" : "inline=1"}&v=${version}`, { cache: "no-store" });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Could not generate your PDF.");
      }
      const blob = await response.blob();
      if (blob.type !== "application/pdf") throw new Error("The server returned an invalid PDF.");
      const url = URL.createObjectURL(blob);
      if (download) {
        const anchor = document.createElement("a");
        const filename = (data.name.normalize("NFKD").replace(/[^\p{L}\p{N} _-]/gu, "").trim().replace(/\s+/g, "_") || "Member").slice(0, 80);
        anchor.href = url; anchor.download = `${filename}_Resume.pdf`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else setPreviewUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return url; });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not generate your PDF."); }
    finally { setPdfBusy(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      {isDemo ? <div className="rounded-xl border border-brand-gold bg-brand-gold/50 p-3 text-sm text-brand-ink">DEMO preview. This screen does not save resume data or generate a member document until you sign in.</div> : null}
      <section className="rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-6">
        <div className="mb-5 flex items-start gap-3"><span className="rounded-xl bg-brand-purple p-2 text-brand-ink"><FileText className="size-5" /></span><div><h2 className="font-semibold text-brand-ink">Professional Resume Builder</h2><p className="mt-1 text-sm text-brand-muted">Add your own accurate information. CSC does not invent or verify employment, education or achievements.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={data.name} maxLength={100} onChange={(e) => update("name", e.target.value)} autoComplete="name" /></Field>
          <Field label="Professional headline"><Input value={data.headline} maxLength={160} onChange={(e) => update("headline", e.target.value)} placeholder="e.g. Computer Science Student" /></Field>
          <Field label="Resume email"><Input type="email" value={data.email} maxLength={254} onChange={(e) => update("email", e.target.value)} autoComplete="email" /></Field>
          <Field label="Phone"><Input value={data.phone} maxLength={40} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" /></Field>
          <Field label="Location"><Input value={data.location} maxLength={120} onChange={(e) => update("location", e.target.value)} placeholder="City, Country" /></Field>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-brand-ink">Professional links</h3><Button variant="outline" size="sm" onClick={() => update("links", [...data.links, { label: "", url: "https://" }])}><Plus className="size-4" /> Add link</Button></div>
          {data.links.map((link, index) => <div key={`link-${index}`} className="grid gap-2 sm:grid-cols-[0.7fr_1.3fr_auto]"><Input aria-label={`Link ${index + 1} label`} value={link.label} placeholder="LinkedIn" onChange={(e) => update("links", data.links.map((x, i) => i === index ? { ...x, label: e.target.value } : x))} /><Input aria-label={`Link ${index + 1} URL`} type="url" value={link.url} placeholder="https://" onChange={(e) => update("links", data.links.map((x, i) => i === index ? { ...x, url: e.target.value } : x))} /><Button variant="ghost" size="icon" aria-label={`Remove link ${index + 1}`} onClick={() => update("links", data.links.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button></div>)}
        </div>
      </section>

      <section className="rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-brand-ink">Professional Summary</h2><label className="flex items-center gap-2 text-xs text-brand-muted"><input type="checkbox" checked={data.visibleSections.summary} onChange={(e) => update("visibleSections", { ...data.visibleSections, summary: e.target.checked })} /> Include in resume</label></div>
        <Textarea value={data.summary} onChange={(e) => update("summary", e.target.value)} rows={10} maxLength={6000} placeholder="Write a concise overview of your interests, strengths, and direction. Use your own words; do not include confidential information." className="min-h-60 resize-y whitespace-pre-wrap" />
        <p className="mt-2 text-right text-xs text-brand-muted">{data.summary.length}/6000 characters</p>
      </section>

      <section className="rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-brand-ink">Technical Skills</h2><p className="text-sm text-brand-muted">Group related skills; they appear in compact ATS-readable lines.</p></div><label className="flex items-center gap-2 text-xs text-brand-muted"><input type="checkbox" checked={data.visibleSections.skills} onChange={(e) => update("visibleSections", { ...data.visibleSections, skills: e.target.checked })} /> Include in resume</label></div>
        <div className="flex flex-col gap-3">
          {data.skills.map((group, index) => <div key={group.id} className="grid gap-2 sm:grid-cols-[0.65fr_1.35fr_auto]"><Input aria-label="Skill category" value={group.category} placeholder="Frontend Engineering" onChange={(e) => update("skills", data.skills.map((x, i) => i === index ? { ...x, category: e.target.value } : x))} /><Input aria-label="Skills, comma separated" value={group.items.join(", ")} placeholder="React, TypeScript, SQL" onChange={(e) => update("skills", data.skills.map((x, i) => i === index ? { ...x, items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x))} /><Button variant="ghost" size="icon" aria-label="Remove skills group" onClick={() => update("skills", data.skills.filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button></div>)}
          <Button variant="outline" className="w-full sm:w-fit" onClick={() => update("skills", [...data.skills, { id: crypto.randomUUID(), category: "", items: [] }])}><Plus className="size-4" /> Add skill group</Button>
        </div>
      </section>

      {sectionSpecs.map(({ key, title, description }) => <section key={key} className="rounded-2xl bg-brand-white p-5 ring-1 ring-brand-border sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-brand-ink">{title}</h2><p className="mt-1 text-sm text-brand-muted">{description}</p></div><label className="flex items-center gap-2 text-xs text-brand-muted"><input type="checkbox" checked={data.visibleSections[key]} onChange={(e) => update("visibleSections", { ...data.visibleSections, [key]: e.target.checked })} /> Include in resume</label></div>
        <div className="flex flex-col gap-4">
          {data[key].map((entry, index) => <article key={entry.id} className="rounded-xl border border-brand-border bg-brand-cloud/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2"><p className="text-xs font-semibold tracking-wide text-brand-muted uppercase">{title} {index + 1}</p><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`Move ${title} entry up`} disabled={index === 0} onClick={() => moveEntry(key, index, -1)}><ArrowUp className="size-4" /></Button><Button variant="ghost" size="icon" aria-label={`Move ${title} entry down`} disabled={index === data[key].length - 1} onClick={() => moveEntry(key, index, 1)}><ArrowDown className="size-4" /></Button><Button variant="ghost" size="icon" aria-label={`Remove ${title} entry`} onClick={() => update(key, data[key].filter((_, i) => i !== index))}><Trash2 className="size-4" /></Button></div></div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label={key === "experience" ? "Role or title" : key === "education" ? "Degree or course" : key === "certifications" ? "Certification" : "Title"}><Input value={entry.title} maxLength={140} onChange={(e) => updateEntry(key, index, { title: e.target.value })} /></Field><Field label={key === "experience" ? "Employer or organization" : key === "education" ? "Institution" : key === "certifications" ? "Issuer" : "Organization"}><Input value={entry.organization} maxLength={140} onChange={(e) => updateEntry(key, index, { organization: e.target.value })} /></Field>
              <Field label="Start date"><Input value={entry.startDate} maxLength={40} onChange={(e) => updateEntry(key, index, { startDate: e.target.value })} placeholder="Jun 2025" /></Field><Field label="End date"><Input value={entry.endDate} maxLength={40} onChange={(e) => updateEntry(key, index, { endDate: e.target.value })} placeholder="Present" /></Field>
              <Field label="Location"><Input value={entry.location} maxLength={100} onChange={(e) => updateEntry(key, index, { location: e.target.value })} /></Field><Field label="Technologies or focus"><Input value={entry.technologies} maxLength={400} onChange={(e) => updateEntry(key, index, { technologies: e.target.value })} /></Field>
              <Field label="Link (optional)"><Input type="url" value={entry.url ?? ""} maxLength={300} placeholder="https://" onChange={(e) => updateEntry(key, index, { url: e.target.value })} /></Field>
            </div>
            <Field label={key === "experience" || key === "projects" || key === "achievements" ? "Description or highlights (one item per line)" : "Additional details"}><Textarea value={entry.bullets.length ? entry.bullets.join("\n") : entry.description} rows={4} maxLength={3000} className="mt-1 resize-y whitespace-pre-wrap" onChange={(e) => updateEntry(key, index, { bullets: e.target.value.split("\n").slice(0, 20), description: e.target.value })} placeholder="Describe your contribution, learning, or result in your own words." /></Field>
          </article>)}
          <Button variant="outline" className="w-full sm:w-fit" onClick={() => update(key, [...data[key], newEntry()])}><Plus className="size-4" /> Add {({ experience: "experience", projects: "project", education: "education", certifications: "certification", achievements: "achievement" } as const)[key]}</Button>
        </div>
      </section>)}

      <div className="sticky bottom-2 z-10 flex flex-col gap-2 rounded-2xl border border-brand-border bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
        <Button variant="outline" disabled={isDemo || dirty || pdfBusy} onClick={() => void openPdf(false)} className="gap-2">{pdfBusy ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />} Preview PDF</Button>
        <Button variant="outline" disabled={isDemo || dirty || pdfBusy} onClick={() => void openPdf(true)} className="gap-2"><Download className="size-4" /> Download PDF</Button>
        <Button disabled={saving || isDemo || !dirty} onClick={save} className="gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save changes</Button>
      </div>
      {isDemo ? <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-border bg-white p-6 text-center text-sm text-brand-muted"><Eye className="size-5" />Sign in to preview a private resume PDF.</div> : previewUrl ? <section className="mx-auto w-full min-w-0 max-w-4xl overflow-hidden rounded-2xl bg-brand-white ring-1 ring-brand-border"><div className="border-b border-brand-border px-4 py-3 text-center sm:px-5"><h2 className="text-sm font-semibold text-brand-ink">PDF preview</h2><p className="mt-1 text-xs text-brand-muted">Preview zoom: 50% · Download remains full size</p></div><iframe key={previewUrl} src={`${previewUrl}#zoom=50`} title="ATS-friendly resume PDF preview at 50 percent zoom" className="block h-[min(80svh,760px)] min-h-[460px] w-full bg-brand-cloud sm:h-[70vh] sm:min-h-[520px]" /></section> : null}
    </div>
  );
}
