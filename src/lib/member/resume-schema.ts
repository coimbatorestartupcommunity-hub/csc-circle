import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).default("");
const safeLink = z.string().trim().max(500).default("").refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}, "Use a valid http or https link.");

export const resumeDataSchema = z.object({
  headline: optionalText(180),
  contact: z.object({
    email: z.string().trim().max(254).default("").refine((value) => !value || z.email().safeParse(value).success, "Enter a valid resume email."),
    phone: optionalText(40),
    location: optionalText(120),
    linkedin: safeLink,
    github: safeLink,
    portfolio: safeLink,
  }).default({ email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" }),
  summary: optionalText(4000),
  skills: z.array(z.object({ category: z.string().trim().min(1).max(100), items: z.array(z.string().trim().min(1).max(80)).max(40) })).max(20).default([]),
  experiences: z.array(z.object({
    title: z.string().trim().max(120).default(""), organization: z.string().trim().max(160).default(""),
    startDate: z.string().trim().max(40).default(""), endDate: z.string().trim().max(40).default(""), location: z.string().trim().max(120).default(""),
    bullets: z.array(z.string().trim().min(1).max(1200)).max(20).default([]),
  })).max(12).default([]),
  projects: z.array(z.object({
    title: z.string().trim().max(160).default(""), descriptor: z.string().trim().max(200).default(""), technologies: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    bullets: z.array(z.string().trim().min(1).max(1200)).max(20).default([]), link: safeLink,
  })).max(16).default([]),
  education: z.array(z.object({
    qualification: z.string().trim().max(160).default(""), field: z.string().trim().max(160).default(""), institution: z.string().trim().max(200).default(""), location: z.string().trim().max(120).default(""),
    startYear: z.string().trim().max(20).default(""), endYear: z.string().trim().max(30).default(""), details: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
  })).max(12).default([]),
  certifications: z.array(z.object({ title: z.string().trim().max(200).default(""), issuer: z.string().trim().max(160).default(""), date: z.string().trim().max(40).default(""), link: safeLink })).max(30).default([]),
  achievements: z.array(z.string().trim().min(1).max(1200)).max(30).default([]),
  visibility: z.object({ summary: z.boolean().default(true), skills: z.boolean().default(true), experiences: z.boolean().default(true), projects: z.boolean().default(true), education: z.boolean().default(true), certifications: z.boolean().default(true), achievements: z.boolean().default(true) }).default({ summary: true, skills: true, experiences: true, projects: true, education: true, certifications: true, achievements: true }),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;

export const emptyResumeData: ResumeData = {
  headline: "",
  contact: { email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" },
  summary: "",
  skills: [], experiences: [], projects: [], education: [], certifications: [], achievements: [],
  visibility: { summary: true, skills: true, experiences: true, projects: true, education: true, certifications: true, achievements: true },
};
