import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { clipMembershipCardPng, createMembershipCardPdf, membershipCardCaptureOptions, membershipCardExportMatte } from "@/lib/member/card-export";

describe("membership card export", () => {
  it("uses a non-white matte so rounded corners remain visible in white-background viewers", () => {
    expect(membershipCardCaptureOptions).toEqual({ pixelRatio: 3, cacheBust: true });
    expect(membershipCardCaptureOptions).not.toHaveProperty("backgroundColor");
    expect(membershipCardExportMatte).not.toBe("#FFFFFF");
  });

  it("clips the captured bitmap to the card's rounded corners before exporting it", async () => {
    const order: string[] = [];
    const context = {
      fillStyle: "",
      fillRect: vi.fn(() => order.push("matte")),
      beginPath: vi.fn(() => order.push("path")),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
      clip: vi.fn(() => order.push("clip")),
      drawImage: vi.fn(() => order.push("draw")),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toDataURL: vi.fn(() => "data:image/png;base64,rounded"),
    } as unknown as HTMLCanvasElement;
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(canvas);

    class MockImage {
      naturalWidth = 300;
      naturalHeight = 375;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { this.onload?.(); }
    }
    vi.stubGlobal("Image", MockImage);

    try {
      await expect(clipMembershipCardPng("data:image/png;base64,source", 20, 100)).resolves.toBe(
        "data:image/png;base64,rounded",
      );
      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(375);
      expect(context.fillStyle).toBe(membershipCardExportMatte);
      expect(order.indexOf("matte")).toBeLessThan(order.indexOf("clip"));
      expect(context.moveTo).toHaveBeenCalledWith(60, 0);
      expect(context.bezierCurveTo).toHaveBeenCalledTimes(4);
      expect(order.indexOf("clip")).toBeLessThan(order.indexOf("draw"));
      expect(canvas.toDataURL).toHaveBeenCalledWith("image/png");
    } finally {
      createElementSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("creates a card-sized 4:5 PDF containing the same PNG artwork", async () => {
    const transparentPixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/7a8AAAAASUVORK5CYII=";
    const bytes = await createMembershipCardPdf(transparentPixel);
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPages();

    expect(pages).toHaveLength(1);
    expect(pages[0].getSize()).toEqual({ width: 288, height: 360 });
    expect(pages[0].node.Resources()).toBeTruthy();
    expect(pages[0].node.Contents()).toBeTruthy();
  });
});
