/** A subtle CSC lavender matte keeps the rounded silhouette visible in viewers that use a white canvas. */
export const membershipCardExportMatte = "#F1ECFF";

export const membershipCardCaptureOptions = {
  pixelRatio: 3,
  cacheBust: true,
} as const;

const CIRCLE_HANDLE = 0.55228475;

/**
 * Apply the card's rounded silhouette to the captured bitmap itself.
 * html-to-image can retain the element's rectangular background in its PNG,
 * even when the live element clips correctly. Paint a subtle CSC matte first,
 * then clip the captured card over it so the curved silhouette remains visible
 * even in image/PDF viewers that otherwise show transparency as white.
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

  context.fillStyle = membershipCardExportMatte;
  context.fillRect(0, 0, width, height);
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

  return canvas.toDataURL("image/png");
}

/**
 * Place the same 4:5 card artwork on a card-sized PDF page (4 × 5 inches),
 * with a matching matte behind its rounded corners so PDF viewers do not
 * make the card appear square against their default white page background.
 */
export async function createMembershipCardPdf(pngDataUrl: string) {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle("CSC Circle Membership Card");
  pdf.setSubject("CSC Circle digital membership card");

  const image = await pdf.embedPng(pngDataUrl);
  const page = pdf.addPage([288, 360]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 288,
    height: 360,
    color: rgb(0.945, 0.925, 1),
  });
  page.drawImage(image, { x: 0, y: 0, width: 288, height: 360 });

  return pdf.save();
}
