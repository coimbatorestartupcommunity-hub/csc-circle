import type { CommunityMember } from "@/lib/community-data/service";

export const COMMUNITY_DATA_CSV_HEADERS = [
  "Full Name",
  "Contact Number",
  "Email Address",
  "City",
  "Member Category",
  "Business / Idea Name",
  "Industry Sector",
  "Industry (Other Specified)",
  "Current Stage",
  "Description",
  "Support Needed",
  "Support Needed (Other Specified)",
  "Biggest Challenge",
  "Website URL",
  "Discovery Source",
  "Discovery Source (Other Specified)",
  "Preferred Contact Method",
  "Established Year",
  "Business Team Size",
  "Business Connections",
  "Business Connections (Other Specified)",
  "Startup Team Structure",
  "Startup Support",
  "Startup Support (Other Specified)",
  "Startup Current Focus",
  "Seeking Co-founder",
  "Idea Support",
  "Idea Support (Other Specified)",
  "Idea Problem Statement",
  "Submitted On",
] as const;

export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  // Neutralize formula-like values even when control characters or whitespace
  // precede the first spreadsheet operator.
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csvList(value: readonly string[] | null | undefined): string {
  return value && value.length > 0 ? value.join("; ") : "";
}

export function communityDataCsv(rows: CommunityMember[]): string {
  const records = rows.map((row) => [
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
    csvList(row.support_needed),
    row.support_needed_other ?? "",
    row.biggest_challenge ?? "",
    row.website_url ?? "",
    row.discovery_source ?? "",
    row.discovery_source_other ?? "",
    row.preferred_contact_method ?? "",
    row.established_year ?? "",
    row.business_team_size ?? "",
    csvList(row.business_connections),
    row.business_connections_other ?? "",
    row.startup_team_structure ?? "",
    csvList(row.startup_support),
    row.startup_support_other ?? "",
    row.startup_current_focus ?? "",
    row.seeking_cofounder ?? "",
    csvList(row.idea_support),
    row.idea_support_other ?? "",
    row.idea_problem_statement ?? "",
    row.created_at,
  ]);
  return `\uFEFF${[COMMUNITY_DATA_CSV_HEADERS, ...records]
    .map((record) => record.map(csvCell).join(","))
    .join("\r\n")}`;
}
