// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COMMUNITY_DATA_CSV_HEADERS, communityDataCsv, csvCell } from "@/lib/community-data/csv-export";
import { createCommunityDataPdf, CommunityDataPdfFontError } from "@/lib/community-data/pdf-export";
import {
  allCurrentStages,
  businessConnectionOptions,
  businessTeamSizes,
  communityDataFilterSchema,
  discoverySources,
  ideaSupportOptions,
  industrySectors,
  memberCategories,
  memberSurveySubmissionSchema,
  preferredContactMethods,
  sanitizeMemberSurveyValues,
  seekingCofounderOptions,
  startupSupportOptions,
  startupTeamStructures,
  supportNeededOptions,
} from "@/lib/community-data/schema";
import type { CommunityMember } from "@/lib/community-data/service";

const validSubmission = {
  full_name: "  Example Member  ",
  contact_number: "+91 98765 43210",
  email: "EXAMPLE@TEST.COM",
  city: "  Coimbatore  ",
  member_category: "Startup Founder",
  business_or_idea_name: "  Sample Startup  ",
  industry_sector: "Technology / Software",
  industry_other: "",
  current_stage: "Prototype / MVP",
  description: "  Building an education product for startup founders.  ",
  support_needed: ["Mentorship", "Funding / Investment"],
  support_needed_other: "",
  biggest_challenge: "",
  website_url: "",
  discovery_source: undefined,
  discovery_source_other: "",
  preferred_contact_method: undefined,
  established_year: "",
  business_team_size: undefined,
  business_connections: [],
  business_connections_other: "",
  startup_team_structure: "Solo Founder",
  startup_support: ["Mentorship"],
  startup_support_other: "",
  startup_current_focus: "Finishing the MVP.",
  seeking_cofounder: undefined,
  idea_support: [],
  idea_support_other: "",
  idea_problem_statement: "",
  consent: true,
  submission_token: "11111111-1111-4111-8111-111111111111",
  form_started_at: 1_700_000_000_000,
  website: "",
};

const row: CommunityMember = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Élodie Иванова",
  contact_number: "+91 98765 43210",
  email: "member@example.test",
  city: "Coimbatore",
  member_category: "Startup Founder",
  business_or_idea_name: "=Unsafe Spreadsheet Name",
  industry_sector: "Technology / Software",
  industry_other: null,
  current_stage: "Prototype / MVP",
  description: "A long founder description with commas, \"quotes\", and\nmultiple lines.",
  support_needed: ["Mentorship", "Other"],
  support_needed_other: "Warm introductions",
  biggest_challenge: "Finding first customers.",
  website_url: "https://example.test",
  discovery_source: "Other",
  discovery_source_other: "College notice board",
  preferred_contact_method: "WhatsApp",
  established_year: null,
  business_team_size: null,
  business_connections: null,
  business_connections_other: null,
  startup_team_structure: "Solo Founder",
  startup_support: ["Mentorship", "Networking"],
  startup_support_other: null,
  startup_current_focus: "Finishing the MVP.",
  seeking_cofounder: null,
  idea_support: null,
  idea_support_other: null,
  idea_problem_statement: null,
  consent_at: "2026-11-09T10:00:00.000Z",
  submission_source: "member_onboarding_survey",
  created_at: "2026-11-09T10:00:00.000Z",
};

const legacyRow: CommunityMember = {
  id: "22222222-2222-4222-8222-222222222222",
  full_name: "Legacy Member",
  contact_number: "+91 90000 00000",
  email: "legacy@example.test",
  city: null,
  member_category: "Established Business",
  business_or_idea_name: "Legacy Traders",
  industry_sector: null,
  industry_other: null,
  current_stage: null,
  description: "A legacy submission collected before the survey enhancement.",
  support_needed: null,
  support_needed_other: null,
  biggest_challenge: null,
  website_url: null,
  discovery_source: null,
  discovery_source_other: null,
  preferred_contact_method: null,
  established_year: null,
  business_team_size: null,
  business_connections: null,
  business_connections_other: null,
  startup_team_structure: null,
  startup_support: null,
  startup_support_other: null,
  startup_current_focus: null,
  seeking_cofounder: null,
  idea_support: null,
  idea_support_other: null,
  idea_problem_statement: null,
  consent_at: "2026-10-01T10:00:00.000Z",
  submission_source: "member_onboarding_survey",
  created_at: "2026-10-01T10:00:00.000Z",
};

describe("community member survey validation", () => {
  it("accepts and normalizes the required fields and exact categories", () => {
    const value = memberSurveySubmissionSchema.parse(validSubmission);
    expect(value.full_name).toBe("Example Member");
    expect(value.email).toBe("example@test.com");
    expect(value.city).toBe("Coimbatore");
    expect(value.business_or_idea_name).toBe("Sample Startup");
    expect(value.industry_sector).toBe("Technology / Software");
    expect(value.current_stage).toBe("Prototype / MVP");
    expect(value.support_needed).toEqual(["Mentorship", "Funding / Investment"]);
    expect(memberCategories).toEqual(["Established Business", "Startup Founder", "Idea Stage"]);
  });

  it("rejects invalid email, phone, city, category, consent, bot trap and oversized description", () => {
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, email: "invalid" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, contact_number: "123" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, city: "x" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, member_category: "Other" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, consent: false }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, website: "bot.example" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, description: "x".repeat(3001) }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, description: "short" }).success).toBe(false);
  });

  it("offers 14 industries and requires the Other specification only for Other", () => {
    expect(industrySectors).toHaveLength(14);
    expect(industrySectors).toContain("Other");
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, industry_sector: "Other", industry_other: "" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, industry_sector: "Other", industry_other: "  Drones  " }).success).toBe(true);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, industry_sector: "Nope" }).success).toBe(false);
  });

  it("validates the adaptive current stage against the selected category", () => {
    expect(allCurrentStages).toContain("Scaling to New Markets");
    expect(allCurrentStages).toContain("Building a Prototype");
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, current_stage: "Building a Prototype" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({
      ...validSubmission,
      member_category: "Established Business",
      current_stage: "Scaling to New Markets",
    }).success).toBe(true);
    expect(memberSurveySubmissionSchema.safeParse({
      ...validSubmission,
      member_category: "Idea Stage",
      current_stage: "Not Yet",
    }).success).toBe(true);
  });

  it("requires at least one support option and validates website and year optionals", () => {
    expect(supportNeededOptions).toHaveLength(13);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, support_needed: [] }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, website_url: "not a url" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, website_url: "example.com" }).success).toBe(true);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, established_year: "1800" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, established_year: String(new Date().getFullYear() + 1) }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, biggest_challenge: "x".repeat(1001) }).success).toBe(false);
  });

  it("exposes the specified per-category option counts", () => {
    expect(businessTeamSizes).toHaveLength(6);
    expect(businessConnectionOptions).toHaveLength(11);
    expect(startupTeamStructures).toHaveLength(5);
    expect(startupSupportOptions).toHaveLength(12);
    expect(seekingCofounderOptions).toHaveLength(4);
    expect(ideaSupportOptions).toHaveLength(12);
    expect(discoverySources).toHaveLength(9);
    expect(preferredContactMethods).toHaveLength(4);
  });

  it("strips stale category values and normalizes optionals on sanitize", () => {
    const parsed = memberSurveySubmissionSchema.parse({
      ...validSubmission,
      website_url: "example.com",
      established_year: "2019",
      business_team_size: "2-5",
      startup_support: [],
    });
    const clean = sanitizeMemberSurveyValues(parsed);
    expect(clean.website_url).toBe("https://example.com");
    expect(clean.established_year).toBeUndefined();
    expect(clean.business_team_size).toBeUndefined();
    expect(clean.startup_support).toBeUndefined();
    expect(clean.startup_team_structure).toBe("Solo Founder");
    expect(clean.support_needed).toEqual(["Mentorship", "Funding / Investment"]);
  });

  it("validates combined category, search, city, industry, stage, support, date, sorting and pagination filters", () => {
    expect(communityDataFilterSchema.parse({
      category: "Idea Stage",
      search: " idea ",
      city: " Coimbatore ",
      industry: "Other",
      stage: "Validating the Idea",
      support: "Mentorship",
      from: "2026-11-01",
      to: "2026-11-09",
      sort: "name_asc",
      page: "2",
      pageSize: "50",
    })).toMatchObject({
      category: "Idea Stage",
      search: "idea",
      city: "Coimbatore",
      industry: "Other",
      stage: "Validating the Idea",
      support: "Mentorship",
      from: "2026-11-01",
      to: "2026-11-09",
      sort: "name_asc",
      page: 2,
      pageSize: 50,
    });
    expect(communityDataFilterSchema.safeParse({ pageSize: 500 }).success).toBe(false);
    expect(communityDataFilterSchema.safeParse({ from: "11/01/2026" }).success).toBe(false);
    expect(communityDataFilterSchema.safeParse({ stage: "Unknown Stage" }).success).toBe(false);
  });
});
describe("community data exports", () => {
  it("quotes CSV, preserves Unicode and neutralizes spreadsheet formulas", () => {
    const csv = communityDataCsv([row]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Élodie Иванова");
    expect(csv).toContain("\"'=Unsafe Spreadsheet Name\"");
    expect(csv).toContain('multiple lines.\"');
    expect(csvCell("\t-HYPERLINK(\"x\")")).toBe('"\'\t-HYPERLINK(""x"")"');
  });

  it("exports every survey column with semicolon-joined arrays and blank legacy cells", () => {
    expect(COMMUNITY_DATA_CSV_HEADERS).toHaveLength(30);
    expect(COMMUNITY_DATA_CSV_HEADERS).toContain("City");
    expect(COMMUNITY_DATA_CSV_HEADERS).toContain("Current Stage");
    expect(COMMUNITY_DATA_CSV_HEADERS).toContain("Support Needed");
    expect(COMMUNITY_DATA_CSV_HEADERS).toContain("Idea Problem Statement");
    const csv = communityDataCsv([row, legacyRow]);
    expect(csv).toContain("\"Mentorship; Other\"");
    expect(csv).toContain("\"Mentorship; Networking\"");
    expect(csv).toContain("Warm introductions");
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0].split('","')).toHaveLength(30);
  });

  it("creates a readable multi-page portrait PDF report with page numbering and wrapped long text", async () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      ...row,
      id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
      description: `${row.description} ${"Detailed community context ".repeat(45)}`,
    }));
    const bytes = await createCommunityDataPdf(rows, { sort: "newest", page: 1, pageSize: 25 }, rows.length);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(pdf.getTitle()).toBe("CSC Circle Community Member Information Report");
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.28, 1);
      expect(page.getHeight()).toBeCloseTo(841.89, 1);
    }
  }, 20_000);

  it("renders legacy rows without invention and keeps Tamil/Unicode support with safe font failures", async () => {
    const legacyBytes = await createCommunityDataPdf([legacyRow], { sort: "newest", page: 1, pageSize: 25 }, 1);
    expect((await PDFDocument.load(legacyBytes)).getPageCount()).toBeGreaterThanOrEqual(1);
    const tamilBytes = await createCommunityDataPdf([{ ...row, full_name: "தமிழ் Founder", description: "கோயம்புத்தூர் startup idea" }], { search: "தமிழ்", sort: "newest", page: 1, pageSize: 25 }, 1);
    expect((await PDFDocument.load(tamilBytes)).getPageCount()).toBeGreaterThanOrEqual(1);
    await expect(createCommunityDataPdf([{ ...row, full_name: "Unsupported emoji 🫠" }], { sort: "newest", page: 1, pageSize: 25 }, 1))
      .rejects.toBeInstanceOf(CommunityDataPdfFontError);
  }, 20_000);
});

describe("csc_members migration security and invariants", () => {
  let database: PGlite;

  beforeAll(async () => {
    database = new PGlite();
    await database.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    const base = readFileSync(resolve(process.cwd(), "supabase/migrations/20261109102024_csc_member_survey.sql"), "utf8");
    await database.exec(base);
    const enhancement = readFileSync(resolve(process.cwd(), "supabase/migrations/20261109120000_csc_member_survey_enhancement.sql"), "utf8");
    await database.exec(enhancement);
  });

  afterAll(async () => database?.close());

  it("creates generated UUID/timestamps and accepts only valid normalized records", async () => {
    const inserted = await database.query<{ id: string; created_at: string; consent_at: string }>(`
      insert into public.csc_members(full_name,contact_number,email,member_category,business_or_idea_name,description,submission_token)
      values ('Example Member','+91 98765 43210','example@test.com','Idea Stage','Example Idea','A sufficiently detailed idea description.','22222222-2222-4222-8222-222222222222')
      returning id,created_at,consent_at
    `);
    expect(inserted.rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(inserted.rows[0].created_at).toBeTruthy();
    expect(inserted.rows[0].consent_at).toBeTruthy();
    await expect(database.exec(`insert into public.csc_members(full_name,contact_number,email,member_category,business_or_idea_name,description,submission_token) values ('Bad Member','9876543210','bad@test.com','Other','Bad Idea','A sufficiently detailed description.','33333333-3333-4333-8333-333333333333')`)).rejects.toThrow();
  });

  it("stores the enhancement columns and rejects invalid option values", async () => {
    await database.exec(`insert into public.csc_members(full_name,contact_number,email,city,member_category,business_or_idea_name,industry_sector,current_stage,description,support_needed,established_year,website_url,submission_token)
      values ('Enhanced Member','+91 98765 43211','enhanced@test.com','Coimbatore','Startup Founder','Enhanced Startup','Technology / Software','Prototype / MVP','A sufficiently detailed startup description.',array['Mentorship','Other'],2019,'https://example.test','44444444-4444-4444-8444-444444444444')`);
    const stored = await database.query<{ city: string; support_needed: string[]; established_year: number }>(
      `select city,support_needed,established_year from public.csc_members where submission_token='44444444-4444-4444-8444-444444444444'`);
    expect(stored.rows[0]).toMatchObject({ city: "Coimbatore", support_needed: ["Mentorship", "Other"], established_year: 2019 });
    await expect(database.exec(`insert into public.csc_members(full_name,contact_number,email,member_category,business_or_idea_name,description,industry_sector,submission_token) values ('Bad Industry','9876543210','bad-industry@test.com','Idea Stage','Bad Idea','A sufficiently detailed description.','Nope','55555555-5555-4555-8555-555555555555')`)).rejects.toThrow();
    await expect(database.exec(`insert into public.csc_members(full_name,contact_number,email,member_category,business_or_idea_name,description,current_stage,submission_token) values ('Bad Stage','9876543210','bad-stage@test.com','Idea Stage','Bad Idea','A sufficiently detailed description.','IPO','66666666-6666-4666-8666-666666666666')`)).rejects.toThrow();
    await expect(database.exec(`insert into public.csc_members(full_name,contact_number,email,member_category,business_or_idea_name,description,industry_sector,submission_token) values ('Missing Other','9876543210','missing-other@test.com','Idea Stage','Bad Idea','A sufficiently detailed description.','Other','77777777-7777-4777-8777-777777777777')`)).rejects.toThrow();
    await expect(database.exec(`insert into public.csc_members(full_name,contact_number,email,member_category,business_or_idea_name,description,established_year,submission_token) values ('Bad Year','9876543210','bad-year@test.com','Established Business','Bad Business','A sufficiently detailed description.',1800,'88888888-8888-4888-8888-888888888888')`)).rejects.toThrow();
    await expect(database.exec(`insert into public.csc_members(full_name,contact_number,email,member_category,business_or_idea_name,description,support_needed,submission_token) values ('Bad Support','9876543210','bad-support@test.com','Idea Stage','Bad Idea','A sufficiently detailed description.',array['Nope'],'99999999-9999-4999-8999-999999999999')`)).rejects.toThrow();
  });

  it("enables forced RLS and denies browser roles all table privileges", async () => {
    const security = await database.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>("select relrowsecurity,relforcerowsecurity from pg_class where oid='public.csc_members'::regclass");
    expect(security.rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
    const privileges = await database.query<{ anon_select: boolean; authenticated_select: boolean; anon_insert: boolean }>("select has_table_privilege('anon','public.csc_members','select') anon_select,has_table_privilege('authenticated','public.csc_members','select') authenticated_select,has_table_privilege('anon','public.csc_members','insert') anon_insert");
    expect(privileges.rows).toEqual([{ anon_select: false, authenticated_select: false, anon_insert: false }]);
  });

  it("keeps idempotency tokens unique and lets only service_role execute the bounded search RPC", async () => {
    await expect(database.exec(`insert into public.csc_members(full_name,contact_number,email,member_category,business_or_idea_name,description,submission_token) values ('Duplicate Member','9876543210','duplicate@test.com','Idea Stage','Duplicate Idea','A sufficiently detailed description.','22222222-2222-4222-8222-222222222222')`)).rejects.toThrow();
    const execute = await database.query<{ anon_execute: boolean; service_execute: boolean }>("select has_function_privilege('anon','public.csc_list_member_survey_responses(text,text,text,integer,integer,text,text,text,text,date,date)','execute') anon_execute,has_function_privilege('service_role','public.csc_list_member_survey_responses(text,text,text,integer,integer,text,text,text,text,date,date)','execute') service_execute");
    expect(execute.rows).toEqual([{ anon_execute: false, service_execute: true }]);
  });

  it("filters the search RPC by city, industry, stage, support and free text", async () => {
    const city = await database.query<{ full_name: string }>(
      `select full_name from public.csc_list_member_survey_responses(null,null,'newest',0,25,'Coimbatore',null,null,null,null,null)`);
    expect(city.rows.map((entry) => entry.full_name)).toContain("Enhanced Member");
    const industry = await database.query<{ full_name: string }>(
      `select full_name from public.csc_list_member_survey_responses(null,null,'newest',0,25,null,'Technology / Software',null,null,null,null)`);
    expect(industry.rows.map((entry) => entry.full_name)).toContain("Enhanced Member");
    const stage = await database.query<{ full_name: string }>(
      `select full_name from public.csc_list_member_survey_responses(null,null,'newest',0,25,null,null,'Prototype / MVP',null,null,null)`);
    expect(stage.rows.map((entry) => entry.full_name)).toContain("Enhanced Member");
    const support = await database.query<{ full_name: string }>(
      `select full_name from public.csc_list_member_survey_responses(null,null,'newest',0,25,null,null,null,'Mentorship',null,null)`);
    expect(support.rows.map((entry) => entry.full_name)).toContain("Enhanced Member");
    const missing = await database.query<{ full_name: string }>(
      `select full_name from public.csc_list_member_survey_responses(null,null,'newest',0,25,'Chennai',null,null,null,null,null)`);
    expect(missing.rows.map((entry) => entry.full_name)).not.toContain("Enhanced Member");
    const search = await database.query<{ full_name: string }>(
      `select full_name from public.csc_list_member_survey_responses(null,'Coimbatore','newest',0,25,null,null,null,null,null,null)`);
    expect(search.rows.map((entry) => entry.full_name)).toContain("Enhanced Member");
  });
});
