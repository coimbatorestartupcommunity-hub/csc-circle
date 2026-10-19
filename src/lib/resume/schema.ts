import { z } from "zod";

const cleanText = (max: number) => z.string().trim().max(max);
const linkSchema = z.object({ label: cleanText(60), url: z.string().trim().url().max(300).refine((value) => /^https:\/\//i.test(value), "Use an HTTPS link.") });
const entrySchema = z.object({
  id: z.string().uuid(),
  title: cleanText(140),
  organization: cleanText(140),
  location: cleanText(100),
  startDate: cleanText(40),
  endDate: cleanText(40),
  description: cleanText(3000),
  bullets: z.array(cleanText(1000)).max(20),
  technologies: cleanText(400),
  url: z.string().trim().max(300).optional().refine((value) => !value || /^https:\/\//i.test(value), "Use an HTTPS link."),
});

export const resumeSchema = z.object({
  name: cleanText(100).min(2),
  headline: cleanText(160),
  email: z.string().trim().email().max(254).or(z.literal("")),
  phone: cleanText(40),
  location: cleanText(120),
  links: z.array(linkSchema).max(8),
  summary: cleanText(6000),
  skills: z.array(z.object({ id: z.string().uuid(), category: cleanText(80), items: z.array(cleanText(80)).max(40) })).max(20),
  experience: z.array(entrySchema).max(30),
  projects: z.array(entrySchema).max(30),
  education: z.array(entrySchema).max(20),
  certifications: z.array(entrySchema).max(30),
  achievements: z.array(entrySchema).max(30),
  visibleSections: z.object({ summary: z.boolean(), skills: z.boolean(), experience: z.boolean(), projects: z.boolean(), education: z.boolean(), certifications: z.boolean(), achievements: z.boolean() }),
});

export type ResumeData = z.infer<typeof resumeSchema>;

export function blankResume(): ResumeData {
  return { name: "", headline: "", email: "", phone: "", location: "", links: [], summary: "", skills: [], experience: [], projects: [], education: [], certifications: [], achievements: [], visibleSections: { summary: true, skills: true, experience: true, projects: true, education: true, certifications: true, achievements: true } };
}

export function profileResumeDefaults(profile: { full_name?: string | null; display_name?: string | null; email?: string | null; whatsapp?: string | null; city?: string | null; skills?: string[] | null }): ResumeData {
  return { ...blankResume(), name: profile.full_name || profile.display_name || "", email: profile.email || "", phone: profile.whatsapp || "", location: profile.city || "", skills: profile.skills?.length ? [{ id: crypto.randomUUID(), category: "Skills", items: profile.skills }] : [] };
}
