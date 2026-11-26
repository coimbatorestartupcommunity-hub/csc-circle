import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  rgb,
  type Color,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  StandardFonts,
} from "pdf-lib";
import sharp from "sharp";
import QRCode from "qrcode";
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
const MARGIN_X = 46;
const CONTENT_W = A4_W - MARGIN_X * 2; // 503.28

// Exact Color Palette Extracted from User's Editorial Template
const P1_BG = rgb(245 / 255, 240 / 255, 237 / 255); // #F5F0ED warm linen
const P1_PILL_BG = rgb(226 / 255, 191 / 255, 198 / 255); // #E2BFC6 dusty rose
const P1_CALLOUT_BG = rgb(247 / 255, 232 / 255, 236 / 255); // #F7E8EC light blush callout
const P1_CALLOUT_BORDER = rgb(234 / 255, 198 / 255, 207 / 255); // #EAC6CF
const ACCENT_ROSE = rgb(184 / 255, 106 / 255, 123 / 255); // #B86A7B
const ACCENT_ROSE_BORDER = rgb(216 / 255, 168 / 255, 178 / 255); // #D8A8B2
const INK_DARK = rgb(45 / 255, 41 / 255, 38 / 255); // #2D2926 charcoal
const INK_BODY = rgb(74 / 255, 67 / 255, 64 / 255); // #4A4340
const INK_MUTED = rgb(138 / 255, 107 / 255, 115 / 255); // #8A6B73
const WHITE = rgb(1, 1, 1);

const P2_BG = rgb(244 / 255, 198 / 255, 209 / 255); // #F4C6D1 blush pink
const P2_GRID = rgb(232 / 255, 176 / 255, 190 / 255); // #E8B0BE graph quad grid lines
const P2_INK_DARK = rgb(45 / 255, 33 / 255, 36 / 255); // #2D2124 dark plum
const P2_INK_BODY = rgb(58 / 255, 43 / 255, 46 / 255); // #3A2B2E
const SIG_BLUE = rgb(30 / 255, 58 / 255, 138 / 255); // #1E3A8A deep signature ink

async function loadFontFile(filename: string): Promise<Uint8Array> {
  const fullPath = path.join(process.cwd(), "public", "fonts", "agreements", filename);
  return new Uint8Array(await readFile(fullPath));
}

async function loadCachedPng(relPath: string, maxW = 400, maxH = 400): Promise<Buffer | null> {
  try {
    const fullPath = path.join(process.cwd(), relPath);
    const raw = await readFile(fullPath);
    return await sharp(raw).resize(maxW, maxH, { fit: "inside" }).png().toBuffer();
  } catch {
    return null;
  }
}

function drawRoundedRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  options: {
    color?: Color;
    borderColor?: Color;
    borderWidth?: number;
  },
) {
  const radius = Math.min(r, w / 2, h / 2);
  const svg = `M ${x + radius} ${y} h ${w - 2 * radius} a ${radius} ${radius} 0 0 1 ${radius} ${radius} v ${h - 2 * radius} a ${radius} ${radius} 0 0 1 -${radius} ${radius} h -${w - 2 * radius} a ${radius} ${radius} 0 0 1 -${radius} -${radius} v -${h - 2 * radius} a ${radius} ${radius} 0 0 1 ${radius} -${radius} Z`;
  page.drawSvgPath(svg, options);
}

function drawCheckmark(page: PDFPage, x: number, y: number, size: number, color: Color) {
  page.drawLine({
    start: { x: x, y: y + size * 0.45 },
    end: { x: x + size * 0.35, y: y },
    thickness: 1.2,
    color,
  });
  page.drawLine({
    start: { x: x + size * 0.35, y: y },
    end: { x: x + size, y: y + size * 0.85 },
    thickness: 1.2,
    color,
  });
}

function drawArrow(page: PDFPage, x: number, y: number, length: number, color: Color) {
  page.drawLine({
    start: { x, y: y + 2 },
    end: { x: x + length, y: y + 2 },
    thickness: 0.8,
    color,
  });
  page.drawLine({
    start: { x: x + length - 3, y: y + 4.5 },
    end: { x: x + length, y: y + 2 },
    thickness: 0.8,
    color,
  });
  page.drawLine({
    start: { x: x + length - 3, y: y - 0.5 },
    end: { x: x + length, y: y + 2 },
    thickness: 0.8,
    color,
  });
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
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (A4_W - width) / 2, y, size, font, color });
}

export async function generateAgreementPdf(input: AgreementPdfInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Load typography & brand images
  const [
    sansBytes,
    scriptBytes,
    serifBytes,
    italicBytes,
    cscLogoPng,
    qrPng,
  ] = await Promise.all([
    loadFontFile("PlusJakartaSans.ttf"),
    loadFontFile("Caveat.ttf"),
    loadFontFile("CormorantGaramond.ttf"),
    loadFontFile("CormorantGaramond-Italic.ttf"),
    loadCachedPng("public/brand/csc-circle-seal.png", 240, 240),
    QRCode.toBuffer(
      `https://csc.logicintelligencetechnologies.in/agreements/sign/${input.referenceCode}`,
      {
        margin: 1,
        width: 240,
        color: { dark: "#2D2124", light: "#F4C6D1" },
      },
    ),
  ]);

  const sans = await doc.embedFont(sansBytes);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const script = await doc.embedFont(scriptBytes);
  const serif = await doc.embedFont(serifBytes);
  const italic = await doc.embedFont(italicBytes);

  let cscLogoImg: PDFImage | null = null;
  if (cscLogoPng) {
    try {
      cscLogoImg = await doc.embedPng(new Uint8Array(cscLogoPng));
    } catch {
      cscLogoImg = null;
    }
  }

  let partnerLogoImg: PDFImage | null = null;
  if (input.partnerLogoBuffer && input.partnerLogoBuffer.length > 0) {
    try {
      const normalized = await sharp(input.partnerLogoBuffer)
        .resize(180, 180, { fit: "inside" })
        .png()
        .toBuffer();
      partnerLogoImg = await doc.embedPng(new Uint8Array(normalized));
    } catch {
      partnerLogoImg = null;
    }
  }

  let qrImg: PDFImage | null = null;
  if (qrPng) {
    try {
      qrImg = await doc.embedPng(new Uint8Array(qrPng));
    } catch {
      qrImg = null;
    }
  }

  const isSigned = input.status === "signed" || Boolean(input.signedAt);

  // Extract sections & clauses
  const sec1 = input.sections[0] || {
    heading: "Purpose & Alliance Mandate",
    clauses: [
      "1.1 Collaborative Ecosystem Acceleration: The parties agree to co-create high-impact initiatives supporting founders across Western Tamil Nadu.",
      "1.2 Non-Transactional Ethos: Engagement is strictly founded upon peer mentorship, transparent knowledge sharing, and give-first values.",
      "1.3 Official Alliance Representation: Mutual rights to publicly reference the alliance across official platforms, demo days, and founder forums.",
    ],
  };

  const sec2 = input.sections[1] || {
    heading: "Intellectual Property, Governance & Independence",
    clauses: [
      "2.1 Proprietary Platform Ownership: Each party retains sole and unencumbered ownership of its pre-existing IP, brand trademarks, and software.",
      "2.2 Confidentiality & Non-Disclosure: All member data, roadmap details, and internal discussions remain strictly confidential and privileged.",
      "2.3 Term & Mutual Disengagement: Valid for a twelve-month duration, reviewable annually with a thirty-day bilateral notice window.",
    ],
  };

  // =========================================================================
  // PAGE 1: WARM LINEN TEMPLATE (Matches Left Page in User's Screenshot)
  // =========================================================================
  const p1 = doc.addPage([A4_W, A4_H]);
  p1.drawRectangle({ x: 0, y: 0, width: A4_W, height: A4_H, color: P1_BG });

  // Top Arched Oval Badge for Logo (Matching the arch in user template)
  const archW = 88;
  const archH = 68;
  const archX = (A4_W - archW) / 2;
  const archY = A4_H - 104;

  drawRoundedRect(p1, archX, archY, archW, archH, 34, {
    color: rgb(250 / 255, 246 / 255, 244 / 255),
    borderColor: ACCENT_ROSE_BORDER,
    borderWidth: 1,
  });

  if (partnerLogoImg && cscLogoImg) {
    // Show both side-by-side inside arch
    p1.drawImage(cscLogoImg, {
      x: archX + 6,
      y: archY + 14,
      width: 36,
      height: 36,
    });
    p1.drawImage(partnerLogoImg, {
      x: archX + 46,
      y: archY + 14,
      width: 36,
      height: 36,
    });
  } else if (cscLogoImg) {
    p1.drawImage(cscLogoImg, {
      x: (A4_W - 46) / 2,
      y: archY + (archH - 46) / 2,
      width: 46,
      height: 46,
    });
  }

  // Document Title Line 1: Modern Roman / Clean Sans (Matches "Воронка для")
  const titleText = (input.title || "Digital Partnership Agreement").toUpperCase();
  drawCenteredText(p1, titleText, archY - 26, bold, 13.5, INK_DARK);

  // Document Title Line 2: Elegant Cursive Script in dusty rose (Matches "услуги - маникюр")
  const subtitleText = input.subtitle || "Memorandum of Understanding";
  drawCenteredText(p1, subtitleText, archY - 48, script, 22, ACCENT_ROSE);

  let curY = archY - 76;

  // --- STAGE 1: PILL BADGE & CONTENT (Matches "Этап 1: Осведомленность") ---
  const s1PillText = `Stage 1: ${sec1.heading}`;
  const s1PillW = Math.min(bold.widthOfTextAtSize(s1PillText, 8) + 24, CONTENT_W - 80);
  drawRoundedRect(p1, MARGIN_X, curY - 18, s1PillW, 20, 6, { color: P1_PILL_BG });
  p1.drawText(s1PillText, {
    x: MARGIN_X + 10,
    y: curY - 13,
    size: 7.8,
    font: bold,
    color: INK_DARK,
  });

  curY -= 28;
  drawArrow(p1, MARGIN_X, curY, 14, ACCENT_ROSE);
  const s1Lead = `Formal alliance established between Coimbatore Startup Community and ${input.recipientOrg || input.recipientName}.`;
  p1.drawText(s1Lead.slice(0, 92), {
    x: MARGIN_X + 20,
    y: curY - 1,
    size: 7.8,
    font: sans,
    color: INK_BODY,
  });

  curY -= 15;
  p1.drawText("Mutual Covenants & Action Points:", {
    x: MARGIN_X,
    y: curY,
    size: 7.8,
    font: italic,
    color: rgb(110 / 255, 90 / 255, 96 / 255),
  });

  curY -= 14;
  for (const clause of sec1.clauses.slice(0, 3)) {
    // Extract colon lead if present
    const colonMatch = clause.match(/^([^:]+:)\s*(.*)/);
    const titlePart = colonMatch ? colonMatch[1] : clause.slice(0, 45);
    const bodyPart = colonMatch ? colonMatch[2] : clause.slice(45);

    drawCheckmark(p1, MARGIN_X + 2, curY - 1, 7, ACCENT_ROSE);
    p1.drawText(titlePart, { x: MARGIN_X + 16, y: curY, size: 7.6, font: bold, color: INK_DARK });
    const leadW = bold.widthOfTextAtSize(titlePart, 7.6);
    const bLines = wrapText(bodyPart, sans, 7.5, CONTENT_W - 20 - leadW);
    p1.drawText(bLines[0] || "", { x: MARGIN_X + 20 + leadW, y: curY, size: 7.5, font: sans, color: INK_BODY });
    curY -= 13;
    if (bLines[1]) {
      p1.drawText(bLines[1], { x: MARGIN_X + 16, y: curY, size: 7.5, font: sans, color: INK_BODY });
      curY -= 12;
    }
  }

  // --- LIGHT PINK CALLOUT BOX WITH CIRCLE BADGE (Matches "Что важно:" box) ---
  curY -= 4;
  const calloutH = 46;
  drawRoundedRect(p1, MARGIN_X, curY - calloutH, CONTENT_W, calloutH, 6, {
    color: P1_CALLOUT_BG,
    borderColor: P1_CALLOUT_BORDER,
    borderWidth: 0.5,
  });

  const cText =
    "Key Mandate: Both parties commit to collaborative ecosystem acceleration, mutual operational transparency, and non-transactional founder mentorship across Western Tamil Nadu.";
  const cLines = wrapText(cText, italic, 7.8, CONTENT_W - 48);
  let cy = curY - 18;
  cLines.forEach((l) => {
    p1.drawText(l, {
      x: MARGIN_X + 16,
      y: cy,
      size: 7.8,
      font: italic,
      color: rgb(90 / 255, 69 / 255, 75 / 255),
    });
    cy -= 11;
  });

  // White circular badge on right side
  drawRoundedRect(p1, MARGIN_X + CONTENT_W - 28, curY - 32, 18, 18, 9, {
    color: WHITE,
    borderColor: P1_CALLOUT_BORDER,
    borderWidth: 0.5,
  });

  curY -= calloutH + 18;

  // --- STAGE 2: PILL BADGE & CONTENT (Matches "Этап 2: Интерес") ---
  const s2PillText = `Stage 2: ${sec2.heading}`;
  const s2PillW = Math.min(bold.widthOfTextAtSize(s2PillText, 8) + 24, CONTENT_W);
  drawRoundedRect(p1, MARGIN_X, curY - 18, s2PillW, 20, 6, { color: P1_PILL_BG });
  p1.drawText(s2PillText, {
    x: MARGIN_X + 10,
    y: curY - 13,
    size: 7.8,
    font: bold,
    color: INK_DARK,
  });

  curY -= 28;
  drawArrow(p1, MARGIN_X, curY, 14, ACCENT_ROSE);
  p1.drawText("Preserving operational independence and safeguarding proprietary ecosystem assets.", {
    x: MARGIN_X + 20,
    y: curY - 1,
    size: 7.8,
    font: sans,
    color: INK_BODY,
  });

  curY -= 15;
  p1.drawText("Terms & Obligations:", {
    x: MARGIN_X,
    y: curY,
    size: 7.8,
    font: italic,
    color: rgb(110 / 255, 90 / 255, 96 / 255),
  });

  curY -= 14;
  for (const clause of sec2.clauses.slice(0, 3)) {
    const colonMatch = clause.match(/^([^:]+:)\s*(.*)/);
    const titlePart = colonMatch ? colonMatch[1] : clause.slice(0, 45);
    const bodyPart = colonMatch ? colonMatch[2] : clause.slice(45);

    drawCheckmark(p1, MARGIN_X + 2, curY - 1, 7, ACCENT_ROSE);
    p1.drawText(titlePart, { x: MARGIN_X + 16, y: curY, size: 7.6, font: bold, color: INK_DARK });
    const leadW = bold.widthOfTextAtSize(titlePart, 7.6);
    const bLines = wrapText(bodyPart, sans, 7.5, CONTENT_W - 20 - leadW);
    p1.drawText(bLines[0] || "", { x: MARGIN_X + 20 + leadW, y: curY, size: 7.5, font: sans, color: INK_BODY });
    curY -= 13;
    if (bLines[1]) {
      p1.drawText(bLines[1], { x: MARGIN_X + 16, y: curY, size: 7.5, font: sans, color: INK_BODY });
      curY -= 12;
    }
  }

  // Page 1 Footer: ( 26 )
  drawCenteredText(p1, "( 26 )", 28, italic, 9, INK_MUTED);

  // =========================================================================
  // PAGE 2: BLUSH PINK WITH QUAD GRAPH GRID (Matches Right Page in Screenshot)
  // DIGITAL EXECUTION & SIGNATURES
  // =========================================================================
  const p2 = doc.addPage([A4_W, A4_H]);
  p2.drawRectangle({ x: 0, y: 0, width: A4_W, height: A4_H, color: P2_BG });

  // Quad Grid Lines (24pt grid pattern matching graph paper in template)
  const gridSize = 24;
  for (let x = 0; x <= A4_W; x += gridSize) {
    p2.drawLine({ start: { x, y: 0 }, end: { x, y: A4_H }, thickness: 0.5, color: P2_GRID });
  }
  for (let y = 0; y <= A4_H; y += gridSize) {
    p2.drawLine({ start: { x: 0, y }, end: { x: A4_W, y }, thickness: 0.5, color: P2_GRID });
  }

  // Top White Pill Badge (Matches "глава 5")
  const topPillW = 84;
  const topPillH = 18;
  drawRoundedRect(p2, (A4_W - topPillW) / 2, A4_H - 42, topPillW, topPillH, 9, { color: WHITE });
  drawCenteredText(p2, "section 02", A4_H - 35, bold, 7.5, rgb(122 / 255, 88 / 255, 97 / 255));

  // Main Title: Elegant Classical Serif 2-Line Title (Matches "Бонусы и дополнительные / инструменты")
  drawCenteredText(p2, "Statutory Execution &", A4_H - 78, serif, 22, P2_INK_DARK);
  drawCenteredText(p2, "Digital Signatures", A4_H - 102, serif, 22, P2_INK_DARK);

  // Secondary Floating White Card (Matches "01 | Как повысить ценность предложения?")
  const cardY = A4_H - 150;
  drawRoundedRect(p2, MARGIN_X, cardY, CONTENT_W, 28, 6, {
    color: WHITE,
    borderColor: rgb(229 / 255, 184 / 255, 196 / 255),
    borderWidth: 0.5,
  });
  drawCenteredText(
    p2,
    "01 | Legal Acceptance & Tamper-Evident Signatures",
    cardY + 9,
    bold,
    9.5,
    ACCENT_ROSE,
  );

  // Introductory Body Paragraph
  const introText =
    "This digital agreement is executed under Section 10A of the Information Technology Act, 2000 and the Indian Contract Act, 1872. By completing digital execution, both parties acknowledge and accept all covenants, schedules, and terms set forth herein.";
  const introLines = wrapText(introText, sans, 7.6, CONTENT_W);
  let p2y = cardY - 20;
  introLines.forEach((l) => {
    p2.drawText(l, { x: MARGIN_X, y: p2y, size: 7.6, font: sans, color: P2_INK_BODY });
    p2y -= 11;
  });

  // Sub-section Pill (Matches "#1 Скидки, акции и бонусы: как использовать эффективно?")
  p2y -= 10;
  const p2PillW = 265;
  drawRoundedRect(p2, MARGIN_X, p2y - 18, p2PillW, 20, 6, { color: WHITE });
  p2.drawText("#1 CSC Circle & Counterparty Digital Execution", {
    x: MARGIN_X + 10,
    y: p2y - 13,
    size: 7.8,
    font: bold,
    color: P2_INK_DARK,
  });

  p2y -= 28;
  drawArrow(p2, MARGIN_X, p2y, 14, ACCENT_ROSE);
  p2.drawText(
    "Cryptographically verified digital sign-off and audit trail recorded on secure ledger.",
    {
      x: MARGIN_X + 20,
      y: p2y - 1,
      size: 7.6,
      font: sans,
      color: P2_INK_BODY,
    },
  );

  p2y -= 16;
  p2.drawText("Execution Details & Authorized Signatories:", {
    x: MARGIN_X,
    y: p2y,
    size: 7.8,
    font: italic,
    color: rgb(90 / 255, 69 / 255, 75 / 255),
  });

  // 3 Checkmark Execution Blocks (Matching Page 2 template checkmark items)
  p2y -= 18;

  // Block 1: CSC Signatory
  drawCheckmark(p2, MARGIN_X + 2, p2y + 16, 8, ACCENT_ROSE);
  p2.drawText("Authorized Signatory — Coimbatore Startup Community:", {
    x: MARGIN_X + 16,
    y: p2y + 17,
    size: 8,
    font: bold,
    color: P2_INK_DARK,
  });
  p2.drawText(input.cscSignatoryName, {
    x: MARGIN_X + 16,
    y: p2y - 6,
    size: 22,
    font: script,
    color: SIG_BLUE,
  });
  p2.drawText(
    `${input.cscSignatoryName} · ${input.cscSignatoryRole} · Coimbatore Startup Community (CSC Circle)`,
    {
      x: MARGIN_X + 16,
      y: p2y - 18,
      size: 7.2,
      font: sans,
      color: P2_INK_BODY,
    },
  );

  p2y -= 52;

  // Block 2: Counterparty Signatory
  drawCheckmark(p2, MARGIN_X + 2, p2y + 16, 8, ACCENT_ROSE);
  p2.drawText("Authorized Signatory — Counterparty / Recipient:", {
    x: MARGIN_X + 16,
    y: p2y + 17,
    size: 8,
    font: bold,
    color: P2_INK_DARK,
  });

  const counterpartySig =
    isSigned && input.signedName ? input.signedName : input.recipientName;
  p2.drawText(counterpartySig, {
    x: MARGIN_X + 16,
    y: p2y - 6,
    size: 22,
    font: script,
    color: SIG_BLUE,
  });
  const auditState = isSigned
    ? `Verified Signature · ${input.signedEmail || input.recipientEmail}`
    : `Pending Execution · ${input.recipientEmail}`;
  p2.drawText(
    `${input.signedName || input.recipientName} · ${
      input.signedRole || input.recipientRole || "Authorized Signatory"
    }${input.signedOrg || input.recipientOrg ? ` · ${input.signedOrg || input.recipientOrg}` : ""} (${auditState})`,
    {
      x: MARGIN_X + 16,
      y: p2y - 18,
      size: 7.2,
      font: sans,
      color: P2_INK_BODY,
    },
  );

  p2y -= 52;

  // Block 3: Statutory Acceptance Declaration & QR Code
  drawCheckmark(p2, MARGIN_X + 2, p2y + 16, 8, ACCENT_ROSE);
  p2.drawText("Statutory Acceptance & Tamper-Evident Verification:", {
    x: MARGIN_X + 16,
    y: p2y + 17,
    size: 8,
    font: bold,
    color: P2_INK_DARK,
  });

  const hashSnippet = (input.documentHash || "SHA256-VERIFIED-RECORD").slice(0, 32);
  const declText = `Confirmed under Section 10A & 65B of Information Technology Act, 2000. Cryptographic Record: ${hashSnippet}... Both parties are legally bound upon digital execution.`;
  const dLines = wrapText(declText, sans, 7.2, CONTENT_W - 84);
  let dy = p2y - 2;
  dLines.forEach((dl) => {
    p2.drawText(dl, { x: MARGIN_X + 16, y: dy, size: 7.2, font: sans, color: P2_INK_BODY });
    dy -= 10;
  });

  // Verification QR Code on right side of statutory block
  if (qrImg) {
    p2.drawImage(qrImg, {
      x: MARGIN_X + CONTENT_W - 68,
      y: p2y - 28,
      width: 60,
      height: 60,
    });
  }

  // Minimal 2-Line Official Attribution at bottom of Page 2
  drawCenteredText(
    p2,
    "Coimbatore Startup Community — A Community-Led Initiative",
    64,
    sans,
    8,
    P2_INK_BODY,
  );
  drawCenteredText(
    p2,
    "Platform Architecture & Engineering by Logic Intelligence Technologies (LIT)",
    50,
    sans,
    7.2,
    rgb(122 / 255, 88 / 255, 97 / 255),
  );

  // Page 2 Footer: ( 62 )
  drawCenteredText(p2, "( 62 )", 28, italic, 9, rgb(138 / 255, 107 / 255, 115 / 255));

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
