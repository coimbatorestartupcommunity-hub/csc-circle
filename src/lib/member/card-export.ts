/** Render a card at up to 4K on its long edge while staying within mobile canvas limits. */
export function cardCaptureOptions(cardHeightCssPx: number) {
  return {
    // A 4:5 4K card is about 3,072 × 3,840 (11.8 MP), below common mobile
    // canvas pixel limits. Blob capture avoids holding a multi-megabyte
    // base64 string in addition to the render surfaces.
    pixelRatio: Math.min(12, 3840 / Math.max(1, cardHeightCssPx)),
    cacheBust: true,
  } as const;
}

/** The membership and event passes share the same mobile-safe capture budget. */
export const membershipCardCaptureOptions = cardCaptureOptions;
export const eventPassCaptureOptions = cardCaptureOptions;

/** Wait for the exact logo, portrait, QR and web fonts before rasterizing. */
export async function waitForMembershipCardAssets(element: HTMLElement) {
  if ("fonts" in document) await document.fonts.ready;
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(images.map(async (image) => {
    if (image.complete && image.naturalWidth > 0) return;
    try { await image.decode(); } catch { /* Avatar has a text fallback; QR is checked by the caller. */ }
  }));
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("Could not prepare a membership card image."));
    reader.onerror = () => reject(new Error("Could not prepare a membership card image."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Clone the card for export and inline image bytes before html-to-image
 * serializes the DOM. This avoids losing authenticated portrait responses,
 * local Next.js assets, or the data-URL QR during foreignObject capture.
 */
export async function createMembershipCardExportNode(
  element: HTMLElement,
  options: { normalizeMobileMediaEffects?: boolean } = {},
) {
  const sourceImages = Array.from(element.querySelectorAll("img"));
  const clone = element.cloneNode(true) as HTMLElement;
  const cloneImages = Array.from(clone.querySelectorAll("img"));
  const bounds = element.getBoundingClientRect();
  // Keep only the wrapper off-screen. A fixed-position card node with a large
  // negative `left` is captured as an empty foreignObject by WebKit, producing
  // a fully transparent PNG/PDF even though the on-screen card is visible.
  const host = document.createElement("div");
  Object.assign(clone.style, {
    position: "relative",
    top: "auto",
    left: "auto",
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    margin: "0",
    transform: "none",
    transition: "none",
    animation: "none",
    pointerEvents: "none",
  });
  Object.assign(host.style, {
    position: "fixed",
    top: "0",
    left: "-10000px",
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "-1",
  });
  clone.setAttribute("aria-hidden", "true");
  if (options.normalizeMobileMediaEffects) {
    // WebKit's foreignObject renderer can paint Tailwind's multi-layer media
    // shadows as detached streaks in exported PNG/PDF files. Keep the images,
    // borders and card silhouette intact while removing those flaky effects.
    for (const image of cloneImages) {
      image.style.boxShadow = "none";
      image.style.filter = "none";
      let ancestor = image.parentElement;
      while (ancestor && ancestor !== clone) {
        ancestor.style.boxShadow = "none";
        ancestor.style.filter = "none";
        ancestor = ancestor.parentElement;
      }
    }
  }
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await Promise.all(sourceImages.map(async (source, index) => {
      const target = cloneImages[index];
      const sourceUrl = source.currentSrc || source.src;
      if (!target || !sourceUrl) throw new Error("A membership card image is missing.");
      target.loading = "eager";
      target.decoding = "sync";
      target.removeAttribute("srcset");
      target.removeAttribute("sizes");
      if (sourceUrl.startsWith("data:")) {
        target.src = sourceUrl;
        return;
      }

      const response = await fetch(sourceUrl, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("A membership card image could not be loaded.");
      const imageBlob = await response.blob();
      if (!imageBlob.type.startsWith("image/")) throw new Error("A membership card image could not be loaded.");
      target.src = await blobToDataUrl(imageBlob);
    }));
    await waitForMembershipCardAssets(clone);
    return clone;
  } catch (error) {
    host.remove();
    throw error;
  }
}

/** Event passes use the same authenticated-image inlining used by digital IDs. */
export const createEventPassExportNode = createMembershipCardExportNode;
export const waitForEventPassAssets = waitForMembershipCardAssets;

const CIRCLE_HANDLE = 0.55228475;

/**
 * Apply an anti-aliased rounded silhouette to the captured bitmap itself.
 * The pixels outside the card are intentionally transparent. Painting a matte
 * here would bake a rectangle into both PNG and PDF exports.
 */
export async function clipMembershipCardPng(
  pngBlob: Blob,
  cornerRadiusCssPx: number,
  cardWidthCssPx: number,
): Promise<Blob> {
  const sourceUrl = URL.createObjectURL(pngBlob);
  let image: HTMLImageElement;
  try {
    image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const source = new Image();
      source.onload = () => resolve(source);
      source.onerror = () => reject(new Error("Could not load the membership card image."));
      source.src = sourceUrl;
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the membership card image.");

  const scale = image.naturalWidth / Math.max(1, cardWidthCssPx);
  const radius = Math.min(
    Math.max(0, cornerRadiusCssPx * scale),
    image.naturalWidth / 2,
    image.naturalHeight / 2,
  );
  const width = canvas.width;
  const height = canvas.height;

  context.save();
  context.beginPath();
  context.moveTo(radius, 0);
  context.lineTo(width - radius, 0);
  context.bezierCurveTo(width - radius + radius * CIRCLE_HANDLE, 0, width, radius - radius * CIRCLE_HANDLE, width, radius);
  context.lineTo(width, height - radius);
  context.bezierCurveTo(width, height - radius + radius * CIRCLE_HANDLE, width - radius + radius * CIRCLE_HANDLE, height, width - radius, height);
  context.lineTo(radius, height);
  context.bezierCurveTo(radius - radius * CIRCLE_HANDLE, height, 0, height - radius + radius * CIRCLE_HANDLE, 0, height - radius);
  context.lineTo(0, radius);
  context.bezierCurveTo(0, radius - radius * CIRCLE_HANDLE, radius - radius * CIRCLE_HANDLE, 0, radius, 0);
  context.closePath();
  context.clip();
  context.drawImage(image, 0, 0, width, height);
  context.restore();

  // Refuse to deliver a valid-looking PDF wrapper around an empty Safari
  // capture. Sample a small grid instead of scanning all ~12M export pixels.
  const samplePoints = [
    [0.5, 0.5], [0.25, 0.25], [0.75, 0.25],
    [0.25, 0.75], [0.75, 0.75], [0.5, 0.15], [0.5, 0.85],
  ];
  const hasVisibleCardPixels = samplePoints.some(([x, y]) =>
    context.getImageData(Math.floor(width * x), Math.floor(height * y), 1, 1).data[3] > 0,
  );
  if (!hasVisibleCardPixels) throw new Error("The membership card render was blank. Please try downloading it again.");

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not prepare the membership card PNG."));
    }, "image/png");
  });
}

/**
 * Place the same 4:5 card artwork on a card-sized PDF page (4 × 5 inches).
 * No page background is painted; the PNG's alpha mask supplies the curved
 * corners, leaving the page transparent outside the card in capable viewers.
 */
export async function createMembershipCardPdf(pngBlob: Blob) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle("CSC Circle Membership Card");
  pdf.setSubject("CSC Circle digital membership card");

  const imageBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result instanceof ArrayBuffer
      ? resolve(reader.result)
      : reject(new Error("Could not read the membership card image."));
    reader.onerror = () => reject(new Error("Could not read the membership card image."));
    reader.readAsArrayBuffer(pngBlob);
  });
  const image = await pdf.embedPng(new Uint8Array(imageBytes));
  const page = pdf.addPage([288, 360]);
  page.drawImage(image, { x: 0, y: 0, width: 288, height: 360 });

  return pdf.save();
}

/** Put the rendered event pass artwork on a compact, printable PDF page. */
export async function createEventPassPdf(pngBlob: Blob, title: string) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(title || "CSC Circle Event Pass");
  pdf.setSubject("CSC Circle digital event pass");

  const imageBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result instanceof ArrayBuffer
      ? resolve(reader.result)
      : reject(new Error("Could not read the event pass image."));
    reader.onerror = () => reject(new Error("Could not read the event pass image."));
    reader.readAsArrayBuffer(pngBlob);
  });
  const image = await pdf.embedPng(new Uint8Array(imageBytes));
  const scale = Math.min(432 / image.width, 576 / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const page = pdf.addPage([width, height]);
  page.drawImage(image, { x: 0, y: 0, width, height });
  return pdf.save();
}
