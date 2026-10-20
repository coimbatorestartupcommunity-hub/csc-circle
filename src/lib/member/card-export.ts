/**
 * Keep mobile canvas memory bounded while retaining print-sharp output.
 * The card is rendered at about 1,440 px on its long edge (roughly 288 DPI
 * when placed on the 4 × 5 inch PDF page).
 */
export function membershipCardCaptureOptions(cardHeightCssPx: number) {
  return {
    pixelRatio: Math.min(4, Math.max(3, Math.ceil(1440 / Math.max(1, cardHeightCssPx)))),
    cacheBust: true,
  } as const;
}

/** Wait for the exact logo, portrait, QR and web fonts before rasterizing. */
export async function waitForMembershipCardAssets(element: HTMLElement) {
  if ("fonts" in document) await document.fonts.ready;
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(images.map(async (image) => {
    if (image.complete && image.naturalWidth > 0) return;
    try { await image.decode(); } catch { /* Avatar has a text fallback; QR is checked by the caller. */ }
  }));
}

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
