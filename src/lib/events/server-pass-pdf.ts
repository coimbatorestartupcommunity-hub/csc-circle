import "server-only";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";

export interface ServerPassPdfOptions {
  eventTitle: string;
  name: string;
  email: string;
  uid: string;
  dateRange: string;
  location: string;
  qrBuffer?: Buffer;
  qrPayload?: string;
  phone?: string;
}

/**
 * Sanitizes input text so it is safe for standard PDF WinAnsiEncoding,
 * avoiding runtime font encoding crashes.
 */
function sanitizeForPdf(text: string): string {
  return String(text || "")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2022]/g, " ")
    .trim();
}

/**
 * Measures text using the embedded PDF font and wraps it across multiple lines
 * so it never exceeds maxWidth.
 */
function wrapText(font: PDFFont, text: string, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

let cachedLogoBytes: Buffer | null = null;
function getLogoBytes(): Buffer | null {
  if (cachedLogoBytes) return cachedLogoBytes;
  try {
    const logoPath = path.join(process.cwd(), "public/brand/csc-icon.png");
    if (fs.existsSync(logoPath)) {
      cachedLogoBytes = fs.readFileSync(logoPath);
      return cachedLogoBytes;
    }
  } catch {
    // Non-fatal if logo is unavailable
  }
  return null;
}

/**
 * Generates an official, beautifully proportioned CSC Event Pass PDF
 * using pure vector rendering in pdf-lib. Standard fonts (Helvetica, Courier)
 * are embedded directly into the PDF specification, guaranteeing 100% crisp,
 * selectable, and accurate rendering on all devices, servers, and PDF viewers.
 */
export async function generateServerEventPassPdf(
  options: ServerPassPdfOptions,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await pdf.embedFont(StandardFonts.CourierBold);

  pdf.setTitle(`${options.eventTitle || "CSC Event"} · Event Pass`);
  pdf.setSubject("Official CSC Circle Event Pass");
  pdf.setProducer("Coimbatore Startup Community");
  pdf.setCreator("CSC Circle Portal");

  const W = 400;
  const H = 740;
  const page = pdf.addPage([W, H]);

  // Colors matching CSC Circle brand guidelines
  const cInk = rgb(15 / 255, 23 / 255, 42 / 255);
  const cSecondary = rgb(51 / 255, 65 / 255, 85 / 255);
  const cMuted = rgb(100 / 255, 116 / 255, 139 / 255);
  const cBorder = rgb(226 / 255, 232 / 255, 240 / 255);
  const cHeaderBg = rgb(245 / 255, 243 / 255, 255 / 255);
  const cBoxBg = rgb(248 / 255, 250 / 255, 255 / 255);
  const cGreenBg = rgb(236 / 255, 253 / 255, 245 / 255);
  const cGreenBorder = rgb(167 / 255, 243 / 255, 208 / 255);
  const cGreenText = rgb(4 / 255, 120 / 255, 87 / 255);
  const cGreenDot = rgb(16 / 255, 185 / 255, 129 / 255);
  const cAvatarBg = rgb(238 / 255, 232 / 255, 255 / 255);
  const cAvatarBorder = rgb(111 / 255, 100 / 255, 186 / 255);
  const cAvatarText = rgb(67 / 255, 56 / 255, 202 / 255);

  // Outer card
  page.drawRectangle({
    x: 16,
    y: 16,
    width: 368,
    height: 708,
    color: rgb(1, 1, 1),
    borderColor: cBorder,
    borderWidth: 1.5,
  });

  // Header banner
  page.drawRectangle({
    x: 17,
    y: 660,
    width: 366,
    height: 63,
    color: cHeaderBg,
  });
  page.drawLine({
    start: { x: 16, y: 660 },
    end: { x: 384, y: 660 },
    color: cBorder,
    thickness: 1,
  });

  // CSC Logo
  const logoBytes = getLogoBytes();
  if (logoBytes) {
    try {
      const logoImage = await pdf.embedPng(logoBytes);
      page.drawImage(logoImage, {
        x: 30,
        y: 672,
        width: 38,
        height: 38,
      });
    } catch {
      // Fallback text if logo embedding fails
    }
  }

  // Header Titles
  page.drawText("CSC EVENT PASS", {
    x: 78,
    y: 695,
    size: 11.5,
    font: fontBold,
    color: cInk,
  });
  page.drawText("Coimbatore Startup Community", {
    x: 78,
    y: 680,
    size: 8.5,
    font: fontRegular,
    color: cMuted,
  });

  // Confirmed Badge
  page.drawRectangle({
    x: 284,
    y: 678,
    width: 88,
    height: 24,
    color: cGreenBg,
    borderColor: cGreenBorder,
    borderWidth: 1,
  });
  page.drawCircle({
    x: 295,
    y: 690,
    size: 3.5,
    color: cGreenDot,
  });
  page.drawText("CONFIRMED", {
    x: 303,
    y: 686,
    size: 8.5,
    font: fontBold,
    color: cGreenText,
  });

  // Attendee Avatar Circle
  page.drawCircle({
    x: 200,
    y: 615,
    size: 26,
    color: cAvatarBg,
    borderColor: cAvatarBorder,
    borderWidth: 1.5,
  });
  const rawName = (options.name || "Attendee").trim();
  const safeName = sanitizeForPdf(rawName);
  const initial = (safeName.charAt(0) || "A").toUpperCase();
  const initialWidth = fontBold.widthOfTextAtSize(initial, 20);
  page.drawText(initial, {
    x: 200 - initialWidth / 2,
    y: 608,
    size: 20,
    font: fontBold,
    color: cAvatarText,
  });

  // Event Title (wrapped to 1 or 2 lines)
  const safeTitle = sanitizeForPdf(options.eventTitle || "CSC Event");
  const titleLines = wrapText(fontBold, safeTitle, 12.5, 340);
  if (titleLines.length === 1) {
    const tW = fontBold.widthOfTextAtSize(titleLines[0], 13);
    page.drawText(titleLines[0], {
      x: 200 - tW / 2,
      y: 558,
      size: 13,
      font: fontBold,
      color: cInk,
    });
  } else {
    const l1 = titleLines[0];
    const l2 = titleLines.slice(1).join(" ");
    const t1W = fontBold.widthOfTextAtSize(l1, 12.5);
    const t2W = fontBold.widthOfTextAtSize(l2, 12.5);
    page.drawText(l1, {
      x: 200 - t1W / 2,
      y: 566,
      size: 12.5,
      font: fontBold,
      color: cInk,
    });
    page.drawText(l2, {
      x: 200 - t2W / 2,
      y: 550,
      size: 12.5,
      font: fontBold,
      color: cInk,
    });
  }

  // Date & Location Box
  page.drawRectangle({
    x: 26,
    y: 470,
    width: 348,
    height: 64,
    color: rgb(248 / 255, 250 / 255, 252 / 255),
    borderColor: cBorder,
    borderWidth: 1,
  });

  const safeDateRange = sanitizeForPdf(options.dateRange || "Date & Time to be announced");
  const dateText = `Date & Time: ${safeDateRange}`;
  const truncatedDateText = fontBold.widthOfTextAtSize(dateText, 9.5) > 330
    ? `Date: ${safeDateRange}`
    : dateText;
  page.drawText(truncatedDateText, {
    x: 36,
    y: 512,
    size: 9.5,
    font: fontBold,
    color: cSecondary,
  });

  const safeLocation = sanitizeForPdf(options.location || "Online via Google Meet");
  const locLines = wrapText(fontRegular, `Location: ${safeLocation}`, 9, 328);
  page.drawText(locLines[0] || "Location: Online", {
    x: 36,
    y: 490,
    size: 9,
    font: fontRegular,
    color: rgb(71 / 255, 85 / 255, 105 / 255),
  });

  // Attendee Details Box
  page.drawRectangle({
    x: 26,
    y: 348,
    width: 348,
    height: 110,
    color: cBoxBg,
    borderColor: cBorder,
    borderWidth: 1,
  });

  // 1. Name
  const nameLabelW = fontBold.widthOfTextAtSize("NAME", 8);
  page.drawText("NAME", {
    x: 200 - nameLabelW / 2,
    y: 442,
    size: 8,
    font: fontBold,
    color: cMuted,
  });
  const displayName = safeName.toUpperCase();
  const nameFontSize = displayName.length > 28 ? 10.5 : 12.5;
  const nameValW = fontBold.widthOfTextAtSize(displayName, nameFontSize);
  page.drawText(displayName, {
    x: 200 - nameValW / 2,
    y: 426,
    size: nameFontSize,
    font: fontBold,
    color: cInk,
  });

  // 2. Email
  const safeEmail = sanitizeForPdf(options.email || "—").toLowerCase();
  const emailLabelW = fontBold.widthOfTextAtSize("EMAIL", 8);
  page.drawText("EMAIL", {
    x: 200 - emailLabelW / 2,
    y: 406,
    size: 8,
    font: fontBold,
    color: cMuted,
  });
  const emailFontSize = safeEmail.length > 32 ? 9 : 10.5;
  const emailValW = fontBold.widthOfTextAtSize(safeEmail, emailFontSize);
  page.drawText(safeEmail, {
    x: 200 - emailValW / 2,
    y: 392,
    size: emailFontSize,
    font: fontBold,
    color: cInk,
  });

  // 3. UID
  const safeUid = sanitizeForPdf(options.uid || "UID Pending");
  const uidLabelW = fontBold.widthOfTextAtSize("UID", 8);
  page.drawText("UID", {
    x: 200 - uidLabelW / 2,
    y: 372,
    size: 8,
    font: fontBold,
    color: cMuted,
  });
  const uidFontSize = safeUid.length > 28 ? 9 : 10.5;
  const uidValW = fontMono.widthOfTextAtSize(safeUid, uidFontSize);
  page.drawText(safeUid, {
    x: 200 - uidValW / 2,
    y: 358,
    size: uidFontSize,
    font: fontMono,
    color: cInk,
  });

  // Entrance Verification QR Box
  page.drawRectangle({
    x: 26,
    y: 68,
    width: 348,
    height: 266,
    color: cBoxBg,
    borderColor: cBorder,
    borderWidth: 1,
  });

  const qrHeaderW = fontBold.widthOfTextAtSize("ENTRANCE VERIFICATION QR", 8.5);
  page.drawText("ENTRANCE VERIFICATION QR", {
    x: 200 - qrHeaderW / 2,
    y: 316,
    size: 8.5,
    font: fontBold,
    color: cMuted,
  });

  // White QR card container
  page.drawRectangle({
    x: 105,
    y: 110,
    width: 190,
    height: 190,
    color: rgb(1, 1, 1),
    borderColor: cBorder,
    borderWidth: 1,
  });

  const qrBuffer =
    options.qrBuffer ||
    (await QRCode.toBuffer(options.qrPayload || "https://csc.circle", {
      margin: 1,
      width: 360,
      color: { dark: "#121826", light: "#ffffff" },
    }));

  const qrImage = await pdf.embedPng(new Uint8Array(qrBuffer.buffer.slice(qrBuffer.byteOffset, qrBuffer.byteOffset + qrBuffer.byteLength)));
  page.drawImage(qrImage, {
    x: 115,
    y: 120,
    width: 170,
    height: 170,
  });

  const qrSubW = fontBold.widthOfTextAtSize("Scan at Venue Entrance", 9.5);
  page.drawText("Scan at Venue Entrance", {
    x: 200 - qrSubW / 2,
    y: 86,
    size: 9.5,
    font: fontBold,
    color: rgb(71 / 255, 85 / 255, 105 / 255),
  });

  // Footer
  const footerText = "Show this pass at the entrance. All times in India Standard Time.";
  const footerW = fontRegular.widthOfTextAtSize(footerText, 8.5);
  page.drawText(footerText, {
    x: 200 - footerW / 2,
    y: 38,
    size: 8.5,
    font: fontRegular,
    color: cMuted,
  });

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}

/**
 * Compatibility wrapper if PNG is needed.
 */
export async function generateServerEventPassPng(
  options: ServerPassPdfOptions,
): Promise<Buffer> {
  const qrBuffer =
    options.qrBuffer ||
    (await QRCode.toBuffer(options.qrPayload || "https://csc.circle", {
      margin: 1,
      width: 360,
      color: { dark: "#121826", light: "#ffffff" },
    }));
  return qrBuffer;
}
