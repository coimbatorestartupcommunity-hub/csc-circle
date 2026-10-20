"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, FilePlus2, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type ResumeData } from "@/lib/member/resume-schema";

type Props = { initial: ResumeData };

export function MemberProfessionalProfile({ initial }: Props) {
  const router = useRouter();
  const [data, setData] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  async function save() {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/member/resume", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Professional profile could not be saved.");
      toast.success("Professional profile saved.");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Professional profile could not be saved.";
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  }

  const updateExperience = (id: string, patch: Partial<ResumeData["experiences"][number]>) => setData((current) => ({ ...current, experiences: current.experiences.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) }));
  const updateEducation = (id: string, patch: Partial<ResumeData["education"][number]>) => setData((current) => ({ ...current, education: current.education.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) }));
  const updateProject = (id: string, patch: Partial<ResumeData["projects"][number]>) => setData((current) => ({ ...current, projects: current.projects.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) }));
  const updateCertification = (id: string, patch: Partial<ResumeData["certifications"][number]>) => setData((current) => ({ ...current, certifications: current.certifications.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) }));
  const updateSkill = (id: string, patch: Partial<ResumeData["skills"][number]>) => setData((current) => ({ ...current, skills: current.skills.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) }));

  return <div className="flex min-w-0 flex-col gap-5">
    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-6">
      <div className="flex items-start gap-3"><BriefcaseBusiness className="mt-0.5 size-5 shrink-0 text-brand-accent" /><div><h2 className="text-lg font-semibold text-brand-ink">About Me & Professional Summary</h2><p className="mt-1 text-sm leading-6 text-brand-muted">Maintain your professional headline, summary and career objective. This information is private unless you choose to share selected profile fields.</p></div></div>
      <div className="mt-5 flex flex-col gap-4">
        <LabeledInput label="Professional headline" value={data.headline} maxLength={180} onChange={(value) => setData((current) => ({ ...current, headline: value }))} placeholder="e.g. Product Designer · UX Research · Design Systems" />
        <LabeledTextarea label="Short biography / About Me" rows={4} maxLength={1200} value={data.aboutMe} onChange={(value) => setData((current) => ({ ...current, aboutMe: value }))} />
        <LabeledTextarea label="Detailed professional summary" rows={10} maxLength={4000} value={data.summary} onChange={(value) => setData((current) => ({ ...current, summary: value }))} hint={`${data.summary.length}/4000`} />
        <LabeledTextarea label="Career objective" rows={4} maxLength={2000} value={data.careerObjective} onChange={(value) => setData((current) => ({ ...current, careerObjective: value }))} />
        <TokenEditor title="Professional interests" values={data.professionalInterests} onChange={(values) => setData((current) => ({ ...current, professionalInterests: values }))} placeholder="e.g. product strategy, founder mentorship" />
      </div>
    </section>

    <section className="rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-6">
      <h2 className="text-lg font-semibold text-brand-ink">Skills & Expertise</h2><p className="mt-1 text-sm text-brand-muted">Add skills by category. Items are saved in your private member profile and can be selected for your resume.</p>
      <div className="mt-4 flex flex-col gap-3">{data.skills.map((entry) => <article key={entry.id} className="rounded-xl bg-brand-cloud/60 p-4"><div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="Skill category" value={entry.category} maxLength={100} onChange={(event) => updateSkill(entry.id, { category: event.target.value })} placeholder="Category, e.g. Product" /><Input aria-label="Skills" value={entry.items.join(", ")} onChange={(event) => updateSkill(entry.id, { items: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Separate skills with commas" /><IconButton label="Remove skill category" onClick={() => setData((current) => ({ ...current, skills: current.skills.filter((row) => row.id !== entry.id) }))} /></div></article>)}</div>
      <Button type="button" variant="outline" className="mt-3 gap-2" onClick={() => setData((current) => ({ ...current, skills: [...current.skills, { id: crypto.randomUUID(), category: "", items: [] }] }))}><Plus className="size-4" />Add skill category</Button>
    </section>

    <CareerSection title="Education" description="Add degrees, study programs and relevant academic details.">
      {data.education.map((entry) => <article key={entry.id} className="rounded-xl bg-brand-cloud/60 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-medium text-brand-ink">{entry.qualification || "Education record"}</h3><IconButton label="Remove education record" onClick={() => setData((current) => ({ ...current, education: current.education.filter((row) => row.id !== entry.id) }))} /></div><div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2"><LabeledInput label="Qualification" value={entry.qualification} onChange={(value) => updateEducation(entry.id, { qualification: value })} /><LabeledInput label="Field of study" value={entry.field} onChange={(value) => updateEducation(entry.id, { field: value })} /><LabeledInput label="Institution" value={entry.institution} onChange={(value) => updateEducation(entry.id, { institution: value })} /><LabeledInput label="Location" value={entry.location} onChange={(value) => updateEducation(entry.id, { location: value })} /><LabeledInput label="Start year" value={entry.startYear} onChange={(value) => updateEducation(entry.id, { startYear: value })} /><LabeledInput label="End year / expected" value={entry.endYear} onChange={(value) => updateEducation(entry.id, { endYear: value })} /><LabeledTextarea label="Details" rows={3} value={entry.details.join("\n")} onChange={(value) => updateEducation(entry.id, { details: lines(value) })} /></div></article>)}
      <Button type="button" variant="outline" className="mt-3 gap-2" onClick={() => setData((current) => ({ ...current, education: [...current.education, { id: crypto.randomUUID(), qualification: "", field: "", institution: "", location: "", startYear: "", endYear: "", details: [] }] }))}><FilePlus2 className="size-4" />Add education</Button>
    </CareerSection>

    <CareerSection title="Work Experience" description="Describe your roles, responsibilities and measurable outcomes.">
      {data.experiences.map((entry) => <article key={entry.id} className="rounded-xl bg-brand-cloud/60 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-medium text-brand-ink">{entry.title || entry.organization || "Experience record"}</h3><IconButton label="Remove work experience" onClick={() => setData((current) => ({ ...current, experiences: current.experiences.filter((row) => row.id !== entry.id) }))} /></div><div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2"><LabeledInput label="Role / title" value={entry.title} onChange={(value) => updateExperience(entry.id, { title: value })} /><LabeledInput label="Organization" value={entry.organization} onChange={(value) => updateExperience(entry.id, { organization: value })} /><LabeledInput label="Start date" value={entry.startDate} onChange={(value) => updateExperience(entry.id, { startDate: value })} placeholder="Month / year" /><LabeledInput label="End date" value={entry.endDate} onChange={(value) => updateExperience(entry.id, { endDate: value })} placeholder="Present or month / year" /><LabeledInput label="Location" value={entry.location} onChange={(value) => updateExperience(entry.id, { location: value })} /><LabeledTextarea label="Responsibilities and outcomes" rows={5} maxLength={2400} value={entry.bullets.join("\n")} onChange={(value) => updateExperience(entry.id, { bullets: lines(value) })} /></div></article>)}
      <Button type="button" variant="outline" className="mt-3 gap-2" onClick={() => setData((current) => ({ ...current, experiences: [...current.experiences, { id: crypto.randomUUID(), title: "", organization: "", startDate: "", endDate: "", location: "", bullets: [] }] }))}><FilePlus2 className="size-4" />Add work experience</Button>
    </CareerSection>

    <CareerSection title="Certifications" description="Add professional certifications and verified credential links where available.">
      {data.certifications.map((entry) => <article key={entry.id} className="grid min-w-0 gap-2 sm:grid-cols-[1fr_1fr_1fr_1.5fr_auto]"><Input aria-label="Certification title" value={entry.title} onChange={(event) => updateCertification(entry.id, { title: event.target.value })} placeholder="Certification" /><Input aria-label="Certification issuer" value={entry.issuer} onChange={(event) => updateCertification(entry.id, { issuer: event.target.value })} placeholder="Issuer" /><Input aria-label="Certification date" value={entry.date} onChange={(event) => updateCertification(entry.id, { date: event.target.value })} placeholder="Date" /><Input aria-label="Certification link" value={entry.link} onChange={(event) => updateCertification(entry.id, { link: event.target.value })} placeholder="https:// credential link" /><IconButton label="Remove certification" onClick={() => setData((current) => ({ ...current, certifications: current.certifications.filter((row) => row.id !== entry.id) }))} /></article>)}
      <Button type="button" variant="outline" className="mt-3 gap-2" onClick={() => setData((current) => ({ ...current, certifications: [...current.certifications, { id: crypto.randomUUID(), title: "", issuer: "", date: "", link: "" }] }))}><FilePlus2 className="size-4" />Add certification</Button>
    </CareerSection>

    <CareerSection title="Projects & Contributions" description="Share non-confidential projects and contributions that you are comfortable presenting professionally.">
      {data.projects.map((entry) => <article key={entry.id} className="rounded-xl bg-brand-cloud/60 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-medium text-brand-ink">{entry.title || "Project record"}</h3><IconButton label="Remove project" onClick={() => setData((current) => ({ ...current, projects: current.projects.filter((row) => row.id !== entry.id) }))} /></div><div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2"><LabeledInput label="Project name" value={entry.title} onChange={(value) => updateProject(entry.id, { title: value })} /><LabeledInput label="Role / description" value={entry.descriptor} onChange={(value) => updateProject(entry.id, { descriptor: value })} /><LabeledInput label="Technologies" value={entry.technologies.join(", ")} onChange={(value) => updateProject(entry.id, { technologies: value.split(",").map((item) => item.trim()).filter(Boolean) })} /><LabeledInput label="Public project link" value={entry.link} onChange={(value) => updateProject(entry.id, { link: value })} /><LabeledTextarea label="Details and outcomes" rows={4} maxLength={2400} value={entry.bullets.join("\n")} onChange={(value) => updateProject(entry.id, { bullets: lines(value) })} /></div></article>)}
      <Button type="button" variant="outline" className="mt-3 gap-2" onClick={() => setData((current) => ({ ...current, projects: [...current.projects, { id: crypto.randomUUID(), title: "", descriptor: "", technologies: [], bullets: [], link: "" }] }))}><FilePlus2 className="size-4" />Add project</Button>
    </CareerSection>

    <CareerSection title="Achievements & Highlights" description="Use accurate, supportable details and leave out confidential information.">
      <LabeledTextarea label="Achievements" rows={6} maxLength={12000} value={data.achievements.join("\n")} onChange={(value) => setData((current) => ({ ...current, achievements: lines(value) }))} hint="One achievement per line" />
    </CareerSection>

    <CareerSection title="Professional Links & Languages" description="These links and language details remain private in your profile and are not published automatically.">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2"><LabeledInput label="Resume contact email (optional)" type="email" value={data.contact.email} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, email: value } }))} /><LabeledInput label="Professional phone (optional)" type="tel" value={data.contact.phone} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, phone: value } }))} /><LabeledInput label="Professional location" value={data.contact.location} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, location: value } }))} /><LabeledInput label="Time zone" value={data.contact.timeZone} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, timeZone: value } }))} placeholder="e.g. Asia/Kolkata" /><LabeledInput label="Work arrangement" value={data.contact.workArrangement} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, workArrangement: value } }))} placeholder="On-site, hybrid, remote" /><LabeledInput label="LinkedIn URL" value={data.contact.linkedin} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, linkedin: value } }))} /><LabeledInput label="GitHub URL" value={data.contact.github} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, github: value } }))} /><LabeledInput label="Portfolio URL" value={data.contact.portfolio} onChange={(value) => setData((current) => ({ ...current, contact: { ...current.contact, portfolio: value } }))} /></div>
      <div className="mt-4 flex flex-col gap-3">{data.languages.map((entry) => <div key={entry.id} className="flex min-w-0 flex-col gap-2 sm:flex-row"><Input aria-label="Language" value={entry.name} maxLength={80} onChange={(event) => setData((current) => ({ ...current, languages: current.languages.map((row) => row.id === entry.id ? { ...row, name: event.target.value } : row) }))} placeholder="Language" /><Input aria-label="Language proficiency" value={entry.proficiency} maxLength={80} onChange={(event) => setData((current) => ({ ...current, languages: current.languages.map((row) => row.id === entry.id ? { ...row, proficiency: event.target.value } : row) }))} placeholder="Proficiency" /><IconButton label="Remove language" onClick={() => setData((current) => ({ ...current, languages: current.languages.filter((row) => row.id !== entry.id) }))} /></div>)}</div>
      <Button type="button" variant="outline" className="mt-3 gap-2" onClick={() => setData((current) => ({ ...current, languages: [...current.languages, { id: crypto.randomUUID(), name: "", proficiency: "" }] }))}><Plus className="size-4" />Add language</Button>
    </CareerSection>

    {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"><p className="mr-auto text-xs text-brand-muted">These professional details are private to your account and are separate from your public CSC profile sharing choices.</p><Button type="button" onClick={() => void save()} disabled={saving} className="w-full gap-2 sm:w-auto">{saving ? <Loader2 className="size-4 animate-spin" /> : null}{saving ? "Saving professional profile…" : "Save Professional Profile"}</Button></div>
  </div>;
}

function CareerSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl bg-white p-5 ring-1 ring-brand-border sm:p-6"><h2 className="text-lg font-semibold text-brand-ink">{title}</h2><p className="mt-1 text-sm leading-6 text-brand-muted">{description}</p><div className="mt-4 flex min-w-0 flex-col gap-3">{children}</div></section>;
}

function LabeledInput({ label, value, onChange, placeholder, type = "text", maxLength = 500 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; maxLength?: number }) {
  return <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-brand-ink">{label}<Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} /></label>;
}

function LabeledTextarea({ label, value, onChange, rows, maxLength, hint }: { label: string; value: string; onChange: (value: string) => void; rows: number; maxLength?: number; hint?: string }) {
  return <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-brand-ink">{label}<Textarea rows={rows} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className="w-full min-w-0 resize-y" />{hint ? <span className="text-xs font-normal text-brand-muted">{hint}</span> : null}</label>;
}

function TokenEditor({ title, values, onChange, placeholder }: { title: string; values: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = React.useState("");
  return <div><h3 className="mb-2 text-sm font-medium text-brand-ink">{title}</h3><div className="flex min-w-0 flex-col gap-2 sm:flex-row"><Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={placeholder} maxLength={100} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); const value = draft.trim(); if (value && !values.includes(value)) onChange([...values, value]); setDraft(""); } }} /><Button type="button" variant="outline" onClick={() => { const value = draft.trim(); if (value && !values.includes(value)) onChange([...values, value]); setDraft(""); }}>Add</Button></div><ul className="mt-3 flex flex-wrap gap-2">{values.map((value) => <li key={value} className="inline-flex max-w-full items-center gap-2 rounded-full bg-brand-cloud px-3 py-1.5 text-sm text-brand-secondary"><span className="break-words">{value}</span><button type="button" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((item) => item !== value))} className="text-brand-muted hover:text-red-700">×</button></li>)}</ul></div>;
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" aria-label={label} onClick={onClick} className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><Trash2 className="size-4" aria-hidden="true" /></button>;
}

function lines(value: string) { return value.split("\n").map((line) => line.trim()).filter(Boolean); }
