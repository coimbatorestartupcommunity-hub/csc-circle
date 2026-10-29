// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createEventPassPdf, eventPassCaptureOptions } from "@/lib/member/card-export";

describe("event pass PDF export", () => {
  it("renders a high-resolution pass within the mobile canvas budget", () => {
    expect(eventPassCaptureOptions(640)).toEqual({ pixelRatio: 6, cacheBust: true });
    expect(eventPassCaptureOptions(640).pixelRatio * 640).toBe(3840);
    expect(eventPassCaptureOptions(300).pixelRatio).toBe(12);
  });

  it("wraps the existing pass artwork in a downloadable PDF", async () => {
    const pngBytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nXcAAAAASUVORK5CYII="), (char) => char.charCodeAt(0));
    const pdfBytes = await createEventPassPdf(new Blob([pngBytes], { type: "image/png" }), "CSC CONNECT — Edition 2");
    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.load(pdfBytes);

    expect(pdf.getTitle()).toBe("CSC CONNECT — Edition 2");
    expect(pdf.getPageCount()).toBe(1);
  });
});
