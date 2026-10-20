"use client";

import * as React from "react";
import { Download, Eye, FilePlus2, Loader2, RefreshCw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { emptyResumeData, type ResumeData } from "@/lib/member/resume-schema";

function bullets(value: string) { return value.split("\n").map((line) => line.trim()).filter(Boolean); }
function bulletText(value: string[]) { return value.join("\n"); }

export function ResumeBuilder({ memberName, initial }: { memberName: string; initial: ResumeData }) {
  const [data, setData] = React.useState<ResumeData>(initial ?? emptyResumeData);
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [showMissing, setShowMissing] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState("");
  const [error, setError] = React.useState("");

  async function save(): Promise<boolean> {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/member/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Resume could not be saved.");
      setSavedAt(result.updatedAt ?? new Date().toISOString());
      toast.success("Resume information saved.");
      return true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Resume could not be saved.";
      setError(message); toast.error(message); return false;
    } finally { setSaving(false); }
  }

  async function preview() {
    if (!await save()) return;
    setPreviewUrl(`/api/member/resume/pdf?view=${Date.now()}`);
    setShowMissing(false);
  }

  async function download() {
    if (!await save()) return;
    setExporting(true); setError("");
    try {
      const response = await fetch("/api/member/resume/pdf?download=1", { cache: "no-store" });
      if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error ?? "PDF export failed."); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${memberName.normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "") || "CSC_Member"}_Resume.pdf`;
      document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      toast.success("Your resume PDF is ready.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "PDF export failed.";
      setError(message); toast.error(message);
    } finally { setExporting(false); }
  }

  const missing = [
    !data.headline.trim() && "Professional headline",
    !data.contact.email.trim() && "Resume email address",
    !data.summary.trim() && "Professional summary",
    !data.skills.length && "Technical or professional skills",
    !data.experiences.length && "Work experience",
    !data.projects.length && "Projects",
    !data.education.length && "Education",
  ].filter((value): value is string => typeof value === "string");

  function move<T>(items: T[], index: number, direction: -1 | 1, replace: (items: T[]) => void) {
    const next = [...items]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    replace(next);
  }

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
    <section className="rounded-2xl border border-brand-border bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm leading-6 text-brand-secondary">Create a professional resume using your saved CSC Member Profile information and the approved resume layout. Review your details before exporting to PDF.</p><p className="mt-1 text-xs text-brand-muted">Name comes from your CSC profile. Employment and qualifications are member-entered and are not independently verified.</p>{savedAt ? <p className="mt-2 text-xs text-brand-muted">Saved {new Date(savedAt).toLocaleString("en-IN")}</p> : null}</div><div className="flex flex-col gap-2 sm:w-auto sm:flex-row"><Button variant="outline" onClick={() => void save()} disabled={saving || exporting} className="gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save</Button><Button onClick={() => void preview()} disabled={saving || exporting} className="gap-2"><Eye className="size-4" />Preview Resume</Button><Button variant="outline" onClick={() => void download()} disabled={saving || exporting} className="gap-2">{exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Export Resume as PDF</Button></div></div>
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-brand-border pt-3"><Button type="button" variant="ghost" size="sm" onClick={() => setShowMissing((value) => !value)}>Review Missing Information</Button>{showMissing ? <ul className="flex w-full flex-wrap gap-x-5 gap-y-1 text-xs text-brand-muted">{missing.length ? missing.map((item) => <li key={item}>• {item}</li>) : <li>Your resume has the main sections filled in.</li>}</ul> : null}</div>
    </section>

    <section className="rounded-2xl border border-brand-border bg-white p-5 sm:p-7"><h2 className="text-lg font-semibold text-brand-ink">Resume header</h2><p className="mt-1 text-sm text-brand-muted">The resume uses your saved CSC profile name, followed by the professional details you choose here.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Professional headline" value={data.headline} onChange={(value) => setData((current) => ({ ...current, headline: value }))} placeholder="e.g. Product Designer | UX Research | Design Systems" /><Field label="Resume contact email" value={data.contact.email} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, email: value } }))} type="email" placeholder="An email you choose to include" /><Field label="Resume phone" value={data.contact.phone} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, phone: value } }))} /><Field label="Professional location" value={data.contact.location} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, location: value } }))} /><Field label="LinkedIn URL" value={data.contact.linkedin} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, linkedin: value } }))} type="url" /><Field label="GitHub URL" value={data.contact.github} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, github: value } }))} type="url" /><Field label="Portfolio URL" value={data.contact.portfolio} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, portfolio: value } }))} type="url" /></div></section>

    <section className="rounded-2xl border border-brand-border bg-white p-5 sm:p-7"><SectionTitle title="Professional Summary" checked={data.visibility.summary} onToggle={(checked) => setData((current) => ({ ...current, visibility: { ...current.visibility, summary: checked } }))} /><Textarea rows={10} maxLength={4000} value={data.summary} onChange={(event) => setData((current) => ({ ...current, summary: event.target.value }))} placeholder="Summarize your professional experience, main strengths, expertise and the type of work you contribute to." className="mt-4" /></section>

    <section className="rounded-2xl border border-brand-border bg-white p-5 sm:p-7"><SectionTitle title="Technical Skills" checked={data.visibility.skills} onToggle={(checked) => setData((current) => ({ ...current, visibility: { ...current.visibility, skills: checked } }))} /><div className="mt-4 flex flex-col gap-3">{data.skills.map((skill, index) => <div key={skill.id} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"><Input aria-label="Skill category" value={skill.category} onChange={(event) => setData((current) => ({ ...current, skills: current.skills.map((row, i) => i === index ? { ...row, category: event.target.value } : row) }))} placeholder="Category" /><Input aria-label="Skills in category" value={skill.items.join(", ")} onChange={(event) => setData((current) => ({ ...current, skills: current.skills.map((row, i) => i === index ? { ...row, items: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } : row) }))} placeholder="React, TypeScript, Product Strategy" /><RowControls index={index} length={data.skills.length} remove={() => setData((current) => ({ ...current, skills: current.skills.filter((_, i) => i !== index) }))} move={(direction) => move(data.skills, index, direction, (skills) => setData((current) => ({ ...current, skills })))} /></div>)}</div><Button variant="outline" className="mt-3 gap-2" onClick={() => setData((current) => ({ ...current, skills: [...current.skills, { id: crypto.randomUUID(), category: "", items: [] }] }))}><FilePlus2 className="size-4" />Add skill category</Button></section>

    <section className="rounded-2xl border border-brand-border bg-white p-5 sm:p-7"><SectionTitle title="Experience" checked={data.visibility.experiences} onToggle={(checked) => setData((current) => ({ ...current, visibility: { ...current.visibility, experiences: checked } }))} /><div className="mt-4 flex flex-col gap-4">{data.experiences.map((entry, index) => <div key={entry.id} className="rounded-xl bg-brand-cloud/60 p-4"><RowControls index={index} length={data.experiences.length} remove={() => setData((current) => ({ ...current, experiences: current.experiences.filter((_, i) => i !== index) }))} move={(direction) => move(data.experiences, index, direction, (experiences) => setData((current) => ({ ...current, experiences })))} /><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Job title / role" value={entry.title} onChange={(value) => setData((current) => ({ ...current, experiences: current.experiences.map((row, i) => i === index ? { ...row, title: value } : row) }))} /><Field label="Organization" value={entry.organization} onChange={(value) => setData((current) => ({ ...current, experiences: current.experiences.map((row, i) => i === index ? { ...row, organization: value } : row) }))} /><Field label="Start date" value={entry.startDate} onChange={(value) => setData((current) => ({ ...current, experiences: current.experiences.map((row, i) => i === index ? { ...row, startDate: value } : row) }))} placeholder="Month / year" /><Field label="End date" value={entry.endDate} onChange={(value) => setData((current) => ({ ...current, experiences: current.experiences.map((row, i) => i === index ? { ...row, endDate: value } : row) }))} placeholder="Present or month / year" /><Field label="Location" value={entry.location} onChange={(value) => setData((current) => ({ ...current, experiences: current.experiences.map((row, i) => i === index ? { ...row, location: value } : row) }))} /><label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-brand-ink sm:col-span-2">Responsibilities and outcomes<Textarea rows={4} value={bulletText(entry.bullets)} onChange={(event) => setData((current) => ({ ...current, experiences: current.experiences.map((row, i) => i === index ? { ...row, bullets: bullets(event.target.value) } : row) }))} placeholder="One bullet per line. Use accurate, member-entered details." /></label></div></div>)}</div><Button variant="outline" className="mt-3 gap-2" onClick={() => setData((current) => ({ ...current, experiences: [...current.experiences, { id: crypto.randomUUID(), title: "", organization: "", startDate: "", endDate: "", location: "", bullets: [] }] }))}><FilePlus2 className="size-4" />Add experience</Button></section>

    <section className="rounded-2xl border border-brand-border bg-white p-5 sm:p-7"><SectionTitle title="Projects" checked={data.visibility.projects} onToggle={(checked) => setData((current) => ({ ...current, visibility: { ...current.visibility, projects: checked } }))} /><div className="mt-4 flex flex-col gap-4">{data.projects.map((entry, index) => <div key={entry.id} className="rounded-xl bg-brand-cloud/60 p-4"><RowControls index={index} length={data.projects.length} remove={() => setData((current) => ({ ...current, projects: current.projects.filter((_, i) => i !== index) }))} move={(direction) => move(data.projects, index, direction, (projects) => setData((current) => ({ ...current, projects })))} /><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Project name" value={entry.title} onChange={(value) => setData((current) => ({ ...current, projects: current.projects.map((row, i) => i === index ? { ...row, title: value } : row) }))} /><Field label="Description / role" value={entry.descriptor} onChange={(value) => setData((current) => ({ ...current, projects: current.projects.map((row, i) => i === index ? { ...row, descriptor: value } : row) }))} /><Field label="Technologies" value={entry.technologies.join(", ")} onChange={(value) => setData((current) => ({ ...current, projects: current.projects.map((row, i) => i === index ? { ...row, technologies: value.split(",").map((item) => item.trim()).filter(Boolean) } : row) }))} /><Field label="Public project link" type="url" value={entry.link} onChange={(value) => setData((current) => ({ ...current, projects: current.projects.map((row, i) => i === index ? { ...row, link: value } : row) }))} /><label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-brand-ink sm:col-span-2">Project details<Textarea rows={4} value={bulletText(entry.bullets)} onChange={(event) => setData((current) => ({ ...current, projects: current.projects.map((row, i) => i === index ? { ...row, bullets: bullets(event.target.value) } : row) }))} placeholder="One bullet per line. Omit confidential or client-sensitive information." /></label></div></div>)}</div><Button variant="outline" className="mt-3 gap-2" onClick={() => setData((current) => ({ ...current, projects: [...current.projects, { id: crypto.randomUUID(), title: "", descriptor: "", technologies: [], bullets: [], link: "" }] }))}><FilePlus2 className="size-4" />Add project</Button></section>

    <section className="rounded-2xl border border-brand-border bg-white p-5 sm:p-7"><SectionTitle title="Education" checked={data.visibility.education} onToggle={(checked) => setData((current) => ({ ...current, visibility: { ...current.visibility, education: checked } }))} /><div className="mt-4 flex flex-col gap-4">{data.education.map((entry, index) => <div key={entry.id} className="rounded-xl bg-brand-cloud/60 p-4"><RowControls index={index} length={data.education.length} remove={() => setData((current) => ({ ...current, education: current.education.filter((_, i) => i !== index) }))} move={(direction) => move(data.education, index, direction, (education) => setData((current) => ({ ...current, education })))} /><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Qualification" value={entry.qualification} onChange={(value) => setData((current) => ({ ...current, education: current.education.map((row, i) => i === index ? { ...row, qualification: value } : row) }))} /><Field label="Field of study" value={entry.field} onChange={(value) => setData((current) => ({ ...current, education: current.education.map((row, i) => i === index ? { ...row, field: value } : row) }))} /><Field label="Institution" value={entry.institution} onChange={(value) => setData((current) => ({ ...current, education: current.education.map((row, i) => i === index ? { ...row, institution: value } : row) }))} /><Field label="Location" value={entry.location} onChange={(value) => setData((current) => ({ ...current, education: current.education.map((row, i) => i === index ? { ...row, location: value } : row) }))} /><Field label="Start year" value={entry.startYear} onChange={(value) => setData((current) => ({ ...current, education: current.education.map((row, i) => i === index ? { ...row, startYear: value } : row) }))} /><Field label="End year / expected" value={entry.endYear} onChange={(value) => setData((current) => ({ ...current, education: current.education.map((row, i) => i === index ? { ...row, endYear: value } : row) }))} /><label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-brand-ink sm:col-span-2">Selected academic details<Textarea rows={2} value={bulletText(entry.details)} onChange={(event) => setData((current) => ({ ...current, education: current.education.map((row, i) => i === index ? { ...row, details: bullets(event.target.value) } : row) }))} /></label></div></div>)}</div><Button variant="outline" className="mt-3 gap-2" onClick={() => setData((current) => ({ ...current, education: [...current.education, { id: crypto.randomUUID(), qualification: "", field: "", institution: "", location: "", startYear: "", endYear: "", details: [] }] }))}><FilePlus2 className="size-4" />Add education</Button></section>

    <section className="rounded-2xl border border-brand-border bg-white p-5 sm:p-7"><SectionTitle title="Certifications" checked={data.visibility.certifications} onToggle={(checked) => setData((current) => ({ ...current, visibility: { ...current.visibility, certifications: checked } }))} /><div className="mt-4 flex flex-col gap-3">{data.certifications.map((entry, index) => <div key={entry.id} className="grid gap-2 sm:grid-cols-[1.3fr_1fr_1fr_1.5fr_auto]"><Input aria-label="Certification title" value={entry.title} onChange={(event) => setData((current) => ({ ...current, certifications: current.certifications.map((row, i) => i === index ? { ...row, title: event.target.value } : row) }))} placeholder="Certification title" /><Input aria-label="Certification issuer" value={entry.issuer} onChange={(event) => setData((current) => ({ ...current, certifications: current.certifications.map((row, i) => i === index ? { ...row, issuer: event.target.value } : row) }))} placeholder="Issuer" /><Input aria-label="Certification date" value={entry.date} onChange={(event) => setData((current) => ({ ...current, certifications: current.certifications.map((row, i) => i === index ? { ...row, date: event.target.value } : row) }))} placeholder="Date" /><Input aria-label="Certification link" value={entry.link} onChange={(event) => setData((current) => ({ ...current, certifications: current.certifications.map((row, i) => i === index ? { ...row, link: event.target.value } : row) }))} placeholder="Credential link" /> <RowControls index={index} length={data.certifications.length} remove={() => setData((current) => ({ ...current, certifications: current.certifications.filter((_, i) => i !== index) }))} move={(direction) => move(data.certifications, index, direction, (certifications) => setData((current) => ({ ...current, certifications })))} /></div>)}</div><Button variant="outline" className="mt-3 gap-2" onClick={() => setData((current) => ({ ...current, certifications: [...current.certifications, { id: crypto.randomUUID(), title: "", issuer: "", date: "", link: "" }] }))}><FilePlus2 className="size-4" />Add certification</Button></section>

    <section className="rounded-2xl border border-brand-border bg-white p-5 sm:p-7"><SectionTitle title="Achievements & Highlights" checked={data.visibility.achievements} onToggle={(checked) => setData((current) => ({ ...current, visibility: { ...current.visibility, achievements: checked } }))} /><Textarea rows={5} value={bulletText(data.achievements)} onChange={(event) => setData((current) => ({ ...current, achievements: bullets(event.target.value) }))} placeholder="Add achievements you want to include, one per line. Use accurate, supportable information." className="mt-4" /></section>

    {previewUrl ? <section className="overflow-hidden rounded-2xl border border-brand-border bg-white"><div className="flex items-center justify-between gap-3 border-b border-brand-border p-3"><h2 className="font-semibold text-brand-ink">Resume Preview — A4 PDF</h2><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void preview()} disabled={saving} className="gap-1"><RefreshCw className="size-3.5" />Refresh Preview</Button><Button variant="ghost" size="icon" aria-label="Close resume preview" onClick={() => setPreviewUrl("")}><X className="size-4" /></Button></div></div><iframe key={previewUrl} src={previewUrl} title="A4 resume preview" className="h-[70vh] min-h-[520px] w-full bg-white" /></section> : null}
  </div>;
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-brand-ink">{label}<Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={500} /></label>;
}

function SectionTitle({ title, checked, onToggle }: { title: string; checked: boolean; onToggle: (value: boolean) => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-brand-ink">{title}</h2><label className="inline-flex items-center gap-2 text-xs text-brand-muted"><input type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} className="accent-[var(--brand-accent)]" />Include in resume</label></div>;
}

function RowControls({ index, length, remove, move }: { index: number; length: number; remove: () => void; move: (direction: -1 | 1) => void }) {
  return <div className="flex items-center justify-end gap-2"><button type="button" className="rounded-md px-2 py-1 text-xs text-brand-accent hover:bg-white disabled:opacity-40" onClick={() => move(-1)} disabled={index === 0} aria-label="Move entry up">Move up</button><button type="button" className="rounded-md px-2 py-1 text-xs text-brand-accent hover:bg-white disabled:opacity-40" onClick={() => move(1)} disabled={index === length - 1} aria-label="Move entry down">Move down</button><button type="button" className="rounded-md px-2 py-1 text-xs text-red-700 hover:bg-white" onClick={remove}>Remove</button></div>;
}
