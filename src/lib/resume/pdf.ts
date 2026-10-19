import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFString, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ResumeData } from "@/lib/resume/schema";

const WIDTH = 595;
const HEIGHT = 842;
const LEFT = 14.7;
const RIGHT = 15;
const CONTENT = WIDTH - LEFT - RIGHT;
const NAVY = rgb(10 / 255, 36 / 255, 114 / 255);
const CHARCOAL = rgb(26 / 255, 26 / 255, 26 / 255);
const BLACK = rgb(0, 0, 0);
const SIZE = { name: 16.71, headline: 9.8, section: 9.8, body: 8.07, role: 8.64 };
const LINE = 9.8;

function clean(input: string): string {
  return input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\r\n?/g, "\n").trim();
}

function wrapped(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of clean(text).split("\n")) {
    if (!paragraph.trim()) { lines.push(""); continue; }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) { line = candidate; continue; }
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) { line = word; continue; }
      let chunk = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(chunk + char, size) > maxWidth && chunk) { lines.push(chunk); chunk = char; }
        else chunk += char;
      }
      line = chunk;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawTextTop(page: PDFPage, text: string, x: number, top: number, size: number, font: PDFFont, color = CHARCOAL) {
  page.drawText(text, { x, y: HEIGHT - top - size, size, font, color, lineHeight: LINE });
}

function addLink(page: PDFPage, x: number, top: number, width: number, height: number, url: string) {
  if (!/^https:\/\//i.test(url) && !/^mailto:/i.test(url)) return;
  const context = page.doc.context;
  const annotation = context.obj({
    Type: "Annot", Subtype: "Link",
    Rect: [x, HEIGHT - top - height, x + width, HEIGHT - top],
    Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
  });
  page.node.addAnnot(context.register(annotation));
}

export async function renderResumePdf(data: ResumeData): Promise<Uint8Array> {
  const fontDir = join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf");
  const [regularBytes, boldBytes, italicBytes] = await Promise.all([
    readFile(join(fontDir, "DejaVuSans.ttf")),
    readFile(join(fontDir, "DejaVuSans-Bold.ttf")),
    readFile(join(fontDir, "DejaVuSans-Oblique.ttf")),
  ]);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  const italic = await doc.embedFont(italicBytes, { subset: true });
  doc.setTitle(`${clean(data.name) || "Member"} Resume`);
  doc.setAuthor(clean(data.name) || "CSC Circle Member");
  doc.setSubject("Professional resume");
  doc.setCreator("CSC Circle Resume Builder");

  let page = doc.addPage([WIDTH, HEIGHT]);
  let y = 15;
  const newPage = () => { page = doc.addPage([WIDTH, HEIGHT]); y = 15; };
  const ensure = (height: number) => { if (y + height > HEIGHT - 18) newPage(); };
  const centered = (text: string, top: number, size: number, font: PDFFont, color = BLACK) => {
    const width = font.widthOfTextAtSize(text, size);
    drawTextTop(page, text, (WIDTH - width) / 2, top, size, font, color);
  };

  let nameSize = SIZE.name;
  const uppercaseName = (clean(data.name) || "Member Name").toLocaleUpperCase();
  while (nameSize > 11 && bold.widthOfTextAtSize(uppercaseName, nameSize) > CONTENT) nameSize -= 0.5;
  centered(uppercaseName, 15.3, nameSize, bold, NAVY);
  if (data.headline.trim()) centered(clean(data.headline), 37.3, SIZE.headline, bold, BLACK);
  const contactParts = [data.email, data.phone, data.location].map(clean).filter(Boolean);
  const contactLine = contactParts.join(" | ");
  if (contactLine) centered(contactLine, 51.6, SIZE.body, regular, BLACK);
  if (data.links.length) {
    let text = "";
    let x = 0;
    const parts = data.links.map((link) => `${clean(link.label) || clean(link.url)}`);
    const totalWidth = parts.reduce((sum, part) => sum + regular.widthOfTextAtSize(part, SIZE.body), 0) + Math.max(0, parts.length - 1) * regular.widthOfTextAtSize(" | ", SIZE.body);
    x = (WIDTH - totalWidth) / 2;
    for (let i = 0; i < data.links.length; i++) {
      const label = parts[i];
      const width = regular.widthOfTextAtSize(label, SIZE.body);
      drawTextTop(page, label, x, 61.4, SIZE.body, regular, BLACK);
      addLink(page, x, 61.4, width, 10, data.links[i].url);
      x += width;
      if (i < data.links.length - 1) {
        text = " | "; drawTextTop(page, text, x, 61.4, SIZE.body, regular, BLACK);
        x += regular.widthOfTextAtSize(text, SIZE.body);
      }
    }
  }
  y = 78.8;

  function section(heading: string, startAt = 0) {
    if (startAt && y < startAt) y = startAt;
    ensure(42);
    drawTextTop(page, heading, LEFT, y, SIZE.section, bold, NAVY);
    page.drawRectangle({ x: LEFT, y: HEIGHT - y - 14.2, width: CONTENT, height: 0.58, color: NAVY });
    y += 18.3;
  }
  function body(text: string, x = LEFT, size = SIZE.body, font = regular, color = CHARCOAL, maxWidth = WIDTH - RIGHT - x, lineHeight = LINE) {
    const lines = wrapped(text, font, size, maxWidth);
    for (const line of lines) {
      ensure(lineHeight + 1);
      if (line) drawTextTop(page, line, x, y, size, font, color);
      y += lineHeight;
    }
    return lines.length;
  }
  function bullet(text: string) {
    const lines = wrapped(text, regular, SIZE.body, WIDTH - RIGHT - (LEFT + 25));
    for (let i = 0; i < lines.length; i++) {
      ensure(LINE + 1);
      if (i === 0) drawTextTop(page, "•", LEFT + 2, y, SIZE.body, regular, CHARCOAL);
      drawTextTop(page, lines[i], LEFT + 11, y, SIZE.body, regular, CHARCOAL);
      y += LINE;
    }
    y += 2.8;
  }
  const endSection = () => { y += 7.5; };

  if (data.visibleSections.summary && data.summary.trim()) {
    section("PROFESSIONAL SUMMARY", 78.8);
    body(data.summary); endSection();
  }
  if (data.visibleSections.skills && data.skills.some((g) => g.items.length)) {
    section("TECHNICAL SKILLS");
    for (const group of data.skills) {
      const items = group.items.map(clean).filter(Boolean);
      if (!items.length) continue;
      const label = clean(group.category) || "Skills";
      const prefix = `${label}:`;
      const firstWidth = bold.widthOfTextAtSize(prefix, SIZE.body) + regular.widthOfTextAtSize(" ", SIZE.body);
      const firstLineWidth = CONTENT - firstWidth;
      const text = items.join(", ");
      const firstLines = wrapped(text, regular, SIZE.body, firstLineWidth);
      const prefixLine = firstLines.shift() ?? "";
      ensure(LINE + 1);
      drawTextTop(page, prefix, LEFT, y, SIZE.body, bold, CHARCOAL);
      drawTextTop(page, prefixLine, LEFT + firstWidth, y, SIZE.body, regular, CHARCOAL);
      y += LINE;
      for (const line of firstLines) { ensure(LINE + 1); drawTextTop(page, line, LEFT, y, SIZE.body, regular, CHARCOAL); y += LINE; }
      y += 3.4;
    }
    endSection();
  }
  if (data.visibleSections.experience && data.experience.length) {
    section("EXPERIENCE");
    for (const entry of data.experience) {
      const heading = [entry.title, entry.organization].map(clean).filter(Boolean).join(" | ");
      const dates = [entry.startDate, entry.endDate].map(clean).filter(Boolean).join(" – ");
      ensure(16);
      const dateWidth = dates ? italic.widthOfTextAtSize(dates, SIZE.body) : 0;
      const titleLines = wrapped(heading, bold, SIZE.role, Math.max(80, CONTENT - dateWidth - 10));
      drawTextTop(page, titleLines[0] ?? "Experience", LEFT, y, SIZE.role, bold, CHARCOAL);
      if (dates && (titleLines.length === 1)) drawTextTop(page, dates, WIDTH - RIGHT - dateWidth, y, SIZE.body, italic, BLACK);
      y += LINE + 1.8;
      for (const line of titleLines.slice(1)) { ensure(LINE); drawTextTop(page, line, LEFT, y, SIZE.role, bold, CHARCOAL); y += LINE; }
      if (entry.location) { body(entry.location, LEFT, SIZE.body, regular, CHARCOAL); }
      const bullets = entry.bullets.length ? entry.bullets : entry.description ? entry.description.split("\n").filter(Boolean) : [];
      for (const item of bullets) bullet(item);
      y += 3;
    }
    endSection();
  }
  if (data.visibleSections.projects && data.projects.length) {
    section("PROJECTS");
    for (const entry of data.projects) {
      const tech = clean(entry.technologies);
      const heading = [entry.title, entry.organization].map(clean).filter(Boolean).join(" | ");
      const headingLines = wrapped(heading, bold, SIZE.body, CONTENT);
      ensure(15);
      for (const line of headingLines) { drawTextTop(page, line, LEFT, y, SIZE.body, bold, CHARCOAL); y += LINE; }
      if (tech) { for (const line of wrapped(`— ${tech}`, italic, SIZE.body, CONTENT)) { ensure(LINE + 1); drawTextTop(page, line, LEFT, y, SIZE.body, italic, CHARCOAL); y += LINE; } }
      if (entry.url && /^https:\/\//i.test(entry.url)) {
        const urlText = clean(entry.url);
        for (const line of wrapped(urlText, regular, SIZE.body, CONTENT)) { ensure(LINE + 1); drawTextTop(page, line, LEFT, y, SIZE.body, regular, NAVY); addLink(page, LEFT, y, regular.widthOfTextAtSize(line, SIZE.body), LINE, urlText); y += LINE; }
      }
      const bullets = entry.bullets.length ? entry.bullets : entry.description ? entry.description.split("\n").filter(Boolean) : [];
      for (const item of bullets) bullet(item);
      y += 3;
    }
    endSection();
  }
  if (data.visibleSections.education && data.education.length) {
    section("EDUCATION");
    for (const entry of data.education) {
      const title = [entry.title, entry.organization].map(clean).filter(Boolean).join(" | ");
      const dates = [entry.startDate, entry.endDate].map(clean).filter(Boolean).join(" – ");
      ensure(18);
      const dateWidth = dates ? italic.widthOfTextAtSize(dates, SIZE.body) : 0;
      drawTextTop(page, title, LEFT, y, SIZE.body, bold, CHARCOAL);
      if (dates) drawTextTop(page, dates, WIDTH - RIGHT - dateWidth, y, SIZE.body, italic, BLACK);
      y += LINE + 2;
      if (entry.location) { body(entry.location); }
      if (entry.description) body(entry.description);
    }
    endSection();
  }
  if (data.visibleSections.certifications && data.certifications.length) {
    section("CERTIFICATIONS");
    for (const entry of data.certifications) {
      const item = [entry.title, entry.organization, entry.startDate, entry.url].map((value) => clean(value ?? "")).filter(Boolean).join(" — ");
      body(item); y += 1.5;
    }
    endSection();
  }
  if (data.visibleSections.achievements && data.achievements.length) {
    section("ACHIEVEMENTS & HIGHLIGHTS");
    for (const entry of data.achievements) bullet([clean(entry.title), clean(entry.description)].filter(Boolean).join(" — "));
  }
  return doc.save({ useObjectStreams: false });
}
