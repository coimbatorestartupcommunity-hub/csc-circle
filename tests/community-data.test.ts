// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { communityDataCsv, csvCell } from "@/lib/community-data/csv-export";
import { createCommunityDataPdf, CommunityDataPdfFontError } from "@/lib/community-data/pdf-export";
import {
  communityDataFilterSchema,
  memberCategories,
  memberSurveySubmissionSchema,
} from "@/lib/community-data/schema";
import type { CommunityMember } from "@/lib/community-data/service";

const validSubmission = {
  full_name: "  Example Member  ",
  contact_number: "+91 98765 43210",
  email: "EXAMPLE@TEST.COM",
  member_category: "Startup Founder",
  business_or_idea_name: "  Sample Startup  ",
  description: "  Building an education product for startup founders.  ",
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
  member_category: "Startup Founder",
  business_or_idea_name: "=Unsafe Spreadsheet Name",
  description: "A long founder description with commas, \"quotes\", and\nmultiple lines.",
  consent_at: "2026-11-09T10:00:00.000Z",
  submission_source: "member_onboarding_survey",
  created_at: "2026-11-09T10:00:00.000Z",
};

describe("community member survey validation", () => {
  it("accepts and normalizes the six required fields and exact categories", () => {
    const value = memberSurveySubmissionSchema.parse(validSubmission);
    expect(value.full_name).toBe("Example Member");
    expect(value.email).toBe("example@test.com");
    expect(value.business_or_idea_name).toBe("Sample Startup");
    expect(memberCategories).toEqual(["Established Business", "Startup Founder", "Idea Stage"]);
  });

  it("rejects invalid email, phone, category, consent, bot trap and oversized description", () => {
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, email: "invalid" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, contact_number: "123" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, member_category: "Other" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, consent: false }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, website: "bot.example" }).success).toBe(false);
    expect(memberSurveySubmissionSchema.safeParse({ ...validSubmission, description: "x".repeat(3001) }).success).toBe(false);
  });

  it("validates combined category, search, sorting and pagination filters", () => {
    expect(communityDataFilterSchema.parse({ category: "Idea Stage", search: " idea ", sort: "name_asc", page: "2", pageSize: "50" })).toMatchObject({
      category: "Idea Stage",
      search: "idea",
      sort: "name_asc",
      page: 2,
      pageSize: 50,
    });
    expect(communityDataFilterSchema.safeParse({ pageSize: 500 }).success).toBe(false);
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

  it("creates a readable multi-page A4 PDF with page numbering and wrapped long text", async () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      ...row,
      id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
      description: `${row.description} ${"Detailed community context ".repeat(45)}`,
    }));
    const bytes = await createCommunityDataPdf(rows, { sort: "newest", page: 1, pageSize: 25 }, rows.length);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(pdf.getTitle()).toBe("CSC Community Member Data Report");
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(841.89, 1);
      expect(page.getHeight()).toBeCloseTo(595.28, 1);
    }
  }, 20_000);

  it("embeds a Tamil fallback font and fails safely for genuinely unsupported glyphs", async () => {
    const tamilBytes = await createCommunityDataPdf([{ ...row, full_name: "தமிழ் Founder", description: "கோயம்புத்தூர் startup idea" }], { search: "தமிழ்", sort: "newest", page: 1, pageSize: 25 }, 1);
    expect((await PDFDocument.load(tamilBytes)).getPageCount()).toBe(1);
    await expect(createCommunityDataPdf([{ ...row, full_name: "Unsupported emoji 🫠" }], { sort: "newest", page: 1, pageSize: 25 }, 1))
      .rejects.toBeInstanceOf(CommunityDataPdfFontError);
  }, 20_000);
});

describe("csc_members migration security and invariants", () => {
  let database: PGlite;

  beforeAll(async () => {
    database = new PGlite();
    await database.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261109102024_csc_member_survey.sql"), "utf8");
    await database.exec(migration);
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

  it("enables forced RLS and denies browser roles all table privileges", async () => {
    const security = await database.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>("select relrowsecurity,relforcerowsecurity from pg_class where oid='public.csc_members'::regclass");
    expect(security.rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
    const privileges = await database.query<{ anon_select: boolean; authenticated_select: boolean; anon_insert: boolean }>("select has_table_privilege('anon','public.csc_members','select') anon_select,has_table_privilege('authenticated','public.csc_members','select') authenticated_select,has_table_privilege('anon','public.csc_members','insert') anon_insert");
    expect(privileges.rows).toEqual([{ anon_select: false, authenticated_select: false, anon_insert: false }]);
  });

  it("keeps idempotency tokens unique and lets only service_role execute the bounded search RPC", async () => {
    await expect(database.exec(`insert into public.csc_members(full_name,contact_number,email,member_category,business_or_idea_name,description,submission_token) values ('Duplicate Member','9876543210','duplicate@test.com','Idea Stage','Duplicate Idea','A sufficiently detailed description.','22222222-2222-4222-8222-222222222222')`)).rejects.toThrow();
    const execute = await database.query<{ anon_execute: boolean; service_execute: boolean }>("select has_function_privilege('anon','public.csc_list_member_survey_responses(text,text,text,integer,integer)','execute') anon_execute,has_function_privilege('service_role','public.csc_list_member_survey_responses(text,text,text,integer,integer)','execute') service_execute");
    expect(execute.rows).toEqual([{ anon_execute: false, service_execute: true }]);
  });
});
