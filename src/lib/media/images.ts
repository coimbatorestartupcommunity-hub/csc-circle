import sharp from "sharp";
/** Reject active formats and decompress/strip metadata within explicit limits. */
export async function sanitizeImage(bytes: Buffer, mime: string) {
  if (bytes.length > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new Error("Invalid image type or size.");
  const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  const expected: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (metadata.format !== expected[mime] || (metadata.pages ?? 1) > 1) throw new Error("Invalid image contents.");
  return image.rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
}
