/** Keep the rounded card corners transparent in the exported PNG. */
export const membershipCardCaptureOptions = {
  pixelRatio: 3,
  cacheBust: true,
} as const;

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
