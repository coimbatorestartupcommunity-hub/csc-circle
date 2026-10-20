import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { ResumeData } from "@/lib/member/resume-schema";

const PAGE_W = 595;
const PAGE_H = 842;
const LEFT = 15;
const RIGHT = 15;
const CONTENT_W = PAGE_W - LEFT - RIGHT;
const BOTTOM = 15;
const NAVY = rgb(10 / 255, 36 / 255, 114 / 255);
const CHARCOAL = rgb(26 / 255, 26 / 255, 26 / 255);
const BLACK = rgb(0, 0, 0);
const REGULAR_SIZE = 8.07;
const BODY_LINE = 9.8;

function splitLines(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = value.replaceAll("\r", "").split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(""); continue; }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function clean(value: string | undefined | null) {
  return (value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
}

export async function createMemberResumePdf(name: string, data: ResumeData) {
  const fontDir = path.join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf");
  const [regularBytes, boldBytes, italicBytes] = await Promise.all([
    readFile(path.join(fontDir, "DejaVuSans.ttf")),
    readFile(path.join(fontDir, "DejaVuSans-Bold.ttf")),
    readFile(path.join(fontDir, "DejaVuSans-BoldOblique.ttf")),
  ]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`${name} — Resume`);
  pdf.setAuthor(name);
  pdf.setSubject("Professional resume");
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const boldItalic = await pdf.embedFont(italicBytes, { subset: true });
  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 15;
  const newPage = () => { page = pdf.addPage([PAGE_W, PAGE_H]); y = PAGE_H - 15; };

  const ensure = (height: number) => { if (y - height < BOTTOM) newPage(); };
  const paragraph = (value: string, font = regular, size = REGULAR_SIZE, color = CHARCOAL, x = LEFT, width = CONTENT_W, lineHeight = BODY_LINE) => {
    const lines = splitLines(clean(value), font, size, width);
    for (const line of lines) { ensure(lineHeight); page.drawText(line, { x, y: y - size, size, font, color, lineHeight }); y -= lineHeight; }
    y -= 2;
  };
  const bullet = (value: string) => {
    const lines = splitLines(clean(value), regular, REGULAR_SIZE, CONTENT_W - 15);
    for (const [index, line] of lines.entries()) {
      ensure(BODY_LINE);
      if (index === 0) page.drawText("•", { x: LEFT + 3, y: y - REGULAR_SIZE, size: REGULAR_SIZE, font: regular, color: CHARCOAL });
      page.drawText(line, { x: LEFT + 14, y: y - REGULAR_SIZE, size: REGULAR_SIZE, font: regular, color: CHARCOAL });
      y -= BODY_LINE;
    }
    y -= 1.5;
  };
  const heading = (label: string) => {
    ensure(27);
    y -= 3;
    page.drawText(label.toUpperCase(), { x: LEFT, y: y - 9.8, size: 9.8, font: bold, color: NAVY });
    y -= 12.2;
    page.drawLine({ start: { x: LEFT, y }, end: { x: PAGE_W - RIGHT, y }, thickness: 0.58, color: NAVY });
    y -= 5;
  };
  const drawRuns = (runs: { text: string; font: PDFFont }[]) => {
    const tokens: { text: string; font: PDFFont }[] = [];
    for (const run of runs) {
      const words = clean(run.text).split(/\s+/).filter(Boolean);
      words.forEach((word) => tokens.push({ text: `${tokens.length ? " " : ""}${word}`, font: run.font }));
    }
    const lines: { text: string; font: PDFFont }[][] = [[]];
    let width = 0;
    for (const token of tokens) {
      const tokenWidth = token.font.widthOfTextAtSize(token.text, REGULAR_SIZE);
      if (width + tokenWidth > CONTENT_W && width > 0) { lines.push([]); width = 0; token.text = token.text.trimStart(); }
      lines[lines.length - 1].push(token);
      width += token.font.widthOfTextAtSize(token.text, REGULAR_SIZE);
    }
    ensure(BODY_LINE);
    for (const line of lines) {
      ensure(BODY_LINE);
      let x = LEFT;
      for (const run of line) { page.drawText(run.text, { x, y: y - REGULAR_SIZE, size: REGULAR_SIZE, font: run.font, color: CHARCOAL }); x += run.font.widthOfTextAtSize(run.text, REGULAR_SIZE); }
      y -= BODY_LINE;
    }
    y -= 1.5;
  };
  const resumeDate = (start: string, end: string) => [clean(start), clean(end)].filter(Boolean).join(" – ");
  const headerLine = (text: string, size: number, font: PDFFont, color = BLACK) => {
    const value = clean(text);
    if (!value) return;
    const width = font.widthOfTextAtSize(value, size);
    const fittedSize = width > CONTENT_W ? size * CONTENT_W / width : size;
    const fittedWidth = font.widthOfTextAtSize(value, fittedSize);
    page.drawText(value, { x: (PAGE_W - fittedWidth) / 2, y: y - fittedSize, size: fittedSize, font, color });
    y -= fittedSize + 2;
  };

  headerLine(clean(name).toUpperCase(), 16.71, bold, NAVY);
  headerLine(data.headline, 9.8, bold);
  const contact = [clean(data.contact.email), clean(data.contact.phone), clean(data.contact.location)].filter(Boolean).join(" | ");
  headerLine(contact, REGULAR_SIZE, regular);
  const links = [data.contact.linkedin, data.contact.github, data.contact.portfolio].map(clean).filter(Boolean).join(" | ");
  headerLine(links, REGULAR_SIZE, regular);
  y += 4;

  if (data.visibility.summary && clean(data.summary)) { heading("Professional Summary"); paragraph(data.summary); }
  if (data.visibility.skills && data.skills.some((row) => clean(row.category) && row.items.some(clean))) {
    heading("Technical Skills");
    for (const row of data.skills) if (clean(row.category) && row.items.some(clean)) drawRuns([{ text: `${clean(row.category)}:`, font: bold }, { text: row.items.map(clean).filter(Boolean).join(", "), font: regular }]);
  }
  if (data.visibility.experiences && data.experiences.some((item) => clean(item.title) || clean(item.organization))) {
    heading("Experience");
    for (const item of data.experiences) {
      if (!clean(item.title) && !clean(item.organization)) continue;
      const left = [clean(item.title), clean(item.organization)].filter(Boolean).join(" | ");
      const right = [resumeDate(item.startDate, item.endDate), clean(item.location)].filter(Boolean).join(" | ");
      const rightWidth = right ? Math.min(190, boldItalic.widthOfTextAtSize(right, REGULAR_SIZE)) : 0;
      const leftLines = splitLines(left, bold, 8.64, CONTENT_W - rightWidth - 12);
      ensure(10);
      page.drawText(leftLines[0] ?? "", { x: LEFT, y: y - 8.64, size: 8.64, font: bold, color: CHARCOAL });
      if (right) page.drawText(right, { x: PAGE_W - RIGHT - rightWidth, y: y - REGULAR_SIZE, size: REGULAR_SIZE, font: boldItalic, color: BLACK });
      y -= 10;
      for (const line of leftLines.slice(1)) { ensure(10); page.drawText(line, { x: LEFT, y: y - 8.64, size: 8.64, font: bold, color: CHARCOAL }); y -= 10; }
      for (const entry of item.bullets) if (clean(entry)) bullet(entry);
      y -= 1;
    }
  }
  if (data.visibility.projects && data.projects.some((item) => clean(item.title))) {
    heading("Projects");
    for (const item of data.projects) {
      if (!clean(item.title)) continue;
      drawRuns([{ text: clean(item.title), font: bold }, { text: [clean(item.descriptor), item.technologies.map(clean).filter(Boolean).join(", ")].filter(Boolean).join(" — "), font: boldItalic }]);
      for (const entry of item.bullets) if (clean(entry)) bullet(entry);
    }
  }
  if (data.visibility.education && data.education.some((item) => clean(item.qualification) || clean(item.institution))) {
    heading("Education");
    for (const item of data.education) {
      if (!clean(item.qualification) && !clean(item.institution)) continue;
      const left = [clean(item.qualification), clean(item.field)].filter(Boolean).join(" — ");
      const right = resumeDate(item.startYear, item.endYear);
      const rightWidth = right ? boldItalic.widthOfTextAtSize(right, REGULAR_SIZE) : 0;
      const lines = splitLines(left, bold, REGULAR_SIZE, CONTENT_W - rightWidth - 10);
      ensure(BODY_LINE);
      page.drawText(lines[0] ?? "", { x: LEFT, y: y - REGULAR_SIZE, size: REGULAR_SIZE, font: bold, color: CHARCOAL });
      if (right) page.drawText(right, { x: PAGE_W - RIGHT - rightWidth, y: y - REGULAR_SIZE, size: REGULAR_SIZE, font: boldItalic, color: BLACK });
      y -= BODY_LINE;
      for (const line of lines.slice(1)) { ensure(BODY_LINE); page.drawText(line, { x: LEFT, y: y - REGULAR_SIZE, size: REGULAR_SIZE, font: bold, color: CHARCOAL }); y -= BODY_LINE; }
      paragraph([clean(item.institution), clean(item.location)].filter(Boolean).join(" | "));
      for (const entry of item.details) if (clean(entry)) bullet(entry);
    }
  }
  if (data.visibility.certifications && data.certifications.some((item) => clean(item.title))) {
    heading("Certifications");
    const certs = data.certifications.filter((item) => clean(item.title)).map((item) => [clean(item.title), clean(item.issuer), clean(item.date)].filter(Boolean).join(" — "));
    paragraph(certs.join(" | "));
  }
  if (data.visibility.achievements && data.achievements.some(clean)) {
    heading("Achievements & Highlights");
    for (const entry of data.achievements) if (clean(entry)) bullet(entry);
  }

  return pdf.save({ useObjectStreams: true });
}
