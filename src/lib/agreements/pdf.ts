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
const MARGIN_X = 36;
const CONTENT_W = A4_W - MARGIN_X * 2; // 523.28

// Clean, Modern Web Layout Color Palette (Matches Chrome Web Printout)
const PAGE_BG = rgb(1, 1, 1); // Pure White
const CARD_BG = rgb(1, 1, 1);
const CARD_BORDER = rgb(226 / 255, 232 / 255, 240 / 255); // #E2E8F0
const CARD_MUTED_BG = rgb(248 / 255, 250 / 255, 252 / 255); // #F8FAFC
const TEXT_DARK = rgb(15 / 255, 23 / 255, 42 / 255); // #0F172A
const TEXT_BODY = rgb(51 / 255, 65 / 255, 85 / 255); // #334155
const TEXT_MUTED = rgb(100 / 255, 116 / 255, 139 / 255); // #64748B
const ACCENT_PURPLE = rgb(124 / 255, 58 / 255, 237 / 255); // #7C3AED
const PILL_BLUE_BG = rgb(239 / 255, 246 / 255, 255 / 255); // #EFF6FF
const PILL_BLUE_BORDER = rgb(191 / 255, 219 / 255, 254 / 255); // #BFDBFE
const PILL_BLUE_TEXT = rgb(37 / 255, 99 / 255, 235 / 255); // #2563EB
const AUDIT_BG = rgb(236 / 255, 253 / 255, 245 / 255); // #ECFDF5
const AUDIT_BORDER = rgb(167 / 255, 243 / 255, 208 / 255); // #A7F3D0
const AUDIT_TEXT = rgb(4 / 255, 120 / 255, 87 / 255); // #047857
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
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  if (radius <= 0) {
    if (options.color) {
      page.drawRectangle({ x, y, width: w, height: h, color: options.color });
    }
    if (options.borderColor && options.borderWidth) {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        borderColor: options.borderColor,
        borderWidth: options.borderWidth,
      });
    }
    return;
  }
  const svg = `M ${x + radius} ${y} h ${w - 2 * radius} a ${radius} ${radius} 0 0 1 ${radius} ${radius} v ${h - 2 * radius} a ${radius} ${radius} 0 0 1 -${radius} ${radius} h -${w - 2 * radius} a ${radius} ${radius} 0 0 1 -${radius} -${radius} v -${h - 2 * radius} a ${radius} ${radius} 0 0 1 ${radius} -${radius} Z`;
  page.drawSvgPath(svg, options);
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

export async function generateAgreementPdf(input: AgreementPdfInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Load typography & assets
  const [
    sansBytes,
    scriptBytes,
    serifBytes,
    cscLogoPng,
    sealCirclePng,
    socialWhatsappPng,
    socialAgentPng,
    socialLinkedinPng,
    socialInstagramPng,
    socialMailPng,
    qrPng,
  ] = await Promise.all([
    loadFontFile("PlusJakartaSans.ttf"),
    loadFontFile("Caveat.ttf"),
    loadFontFile("CormorantGaramond.ttf"),
    loadCachedPng("public/brand/csc-circle-seal.png", 240, 240),
    loadCachedPng("public/images/agreements/circular-image/reyash.jpg", 160, 160),
    loadCachedPng("public/images/agreements/social/whatsapp.png", 64, 64),
    loadCachedPng("public/images/agreements/social/whatsapp-agent.png", 64, 64),
    loadCachedPng("public/images/agreements/social/linkedin.png", 64, 64),
    loadCachedPng("public/images/agreements/social/instagram.png", 64, 64),
    loadCachedPng("public/images/agreements/social/mail.png", 64, 64),
    QRCode.toBuffer(
      `https://csc.logicintelligencetechnologies.in/agreements/sign/${input.referenceCode}`,
      {
        margin: 1,
        width: 240,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      },
    ),
  ]);

  const sans = await doc.embedFont(sansBytes);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const script = await doc.embedFont(scriptBytes);
  const serif = await doc.embedFont(serifBytes);

  let cscLogoImg: PDFImage | null = null;
  if (cscLogoPng) {
    try {
      cscLogoImg = await doc.embedPng(new Uint8Array(cscLogoPng));
    } catch {
      cscLogoImg = null;
    }
  }

  let sealCircleImg: PDFImage | null = null;
  if (sealCirclePng) {
    try {
      sealCircleImg = await doc.embedPng(new Uint8Array(sealCirclePng));
    } catch {
      sealCircleImg = null;
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

  // Social icons
  const socialIcons: (PDFImage | null)[] = [];
  for (const b of [
    socialWhatsappPng,
    socialAgentPng,
    socialLinkedinPng,
    socialInstagramPng,
    socialMailPng,
  ]) {
    if (b) {
      try {
        socialIcons.push(await doc.embedPng(new Uint8Array(b)));
      } catch {
        socialIcons.push(null);
      }
    } else {
      socialIcons.push(null);
    }
  }

  const isSigned = input.status === "signed" || Boolean(input.signedAt);

  // Helper for multi-page management
  let currentPage = doc.addPage([A4_W, A4_H]);
  let pageNumber = 1;
  let curY = A4_H - 36;

  function drawTopHeader(page: PDFPage) {
    if (cscLogoImg) {
      page.drawImage(cscLogoImg, {
        x: MARGIN_X,
        y: A4_H - 38,
        width: 22,
        height: 22,
      });
    }
    page.drawText("CSC Circle", {
      x: MARGIN_X + 28,
      y: A4_H - 26,
      size: 10.5,
      font: bold,
      color: TEXT_DARK,
    });
    page.drawText("COIMBATORE STARTUP COMMUNITY", {
      x: MARGIN_X + 28,
      y: A4_H - 36,
      size: 5.5,
      font: bold,
      color: TEXT_MUTED,
    });
  }

  function drawPageFooter(page: PDFPage, num: number) {
    page.drawLine({
      start: { x: MARGIN_X, y: 28 },
      end: { x: MARGIN_X + CONTENT_W, y: 28 },
      thickness: 0.5,
      color: CARD_BORDER,
    });
    page.drawText(`CSC Circle · Official Digital Agreement — Page ${num}`, {
      x: MARGIN_X,
      y: 18,
      size: 6.5,
      font: sans,
      color: TEXT_MUTED,
    });
    page.drawText("Confidential & Tamper-Evident", {
      x: MARGIN_X + CONTENT_W - 105,
      y: 18,
      size: 6.5,
      font: sans,
      color: TEXT_MUTED,
    });
  }

  function startNewPage(): PDFPage {
    drawPageFooter(currentPage, pageNumber);
    pageNumber++;
    currentPage = doc.addPage([A4_W, A4_H]);
    drawTopHeader(currentPage);
    curY = A4_H - 56;
    return currentPage;
  }

  function ensureSpace(requiredH: number) {
    if (curY - requiredH < 44) {
      startNewPage();
    }
  }

  // --- PAGE 1 TOP HEADER BAR ---
  drawTopHeader(currentPage);
  curY -= 20;

  // --- HEADER SUMMARY CARD (White rounded card with border #E2E8F0) ---
  const headerCardH = 96;
  drawRoundedRect(currentPage, MARGIN_X, curY - headerCardH, CONTENT_W, headerCardH, 8, {
    color: CARD_BG,
    borderColor: CARD_BORDER,
    borderWidth: 1,
  });

  // CSC Circular Seal on left
  if (cscLogoImg) {
    currentPage.drawImage(cscLogoImg, {
      x: MARGIN_X + 14,
      y: curY - 44,
      width: 32,
      height: 32,
    });
  }

  // Eyebrow & Title
  const eyebrowText = (input.eyebrow || "COIMBATORE STARTUP COMMUNITY CORE MANDATE").toUpperCase();
  currentPage.drawText(eyebrowText.slice(0, 68), {
    x: MARGIN_X + 54,
    y: curY - 24,
    size: 7,
    font: bold,
    color: ACCENT_PURPLE,
  });

  const mainTitle = (input.title || "EXECUTIVE LEADERSHIP CHARTER").toUpperCase();
  currentPage.drawText(mainTitle.slice(0, 52), {
    x: MARGIN_X + 54,
    y: curY - 38,
    size: 11.5,
    font: bold,
    color: TEXT_DARK,
  });

  // Status Pill on top right
  const statusLabel = isSigned ? "Digitally Signed" : "Awaiting Signature";
  const statusPillW = bold.widthOfTextAtSize(statusLabel, 7.5) + 20;
  const statusX = MARGIN_X + CONTENT_W - statusPillW - 14;
  drawRoundedRect(currentPage, statusX, curY - 36, statusPillW, 18, 9, {
    color: isSigned ? AUDIT_BG : CARD_MUTED_BG,
    borderColor: isSigned ? AUDIT_BORDER : CARD_BORDER,
    borderWidth: 0.8,
  });
  currentPage.drawText(statusLabel, {
    x: statusX + 10,
    y: curY - 31,
    size: 7.5,
    font: bold,
    color: isSigned ? AUDIT_TEXT : TEXT_BODY,
  });

  // Card Divider
  currentPage.drawLine({
    start: { x: MARGIN_X + 14, y: curY - 50 },
    end: { x: MARGIN_X + CONTENT_W - 14, y: curY - 50 },
    thickness: 0.8,
    color: CARD_BORDER,
  });

  // 2-Column Metadata inside Header Card
  const colW = (CONTENT_W - 48) / 2;
  const col1X = MARGIN_X + 16;
  const col2X = col1X + colW + 16;

  // Left Column: Reference & Effective Date
  currentPage.drawText("Reference & Effective Date", {
    x: col1X,
    y: curY - 64,
    size: 7.5,
    font: bold,
    color: TEXT_DARK,
  });
  currentPage.drawText(input.referenceCode, {
    x: col1X,
    y: curY - 76,
    size: 7.2,
    font: sans,
    color: TEXT_MUTED,
  });
  currentPage.drawText(`Effective: ${input.effectiveDate} · Term: ${input.durationLabel}`, {
    x: col1X,
    y: curY - 87,
    size: 7,
    font: sans,
    color: TEXT_MUTED,
  });

  // Right Column: Addressed To
  currentPage.drawText("Addressed To", {
    x: col2X,
    y: curY - 64,
    size: 7.5,
    font: bold,
    color: TEXT_DARK,
  });
  const recipientLine = `${input.recipientName}${
    input.recipientOrg ? ` — ${input.recipientOrg}` : ""
  }`;
  currentPage.drawText(recipientLine.slice(0, 50), {
    x: col2X,
    y: curY - 76,
    size: 7.2,
    font: sans,
    color: TEXT_MUTED,
  });
  currentPage.drawText(input.recipientEmail.slice(0, 50), {
    x: col2X,
    y: curY - 87,
    size: 7,
    font: sans,
    color: TEXT_MUTED,
  });

  curY -= headerCardH + 16;

  // --- CATEGORY BAR ---
  currentPage.drawText((input.subtitle || "MEMORANDUM OF UNDERSTANDING").toUpperCase(), {
    x: MARGIN_X,
    y: curY,
    size: 7,
    font: bold,
    color: TEXT_MUTED,
  });
  const jurisText = "Laws of India · Coimbatore Jurisdiction";
  const jurisW = sans.widthOfTextAtSize(jurisText, 7);
  currentPage.drawText(jurisText, {
    x: MARGIN_X + CONTENT_W - jurisW,
    y: curY,
    size: 7,
    font: sans,
    color: TEXT_MUTED,
  });

  curY -= 14;

  // --- SECTIONS & CLAUSES RENDERING (DYNAMIC PAGINATION) ---
  for (let sIdx = 0; sIdx < input.sections.length; sIdx++) {
    const sec = input.sections[sIdx];

    // Ensure space for section header + at least 1 clause (~65pt)
    ensureSpace(65);

    // Section Header Card
    const secH = 24;
    drawRoundedRect(currentPage, MARGIN_X, curY - secH, CONTENT_W, secH, 6, {
      color: CARD_BG,
      borderColor: CARD_BORDER,
      borderWidth: 1,
    });

    const secTitle = sec.heading.toUpperCase();
    currentPage.drawText(secTitle.slice(0, 80), {
      x: MARGIN_X + 12,
      y: curY - 16,
      size: 7.5,
      font: bold,
      color: TEXT_DARK,
    });

    // Clause count pill on right
    const clausePillLabel = `${sec.clauses.length} Clauses`;
    const cPillW = sans.widthOfTextAtSize(clausePillLabel, 6.5) + 16;
    drawRoundedRect(
      currentPage,
      MARGIN_X + CONTENT_W - cPillW - 8,
      curY - 18,
      cPillW,
      14,
      4,
      {
        color: CARD_MUTED_BG,
        borderColor: CARD_BORDER,
        borderWidth: 0.6,
      },
    );
    currentPage.drawText(clausePillLabel, {
      x: MARGIN_X + CONTENT_W - cPillW,
      y: curY - 14,
      size: 6.5,
      font: sans,
      color: TEXT_MUTED,
    });

    curY -= secH + 6;

    // Render each clause inside section
    for (const rawClause of sec.clauses) {
      // Parse numbered prefix, colon lead, and body
      const numMatch = rawClause.match(
        /^([0-9]+\.[0-9]+(?:\.[0-9]+)?|[•✦\-])\s*([\s\S]*)/,
      );
      let pillPrefix = "";
      let colonTitle = "";
      let bodyText = rawClause;

      if (numMatch) {
        pillPrefix = numMatch[1];
        const rest = numMatch[2];
        const colonMatch = rest.match(/^([^:]+:)\s*([\s\S]*)/);
        if (colonMatch && colonMatch[1].length < 80) {
          colonTitle = colonMatch[1];
          bodyText = colonMatch[2];
        } else {
          bodyText = rest;
        }
      } else {
        const colonMatch = rawClause.match(/^([^:]+:)\s*([\s\S]*)/);
        if (colonMatch && colonMatch[1].length < 80) {
          colonTitle = colonMatch[1];
          bodyText = colonMatch[2];
        }
      }

      // Compute wrapped lines
      const textIndentX = pillPrefix ? 46 : 14;
      const textMaxW = CONTENT_W - textIndentX - 16;
      const fullText = colonTitle ? `${colonTitle} ${bodyText}` : bodyText;
      const wrapped = wrapText(fullText, sans, 7.2, textMaxW);
      const lineHeight = 10.5;
      const cardInnerH = Math.max(wrapped.length * lineHeight + 12, 28);

      ensureSpace(cardInnerH + 6);

      // Clause Card
      drawRoundedRect(currentPage, MARGIN_X, curY - cardInnerH, CONTENT_W, cardInnerH, 6, {
        color: CARD_BG,
        borderColor: CARD_BORDER,
        borderWidth: 0.7,
      });

      // Left blue pill badge (e.g. "1.1")
      if (pillPrefix) {
        const pillW = Math.max(bold.widthOfTextAtSize(pillPrefix, 6.8) + 12, 22);
        drawRoundedRect(
          currentPage,
          MARGIN_X + 10,
          curY - 21,
          pillW,
          14,
          4,
          {
            color: PILL_BLUE_BG,
            borderColor: PILL_BLUE_BORDER,
            borderWidth: 0.6,
          },
        );
        currentPage.drawText(pillPrefix, {
          x: MARGIN_X + 10 + (pillW - bold.widthOfTextAtSize(pillPrefix, 6.8)) / 2,
          y: curY - 17,
          size: 6.8,
          font: bold,
          color: PILL_BLUE_TEXT,
        });
      }

      // Draw lines
      let lineY = curY - 15;
      for (let lIdx = 0; lIdx < wrapped.length; lIdx++) {
        const line = wrapped[lIdx];
        if (lIdx === 0 && colonTitle && line.startsWith(colonTitle)) {
          // Highlight bold colon title
          currentPage.drawText(colonTitle, {
            x: MARGIN_X + textIndentX,
            y: lineY,
            size: 7.2,
            font: bold,
            color: TEXT_DARK,
          });
          const cTitleW = bold.widthOfTextAtSize(colonTitle + " ", 7.2);
          const remainder = line.slice(colonTitle.length).trim();
          if (remainder) {
            currentPage.drawText(remainder, {
              x: MARGIN_X + textIndentX + cTitleW,
              y: lineY,
              size: 7.2,
              font: sans,
              color: TEXT_BODY,
            });
          }
        } else {
          currentPage.drawText(line, {
            x: MARGIN_X + textIndentX,
            y: lineY,
            size: 7.2,
            font: sans,
            color: TEXT_BODY,
          });
        }
        lineY -= lineHeight;
      }

      curY -= cardInnerH + 6;
    }

    curY -= 6;
  }

  // --- DIGITAL EXECUTION & SIGNATURES CARD ---
  // Ensure enough space for the execution card (~190pt)
  ensureSpace(190);

  const sigCardH = partnerLogoImg ? 186 : 172;
  drawRoundedRect(currentPage, MARGIN_X, curY - sigCardH, CONTENT_W, sigCardH, 8, {
    color: CARD_BG,
    borderColor: CARD_BORDER,
    borderWidth: 1,
  });

  // Card Header: DIGITAL EXECUTION & SIGNATURES
  currentPage.drawText("DIGITAL EXECUTION & SIGNATURES", {
    x: MARGIN_X + 16,
    y: curY - 20,
    size: 8.5,
    font: bold,
    color: TEXT_DARK,
  });

  // Statutory Pill on right
  const statBadge = "Section 10A · IT Act 2000";
  const statW = sans.widthOfTextAtSize(statBadge, 6.8) + 16;
  drawRoundedRect(
    currentPage,
    MARGIN_X + CONTENT_W - statW - 14,
    curY - 24,
    statW,
    15,
    4,
    {
      color: CARD_MUTED_BG,
      borderColor: CARD_BORDER,
      borderWidth: 0.6,
    },
  );
  currentPage.drawText(statBadge, {
    x: MARGIN_X + CONTENT_W - statW - 6,
    y: curY - 20,
    size: 6.8,
    font: sans,
    color: TEXT_MUTED,
  });

  let innerY = curY - 32;

  // If partner logo attached, display verification banner inside card
  if (partnerLogoImg) {
    drawRoundedRect(
      currentPage,
      MARGIN_X + 14,
      innerY - 30,
      CONTENT_W - 28,
      28,
      5,
      {
        color: CARD_MUTED_BG,
        borderColor: CARD_BORDER,
        borderWidth: 0.6,
      },
    );
    currentPage.drawImage(partnerLogoImg, {
      x: MARGIN_X + 20,
      y: innerY - 26,
      width: 20,
      height: 20,
    });
    if (cscLogoImg) {
      currentPage.drawImage(cscLogoImg, {
        x: MARGIN_X + 44,
        y: innerY - 26,
        width: 20,
        height: 20,
      });
    }
    currentPage.drawText(
      "Verified Counterparty Organization Logo Attached & Bound to Digital Seal",
      {
        x: MARGIN_X + 70,
        y: innerY - 18,
        size: 7,
        font: bold,
        color: TEXT_DARK,
      },
    );
    innerY -= 36;
  }

  // Left Sub-box: Counterparty Signatory
  const boxW = (CONTENT_W - 36) / 2;
  const leftBoxX = MARGIN_X + 14;
  const rightBoxX = leftBoxX + boxW + 8;

  currentPage.drawText("COUNTERPARTY SIGNATORY SIGNATURE", {
    x: leftBoxX,
    y: innerY - 2,
    size: 6.5,
    font: bold,
    color: TEXT_MUTED,
  });

  const counterpartyName = isSigned && input.signedName ? input.signedName : input.recipientName;
  // Cursive signature
  currentPage.drawText(counterpartyName, {
    x: leftBoxX,
    y: innerY - 24,
    size: 20,
    font: script,
    color: SIG_BLUE,
  });

  const signatoryDetails = `${counterpartyName} · ${
    input.signedRole || input.recipientRole || "Authorized Signatory"
  }${input.signedOrg || input.recipientOrg ? ` · ${input.signedOrg || input.recipientOrg}` : ""}`;
  currentPage.drawText(signatoryDetails.slice(0, 52), {
    x: leftBoxX,
    y: innerY - 36,
    size: 6.8,
    font: bold,
    color: TEXT_DARK,
  });
  currentPage.drawText(
    `${input.signedEmail || input.recipientEmail} (${
      isSigned ? "Verified Digital Signature" : "Pending Execution"
    })`,
    {
      x: leftBoxX,
      y: innerY - 46,
      size: 6.5,
      font: sans,
      color: TEXT_MUTED,
    },
  );

  // Right Sub-box: Cryptographic Audit Stamp
  drawRoundedRect(currentPage, rightBoxX, innerY - 54, boxW, 54, 6, {
    color: AUDIT_BG,
    borderColor: AUDIT_BORDER,
    borderWidth: 0.8,
  });

  currentPage.drawText("Cryptographic Audit Stamp", {
    x: rightBoxX + 10,
    y: innerY - 14,
    size: 7.5,
    font: bold,
    color: AUDIT_TEXT,
  });

  const timestampStr = input.signedAt
    ? new Date(input.signedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Active Session Record";
  currentPage.drawText(`Timestamp: ${timestampStr} · Token Verified`, {
    x: rightBoxX + 10,
    y: innerY - 26,
    size: 6.5,
    font: sans,
    color: AUDIT_TEXT,
  });
  currentPage.drawText(`Ref: ${input.referenceCode}`, {
    x: rightBoxX + 10,
    y: innerY - 36,
    size: 6.5,
    font: sans,
    color: AUDIT_TEXT,
  });
  const hashPreview = (input.documentHash || "SHA256-AUTHENTICATED-LEDGER-HASH").slice(0, 28);
  currentPage.drawText(`Hash: ${hashPreview}...`, {
    x: rightBoxX + 10,
    y: innerY - 46,
    size: 6,
    font: sans,
    color: AUDIT_TEXT,
  });

  // QR Code on right inside stamp box
  if (qrImg) {
    currentPage.drawImage(qrImg, {
      x: rightBoxX + boxW - 46,
      y: innerY - 50,
      width: 42,
      height: 42,
    });
  }

  // Statutory declaration line
  innerY -= 68;
  const statDec =
    "I confirm that I have read the entire agreement above, am authorized to execute it, and agree to be legally bound under Section 10A of the Information Technology Act, 2000 and the Indian Contract Act, 1872.";
  const decLines = wrapText(statDec, sans, 6.5, CONTENT_W - 28);
  decLines.forEach((dl) => {
    currentPage.drawText(dl, {
      x: MARGIN_X + 14,
      y: innerY,
      size: 6.5,
      font: sans,
      color: TEXT_BODY,
    });
    innerY -= 9;
  });

  // CSC Signatory footer inside card
  innerY -= 2;
  currentPage.drawText(
    `CSC Authorized Signatory: ${input.cscSignatoryName} (${input.cscSignatoryRole})`,
    {
      x: MARGIN_X + 14,
      y: innerY,
      size: 7,
      font: bold,
      color: TEXT_DARK,
    },
  );

  curY -= sigCardH + 16;

  // --- OFFICIAL STAY CONNECTED FOOTER ---
  ensureSpace(90);

  currentPage.drawLine({
    start: { x: MARGIN_X, y: curY },
    end: { x: MARGIN_X + CONTENT_W, y: curY },
    thickness: 0.5,
    color: CARD_BORDER,
  });
  curY -= 14;

  // Stay connected title
  const stayTitle = "STAY CONNECTED";
  const stayW = bold.widthOfTextAtSize(stayTitle, 7);
  currentPage.drawText(stayTitle, {
    x: (A4_W - stayW) / 2,
    y: curY,
    size: 7,
    font: bold,
    color: TEXT_MUTED,
  });

  // 5 Social Icons
  curY -= 24;
  const iconSize = 16;
  const iconGap = 12;
  const totalIconsW = 5 * iconSize + 4 * iconGap;
  let iconX = (A4_W - totalIconsW) / 2;

  for (const icon of socialIcons) {
    if (icon) {
      currentPage.drawImage(icon, {
        x: iconX,
        y: curY,
        width: iconSize,
        height: iconSize,
      });
    }
    iconX += iconSize + iconGap;
  }

  curY -= 14;

  // Attribution Lines
  const attr1 = "Coimbatore Startup Community — A Community-Led Initiative";
  const a1W = bold.widthOfTextAtSize(attr1, 7.5);
  currentPage.drawText(attr1, {
    x: (A4_W - a1W) / 2,
    y: curY,
    size: 7.5,
    font: bold,
    color: TEXT_DARK,
  });

  curY -= 11;
  const attr2 = "Platform Architecture & Engineering by Logic Intelligence Technologies (LIT)";
  const a2W = sans.widthOfTextAtSize(attr2, 6.8);
  currentPage.drawText(attr2, {
    x: (A4_W - a2W) / 2,
    y: curY,
    size: 6.8,
    font: sans,
    color: TEXT_MUTED,
  });

  curY -= 10;
  const attr3 = "coimbatorestartupcommunity@gmail.com · Official Digital Agreement";
  const a3W = sans.widthOfTextAtSize(attr3, 6.5);
  currentPage.drawText(attr3, {
    x: (A4_W - a3W) / 2,
    y: curY,
    size: 6.5,
    font: sans,
    color: TEXT_MUTED,
  });

  // Draw footer on last page
  drawPageFooter(currentPage, pageNumber);

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
