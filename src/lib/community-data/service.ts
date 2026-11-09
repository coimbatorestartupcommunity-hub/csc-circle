import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { can, getAdminContext } from "@/lib/admin/gate";
import type { CommunityDataFilter, MemberSurveySubmission } from "@/lib/community-data/schema";
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
    member_category: row.member_category,
    business_or_idea_name: row.business_or_idea_name,
    description: row.description,
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
    p_category: filter.category ?? null,
    p_search: filter.search || null,
    p_sort: filter.sort,
    p_offset: offset,
    p_limit: limit,
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
  const { error } = await client.from("csc_members").upsert({
    full_name: value.full_name,
    contact_number: value.contact_number,
    email: value.email,
    member_category: value.member_category,
    business_or_idea_name: value.business_or_idea_name,
    description: value.description,
    submission_token: value.submission_token,
  }, { onConflict: "submission_token", ignoreDuplicates: true });

  if (!error) return { ok: true };
  return { ok: false };
}
