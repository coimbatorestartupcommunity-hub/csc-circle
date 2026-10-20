const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/avif",
  "image/heic",
  "image/heif",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "tif", "tiff", "avif", "heic", "heif"]);

export function isSupportedStartupImage(file: { type: string; name: string }) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  // Mobile file pickers sometimes report an empty or generic MIME type. The
  // server still verifies the decoded format from the file signature via
  // Sharp, so a recognized filename is safe to accept here as a hint.
  return IMAGE_MIME_TYPES.has(file.type.toLowerCase()) || IMAGE_EXTENSIONS.has(extension);
}

export function isSupportedStartupImageFormat(format: string | undefined) {
  return format === "jpeg" || format === "png" || format === "webp" || format === "gif" || format === "tiff" || format === "heif";
}
