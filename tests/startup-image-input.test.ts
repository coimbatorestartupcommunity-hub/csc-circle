import { describe, expect, it } from "vitest";
import { isSupportedStartupImage, isSupportedStartupImageFormat } from "@/lib/startups/image-input";

describe("startup image input validation", () => {
  it.each([
    ["image/jpeg", "founder.jpg"],
    ["image/jpeg", "founder.jpeg"],
    ["image/png", "founder.png"],
    ["image/webp", "founder.webp"],
    ["image/gif", "founder.gif"],
    ["image/tiff", "founder.tiff"],
    ["image/avif", "founder.avif"],
    ["image/heic", "founder.heic"],
  ])("accepts %s (%s)", (type, name) => {
    expect(isSupportedStartupImage({ type, name })).toBe(true);
  });

  it("accepts a supported extension when a mobile browser omits MIME type", () => {
    expect(isSupportedStartupImage({ type: "", name: "founder.JPEG" })).toBe(true);
    expect(isSupportedStartupImage({ type: "application/octet-stream", name: "founder.jpg" })).toBe(true);
  });

  it("rejects unsafe or unsupported inputs", () => {
    expect(isSupportedStartupImage({ type: "image/svg+xml", name: "logo.svg" })).toBe(false);
    expect(isSupportedStartupImage({ type: "text/html", name: "profile.html" })).toBe(false);
    expect(isSupportedStartupImage({ type: "", name: "founder.bmp" })).toBe(false);
  });

  it("only accepts formats that can be normalized by the server image pipeline", () => {
    for (const format of ["jpeg", "png", "webp", "gif", "tiff", "heif"]) {
      expect(isSupportedStartupImageFormat(format)).toBe(true);
    }
    expect(isSupportedStartupImageFormat("svg")).toBe(false);
    expect(isSupportedStartupImageFormat(undefined)).toBe(false);
  });
});
