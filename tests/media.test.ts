// @vitest-environment node
import { it, expect } from "vitest";
import sharp from "sharp";
import { sanitizeImage } from "@/lib/media/images";
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
