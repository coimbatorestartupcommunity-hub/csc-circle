import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { clipMembershipCardPng, createMembershipCardExportNode, createMembershipCardPdf, membershipCardCaptureOptions } from "@/lib/member/card-export";

describe("membership card export", () => {
  it("renders the 4:5 card at 4K while keeping the canvas within mobile pixel limits", () => {
    expect(membershipCardCaptureOptions(480)).toEqual({ pixelRatio: 8, cacheBust: true });
    expect(membershipCardCaptureOptions(420).pixelRatio * 420).toBeCloseTo(3840);
    expect(membershipCardCaptureOptions(360).pixelRatio * 360).toBeCloseTo(3840);
    expect(membershipCardCaptureOptions(300).pixelRatio).toBe(12);
  });

  it("inlines authenticated and local image assets into an isolated export clone", async () => {
    const source = document.createElement("div");
    const image = document.createElement("img");
    image.src = "/api/member/portrait";
    source.append(image);
    document.body.append(source);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["portrait"], { type: "image/webp" }),
    } as Response);

    try {
      const clone = await createMembershipCardExportNode(source);
      const clonedImage = clone.querySelector("img");
      expect(clone).not.toBe(source);
      expect(clone.style.position).toBe("relative");
      expect(clone.style.left).toBe("auto");
      expect(clone.parentElement?.style.left).toBe("-10000px");
      expect(clonedImage?.src).toMatch(/^data:image\/webp;base64,/);
      expect(clonedImage?.hasAttribute("srcset")).toBe(false);
      expect(image.getAttribute("src")).toBe("/api/member/portrait");
      expect(fetchSpy).toHaveBeenCalledWith("http://localhost:3000/api/member/portrait", {
        credentials: "same-origin",
        cache: "no-store",
      });
      clone.parentElement?.remove();
    } finally {
      fetchSpy.mockRestore();
      source.remove();
    }
  });

  it("normalizes only image-related shadows for mobile WebKit exports", async () => {
    const source = document.createElement("div");
    const media = document.createElement("span");
    const image = document.createElement("img");
    media.className = "shadow-sm";
    image.src = "data:image/png;base64,aGVsbG8=";
    source.append(media);
    media.append(image);
    document.body.append(source);
    try {
      const clone = await createMembershipCardExportNode(source, { normalizeMobileMediaEffects: true });
      expect(clone.querySelector("img")?.style.boxShadow).toBe("none");
      expect(clone.querySelector("span")?.style.boxShadow).toBe("none");
      expect(clone.parentElement?.style.left).toBe("-10000px");
      clone.parentElement?.remove();
    } finally {
      source.remove();
    }
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
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) })),
    };
    const clippedPng = new Blob(["rounded"], { type: "image/png" });
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) => callback(clippedPng)),
    } as unknown as HTMLCanvasElement;
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(canvas);
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:source-card");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    class MockImage {
      naturalWidth = 300;
      naturalHeight = 375;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { this.onload?.(); }
    }
    vi.stubGlobal("Image", MockImage);

    try {
      await expect(clipMembershipCardPng(new Blob(["source"], { type: "image/png" }), 20, 100)).resolves.toBe(clippedPng);
      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(375);
      expect(context.save).toHaveBeenCalledOnce();
      expect(context.moveTo).toHaveBeenCalledWith(60, 0);
      expect(context.bezierCurveTo).toHaveBeenCalledTimes(4);
      expect(order.indexOf("clip")).toBeLessThan(order.indexOf("draw"));
      expect(context.restore).toHaveBeenCalledOnce();
      expect(context).not.toHaveProperty("fillRect");
      expect(createObjectUrlSpy).toHaveBeenCalledOnce();
      expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:source-card");
      expect(canvas.toBlob).toHaveBeenCalledOnce();
    } finally {
      createElementSpy.mockRestore();
      createObjectUrlSpy.mockRestore();
      revokeObjectUrlSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("refuses to turn an empty browser capture into a downloadable blank card", async () => {
    const context = {
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      bezierCurveTo: vi.fn(), closePath: vi.fn(), clip: vi.fn(), drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([0, 0, 0, 0]) })),
    };
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue(canvas);
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:blank-card");
    vi.stubGlobal("Image", class {
      naturalWidth = 300; naturalHeight = 375;
      onload: (() => void) | null = null; onerror: (() => void) | null = null;
      set src(_value: string) { this.onload?.(); }
    });
    try {
      await expect(clipMembershipCardPng(new Blob(["blank"], { type: "image/png" }), 20, 100))
        .rejects.toThrow("membership card render was blank");
    } finally {
      createElementSpy.mockRestore();
      createObjectUrlSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("creates a card-sized 4:5 PDF containing the same PNG artwork", async () => {
    const alphaPng = await sharp({ create: { width: 8, height: 10, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } }).png().toBuffer();
    const bytes = await createMembershipCardPdf(new Blob([alphaPng], { type: "image/png" }));
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
