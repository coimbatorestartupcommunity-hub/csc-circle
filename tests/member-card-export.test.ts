import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { clipMembershipCardPng, createMembershipCardPdf, membershipCardCaptureOptions } from "@/lib/member/card-export";

describe("membership card export", () => {
  it("renders the long edge at 4K resolution without adding a background", () => {
    expect(membershipCardCaptureOptions(480)).toEqual({ pixelRatio: 8, cacheBust: true });
    expect(membershipCardCaptureOptions(1200).pixelRatio).toBe(4);
  });

  it("clips the captured bitmap to the card's rounded corners before exporting it", async () => {
    const order: string[] = [];
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
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
      expect(context.save).toHaveBeenCalledOnce();
      expect(context.moveTo).toHaveBeenCalledWith(60, 0);
      expect(context.bezierCurveTo).toHaveBeenCalledTimes(4);
      expect(order.indexOf("clip")).toBeLessThan(order.indexOf("draw"));
      expect(context.restore).toHaveBeenCalledOnce();
      expect(context).not.toHaveProperty("fillRect");
      expect(canvas.toDataURL).toHaveBeenCalledWith("image/png");
    } finally {
      createElementSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("creates a card-sized 4:5 PDF containing the same PNG artwork", async () => {
    const alphaPng = await sharp({ create: { width: 8, height: 10, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } }).png().toBuffer();
    const bytes = await createMembershipCardPdf(`data:image/png;base64,${alphaPng.toString("base64")}`);
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPages();

    expect(pages).toHaveLength(1);
    expect(pages[0].getSize()).toEqual({ width: 288, height: 360 });
    expect(pages[0].node.Resources()).toBeTruthy();
    expect(pages[0].node.Contents()).toBeTruthy();
    const resources = pdf.context.lookup(pages[0].node.Resources(), PDFDict);
    const images = resources.lookup(PDFName.of("XObject"), PDFDict);
    const imageRef = images.entries()[0][1];
    const embeddedImage = pdf.context.lookup(imageRef);
    expect(embeddedImage).toBeDefined();
    expect((embeddedImage as { dict?: PDFDict }).dict?.get(PDFName.of("SMask"))).toBeTruthy();
  });
});
