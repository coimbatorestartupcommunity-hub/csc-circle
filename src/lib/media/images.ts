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

/** Normalize public landscape artwork to consistent, metadata-free 4:3 WebP. */
export async function sanitizeLandscapeImage(bytes: Buffer, mime: string) {
  if (bytes.length > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new Error("Invalid image type or size.");
  const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  const expected: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (metadata.format !== expected[mime] || (metadata.pages ?? 1) > 1 || !metadata.width || !metadata.height || metadata.width < 640 || metadata.height < 480) {
    throw new Error("Choose a single-frame image at least 640 by 480 pixels.");
  }
  const { data, info } = await image
    .rotate()
    .resize(1600, 1200, { fit: "cover", position: "attention" })
    .webp({ quality: 88, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, size: info.size };
}

/** Event banners keep the 4:3 landscape contract. */
export const sanitizeEventBanner = sanitizeLandscapeImage;

/** Normalize collaboration featured/gallery artwork to metadata-free 5:3 WebP (logos are handled separately). */
export async function sanitizeCollaborationImage(bytes: Buffer, mime: string) {
  if (bytes.length > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new Error("Invalid image type or size.");
  const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  const expected: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (metadata.format !== expected[mime] || (metadata.pages ?? 1) > 1 || !metadata.width || !metadata.height || metadata.width < 640 || metadata.height < 384) {
    throw new Error("Choose a single-frame image at least 640 by 384 pixels.");
  }
  const { data, info } = await image
    .rotate()
    .resize(1600, 960, { fit: "cover", position: "attention" })
    .webp({ quality: 88, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, size: info.size };
}

/** Preserve the full partner mark inside a neutral square canvas for circular display. */
export async function sanitizeCollaborationLogo(bytes: Buffer, mime: string) {
  if (bytes.length > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new Error("Invalid image type or size.");
  const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  const expected: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (metadata.format !== expected[mime] || (metadata.pages ?? 1) > 1 || !metadata.width || !metadata.height || metadata.width < 48 || metadata.height < 48) {
    throw new Error("Choose a single-frame logo at least 48 × 48 px.");
  }
  const { data, info } = await image
    .rotate()
    .resize(720, 720, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .webp({ quality: 88, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, size: info.size };
}
