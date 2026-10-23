// @vitest-environment node
import { it, expect } from "vitest";
import sharp from "sharp";
import { sanitizeImage, sanitizeCollaborationImage, sanitizeCollaborationLogo } from "@/lib/media/images";
it("re-encodes genuine images and returns bounded WebP dimensions", async () => {
  const source = await sharp({ create: { width: 40, height: 50, channels: 3, background: "white" } }).png().toBuffer();
  const result = await sanitizeImage(source, "image/png");
  expect(result.info.format).toBe("webp"); expect(result.info.width).toBe(40); expect(result.info.height).toBe(50);
});
it("rejects active content, MIME spoofing, and oversized files", async () => {
  await expect(sanitizeImage(Buffer.from("<svg onload='alert(1)'/>"), "image/svg+xml")).rejects.toThrow();
  await expect(sanitizeImage(Buffer.from("not a jpeg"), "image/jpeg")).rejects.toThrow();
  await expect(sanitizeImage(Buffer.alloc(5*1024*1024+1), "image/png")).rejects.toThrow();
});

it("normalizes collaboration artwork to 4:3 and preserves rectangular logo artwork", async () => {
  const landscape = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#673ab7" } }).png().toBuffer();
  const collaboration = await sanitizeCollaborationImage(landscape, "image/png");
  expect(collaboration.width).toBe(1600);
  expect(collaboration.height).toBe(1200);
  expect((await sharp(collaboration.data).metadata()).format).toBe("webp");

  const rectangular = await sharp({ create: { width: 600, height: 300, channels: 4, background: "#ffffff" } }).png().toBuffer();
  const logo = await sanitizeCollaborationLogo(rectangular, "image/png");
  expect(logo.width).toBe(720);
  expect(logo.height).toBe(720);
  expect((await sharp(logo.data).metadata()).format).toBe("webp");
});
