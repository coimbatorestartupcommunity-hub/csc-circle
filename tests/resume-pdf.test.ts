// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { blankResume, resumeSchema } from "@/lib/resume/schema";
import { renderResumePdf } from "@/lib/resume/pdf";

describe("member resume PDF export", () => {
  it("renders searchable A4 pages with real resume text and links", async () => {
    const parsed = resumeSchema.parse({
      ...blankResume(),
      name: "Vikash Saravanan",
      headline: "Founder & Lead System Engineer",
      email: "vikash@example.test",
      links: [{ label: "Portfolio", url: "https://example.test" }],
      summary: "A student and technology professional building practical products.",
      skills: [{ id: "8e43667b-ea44-4119-89f7-92daeb1be610", category: "Engineering", items: ["TypeScript", "React", "PostgreSQL"] }],
      experience: [{ id: "ad6ef54b-0f53-4e52-a907-718e2670ef92", title: "Lead Engineer", organization: "CSC Circle", location: "Coimbatore", startDate: "2025", endDate: "Present", description: "Built platform workflows.", bullets: ["Delivered accessible member features."], technologies: "", url: "" }],
    });
    const bytes = await renderResumePdf(parsed);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBe(595);
    expect(doc.getPage(0).getHeight()).toBe(842);
    expect(doc.getPage(0).node.Annots()?.size()).toBeGreaterThan(0);
    expect(bytes.length).toBeGreaterThan(10_000);
  });

  it("paginates long resumes without dropping the document", async () => {
    const base = blankResume();
    const data = resumeSchema.parse({
      ...base,
      name: "Resume Test",
      summary: "A long professional summary. ".repeat(80),
      experience: Array.from({ length: 12 }, (_, index) => ({
        id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        title: `Role ${index + 1}`, organization: "Community Product Studio", location: "Coimbatore",
        startDate: "2024", endDate: "2025", description: "", bullets: ["Contributed to projects and community learning.".repeat(4)],
        technologies: "TypeScript, React", url: "",
      })),
    });
    const doc = await PDFDocument.load(await renderResumePdf(data));
    expect(doc.getPageCount()).toBeGreaterThan(1);
    for (const page of doc.getPages()) {
      expect(page.getWidth()).toBe(595);
      expect(page.getHeight()).toBe(842);
    }
  });
});
