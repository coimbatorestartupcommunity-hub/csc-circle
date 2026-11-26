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

// Editorial Color Palette (Showit Style: High contrast, Pure White & Charcoal Black)
const WHITE = rgb(1, 1, 1);
const INK_DARK = rgb(0.067, 0.067, 0.067); // #111111
const INK_BODY = rgb(0.14, 0.14, 0.16); // #242429
const INK_MUTED = rgb(0.42, 0.43, 0.47); // #6B6E78
const RULE_LIGHT = rgb(0.86, 0.87, 0.89); // #DCDEE3
const CARD_BG = rgb(0.98, 0.982, 0.988); // #F9FAFC
const SIG_BLUE = rgb(0.118, 0.251, 0.686); // #1E40AF ink-blue handwritten accent

async function loadFontFile(filename: string): Promise<Uint8Array> {
  const fullPath = path.join(process.cwd(), "public", "fonts", "agreements", filename);
  return new Uint8Array(await readFile(fullPath));
}

async function loadCachedPng(relPath: string, maxW = 800, maxH = 800): Promise<Buffer | null> {
  try {
    const fullPath = path.join(process.cwd(), relPath);
    const raw = await readFile(fullPath);
    return await sharp(raw).resize(maxW, maxH, { fit: "inside" }).png().toBuffer();
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

  // Load typography & brand image assets in parallel
  const [
    serifBytes,
    serifItalicBytes,
    sansBytes,
    scriptBytes,
    cscLogoPng,
    litLogoPng,
    bannerPng,
    ticelPng,
    leadersPng,
  ] = await Promise.all([
    loadFontFile("CormorantGaramond.ttf"),
    loadFontFile("CormorantGaramond-Italic.ttf"),
    loadFontFile("PlusJakartaSans.ttf"),
    loadFontFile("Caveat.ttf"),
    loadCachedPng("public/brand/csc-circle-seal.png", 260, 260),
    loadCachedPng("public/brand/lit-seal.png", 260, 260),
    loadCachedPng("public/images/agreements/csc-web-banner.jpg", 720, 380),
    loadCachedPng("public/images/agreements/community-ticel.webp", 640, 480),
    loadCachedPng("public/images/agreements/leaders/csc-leaders-lockup.jpg", 640, 800),
  ]);

  const serif = await doc.embedFont(serifBytes);
  const serifItalic = await doc.embedFont(serifItalicBytes);
  const sans = await doc.embedFont(sansBytes);
  const script = await doc.embedFont(scriptBytes);

  let cscLogoImg: PDFImage | null = null;
  if (cscLogoPng) {
    cscLogoImg = await doc.embedPng(new Uint8Array(cscLogoPng));
  }

  let litLogoImg: PDFImage | null = null;
  if (litLogoPng) {
    litLogoImg = await doc.embedPng(new Uint8Array(litLogoPng));
  }

  let partnerLogoImg: PDFImage | null = null;
  if (input.partnerLogoBuffer && input.partnerLogoBuffer.length > 0) {
    try {
      const normalized = await sharp(input.partnerLogoBuffer)
        .resize(260, 140, { fit: "inside" })
        .png()
        .toBuffer();
      partnerLogoImg = await doc.embedPng(new Uint8Array(normalized));
    } catch {
      partnerLogoImg = null;
    }
  }

  let bannerImg: PDFImage | null = null;
  if (bannerPng) {
    try {
      bannerImg = await doc.embedPng(new Uint8Array(bannerPng));
    } catch {
      bannerImg = null;
    }
  }

  let ticelImg: PDFImage | null = null;
  if (ticelPng) {
    try {
      ticelImg = await doc.embedPng(new Uint8Array(ticelPng));
    } catch {
      ticelImg = null;
    }
  }

  let leadersImg: PDFImage | null = null;
  if (leadersPng) {
    try {
      leadersImg = await doc.embedPng(new Uint8Array(leadersPng));
    } catch {
      leadersImg = null;
    }
  }

  const pages: PDFPage[] = [];

  const createEditorialPage = (isFirst: boolean): { page: PDFPage; cursorY: number } => {
    const page = doc.addPage([A4_W, A4_H]);
    page.drawRectangle({ x: 0, y: 0, width: A4_W, height: A4_H, color: WHITE });
    pages.push(page);

    // Tracked uppercase header metadata (Showit style)
    drawTrackedLeft(page, "COIMBATORE STARTUP COMMUNITY", MARGIN_X, A4_H - 42, sans, 7.2, INK_DARK, 1.8);
    drawTrackedRight(
      page,
      `REF: ${input.referenceCode}`,
      A4_W - MARGIN_X,
      A4_H - 42,
      sans,
      7.2,
      INK_DARK,
      1.5,
    );

    page.drawLine({
      start: { x: MARGIN_X, y: A4_H - 52 },
      end: { x: A4_W - MARGIN_X, y: A4_H - 52 },
      thickness: 0.5,
      color: RULE_LIGHT,
    });

    return { page, cursorY: A4_H - 76 };
  };

  // -------------------------------------------------------------
  // PAGE 1: EDITORIAL COVER & FORMAL TITLE
  // -------------------------------------------------------------
  let { page, cursorY } = createEditorialPage(true);

  // Centered circular seal / logos row
  const activePartnerLogo = partnerLogoImg || (input.title.includes("Technology") ? litLogoImg : null);
  if (cscLogoImg && activePartnerLogo) {
    const cscSize = 46;
    const pDims = activePartnerLogo.scaleToFit(90, 42);
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
    page.drawImage(activePartnerLogo, {
      x: startX + cscSize + gap,
      y: cursorY - pDims.height / 2 - 12,
      width: pDims.width,
      height: pDims.height,
    });
    cursorY -= 56;
  } else if (cscLogoImg) {
    const cscSize = 48;
    page.drawImage(cscLogoImg, {
      x: (A4_W - cscSize) / 2,
      y: cursorY - cscSize + 10,
      width: cscSize,
      height: cscSize,
    });
    cursorY -= 56;
  }

  // Italic serif eyebrow
  const eyebrowLines = wrapText(input.eyebrow, serifItalic, 12, CONTENT_W - 40);
  for (const line of eyebrowLines) {
    drawCenteredText(page, line, cursorY, serifItalic, 12, INK_BODY);
    cursorY -= 16;
  }
  cursorY -= 4;

  // Prominent uppercase serif title (Showit "LAUNCH IN DAYS, NOT MONTHS" style)
  const titleLines = wrapText(input.title.toUpperCase(), serif, 22, CONTENT_W);
  for (const line of titleLines) {
    drawCenteredText(page, line, cursorY, serif, 22, INK_DARK, 0.8);
    cursorY -= 25;
  }
  cursorY -= 2;

  // Tracked uppercase geometric subtitle
  const subLines = wrapText(input.subtitle.toUpperCase(), sans, 7.5, CONTENT_W - 20);
  for (const line of subLines) {
    drawCenteredText(page, line, cursorY, sans, 7.5, INK_MUTED, 1.5);
    cursorY -= 12;
  }
  cursorY -= 10;

  // Hairline separator
  page.drawLine({
    start: { x: MARGIN_X, y: cursorY },
    end: { x: A4_W - MARGIN_X, y: cursorY },
    thickness: 0.6,
    color: RULE_LIGHT,
  });
  cursorY -= 16;

  // Dual-Column Parties & Metadata Card
  const metaBoxH = 68;
  page.drawRectangle({
    x: MARGIN_X,
    y: cursorY - metaBoxH,
    width: CONTENT_W,
    height: metaBoxH,
    color: CARD_BG,
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
    y: cursorY - 28,
    size: 8.5,
    font: sans,
    color: INK_DARK,
  });
  page.drawText(`Effective: ${input.effectiveDate} · Term: ${input.durationLabel}`, {
    x: MARGIN_X + 12,
    y: cursorY - 42,
    size: 7.5,
    font: sans,
    color: INK_MUTED,
  });
  page.drawText(`Status: ${input.status.toUpperCase()}`, {
    x: MARGIN_X + 12,
    y: cursorY - 55,
    size: 7.2,
    font: sans,
    color: input.status === "signed" ? SIG_BLUE : INK_MUTED,
  });

  page.drawText("COUNTERPARTY / RECIPIENT", {
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
      y: cursorY - 28,
      size: 8.5,
      font: sans,
      color: INK_DARK,
    },
  );
  page.drawText((input.recipientRole || "Authorized Signatory").slice(0, 48), {
    x: col2X,
    y: cursorY - 42,
    size: 7.5,
    font: sans,
    color: INK_MUTED,
  });
  page.drawText(input.recipientEmail.slice(0, 48), {
    x: col2X,
    y: cursorY - 55,
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

  // -------------------------------------------------------------
  // NUMBERED LEGAL SECTIONS & CLAUSES
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // EXECUTION & SIGNATURE BLOCK
  // -------------------------------------------------------------
  ensureSpace(140);
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

  // First Party (CSC Signatory)
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

  // Counterparty Signatory
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

  // -------------------------------------------------------------
  // SECTION 65B ELECTRONIC AUDIT CERTIFICATE
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // APPENDIX: 7-SLIDE COMMUNITY & ECOSYSTEM PRESENTATION DECK
  // -------------------------------------------------------------

  const createAppendixPage = (slideHeader: string): { page: PDFPage; cursorY: number } => {
    const p = doc.addPage([A4_W, A4_H]);
    p.drawRectangle({ x: 0, y: 0, width: A4_W, height: A4_H, color: WHITE });
    pages.push(p);

    drawTrackedLeft(p, "CSC CIRCLE — ECOSYSTEM BRIEFING", MARGIN_X, A4_H - 42, sans, 7.2, INK_DARK, 1.8);
    drawTrackedRight(p, slideHeader.toUpperCase(), A4_W - MARGIN_X, A4_H - 42, sans, 7.2, INK_DARK, 1.4);

    p.drawLine({
      start: { x: MARGIN_X, y: A4_H - 52 },
      end: { x: A4_W - MARGIN_X, y: A4_H - 52 },
      thickness: 0.5,
      color: RULE_LIGHT,
    });

    return { page: p, cursorY: A4_H - 74 };
  };

  // Helper to render framed presentation slide card
  const drawSlideCard = (
    p: PDFPage,
    topY: number,
    height: number,
    slideNum: number,
    eyebrow: string,
    title: string,
    subtitle: string,
  ) => {
    p.drawRectangle({
      x: MARGIN_X,
      y: topY - height,
      width: CONTENT_W,
      height,
      color: CARD_BG,
      borderColor: RULE_LIGHT,
      borderWidth: 0.6,
    });

    // Badge / Pill
    p.drawText(`SLIDE 0${slideNum} · ${eyebrow.toUpperCase()}`, {
      x: MARGIN_X + 16,
      y: topY - 20,
      size: 7,
      font: sans,
      color: INK_MUTED,
    });

    // Title in serif
    p.drawText(title, {
      x: MARGIN_X + 16,
      y: topY - 38,
      size: 13,
      font: serif,
      color: INK_DARK,
    });

    // Subtitle
    p.drawText(subtitle, {
      x: MARGIN_X + 16,
      y: topY - 52,
      size: 7.8,
      font: sans,
      color: INK_MUTED,
    });

    p.drawLine({
      start: { x: MARGIN_X + 16, y: topY - 60 },
      end: { x: MARGIN_X + CONTENT_W - 16, y: topY - 60 },
      thickness: 0.5,
      color: RULE_LIGHT,
    });
  };

  // --- APPENDIX PAGE 1: SLIDES 1 & 2 ---
  {
    const ap1 = createAppendixPage("Slides 1 & 2 of 7");
    let y = ap1.cursorY;

    // Slide 1: Ecosystem Overview
    const card1H = 340;
    drawSlideCard(
      ap1.page,
      y,
      card1H,
      1,
      "Ecosystem Overview",
      "Great Ideas Grow in the Right Circle",
      "Coimbatore Startup Community — Connect. Build. Grow.",
    );

    if (bannerImg) {
      const bannerW = CONTENT_W - 32;
      const bannerH = 135;
      ap1.page.drawImage(bannerImg, {
        x: MARGIN_X + 16,
        y: y - 72 - bannerH,
        width: bannerW,
        height: bannerH,
      });
    }

    const colW = (CONTENT_W - 48) / 3;
    const colY = y - 225;
    const bullets = [
      ["FOUNDERS & BUILDERS", "Bridging early-stage creators with experienced operators and angels."],
      ["COIMBATORE HUB", "Rooted in South India's premier industrial and engineering corridor."],
      ["GIVE-FIRST ETHOS", "Peer problem-solving, transparency, and collaborative acceleration."],
    ];

    bullets.forEach(([title, desc], i) => {
      const bx = MARGIN_X + 16 + i * (colW + 8);
      ap1.page.drawText(title, { x: bx, y: colY, size: 7.2, font: sans, color: INK_DARK });
      const dLines = wrapText(desc, sans, 7, colW);
      dLines.forEach((dl, di) => {
        ap1.page.drawText(dl, { x: bx, y: colY - 12 - di * 10, size: 7, font: sans, color: INK_MUTED });
      });
    });

    y -= card1H + 20;

    // Slide 2: About CSC & Founding Movement
    const card2H = 340;
    drawSlideCard(
      ap1.page,
      y,
      card2H,
      2,
      "Our Story & Movement",
      "Building South India's Most Dynamic Founder Hub",
      "Founded with a mission to unite ambitious minds across Coimbatore.",
    );

    if (ticelImg) {
      const imgW = 190;
      const imgH = 140;
      ap1.page.drawImage(ticelImg, {
        x: MARGIN_X + 16,
        y: y - 72 - imgH,
        width: imgW,
        height: imgH,
      });

      const textX = MARGIN_X + 16 + imgW + 16;
      const textW = CONTENT_W - 48 - imgW;
      const story =
        "Coimbatore Startup Community (CSC Circle) was established to provide aspiring founders, creators, and builders with an authentic home base.\n\nFrom closed-door founder roundtables at TICEL Bio Park to open-air masterminds and coffee house pitch teardowns, we create intentional spaces for builders to solve real problems and build enduring ventures.";
      const sLines = wrapText(story, sans, 8, textW);
      let sy = y - 80;
      sLines.forEach((sl) => {
        ap1.page.drawText(sl, { x: textX, y: sy, size: 8, font: sans, color: INK_BODY });
        sy -= 12;
      });

      // Quick Stats Pills
      ap1.page.drawRectangle({
        x: textX,
        y: sy - 34,
        width: 110,
        height: 32,
        color: WHITE,
        borderColor: RULE_LIGHT,
        borderWidth: 0.5,
      });
      ap1.page.drawText("100+ FOUNDERS", { x: textX + 10, y: sy - 18, size: 7.5, font: sans, color: INK_DARK });
      ap1.page.drawText("Active Startups", { x: textX + 10, y: sy - 28, size: 6.8, font: sans, color: INK_MUTED });

      ap1.page.drawRectangle({
        x: textX + 118,
        y: sy - 34,
        width: 110,
        height: 32,
        color: WHITE,
        borderColor: RULE_LIGHT,
        borderWidth: 0.5,
      });
      ap1.page.drawText("BI-WEEKLY", { x: textX + 128, y: sy - 18, size: 7.5, font: sans, color: INK_DARK });
      ap1.page.drawText("Meetups & Clinics", { x: textX + 128, y: sy - 28, size: 6.8, font: sans, color: INK_MUTED });
    }
  }

  // --- APPENDIX PAGE 2: SLIDES 3 & 4 ---
  {
    const ap2 = createAppendixPage("Slides 3 & 4 of 7");
    let y = ap2.cursorY;

    // Slide 3: The People Behind CSC Circle
    const card3H = 340;
    drawSlideCard(
      ap2.page,
      y,
      card3H,
      3,
      "Leadership & Stewards",
      "The People Behind CSC Circle",
      "Seven dedicated leaders steering the community's vision and operations.",
    );

    if (leadersImg) {
      const lockupW = 180;
      const lockupH = 210;
      ap2.page.drawImage(leadersImg, {
        x: MARGIN_X + 16,
        y: y - 72 - lockupH,
        width: lockupW,
        height: lockupH,
      });

      const rosterX = MARGIN_X + 16 + lockupW + 16;
      const rosterW = CONTENT_W - 48 - lockupW;
      const leadersList = [
        ["K. N. Reyash", "Founder & President · Ecosystem Vision"],
        ["E. R. Sharan", "Co-Founder & Vice President · Strategic Growth"],
        ["Mirra Mahendran", "Chief Executive Officer · Operations & Alliances"],
        ["Vikash Saravanan", "Chief Technology Officer · LIT Tech Partner"],
        ["Swathi", "Chief Community Officer · Member Experience"],
        ["Kishore C", "Chief Operating Officer · Programs & Logistics"],
        ["Jaibharath V", "Chief Business Officer · Partnerships & Value"],
      ];

      let ry = y - 76;
      leadersList.forEach(([lname, lrole]) => {
        ap2.page.drawText(lname, { x: rosterX, y: ry, size: 8.5, font: sans, color: INK_DARK });
        ap2.page.drawText(lrole, { x: rosterX, y: ry - 11, size: 7.2, font: sans, color: INK_MUTED });
        ap2.page.drawLine({
          start: { x: rosterX, y: ry - 16 },
          end: { x: rosterX + rosterW, y: ry - 16 },
          thickness: 0.4,
          color: RULE_LIGHT,
        });
        ry -= 26;
      });
    }

    y -= card3H + 20;

    // Slide 4: Technology Partner Spotlight (LIT)
    const card4H = 340;
    drawSlideCard(
      ap2.page,
      y,
      card4H,
      4,
      "Engineering Architecture",
      "Exclusive Technology Partner: Logic Intelligence Technologies",
      "Enterprise-grade digital infrastructure engineered specifically for CSC Circle.",
    );

    if (litLogoImg) {
      const logoSize = 100;
      ap2.page.drawImage(litLogoImg, {
        x: MARGIN_X + 24,
        y: y - 80 - logoSize,
        width: logoSize,
        height: logoSize,
      });

      ap2.page.drawText("LOGIC INTELLIGENCE TECHNOLOGIES", {
        x: MARGIN_X + 16,
        y: y - 195,
        size: 7.2,
        font: sans,
        color: INK_DARK,
      });
      ap2.page.drawText("Sole & Exclusive Technology Partner", {
        x: MARGIN_X + 16,
        y: y - 207,
        size: 7,
        font: serifItalic,
        color: SIG_BLUE,
      });

      const techX = MARGIN_X + 16 + 140;
      const techW = CONTENT_W - 48 - 140;
      const pillars = [
        ["Tamper-Evident Legal Engine", "Cryptographic SHA-256 agreement generation compliant with Section 10A & 65B."],
        ["AI WhatsApp Concierge", "24/7 automated community query handling, event RSVPs, and member triage."],
        ["Digital Founder Pass", "Dynamic QR check-in badges for partner discounts and verified co-working access."],
      ];

      let ty = y - 82;
      pillars.forEach(([pTitle, pDesc]) => {
        ap2.page.drawText(pTitle, { x: techX, y: ty, size: 8.5, font: sans, color: INK_DARK });
        const pLines = wrapText(pDesc, sans, 7.5, techW);
        pLines.forEach((pl, pli) => {
          ap2.page.drawText(pl, { x: techX, y: ty - 12 - pli * 10, size: 7.5, font: sans, color: INK_BODY });
        });
        ty -= 42;
      });
    }
  }

  // --- APPENDIX PAGE 3: SLIDES 5 & 6 ---
  {
    const ap3 = createAppendixPage("Slides 5 & 6 of 7");
    let y = ap3.cursorY;

    // Slide 5: Flagship Programs
    const card5H = 340;
    drawSlideCard(
      ap3.page,
      y,
      card5H,
      5,
      "Ecosystem Initiatives",
      "Programs Designed for Tangible Founder Outcomes",
      "High-signal gatherings and structured acceleration clinics.",
    );

    const progW = (CONTENT_W - 48) / 3;
    const progs = [
      [
        "CSC CONNECT",
        "Bi-Weekly Curated Meetups",
        "Curated founder roundtables designed to bypass polite small talk. Founders share actual metrics, bottlenecks, and peer solutions.",
        "Format: Stranger-to-Partner",
      ],
      [
        "PITCH CLINICS",
        "Closed-Door Deck Teardowns",
        "Live teardowns with active angel investors, venture capital scouts, and seasoned operators before taking seed rounds to market.",
        "Format: Closed Mastermind",
      ],
      [
        "FOUNDER PASS",
        "Verified Perks & Benefits",
        "Exclusive community partner perks including cloud hosting credits, co-working desks across Coimbatore, and legal templates.",
        "Format: Digital QR Badge",
      ],
    ];

    progs.forEach(([pHeader, pSub, pBody, pFoot], idx) => {
      const px = MARGIN_X + 16 + idx * (progW + 8);
      const py = y - 76;
      ap3.page.drawRectangle({
        x: px,
        y: py - 220,
        width: progW,
        height: 220,
        color: WHITE,
        borderColor: RULE_LIGHT,
        borderWidth: 0.5,
      });

      ap3.page.drawText(pHeader, { x: px + 10, y: py - 18, size: 8, font: sans, color: INK_DARK });
      ap3.page.drawText(pSub, { x: px + 10, y: py - 30, size: 6.8, font: sans, color: INK_MUTED });
      ap3.page.drawLine({
        start: { x: px + 10, y: py - 36 },
        end: { x: px + progW - 10, y: py - 36 },
        thickness: 0.4,
        color: RULE_LIGHT,
      });

      const bLines = wrapText(pBody, sans, 7.2, progW - 20);
      let by = py - 50;
      bLines.forEach((bl) => {
        ap3.page.drawText(bl, { x: px + 10, y: by, size: 7.2, font: sans, color: INK_BODY });
        by -= 11;
      });

      ap3.page.drawText(pFoot, { x: px + 10, y: py - 205, size: 6.5, font: sans, color: SIG_BLUE });
    });

    y -= card5H + 20;

    // Slide 6: Operating Principles & Code of Conduct
    const card6H = 340;
    drawSlideCard(
      ap3.page,
      y,
      card6H,
      6,
      "Community Principles",
      "Our Core Operating Principles & Code of Conduct",
      "A high-trust sanctuary where Coimbatore's founders thrive.",
    );

    const values = [
      [
        "1. Give First, Ask Later",
        "True networks flourish when founders offer insights, introductions, and feedback before seeking immediate transactions.",
      ],
      [
        "2. Zero Tolerance for Spam",
        "Unsolicited promotional sales pitches and indiscriminate DM blasts are strictly prohibited to preserve high signal-to-noise ratio.",
      ],
      [
        "3. Radical Confidentiality (Vegas Rule)",
        "Unreleased product teardowns, sensitive numbers, and struggles shared in closed circles remain strictly confidential.",
      ],
      [
        "4. Inclusivity & Meritocracy",
        "Whether you are a solo student hacker or a seasoned serial entrepreneur, everyone is evaluated on grit and integrity.",
      ],
    ];

    const valW = (CONTENT_W - 44) / 2;
    values.forEach(([vTitle, vDesc], idx) => {
      const row = Math.floor(idx / 2);
      const col = idx % 2;
      const vx = MARGIN_X + 16 + col * (valW + 12);
      const vy = y - 76 - row * 105;

      ap3.page.drawRectangle({
        x: vx,
        y: vy - 92,
        width: valW,
        height: 92,
        color: WHITE,
        borderColor: RULE_LIGHT,
        borderWidth: 0.5,
      });

      ap3.page.drawText(vTitle, { x: vx + 12, y: vy - 18, size: 8.5, font: sans, color: INK_DARK });
      const vdLines = wrapText(vDesc, sans, 7.5, valW - 24);
      let vdy = vy - 32;
      vdLines.forEach((vdl) => {
        ap3.page.drawText(vdl, { x: vx + 12, y: vdy, size: 7.5, font: sans, color: INK_BODY });
        vdy -= 11.5;
      });
    });
  }

  // --- APPENDIX PAGE 4: SLIDE 7 ---
  {
    const ap4 = createAppendixPage("Slide 7 of 7");
    let y = ap4.cursorY;

    // Slide 7: Official Community Hub & Channels
    const card7H = 680;
    drawSlideCard(
      ap4.page,
      y,
      card7H,
      7,
      "Official Hub & Connect",
      "Join the Circle. Lead the Future.",
      "Connect with the leadership team and access official community channels.",
    );

    if (cscLogoImg) {
      const sealSize = 80;
      ap4.page.drawImage(cscLogoImg, {
        x: (A4_W - sealSize) / 2,
        y: y - 80 - sealSize,
        width: sealSize,
        height: sealSize,
      });
    }

    drawCenteredText(
      ap4.page,
      "COIMBATORE STARTUP COMMUNITY",
      y - 185,
      serif,
      16,
      INK_DARK,
      0.8,
    );
    drawCenteredText(
      ap4.page,
      "Official Communication & Partnership Channels",
      y - 202,
      serifItalic,
      11,
      INK_MUTED,
    );

    const channels = [
      ["WhatsApp Founder Network", "https://chat.whatsapp.com/HGWEu9dm7Jc6C3sH7V1PTB"],
      ["WhatsApp 24/7 AI Concierge", "https://wa.me/917550067712 (+91 75500 67712)"],
      ["Official LinkedIn Page", "https://www.linkedin.com/in/csc-coimbatore-startup-community-b27b0b44b"],
      ["Instagram Channel", "https://www.instagram.com/coimbatorestartupcommunity/"],
      ["Official Community Email", "coimbatorestartup.csc@gmail.com"],
      ["Platform Engineering (LIT)", "hello@logicintelligencetechnologies.in"],
    ];

    let cy = y - 235;
    channels.forEach(([cTitle, cVal]) => {
      ap4.page.drawRectangle({
        x: MARGIN_X + 24,
        y: cy - 36,
        width: CONTENT_W - 48,
        height: 36,
        color: WHITE,
        borderColor: RULE_LIGHT,
        borderWidth: 0.5,
      });

      ap4.page.drawText(cTitle, { x: MARGIN_X + 36, y: cy - 16, size: 8, font: sans, color: INK_DARK });
      ap4.page.drawText(cVal, { x: MARGIN_X + 36, y: cy - 27, size: 7, font: sans, color: SIG_BLUE });
      cy -= 46;
    });

    // Minimal 2-line attribution at base of slide 7
    drawCenteredText(
      ap4.page,
      "Coimbatore Startup Community — A Community-Led Initiative",
      cy - 20,
      sans,
      8.5,
      INK_BODY,
    );
    drawCenteredText(
      ap4.page,
      "Platform Architecture & Engineering by Logic Intelligence Technologies (LIT)",
      cy - 34,
      sans,
      7.5,
      INK_MUTED,
    );
  }

  // -------------------------------------------------------------
  // GLOBAL FOOTER & PAGE NUMBERING ON EVERY PAGE
  // -------------------------------------------------------------
  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    drawCenteredText(
      p,
      "csc.logicintelligencetechnologies.in",
      30,
      serifItalic,
      9,
      INK_MUTED,
    );
    drawTrackedRight(
      p,
      `PAGE ${idx + 1} OF ${totalPages}`,
      A4_W - MARGIN_X,
      30,
      sans,
      6.8,
      INK_MUTED,
      1.2,
    );
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
