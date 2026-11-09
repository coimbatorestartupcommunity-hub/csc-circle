import "server-only";
import "regenerator-runtime/runtime";

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { CommunityDataFilter } from "@/lib/community-data/schema";
import type { CommunityMember } from "@/lib/community-data/service";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PAGE_BOTTOM = 46;
const HEADING_SIZE = 10;
const BODY_SIZE = 8.5;
const SMALL_SIZE = 7.5;
const LABEL_SIZE = 7;
const LINE_HEIGHT = 11.5;
const LABEL_HEIGHT = 10;
const FIELD_GAP = 5;
const HEADING_BAR_HEIGHT = 22;

const NAVY = rgb(17 / 255, 24 / 255, 39 / 255);
const PURPLE = rgb(105 / 255, 82 / 255, 213 / 255);
const PALE_PURPLE = rgb(246 / 255, 243 / 255, 255 / 255);
const BORDER = rgb(220 / 255, 224 / 255, 232 / 255);
const MUTED = rgb(89 / 255, 98 / 255, 116 / 255);
const WHITE = rgb(1, 1, 1);

const NOT_PROVIDED = "Not provided";

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
  const maxWidth = Math.max(1, width);
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

function fitLine(value: string, primary: PDFFont, fallback: PDFFont, size: number, width: number): string {
  const cleaned = clean(value);
  if (textWidth(cleaned, primary, fallback, size) <= width) return cleaned;
  let output = cleaned;
  while (output.length > 1 && textWidth(`${output}…`, primary, fallback, size) > width) {
    output = output.slice(0, -1);
  }
  return `${output}…`;
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

function display(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return NOT_PROVIDED;
  const text = String(value).trim();
  return text ? String(value) : NOT_PROVIDED;
}

function displayList(value: readonly string[] | null | undefined): string {
  return value && value.length > 0 ? value.join("; ") : NOT_PROVIDED;
}

function displayWithOther(value: string | null | undefined, other: string | null | undefined): string {
  if (!value) return NOT_PROVIDED;
  if (value === "Other") return other?.trim() ? `Other — ${other.trim()}` : "Other";
  return value;
}

function displayListWithOther(value: readonly string[] | null | undefined, other: string | null | undefined): string {
  if (!value || value.length === 0) return NOT_PROVIDED;
  const shown = value.includes("Other") && other?.trim()
    ? value.map((item) => (item === "Other" ? `Other (${other.trim()})` : item))
    : value;
  return shown.join("; ");
}

interface MemberSection {
  title: string;
  fields: { label: string; value: string }[];
}

function memberSections(row: CommunityMember): MemberSection[] {
  const sections: MemberSection[] = [
    {
      title: "Personal Details",
      fields: [
        { label: "Contact Number", value: display(row.contact_number) },
        { label: "Email Address", value: display(row.email) },
        { label: "City", value: display(row.city) },
      ],
    },
    {
      title: "Business / Idea",
      fields: [
        { label: "Member Category", value: display(row.member_category) },
        { label: "Business / Idea Name", value: display(row.business_or_idea_name) },
        { label: "Industry Sector", value: displayWithOther(row.industry_sector, row.industry_other) },
        { label: "Current Stage", value: display(row.current_stage) },
        { label: "Description", value: display(row.description) },
        { label: "Website URL", value: display(row.website_url) },
      ],
    },
  ];
  if (row.member_category === "Established Business") {
    sections.push({
      title: "Established Business Details",
      fields: [
        { label: "Established Year", value: display(row.established_year) },
        { label: "Business Team Size", value: display(row.business_team_size) },
        { label: "Business Connections", value: displayListWithOther(row.business_connections, row.business_connections_other) },
      ],
    });
  } else if (row.member_category === "Startup Founder") {
    sections.push({
      title: "Startup Details",
      fields: [
        { label: "Startup Team Structure", value: display(row.startup_team_structure) },
        { label: "Startup Support", value: displayListWithOther(row.startup_support, row.startup_support_other) },
        { label: "Startup Current Focus", value: display(row.startup_current_focus) },
      ],
    });
  } else {
    sections.push({
      title: "Idea Stage Details",
      fields: [
        { label: "Seeking Co-founder", value: display(row.seeking_cofounder) },
        { label: "Idea Support", value: displayListWithOther(row.idea_support, row.idea_support_other) },
        { label: "Idea Problem Statement", value: display(row.idea_problem_statement) },
      ],
    });
  }
  sections.push(
    {
      title: "Community & Support",
      fields: [
        { label: "Support Needed", value: displayListWithOther(row.support_needed, row.support_needed_other) },
        { label: "Biggest Challenge", value: display(row.biggest_challenge) },
      ],
    },
    {
      title: "Additional Details",
      fields: [
        { label: "Discovery Source", value: displayWithOther(row.discovery_source, row.discovery_source_other) },
        { label: "Preferred Contact Method", value: display(row.preferred_contact_method) },
      ],
    },
    {
      title: "Submission",
      fields: [
        { label: "Submitted On", value: dateLabel(row.created_at) },
        { label: "Privacy Consent Recorded", value: dateLabel(row.consent_at) },
      ],
    },
  );
  return sections;
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
  document.setTitle("CSC Circle Community Member Information Report");
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
    row.city ?? "",
    row.member_category,
    row.business_or_idea_name,
    row.industry_sector ?? "",
    row.industry_other ?? "",
    row.current_stage ?? "",
    row.description,
    displayList(row.support_needed),
    row.support_needed_other ?? "",
    row.biggest_challenge ?? "",
    row.website_url ?? "",
    row.discovery_source ?? "",
    row.discovery_source_other ?? "",
    row.preferred_contact_method ?? "",
    String(row.established_year ?? ""),
    row.business_team_size ?? "",
    displayList(row.business_connections),
    row.business_connections_other ?? "",
    row.startup_team_structure ?? "",
    displayList(row.startup_support),
    row.startup_support_other ?? "",
    row.startup_current_focus ?? "",
    row.seeking_cofounder ?? "",
    displayList(row.idea_support),
    row.idea_support_other ?? "",
    row.idea_problem_statement ?? "",
  ]);
  ensureSupported(regular, tamilRegular, [
    ...values,
    filter.search ?? "",
    filter.city ?? "",
    filter.category ?? "",
    filter.industry ?? "",
    filter.stage ?? "",
    filter.support ?? "",
  ]);

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y - needed < PAGE_BOTTOM) addPage(false);
  };

  const drawBodyLine = (value: string, font: PDFFont, size: number, color: ReturnType<typeof rgb>, x = MARGIN) => {
    y -= size + 4;
    drawTextRuns(page, value, font, font === bold ? tamilBold : tamilRegular, { x, y, size, color });
  };

  const drawWrapped = (value: string, size: number, color: ReturnType<typeof rgb>) => {
    for (const line of wrapText(value, regular, tamilRegular, size, CONTENT_WIDTH)) {
      ensureSpace(size + 4);
      y -= size + 4;
      drawTextRuns(page, line || " ", regular, tamilRegular, { x: MARGIN, y, size, color });
    }
  };

  const drawField = (label: string, value: string) => {
    const shown = value.trim() ? value : NOT_PROVIDED;
    const lines = wrapText(shown, regular, tamilRegular, BODY_SIZE, CONTENT_WIDTH);
    ensureSpace(LABEL_HEIGHT + lines.length * LINE_HEIGHT + FIELD_GAP + 2);
    y -= LABEL_HEIGHT;
    page.drawText(label.toUpperCase(), { x: MARGIN, y, size: LABEL_SIZE, font: bold, color: MUTED });
    for (const line of lines) {
      y -= LINE_HEIGHT;
      drawTextRuns(page, line || " ", regular, tamilRegular, { x: MARGIN, y, size: BODY_SIZE, color: NAVY });
    }
    y -= FIELD_GAP;
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(HEADING_SIZE + 12);
    y -= HEADING_SIZE + 6;
    page.drawText(title.toUpperCase(), { x: MARGIN, y, size: HEADING_SIZE, font: bold, color: PURPLE });
    y -= 4;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 0.6, color: BORDER });
    y -= 8;
  };

  function addPage(first: boolean) {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    page.drawImage(logo, { x: MARGIN, y: PAGE_HEIGHT - 62, width: 34, height: 34 });
    page.drawText("Coimbatore Startup Community", { x: MARGIN + 42, y: PAGE_HEIGHT - 40, size: 11, font: bold, color: NAVY });
    page.drawText("CSC Circle Community Member Information Report", { x: MARGIN + 42, y: PAGE_HEIGHT - 55, size: 8, font: regular, color: PURPLE });
    const sideLabel = first ? "Private administrative report" : "Continued";
    page.drawText(sideLabel, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(sideLabel, SMALL_SIZE),
      y: PAGE_HEIGHT - 44,
      size: SMALL_SIZE,
      font: bold,
      color: MUTED,
    });
    y = PAGE_HEIGHT - 78;
    if (first) {
      const generated = dateLabel(new Date().toISOString());
      const filters = [
        `Category: ${filter.category ?? "All Members"}`,
        `Search: ${filter.search?.trim() ? filter.search.trim() : "None"}`,
        `City: ${filter.city?.trim() ? filter.city.trim() : "All Cities"}`,
        `Industry: ${filter.industry ?? "All Industries"}`,
        `Stage: ${filter.stage ?? "All Stages"}`,
        `Support: ${filter.support ?? "Any Support"}`,
        `Submitted: ${filter.from ?? "…"} to ${filter.to ?? "…"}`,
      ];
      drawBodyLine(`Generated: ${generated}`, regular, SMALL_SIZE, MUTED);
      for (const line of filters) drawBodyLine(line, regular, SMALL_SIZE, MUTED);
      y -= 2;
      drawBodyLine(`Matching submissions: ${total} · Records included: ${rows.length}`, bold, SMALL_SIZE + 0.5, NAVY);
      y -= 8;

      const counts: { label: string; value: number }[] = [
        { label: "Total submissions", value: rows.length },
        { label: "Established Business", value: rows.filter((row) => row.member_category === "Established Business").length },
        { label: "Startup Founder", value: rows.filter((row) => row.member_category === "Startup Founder").length },
        { label: "Idea Stage", value: rows.filter((row) => row.member_category === "Idea Stage").length },
      ];
      drawSectionTitle("Summary");
      const labelColumn = CONTENT_WIDTH - 110;
      const rowHeight = 18;
      ensureSpace(rowHeight * (counts.length + 1) + 8);
      page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: CONTENT_WIDTH, height: rowHeight, color: NAVY });
      page.drawText("Category", { x: MARGIN + 8, y: y - 12.5, size: SMALL_SIZE, font: bold, color: WHITE });
      page.drawText("Submissions", { x: MARGIN + labelColumn + 8, y: y - 12.5, size: SMALL_SIZE, font: bold, color: WHITE });
      y -= rowHeight;
      counts.forEach((entry, index) => {
        const fill = index % 2 === 0 ? WHITE : PALE_PURPLE;
        page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: CONTENT_WIDTH, height: rowHeight, color: fill, borderColor: BORDER, borderWidth: 0.5 });
        page.drawText(entry.label, { x: MARGIN + 8, y: y - 12.5, size: SMALL_SIZE, font: index === 0 ? bold : regular, color: NAVY });
        page.drawText(String(entry.value), { x: MARGIN + labelColumn + 8, y: y - 12.5, size: SMALL_SIZE, font: bold, color: NAVY });
        y -= rowHeight;
      });
      y -= 14;
    }
  }

  addPage(true);

  if (rows.length === 0) {
    drawWrapped("No survey submissions match the selected filters.", BODY_SIZE + 0.5, MUTED);
  }

  rows.forEach((row, rowIndex) => {
    ensureSpace(HEADING_BAR_HEIGHT + 30);
    page.drawRectangle({ x: MARGIN, y: y - HEADING_BAR_HEIGHT, width: CONTENT_WIDTH, height: HEADING_BAR_HEIGHT, color: NAVY });
    const heading = fitLine(`${rowIndex + 1}. ${row.full_name} — ${row.member_category}`, bold, tamilBold, HEADING_SIZE, CONTENT_WIDTH - 16);
    drawTextRuns(page, heading, bold, tamilBold, { x: MARGIN + 8, y: y - 15, size: HEADING_SIZE, color: WHITE });
    y -= HEADING_BAR_HEIGHT + 2;
    y -= 6;
    for (const section of memberSections(row)) {
      drawSectionTitle(section.title);
      for (const field of section.fields) drawField(field.label, field.value);
      y -= 4;
    }
    y -= 2;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 0.8, color: BORDER });
    y -= 14;
  });

  pages.forEach((currentPage, index) => {
    const label = `Page ${index + 1} of ${pages.length}`;
    currentPage.drawText(label, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(label, SMALL_SIZE),
      y: 18,
      size: SMALL_SIZE,
      font: regular,
      color: MUTED,
    });
    currentPage.drawText("Confidential — CSC administrative use only", {
      x: MARGIN,
      y: 18,
      size: SMALL_SIZE,
      font: regular,
      color: MUTED,
    });
  });

  return document.save({ useObjectStreams: true });
}
