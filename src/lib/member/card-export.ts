/** Render the long edge at 4K while keeping the browser canvas within a safe scale. */
export function membershipCardCaptureOptions(cardHeightCssPx: number) {
  return {
  pixelRatio: Math.min(10, Math.max(4, Math.ceil(3840 / Math.max(1, cardHeightCssPx)))),
  cacheBust: true,
  } as const;
}

const CIRCLE_HANDLE = 0.55228475;

/**
 * Apply an anti-aliased rounded silhouette to the captured bitmap itself.
 * The pixels outside the card are intentionally transparent. Painting a matte
 * here would bake a rectangle into both PNG and PDF exports.
 */
export async function clipMembershipCardPng(
  pngDataUrl: string,
  cornerRadiusCssPx: number,
  cardWidthCssPx: number,
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const source = new Image();
    source.onload = () => resolve(source);
    source.onerror = () => reject(new Error("Could not load the membership card image."));
    source.src = pngDataUrl;
  });

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

  return canvas.toDataURL("image/png");
}

/**
 * Place the same 4:5 card artwork on a card-sized PDF page (4 × 5 inches).
 * No page background is painted; the PNG's alpha mask supplies the curved
 * corners, leaving the page transparent outside the card in capable viewers.
 */
export async function createMembershipCardPdf(pngDataUrl: string) {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle("CSC Circle Membership Card");
  pdf.setSubject("CSC Circle digital membership card");

  const image = await pdf.embedPng(pngDataUrl);
  const page = pdf.addPage([288, 360]);
  page.drawImage(image, { x: 0, y: 0, width: 288, height: 360 });

  return pdf.save();
}
