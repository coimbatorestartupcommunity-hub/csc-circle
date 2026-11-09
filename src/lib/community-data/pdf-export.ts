import "server-only";
import "regenerator-runtime/runtime";

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { CommunityDataFilter } from "@/lib/community-data/schema";
import type { CommunityMember } from "@/lib/community-data/service";

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 20;
const TABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TABLE_BOTTOM = 30;
const HEADER_HEIGHT = 20;
const CELL_PADDING = 4;
const FONT_SIZE = 6.7;
const LINE_HEIGHT = 8.5;

const NAVY = rgb(17 / 255, 24 / 255, 39 / 255);
const PURPLE = rgb(105 / 255, 82 / 255, 213 / 255);
const PALE_PURPLE = rgb(246 / 255, 243 / 255, 255 / 255);
const BORDER = rgb(220 / 255, 224 / 255, 232 / 255);
const MUTED = rgb(89 / 255, 98 / 255, 116 / 255);
const WHITE = rgb(1, 1, 1);

const columns = [
  { key: "full_name", label: "Full Name", width: 82 },
  { key: "contact_number", label: "Contact Number", width: 76 },
  { key: "email", label: "Email", width: 118 },
  { key: "member_category", label: "Category", width: 80 },
  { key: "business_or_idea_name", label: "Business / Idea", width: 100 },
  { key: "description", label: "Description", width: 262 },
  { key: "created_at", label: "Submitted On", width: TABLE_WIDTH - 718 },
] as const;

export class CommunityDataPdfFontError extends Error {
  constructor() {
    super("The PDF font cannot render one or more submitted characters.");
    this.name = "CommunityDataPdfFontError";
  }
}
function clean(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
}

function ensureSupported(font: PDFFont, fallback: PDFFont, values: string[]) {
  const supported = new Set([...font.getCharacterSet(), ...fallback.getCharacterSet()]);
  for (const value of values) {
    for (const character of value) {
      if (character === "\n" || character === "\r" || character === "\t") continue;
      const codePoint = character.codePointAt(0);
      if (codePoint != null && !supported.has(codePoint)) throw new CommunityDataPdfFontError();
    }
  }
}

function textRuns(value: string, primary: PDFFont, fallback: PDFFont) {
  const primaryCharacters = new Set(primary.getCharacterSet());
  const runs: { text: string; font: PDFFont }[] = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    const font = codePoint != null && primaryCharacters.has(codePoint) ? primary : fallback;
    const previous = runs.at(-1);
    if (previous?.font === font) previous.text += character;
    else runs.push({ text: character, font });
  }
  return runs;
}

function textWidth(value: string, primary: PDFFont, fallback: PDFFont, size: number) {
  return textRuns(value, primary, fallback)
    .reduce((total, run) => total + run.font.widthOfTextAtSize(run.text, size), 0);
}

function drawTextRuns(
  page: PDFPage,
  value: string,
  primary: PDFFont,
  fallback: PDFFont,
  options: { x: number; y: number; size: number; color: ReturnType<typeof rgb> },
) {
  let x = options.x;
  for (const run of textRuns(value, primary, fallback)) {
    page.drawText(run.text, { ...options, x, font: run.font });
    x += run.font.widthOfTextAtSize(run.text, options.size);
  }
}

function wrapText(value: string, primary: PDFFont, fallback: PDFFont, size: number, width: number): string[] {
  const maxWidth = Math.max(1, width - CELL_PADDING * 2);
  const result: string[] = [];
  for (const paragraph of clean(value).replaceAll("\r", "").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      result.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, primary, fallback, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) result.push(line);
      line = "";
      let fragment = "";
      for (const character of word) {
        const next = `${fragment}${character}`;
        if (fragment && textWidth(next, primary, fallback, size) > maxWidth) {
          result.push(fragment);
          fragment = character;
        } else {
          fragment = next;
        }
      }
      line = fragment;
    }
    if (line) result.push(line);
  }
  return result.length ? result : [""];
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export async function createCommunityDataPdf(
  rows: CommunityMember[],
  filter: CommunityDataFilter,
  total: number,
) {
  const fontDirectory = path.join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf");
  const tamilFontDirectory = path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans-tamil", "files");
  const [regularBytes, boldBytes, tamilRegularBytes, tamilBoldBytes, logoBytes] = await Promise.all([
    readFile(path.join(fontDirectory, "DejaVuSans.ttf")),
    readFile(path.join(fontDirectory, "DejaVuSans-Bold.ttf")),
    readFile(path.join(tamilFontDirectory, "noto-sans-tamil-tamil-400-normal.woff2")),
    readFile(path.join(tamilFontDirectory, "noto-sans-tamil-tamil-700-normal.woff2")),
    readFile(path.join(process.cwd(), "public", "brand", "csc-logo.png")),
  ]);

  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  document.setTitle("CSC Community Member Data Report");
  document.setAuthor("Coimbatore Startup Community");
  document.setSubject("Private administrative member-onboarding survey report");
  const regular = await document.embedFont(regularBytes, { subset: true });
  const bold = await document.embedFont(boldBytes, { subset: true });
  const tamilRegular = await document.embedFont(tamilRegularBytes, { subset: true });
  const tamilBold = await document.embedFont(tamilBoldBytes, { subset: true });
  const logo = await document.embedPng(logoBytes);

  const values = rows.flatMap((row) => [
    row.full_name,
    row.contact_number,
    row.email,
    row.member_category,
    row.business_or_idea_name,
    row.description,
  ]);
  ensureSupported(regular, tamilRegular, [...values, filter.search ?? ""]);

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const drawTableHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - HEADER_HEIGHT, width: TABLE_WIDTH, height: HEADER_HEIGHT, color: NAVY });
    let x = MARGIN;
    for (const column of columns) {
      page.drawText(column.label, { x: x + CELL_PADDING, y: y - 13, size: 6.5, font: bold, color: WHITE });
      x += column.width;
    }
    y -= HEADER_HEIGHT;
  };

  const addPage = (first: boolean) => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    page.drawImage(logo, { x: MARGIN, y: PAGE_HEIGHT - 55, width: 36, height: 36 });
    page.drawText("Coimbatore Startup Community", { x: 64, y: PAGE_HEIGHT - 34, size: 12, font: bold, color: NAVY });
    page.drawText("Community Member Data Report", { x: 64, y: PAGE_HEIGHT - 49, size: 9, font: regular, color: PURPLE });
    page.drawText(first ? "Private administrative report" : "Continued", {
      x: PAGE_WIDTH - 150,
      y: PAGE_HEIGHT - 38,
      size: 7,
      font: bold,
      color: MUTED,
    });

    if (first) {
      const generated = dateLabel(new Date().toISOString());
      const category = filter.category ?? "All Members";
      const search = filter.search ? `Search: ${filter.search}` : "Search: None";
      page.drawText(`Generated: ${generated}`, { x: MARGIN, y: PAGE_HEIGHT - 76, size: 7.3, font: regular, color: MUTED });
      page.drawText(`Category: ${category}`, { x: 230, y: PAGE_HEIGHT - 76, size: 7.3, font: regular, color: MUTED });
      drawTextRuns(page, search, regular, tamilRegular, { x: 430, y: PAGE_HEIGHT - 76, size: 7.3, color: MUTED });
      page.drawText(`Matching submissions: ${total} · Records included: ${rows.length}`, {
        x: MARGIN,
        y: PAGE_HEIGHT - 90,
        size: 7.3,
        font: bold,
        color: NAVY,
      });
      y = PAGE_HEIGHT - 103;
    } else {
      y = PAGE_HEIGHT - 67;
    }
    drawTableHeader();
  };

  addPage(true);

  rows.forEach((row, rowIndex) => {
    const cellValues = [
      row.full_name,
      row.contact_number,
      row.email,
      row.member_category,
      row.business_or_idea_name,
      row.description,
      dateLabel(row.created_at),
    ];
    const lines = cellValues.map((value, index) => wrapText(value, regular, tamilRegular, FONT_SIZE, columns[index].width));
    const totalLines = Math.max(...lines.map((cell) => cell.length), 1);
    let lineOffset = 0;

    while (lineOffset < totalLines) {
      const availableLines = Math.floor((y - TABLE_BOTTOM - CELL_PADDING * 2) / LINE_HEIGHT);
      if (availableLines < 1) {
        addPage(false);
        continue;
      }
      const lineCount = Math.min(totalLines - lineOffset, availableLines);
      const rowHeight = Math.max(20, lineCount * LINE_HEIGHT + CELL_PADDING * 2);
      const fill = rowIndex % 2 === 0 ? WHITE : PALE_PURPLE;
      page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: TABLE_WIDTH, height: rowHeight, color: fill, borderColor: BORDER, borderWidth: 0.5 });

      let x = MARGIN;
      lines.forEach((cellLines, columnIndex) => {
        const width = columns[columnIndex].width;
        if (columnIndex > 0) {
          page.drawLine({ start: { x, y }, end: { x, y: y - rowHeight }, thickness: 0.4, color: BORDER });
        }
        cellLines.slice(lineOffset, lineOffset + lineCount).forEach((line, index) => {
          drawTextRuns(page, line, columnIndex === 0 && lineOffset === 0 ? bold : regular, columnIndex === 0 && lineOffset === 0 ? tamilBold : tamilRegular, {
            x: x + CELL_PADDING,
            y: y - CELL_PADDING - FONT_SIZE - index * LINE_HEIGHT,
            size: FONT_SIZE,
            color: NAVY,
          });
        });
        x += width;
      });

      y -= rowHeight;
      lineOffset += lineCount;
      if (lineOffset < totalLines) addPage(false);
    }
  });

  if (rows.length === 0) {
    page.drawText("No survey submissions match the selected filters.", {
      x: MARGIN + 12,
      y: y - 28,
      size: 9,
      font: regular,
      color: MUTED,
    });
  }

  pages.forEach((currentPage, index) => {
    const label = `Page ${index + 1} of ${pages.length}`;
    currentPage.drawText(label, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(label, 7),
      y: 14,
      size: 7,
      font: regular,
      color: MUTED,
    });
    currentPage.drawText("Confidential — CSC administrative use only", {
      x: MARGIN,
      y: 14,
      size: 7,
      font: regular,
      color: MUTED,
    });
  });

  return document.save({ useObjectStreams: true });
}
