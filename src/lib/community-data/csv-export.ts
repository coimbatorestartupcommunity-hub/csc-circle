import type { CommunityMember } from "@/lib/community-data/service";

export const COMMUNITY_DATA_CSV_HEADERS = [
  "Full Name",
  "Contact Number",
  "Email Address",
  "Member Category",
  "Business / Idea Name",
  "Description",
  "Submitted On",
] as const;

export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  // Neutralize formula-like values even when control characters or whitespace
  // precede the first spreadsheet operator.
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function communityDataCsv(rows: CommunityMember[]): string {
  const records = rows.map((row) => [
    row.full_name,
    row.contact_number,
    row.email,
    row.member_category,
    row.business_or_idea_name,
    row.description,
    row.created_at,
  ]);
  return `\uFEFF${[COMMUNITY_DATA_CSV_HEADERS, ...records]
    .map((record) => record.map(csvCell).join(","))
    .join("\r\n")}`;
}
