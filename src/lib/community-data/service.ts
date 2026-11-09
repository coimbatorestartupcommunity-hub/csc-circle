import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { can, getAdminContext } from "@/lib/admin/gate";
import { sanitizeMemberSurveyValues, type CommunityDataFilter, type MemberSurveySubmission } from "@/lib/community-data/schema";
import type { Database } from "@/lib/supabase/database.types";
import { createSubmissionClient } from "@/lib/supabase/submissions";

type SurveyRpcRow = Database["public"]["Functions"]["csc_list_member_survey_responses"]["Returns"][number];

export type CommunityMember = Omit<SurveyRpcRow, "total_count">;

export interface CommunityMemberPage {
  rows: CommunityMember[];
  total: number;
  page: number;
  pageSize: number;
}
export interface CommunityDataSummary {
  total: number;
  establishedBusiness: number;
  startupFounder: number;
  ideaStage: number;
}

export class CommunityDataAccessError extends Error {
  constructor() {
    super("Community member data access is required.");
    this.name = "CommunityDataAccessError";
  }
}

export class CommunityDataExportLimitError extends Error {
  constructor(public readonly maximum: number) {
    super(`The export exceeds the ${maximum}-record safety limit.`);
    this.name = "CommunityDataExportLimitError";
  }
}

function trustedClient(): SupabaseClient<Database> {
  const client = createSubmissionClient();
  if (!client) throw new Error("Trusted Supabase server configuration is unavailable.");
  return client;
}

async function requireLiveReadAccess() {
  const context = await getAdminContext();
  if (context.mode !== "live" || !can(context, "members.read")) {
    throw new CommunityDataAccessError();
  }
}

function withoutCount(row: SurveyRpcRow): CommunityMember {
  return {
    id: row.id,
    full_name: row.full_name,
    contact_number: row.contact_number,
    email: row.email,
    city: row.city,
    member_category: row.member_category,
    business_or_idea_name: row.business_or_idea_name,
    industry_sector: row.industry_sector,
    industry_other: row.industry_other,
    current_stage: row.current_stage,
    description: row.description,
    support_needed: row.support_needed,
    support_needed_other: row.support_needed_other,
    biggest_challenge: row.biggest_challenge,
    website_url: row.website_url,
    linkedin_url: row.linkedin_url,
    portfolio_url: row.portfolio_url,
    discovery_source: row.discovery_source,
    discovery_source_other: row.discovery_source_other,
    preferred_contact_method: row.preferred_contact_method,
    established_year: row.established_year,
    business_team_size: row.business_team_size,
    business_connections: row.business_connections,
    business_connections_other: row.business_connections_other,
    startup_team_structure: row.startup_team_structure,
    startup_support: row.startup_support,
    startup_support_other: row.startup_support_other,
    startup_current_focus: row.startup_current_focus,
    seeking_cofounder: row.seeking_cofounder,
    idea_support: row.idea_support,
    idea_support_other: row.idea_support_other,
    idea_problem_statement: row.idea_problem_statement,
    consent_at: row.consent_at,
    submission_source: row.submission_source,
    created_at: row.created_at,
  };
}

async function fetchRows(
  client: SupabaseClient<Database>,
  filter: CommunityDataFilter,
  offset: number,
  limit: number,
) {
  const { data, error } = await client.rpc("csc_list_member_survey_responses", {
    p_category: filter.category,
    p_search: filter.search || undefined,
    p_sort: filter.sort,
    p_offset: offset,
    p_limit: limit,
    p_city: filter.city || undefined,
    p_industry: filter.industry,
    p_stage: filter.stage,
    p_support: filter.support,
    p_from: filter.from,
    p_to: filter.to,
  });
  if (error) throw new Error("Community survey responses could not be loaded.");
  return data ?? [];
}

async function fetchSummary(client: SupabaseClient<Database>): Promise<CommunityDataSummary> {
  const [total, establishedBusiness, startupFounder, ideaStage] = await Promise.all([
    client.from("csc_members").select("id", { count: "exact", head: true }),
    client.from("csc_members").select("id", { count: "exact", head: true }).eq("member_category", "Established Business"),
    client.from("csc_members").select("id", { count: "exact", head: true }).eq("member_category", "Startup Founder"),
    client.from("csc_members").select("id", { count: "exact", head: true }).eq("member_category", "Idea Stage"),
  ]);
  if (total.error || establishedBusiness.error || startupFounder.error || ideaStage.error) {
    throw new Error("Community survey summary could not be loaded.");
  }
  return {
    total: total.count ?? 0,
    establishedBusiness: establishedBusiness.count ?? 0,
    startupFounder: startupFounder.count ?? 0,
    ideaStage: ideaStage.count ?? 0,
  };
}

export async function getCommunityDashboardData(filter: CommunityDataFilter): Promise<{
  page: CommunityMemberPage;
  summary: CommunityDataSummary;
}> {
  await requireLiveReadAccess();
  const client = trustedClient();
  const offset = (filter.page - 1) * filter.pageSize;
  const [initialRows, summary] = await Promise.all([
    fetchRows(client, filter, offset, filter.pageSize),
    fetchSummary(client),
  ]);
  let rpcRows = initialRows;

  let total = Number(rpcRows[0]?.total_count ?? 0);
  let page = filter.page;
  if (rpcRows.length === 0 && filter.page > 1) {
    const first = await fetchRows(client, filter, 0, 1);
    total = Number(first[0]?.total_count ?? 0);
    const lastPage = Math.max(1, Math.ceil(total / filter.pageSize));
    if (total > 0 && filter.page > lastPage) {
      page = lastPage;
      rpcRows = await fetchRows(client, filter, (lastPage - 1) * filter.pageSize, filter.pageSize);
    }
  }

  return {
    page: {
      rows: rpcRows.map(withoutCount),
      total,
      page,
      pageSize: filter.pageSize,
    },
    summary,
  };
}

export async function getCommunityExportRows(
  filter: CommunityDataFilter,
  maximum: number,
): Promise<{ rows: CommunityMember[]; total: number }> {
  await requireLiveReadAccess();
  const client = trustedClient();
  const batchSize = 500;
  const first = await fetchRows(client, filter, 0, Math.min(batchSize, maximum + 1));
  const total = Number(first[0]?.total_count ?? 0);
  if (total > maximum) throw new CommunityDataExportLimitError(maximum);

  const rows = first.map(withoutCount);
  for (let offset = first.length; offset < total; offset += batchSize) {
    const batch = await fetchRows(client, filter, offset, Math.min(batchSize, total - offset));
    rows.push(...batch.map(withoutCount));
  }
  return { rows, total };
}

export async function insertMemberSurveySubmission(value: MemberSurveySubmission): Promise<{
  ok: true;
} | {
  ok: false;
}> {
  const client = trustedClient();
  const clean = sanitizeMemberSurveyValues(value);
  const { error } = await client.from("csc_members").upsert({
    full_name: clean.full_name,
    contact_number: clean.contact_number,
    email: clean.email,
    city: clean.city,
    member_category: clean.member_category,
    business_or_idea_name: clean.business_or_idea_name,
    industry_sector: clean.industry_sector,
    industry_other: clean.industry_other ?? null,
    current_stage: clean.current_stage,
    description: clean.description,
    support_needed: clean.support_needed,
    support_needed_other: clean.support_needed_other ?? null,
    biggest_challenge: clean.biggest_challenge ?? null,
    website_url: clean.website_url ?? null,
    linkedin_url: clean.linkedin_url ?? null,
    portfolio_url: clean.portfolio_url ?? null,
    discovery_source: clean.discovery_source ?? null,
    discovery_source_other: clean.discovery_source_other ?? null,
    preferred_contact_method: clean.preferred_contact_method ?? null,
    established_year: clean.established_year ?? null,
    business_team_size: clean.business_team_size ?? null,
    business_connections: clean.business_connections ?? null,
    business_connections_other: clean.business_connections_other ?? null,
    startup_team_structure: clean.startup_team_structure ?? null,
    startup_support: clean.startup_support ?? null,
    startup_support_other: clean.startup_support_other ?? null,
    startup_current_focus: clean.startup_current_focus ?? null,
    seeking_cofounder: clean.seeking_cofounder ?? null,
    idea_support: clean.idea_support ?? null,
    idea_support_other: clean.idea_support_other ?? null,
    idea_problem_statement: clean.idea_problem_statement ?? null,
    submission_token: clean.submission_token,
  }, { onConflict: "submission_token", ignoreDuplicates: true });

  if (!error) return { ok: true };
  return { ok: false };
}
