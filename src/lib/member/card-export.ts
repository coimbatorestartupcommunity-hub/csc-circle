/** Keep the rounded card corners transparent in the exported PNG. */
export const membershipCardCaptureOptions = {
  pixelRatio: 3,
  cacheBust: true,
} as const;

/**
 * Apply the card's rounded silhouette to the captured bitmap itself.
 * html-to-image can retain the element's rectangular background in its PNG,
 * even when the live element clips correctly, so explicitly clear pixels
 * outside the rounded card before either download format is created.
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

  context.clearRect(0, 0, width, height);
  context.beginPath();
  context.moveTo(radius, 0);
  context.lineTo(width - radius, 0);
  context.quadraticCurveTo(width, 0, width, radius);
  context.lineTo(width, height - radius);
  context.quadraticCurveTo(width, height, width - radius, height);
  context.lineTo(radius, height);
  context.quadraticCurveTo(0, height, 0, height - radius);
  context.lineTo(0, radius);
  context.quadraticCurveTo(0, 0, radius, 0);
  context.closePath();
  context.clip();
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/png");
}

/**
 * Place the same transparent 4:5 card artwork on a card-sized PDF page
 * (4 × 5 inches), preserving its rounded corners and proportions.
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
