import "server-only";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface ServerPassPdfOptions {
  eventTitle: string;
  name: string;
  email: string;
  uid: string;
  dateRange: string;
  location: string;
  qrBuffer: Buffer;
  phone?: string;
}

/**
 * Generates an official, beautifully proportioned CSC Event Pass PDF
 * suitable for printing or opening directly on mobile/desktop.
 */
export async function generateServerEventPassPdf(
  options: ServerPassPdfOptions,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${options.eventTitle} · Event Pass`);
  pdf.setSubject("Official CSC Circle Event Pass");
  pdf.setProducer("Coimbatore Startup Community");
  pdf.setCreator("CSC Circle Portal");

  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdf.embedFont(StandardFonts.CourierBold);

  // Card dimensions: 400 × 600 pt
  const width = 400;
  const height = 620;
  const page = pdf.addPage([width, height]);

  // Colors
  const cInk = rgb(15 / 255, 23 / 255, 42 / 255); // #0f172a
  const cSecondary = rgb(71 / 255, 85 / 255, 105 / 255); // #475569
  const cMuted = rgb(100 / 255, 116 / 255, 139 / 255); // #64748b
  const cBorder = rgb(226 / 255, 232 / 255, 240 / 255); // #e2e8f0
  const cBgCard = rgb(248 / 255, 250 / 255, 255 / 255); // #f8faff
  const cWhite = rgb(1, 1, 1);
  const cGreenBg = rgb(236 / 255, 253 / 255, 245 / 255); // #ecfdf5
  const cGreenText = rgb(4 / 255, 120 / 255, 87 / 255); // #047857

  // Outer background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(248 / 255, 249 / 255, 252 / 255),
  });

  // Main Card border & background
  const margin = 16;
  const cardWidth = width - margin * 2;
  const cardHeight = height - margin * 2;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: cardWidth,
    height: cardHeight,
    color: cWhite,
    borderColor: cBorder,
    borderWidth: 1,
  });

  // Header Bar (y: 545 to 585)
  page.drawRectangle({
    x: margin,
    y: height - margin - 44,
    width: cardWidth,
    height: 44,
    color: rgb(245 / 255, 243 / 255, 255 / 255), // soft purple tint
    borderColor: cBorder,
    borderWidth: 1,
  });

  page.drawText("CSC EVENT PASS", {
    x: margin + 14,
    y: height - margin - 26,
    size: 11,
    font: fontBold,
    color: cInk,
  });

  page.drawText("Coimbatore Startup Community", {
    x: margin + 14,
    y: height - margin - 37,
    size: 8,
    font: fontRegular,
    color: cMuted,
  });

  // Status Badge on right of header
  const badgeText = "CONFIRMED";
  const badgeWidth = fontBold.widthOfTextAtSize(badgeText, 8) + 14;
  page.drawRectangle({
    x: width - margin - badgeWidth - 12,
    y: height - margin - 34,
    width: badgeWidth,
    height: 20,
    color: cGreenBg,
    borderColor: rgb(167 / 255, 243 / 255, 208 / 255),
    borderWidth: 1,
  });
  page.drawText(badgeText, {
    x: width - margin - badgeWidth - 5,
    y: height - margin - 27,
    size: 8,
    font: fontBold,
    color: cGreenText,
  });

  // Event Title (centered)
  let curY = height - margin - 68;
  const eventTitle = options.eventTitle || "CSC Event";
  const titleSize = 15;
  const titleWidth = fontBold.widthOfTextAtSize(eventTitle, titleSize);
  page.drawText(eventTitle, {
    x: Math.max(margin + 10, (width - titleWidth) / 2),
    y: curY,
    size: titleSize,
    font: fontBold,
    color: cInk,
  });

  // Date Range (centered)
  if (options.dateRange) {
    curY -= 18;
    const dateWidth = fontRegular.widthOfTextAtSize(options.dateRange, 9.5);
    page.drawText(options.dateRange, {
      x: Math.max(margin + 10, (width - dateWidth) / 2),
      y: curY,
      size: 9.5,
      font: fontRegular,
      color: cSecondary,
    });
  }

  // Location (centered)
  if (options.location) {
    curY -= 15;
    const locText = `Location: ${options.location}`;
    const locWidth = fontRegular.widthOfTextAtSize(locText, 9);
    page.drawText(locText, {
      x: Math.max(margin + 10, (width - locWidth) / 2),
      y: curY,
      size: 9,
      font: fontRegular,
      color: cSecondary,
    });
  }

  // Attendee Details Card (Centered Box before QR)
  curY -= 20;
  const detailsBoxHeight = 125;
  const detailsBoxY = curY - detailsBoxHeight;
  const detailsBoxWidth = cardWidth - 28;
  const detailsBoxX = margin + 14;

  page.drawRectangle({
    x: detailsBoxX,
    y: detailsBoxY,
    width: detailsBoxWidth,
    height: detailsBoxHeight,
    color: cBgCard,
    borderColor: cBorder,
    borderWidth: 1,
  });

  // Row 1 inside box: Name (Centered)
  const row1Y = detailsBoxY + detailsBoxHeight - 20;
  const nameLabel = "NAME";
  const nameLabelWidth = fontBold.widthOfTextAtSize(nameLabel, 7.5);
  page.drawText(nameLabel, {
    x: detailsBoxX + (detailsBoxWidth - nameLabelWidth) / 2,
    y: row1Y,
    size: 7.5,
    font: fontBold,
    color: cMuted,
  });
  const nameValue = (options.name || "Attendee").toUpperCase();
  const nameValueWidth = fontBold.widthOfTextAtSize(nameValue, 11);
  page.drawText(nameValue, {
    x: Math.max(detailsBoxX + 10, detailsBoxX + (detailsBoxWidth - nameValueWidth) / 2),
    y: row1Y - 14,
    size: 11,
    font: fontBold,
    color: cInk,
  });

  // Row 2 inside box: Email (Centered)
  const row2Y = row1Y - 36;
  const emailLabel = "EMAIL";
  const emailLabelWidth = fontBold.widthOfTextAtSize(emailLabel, 7.5);
  page.drawText(emailLabel, {
    x: detailsBoxX + (detailsBoxWidth - emailLabelWidth) / 2,
    y: row2Y,
    size: 7.5,
    font: fontBold,
    color: cMuted,
  });
  const emailValue = options.email || "—";
  const emailValueWidth = fontBold.widthOfTextAtSize(emailValue, 9.5);
  page.drawText(emailValue, {
    x: Math.max(detailsBoxX + 10, detailsBoxX + (detailsBoxWidth - emailValueWidth) / 2),
    y: row2Y - 13,
    size: 9.5,
    font: fontBold,
    color: cInk,
  });

  // Row 3 inside box: UID (Centered)
  const row3Y = row2Y - 33;
  const uidLabel = "UID";
  const uidLabelWidth = fontBold.widthOfTextAtSize(uidLabel, 7.5);
  page.drawText(uidLabel, {
    x: detailsBoxX + (detailsBoxWidth - uidLabelWidth) / 2,
    y: row3Y,
    size: 7.5,
    font: fontBold,
    color: cMuted,
  });
  const uidValue = options.uid || "—";
  const uidValueWidth = fontMono.widthOfTextAtSize(uidValue, 8.5);
  page.drawText(uidValue, {
    x: Math.max(detailsBoxX + 8, detailsBoxX + (detailsBoxWidth - uidValueWidth) / 2),
    y: row3Y - 12,
    size: 8.5,
    font: fontMono,
    color: cInk,
  });

  // Entrance Verification QR Section (after attendee details)
  curY = detailsBoxY - 16;
  const qrBoxHeight = 220;
  const qrBoxY = curY - qrBoxHeight;

  page.drawRectangle({
    x: detailsBoxX,
    y: qrBoxY,
    width: detailsBoxWidth,
    height: qrBoxHeight,
    color: cBgCard,
    borderColor: cBorder,
    borderWidth: 1,
  });

  const qrHeader = "ENTRANCE VERIFICATION QR";
  const qrHeaderWidth = fontBold.widthOfTextAtSize(qrHeader, 8.5);
  page.drawText(qrHeader, {
    x: detailsBoxX + (detailsBoxWidth - qrHeaderWidth) / 2,
    y: qrBoxY + qrBoxHeight - 18,
    size: 8.5,
    font: fontBold,
    color: cMuted,
  });

  // QR Image
  const qrImage = await pdf.embedPng(new Uint8Array(options.qrBuffer));
  const qrSize = 150;
  page.drawImage(qrImage, {
    x: detailsBoxX + (detailsBoxWidth - qrSize) / 2,
    y: qrBoxY + 32,
    width: qrSize,
    height: qrSize,
  });

  const qrFooter = "Scan at Venue Entrance";
  const qrFooterWidth = fontBold.widthOfTextAtSize(qrFooter, 9);
  page.drawText(qrFooter, {
    x: detailsBoxX + (detailsBoxWidth - qrFooterWidth) / 2,
    y: qrBoxY + 16,
    size: 9,
    font: fontBold,
    color: cSecondary,
  });

  // Footer Instructions
  const footer1 = "Show this pass at the entrance. All times in India Standard Time.";
  const f1Width = fontRegular.widthOfTextAtSize(footer1, 7.5);
  page.drawText(footer1, {
    x: (width - f1Width) / 2,
    y: margin + 14,
    size: 7.5,
    font: fontRegular,
    color: cMuted,
  });

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}
