// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createMemberResumePdf } from "@/lib/member/resume-pdf";
import { emptyResumeData, resumeDataSchema } from "@/lib/member/resume-schema";

describe("CSC member resume PDF", () => {
  it("embeds the member-selected resume in a searchable A4 PDF", async () => {
    const data = resumeDataSchema.parse({
      ...emptyResumeData,
      headline: "Member-selected Product Designer",
      summary: "Synthetic resume content for a secure export regression test.",
      contact: { email: "resume@example.test", phone: "", location: "Coimbatore", linkedin: "", github: "", portfolio: "" },
      skills: [{ category: "Design", items: ["Research", "Prototyping"] }],
      experiences: [{ title: "Designer", organization: "Synthetic Studio", startDate: "2024", endDate: "Present", location: "Coimbatore", bullets: ["Designed accessible member journeys."] }],
    });
    const bytes = await createMemberResumePdf("Synthetic CSC Member", data);
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
    expect(document.getPage(0).getWidth()).toBe(595);
    expect(document.getPage(0).getHeight()).toBe(842);
    expect(document.getTitle()).toBe("Synthetic CSC Member — Resume");
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("creates additional A4 pages instead of clipping long resume content", async () => {
    const data = resumeDataSchema.parse({ ...emptyResumeData, achievements: Array.from({ length: 30 }, (_, index) => `Synthetic achievement ${index + 1}: ${"detailed member-entered information that wraps across several lines in the narrow A4 resume layout. ".repeat(8)}`) });
    const bytes = await createMemberResumePdf("Synthetic Member", data);
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(1);
    for (const page of document.getPages()) {
      expect(page.getWidth()).toBe(595);
      expect(page.getHeight()).toBe(842);
    }
  }, 30000);
});
