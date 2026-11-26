import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import type { AgreementSection } from "@/lib/agreements/templates";

export interface AgreementPdfInput {
  referenceCode: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  effectiveDate: string;
  durationLabel: string;
  recipientName: string;
  recipientRole: string;
  recipientOrg: string;
  recipientEmail: string;
  cscSignatoryName: string;
  cscSignatoryRole: string;
  sections: AgreementSection[];
  status: string;
  signedName?: string | null;
  signedEmail?: string | null;
  signedRole?: string | null;
  signedOrg?: string | null;
  signedAt?: string | null;
  signedIp?: string | null;
  signedUserAgent?: string | null;
  documentHash?: string | null;
  partnerLogoBuffer?: Buffer | null;
}

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN_X = 52;
const CONTENT_W = A4_W - MARGIN_X * 2;

const WHITE = rgb(1, 1, 1);
const INK_DARK = rgb(0.067, 0.067, 0.067); // #111111
const INK_BODY = rgb(0.15, 0.15, 0.17); // #26262B
const INK_MUTED = rgb(0.42, 0.43, 0.47);
const RULE_LIGHT = rgb(0.86, 0.87, 0.89);
const CLOUD_BG = rgb(0.975, 0.98, 0.988);
const SIG_BLUE = rgb(0.118, 0.251, 0.686); // #1E40AF ink-blue handwritten accent

async function loadFontFile(filename: string): Promise<Uint8Array> {
  const fullPath = path.join(process.cwd(), "public", "fonts", "agreements", filename);
  return new Uint8Array(await readFile(fullPath));
}

async function loadCscLogoPng(): Promise<Buffer | null> {
  try {
    const logoPath = path.join(process.cwd(), "public", "brand", "csc-logo.png");
    const raw = await readFile(logoPath);
    return await sharp(raw).resize(240, 240, { fit: "contain" }).png().toBuffer();
  } catch {
    return null;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];
  const paragraphs = clean.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = INK_DARK,
  letterSpacing = 0,
) {
  if (letterSpacing > 0) {
    const chars = [...text];
    const totalW =
      chars.reduce((acc, ch) => acc + font.widthOfTextAtSize(ch, size), 0) +
      Math.max(0, chars.length - 1) * letterSpacing;
    let x = (A4_W - totalW) / 2;
    for (const ch of chars) {
      page.drawText(ch, { x, y, size, font, color });
      x += font.widthOfTextAtSize(ch, size) + letterSpacing;
    }
    return;
  }
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (A4_W - width) / 2, y, size, font, color });
}

function drawTrackedLeft(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = INK_DARK,
  letterSpacing = 1.4,
) {
  let cursor = x;
  for (const ch of [...text]) {
    page.drawText(ch, { x: cursor, y, size, font, color });
    cursor += font.widthOfTextAtSize(ch, size) + letterSpacing;
  }
}

function drawTrackedRight(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color = INK_DARK,
  letterSpacing = 1.4,
) {
  const chars = [...text];
  const totalW =
    chars.reduce((acc, ch) => acc + font.widthOfTextAtSize(ch, size), 0) +
    Math.max(0, chars.length - 1) * letterSpacing;
  drawTrackedLeft(page, text, rightX - totalW, y, font, size, color, letterSpacing);
}

export async function generateAgreementPdf(input: AgreementPdfInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const [serifBytes, serifItalicBytes, sansBytes, scriptBytes, cscLogoPng] = await Promise.all([
    loadFontFile("CormorantGaramond.ttf"),
    loadFontFile("CormorantGaramond-Italic.ttf"),
    loadFontFile("PlusJakartaSans.ttf"),
    loadFontFile("Caveat.ttf"),
    loadCscLogoPng(),
  ]);

  const serif = await doc.embedFont(serifBytes);
  const serifItalic = await doc.embedFont(serifItalicBytes);
  const sans = await doc.embedFont(sansBytes);
  const script = await doc.embedFont(scriptBytes);

  let cscLogoImg: PDFImage | null = null;
  if (cscLogoPng) {
    cscLogoImg = await doc.embedPng(cscLogoPng);
  }

  let partnerLogoImg: PDFImage | null = null;
  if (input.partnerLogoBuffer && input.partnerLogoBuffer.length > 0) {
    try {
      const normalized = await sharp(input.partnerLogoBuffer)
        .resize(240, 120, { fit: "inside" })
        .png()
        .toBuffer();
      partnerLogoImg = await doc.embedPng(normalized);
    } catch {
      partnerLogoImg = null;
    }
  }

  const pages: PDFPage[] = [];

  const createEditorialPage = (isFirst: boolean): { page: PDFPage; cursorY: number } => {
    const page = doc.addPage([A4_W, A4_H]);
    page.drawRectangle({ x: 0, y: 0, width: A4_W, height: A4_H, color: WHITE });
    pages.push(page);

    // Top corner tracked uppercase metadata (matching reference image)
    drawTrackedLeft(page, "CSC CIRCLE", MARGIN_X, A4_H - 40, sans, 7.5, INK_DARK, 1.8);
    drawTrackedRight(
      page,
      `REF: ${input.referenceCode}`,
      A4_W - MARGIN_X,
      A4_H - 40,
      sans,
      7.5,
      INK_DARK,
      1.5,
    );

    if (!isFirst) {
      page.drawLine({
        start: { x: MARGIN_X, y: A4_H - 52 },
        end: { x: A4_W - MARGIN_X, y: A4_H - 52 },
        thickness: 0.5,
        color: RULE_LIGHT,
      });
      return { page, cursorY: A4_H - 76 };
    }

    return { page, cursorY: A4_H - 78 };
  };

  let { page, cursorY } = createEditorialPage(true);

  // Logos row (CSC Circular Logo + Optional Partner Logo)
  if (cscLogoImg && partnerLogoImg) {
    const cscSize = 46;
    const pDims = partnerLogoImg.scaleToFit(90, 42);
    const gap = 24;
    const totalW = cscSize + gap + pDims.width;
    const startX = (A4_W - totalW) / 2;
    page.drawImage(cscLogoImg, {
      x: startX,
      y: cursorY - cscSize + 10,
      width: cscSize,
      height: cscSize,
    });
    page.drawText("×", {
      x: startX + cscSize + 7,
      y: cursorY - 20,
      size: 13,
      font: serifItalic,
      color: INK_MUTED,
    });
    page.drawImage(partnerLogoImg, {
      x: startX + cscSize + gap,
      y: cursorY - pDims.height / 2 - 12,
      width: pDims.width,
      height: pDims.height,
    });
    cursorY -= 58;
  } else if (cscLogoImg) {
    const cscSize = 48;
    page.drawImage(cscLogoImg, {
      x: (A4_W - cscSize) / 2,
      y: cursorY - cscSize + 10,
      width: cscSize,
      height: cscSize,
    });
    cursorY -= 58;
  }

  // Italic serif eyebrow
  const eyebrowLines = wrapText(input.eyebrow, serifItalic, 12.5, CONTENT_W - 40);
  for (const line of eyebrowLines) {
    drawCenteredText(page, line, cursorY, serifItalic, 12.5, INK_BODY);
    cursorY -= 17;
  }
  cursorY -= 4;

  // Tall condensed uppercase serif title
  const titleLines = wrapText(input.title.toUpperCase(), serif, 22, CONTENT_W);
  for (const line of titleLines) {
    drawCenteredText(page, line, cursorY, serif, 22, INK_DARK, 0.8);
    cursorY -= 26;
  }
  cursorY -= 2;

  // Tracked uppercase geometric subtitle
  const subLines = wrapText(input.subtitle.toUpperCase(), sans, 7.5, CONTENT_W - 20);
  for (const line of subLines) {
    drawCenteredText(page, line, cursorY, sans, 7.5, INK_MUTED, 1.5);
    cursorY -= 13;
  }
  cursorY -= 10;

  // Hairline rule
  page.drawLine({
    start: { x: MARGIN_X, y: cursorY },
    end: { x: A4_W - MARGIN_X, y: cursorY },
    thickness: 0.6,
    color: RULE_LIGHT,
  });
  cursorY -= 16;

  // Compact Parties & Metadata Summary Box
  const metaBoxH = 66;
  page.drawRectangle({
    x: MARGIN_X,
    y: cursorY - metaBoxH,
    width: CONTENT_W,
    height: metaBoxH,
    color: CLOUD_BG,
    borderColor: RULE_LIGHT,
    borderWidth: 0.6,
  });

  const col2X = MARGIN_X + CONTENT_W / 2 + 10;
  page.drawText("FIRST PARTY", {
    x: MARGIN_X + 12,
    y: cursorY - 15,
    size: 6.8,
    font: sans,
    color: INK_MUTED,
  });
  page.drawText("Coimbatore Startup Community (CSC)", {
    x: MARGIN_X + 12,
    y: cursorY - 27,
    size: 8.5,
    font: sans,
    color: INK_DARK,
  });
  page.drawText(`Effective: ${input.effectiveDate} · Term: ${input.durationLabel}`, {
    x: MARGIN_X + 12,
    y: cursorY - 40,
    size: 7.5,
    font: sans,
    color: INK_MUTED,
  });
  page.drawText(`Status: ${input.status.toUpperCase()}`, {
    x: MARGIN_X + 12,
    y: cursorY - 53,
    size: 7.2,
    font: sans,
    color: input.status === "signed" ? SIG_BLUE : INK_MUTED,
  });

  page.drawText("COUNTERPARTY / SIGNER", {
    x: col2X,
    y: cursorY - 15,
    size: 6.8,
    font: sans,
    color: INK_MUTED,
  });
  page.drawText(
    `${input.recipientName}${input.recipientOrg ? ` — ${input.recipientOrg}` : ""}`.slice(0, 48),
    {
      x: col2X,
      y: cursorY - 27,
      size: 8.5,
      font: sans,
      color: INK_DARK,
    },
  );
  page.drawText((input.recipientRole || "Authorized Signatory").slice(0, 48), {
    x: col2X,
    y: cursorY - 40,
    size: 7.5,
    font: sans,
    color: INK_MUTED,
  });
  page.drawText(input.recipientEmail.slice(0, 48), {
    x: col2X,
    y: cursorY - 53,
    size: 7.5,
    font: sans,
    color: INK_MUTED,
  });

  cursorY -= metaBoxH + 22;

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < 72) {
      ({ page, cursorY } = createEditorialPage(false));
    }
  };

  // Render all numbered legal sections & clauses
  for (const section of input.sections) {
    ensureSpace(44);
    const headingLines = wrapText(section.heading.toUpperCase(), sans, 8.5, CONTENT_W);
    for (const hl of headingLines) {
      page.drawText(hl, { x: MARGIN_X, y: cursorY, size: 8.5, font: sans, color: INK_DARK });
      cursorY -= 13;
    }
    cursorY -= 3;

    for (const clause of section.clauses) {
      const cLines = wrapText(clause, sans, 8.4, CONTENT_W);
      ensureSpace(cLines.length * 12.2 + 8);
      for (const cl of cLines) {
        if (cursorY < 66) {
          ({ page, cursorY } = createEditorialPage(false));
        }
        page.drawText(cl, { x: MARGIN_X, y: cursorY, size: 8.4, font: sans, color: INK_BODY });
        cursorY -= 12.2;
      }
      cursorY -= 5;
    }
    cursorY -= 8;
  }

  // Execution & Signature Block
  ensureSpace(135);
  page.drawLine({
    start: { x: MARGIN_X, y: cursorY },
    end: { x: A4_W - MARGIN_X, y: cursorY },
    thickness: 0.6,
    color: RULE_LIGHT,
  });
  cursorY -= 20;

  drawTrackedLeft(page, "EXECUTION & DIGITAL SIGNATURES", MARGIN_X, cursorY, sans, 8, INK_DARK, 1.4);
  cursorY -= 24;

  const leftSigX = MARGIN_X;
  const rightSigX = MARGIN_X + CONTENT_W / 2 + 14;

  // CSC Signatory (Left)
  page.drawText("FOR COIMBATORE STARTUP COMMUNITY", {
    x: leftSigX,
    y: cursorY,
    size: 6.8,
    font: sans,
    color: INK_MUTED,
  });
  page.drawText(input.cscSignatoryName, {
    x: leftSigX,
    y: cursorY - 24,
    size: 18,
    font: script,
    color: SIG_BLUE,
  });
  page.drawLine({
    start: { x: leftSigX, y: cursorY - 32 },
    end: { x: leftSigX + 205, y: cursorY - 32 },
    thickness: 0.6,
    color: RULE_LIGHT,
  });
  page.drawText(input.cscSignatoryName, {
    x: leftSigX,
    y: cursorY - 44,
    size: 8.5,
    font: sans,
    color: INK_DARK,
  });
  page.drawText(input.cscSignatoryRole.slice(0, 44), {
    x: leftSigX,
    y: cursorY - 56,
    size: 7.4,
    font: sans,
    color: INK_MUTED,
  });

  // Counterparty Signature (Right)
  page.drawText("FOR COUNTERPARTY / RECIPIENT", {
    x: rightSigX,
    y: cursorY,
    size: 6.8,
    font: sans,
    color: INK_MUTED,
  });
  if (input.status === "signed" && input.signedName) {
    page.drawText(input.signedName.slice(0, 32), {
      x: rightSigX,
      y: cursorY - 24,
      size: 18,
      font: script,
      color: SIG_BLUE,
    });
  } else {
    page.drawText("Awaiting Verified Email Signature", {
      x: rightSigX,
      y: cursorY - 22,
      size: 9,
      font: serifItalic,
      color: INK_MUTED,
    });
  }
  page.drawLine({
    start: { x: rightSigX, y: cursorY - 32 },
    end: { x: rightSigX + 205, y: cursorY - 32 },
    thickness: 0.6,
    color: RULE_LIGHT,
  });
  page.drawText(input.signedName || input.recipientName, {
    x: rightSigX,
    y: cursorY - 44,
    size: 8.5,
    font: sans,
    color: INK_DARK,
  });
  page.drawText(
    `${input.signedRole || input.recipientRole || "Authorized Signatory"}${
      input.signedOrg || input.recipientOrg ? ` · ${input.signedOrg || input.recipientOrg}` : ""
    }`.slice(0, 46),
    {
      x: rightSigX,
      y: cursorY - 56,
      size: 7.4,
      font: sans,
      color: INK_MUTED,
    },
  );
  if (input.signedAt) {
    page.drawText(`Signed: ${input.signedAt}`, {
      x: rightSigX,
      y: cursorY - 68,
      size: 7,
      font: sans,
      color: SIG_BLUE,
    });
  }

  // Final Page: Electronic Signature Audit Certificate (IT Act 2000 Sec 10A & Evidence Act Sec 65B)
  const audit = createEditorialPage(false);
  let ay = audit.cursorY;
  drawCenteredText(
    audit.page,
    "Electronic Execution & Audit Certificate",
    ay,
    serifItalic,
    13,
    INK_BODY,
  );
  ay -= 24;
  drawCenteredText(
    audit.page,
    "COMPLIANCE VERIFICATION RECORD",
    ay,
    serif,
    19,
    INK_DARK,
    0.8,
  );
  ay -= 26;

  audit.page.drawLine({
    start: { x: MARGIN_X, y: ay },
    end: { x: A4_W - MARGIN_X, y: ay },
    thickness: 0.6,
    color: RULE_LIGHT,
  });
  ay -= 22;

  const auditRows: [string, string][] = [
    ["Agreement Reference", input.referenceCode],
    ["Agreement Title", input.title],
    ["Document Status", input.status.toUpperCase()],
    ["Verified Signer Email", input.signedEmail || input.recipientEmail],
    ["Typed Legal Signature", input.signedName || "Pending Execution"],
    ["Execution Timestamp (UTC)", input.signedAt || "Pending"],
    ["Signer IP Address", input.signedIp || "Pending"],
    ["Browser / User-Agent", (input.signedUserAgent || "Pending").slice(0, 74)],
    ["SHA-256 Document Hash", input.documentHash || "Computed upon execution"],
  ];

  for (const [label, val] of auditRows) {
    audit.page.drawText(label.toUpperCase(), {
      x: MARGIN_X,
      y: ay,
      size: 7,
      font: sans,
      color: INK_MUTED,
    });
    audit.page.drawText(val, {
      x: MARGIN_X + 165,
      y: ay,
      size: 8.2,
      font: sans,
      color: label === "SHA-256 Document Hash" ? SIG_BLUE : INK_DARK,
    });
    audit.page.drawLine({
      start: { x: MARGIN_X, y: ay - 8 },
      end: { x: A4_W - MARGIN_X, y: ay - 8 },
      thickness: 0.4,
      color: RULE_LIGHT,
    });
    ay -= 26;
  }

  ay -= 10;
  const complianceNote =
    "Legal Notice: Executed electronically pursuant to Section 10A of the Information Technology Act, 2000 and the Indian Contract Act, 1872. The signer authenticated via verified email session prior to submitting explicit acceptance. This record and its cryptographic SHA-256 digest serve as tamper-evident electronic evidence under Section 65B of the Indian Evidence Act / Bharatiya Sakshya Adhiniyam.";
  for (const line of wrapText(complianceNote, sans, 7.8, CONTENT_W)) {
    audit.page.drawText(line, { x: MARGIN_X, y: ay, size: 7.8, font: sans, color: INK_MUTED });
    ay -= 12;
  }

  // Draw unified editorial footer + page numbers across every page
  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    drawCenteredText(
      p,
      "csc.logicintelligencetechnologies.in",
      32,
      serifItalic,
      9.5,
      INK_MUTED,
    );
    drawTrackedRight(
      p,
      `PAGE ${idx + 1} OF ${totalPages}`,
      A4_W - MARGIN_X,
      32,
      sans,
      6.8,
      INK_MUTED,
      1.2,
    );
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
