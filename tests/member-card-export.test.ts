import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createMembershipCardPdf, membershipCardCaptureOptions } from "@/lib/member/card-export";

describe("membership card export", () => {
  it("leaves the PNG canvas transparent outside the rounded card", () => {
    expect(membershipCardCaptureOptions).toEqual({ pixelRatio: 3, cacheBust: true });
    expect(membershipCardCaptureOptions).not.toHaveProperty("backgroundColor");
  });

  it("creates a card-sized 4:5 PDF containing the same PNG artwork", async () => {
    const transparentPixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/7a8AAAAASUVORK5CYII=";
    const bytes = await createMembershipCardPdf(transparentPixel);
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPages();

    expect(pages).toHaveLength(1);
    expect(pages[0].getSize()).toEqual({ width: 288, height: 360 });
    expect(pages[0].node.Resources()).toBeTruthy();
  });
});
