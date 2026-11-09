// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/gate", () => ({ getAdminContext: vi.fn(), can: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ distributedRateLimit: vi.fn(), clientIp: () => "127.0.0.1" }));
vi.mock("@/lib/supabase/submissions", () => ({ createSubmissionClient: vi.fn() }));
vi.mock("@/lib/community-data/service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/community-data/service")>();
  return { ...actual, getCommunityExportRows: vi.fn() };
});

import { GET } from "@/app/api/admin/community-data/export/route";
import { can, getAdminContext } from "@/lib/admin/gate";
import { getCommunityExportRows } from "@/lib/community-data/service";
import { distributedRateLimit } from "@/lib/rate-limit";
import { createSubmissionClient } from "@/lib/supabase/submissions";
import type { CommunityMember } from "@/lib/community-data/service";

const fullRow: CommunityMember = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Élodie Founder",
  contact_number: "+91 98765 43210",
  email: "founder@example.test",
  city: "Coimbatore",
  member_category: "Startup Founder",
  business_or_idea_name: "Sample Startup",
  industry_sector: "Technology & Artificial Intelligence",
  industry_other: null,
  current_stage: "Prototype / MVP",
  description: "Building an education product.",
  support_needed: ["Startup Mentorship", "Investor / Funding Connections"],
  support_needed_other: null,
  biggest_challenge: null,
  website_url: null,
  linkedin_url: null,
  portfolio_url: null,
  discovery_source: null,
  discovery_source_other: null,
  preferred_contact_method: null,
  established_year: null,
  business_team_size: null,
  business_connections: null,
  business_connections_other: null,
  startup_team_structure: "Solo Founder",
  startup_support: ["Startup Mentorship"],
  startup_support_other: null,
  startup_current_focus: null,
  seeking_cofounder: null,
  idea_support: null,
  idea_support_other: null,
  idea_problem_statement: null,
  consent_at: "2026-11-09T10:00:00.000Z",
  submission_source: "member_onboarding_survey",
  created_at: "2026-11-09T10:00:00.000Z",
};

function requestUrl(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return `https://admin.csc.test/api/admin/community-data/export?${query}`;
}

beforeEach(() => {
  vi.mocked(getAdminContext).mockReset();
  vi.mocked(can).mockReset();
  vi.mocked(distributedRateLimit).mockReset();
  vi.mocked(createSubmissionClient).mockReset();
  vi.mocked(getCommunityExportRows).mockReset();
  vi.mocked(getAdminContext).mockResolvedValue({ mode: "live", userId: "admin-1" } as never);
  vi.mocked(can).mockReturnValue(true);
  vi.mocked(createSubmissionClient).mockReturnValue({} as never);
  vi.mocked(distributedRateLimit).mockResolvedValue({ allowed: true, retryAfter: 0 } as never);
  vi.mocked(getCommunityExportRows).mockResolvedValue({ rows: [fullRow], total: 1 });
});

describe("community data export route", () => {
  it("requires live admin access with the members.read permission", async () => {
    vi.mocked(getAdminContext).mockResolvedValue({ mode: "preview", userId: "admin-1" } as never);
    const preview = await GET(new Request(requestUrl({ format: "csv" })));
    expect(preview.status).toBe(404);
    vi.mocked(getAdminContext).mockResolvedValue({ mode: "live", userId: "admin-1" } as never);
    vi.mocked(can).mockReturnValue(false);
    const forbidden = await GET(new Request(requestUrl({ format: "csv" })));
    expect(forbidden.status).toBe(404);
    expect(vi.mocked(getCommunityExportRows)).not.toHaveBeenCalled();
  });

  it("rejects unknown formats and rate-limited callers", async () => {
    const invalid = await GET(new Request(requestUrl({ format: "xlsx" })));
    expect(invalid.status).toBe(400);
    vi.mocked(distributedRateLimit).mockResolvedValue({ allowed: false, retryAfter: 42 } as never);
    const limited = await GET(new Request(requestUrl({ format: "csv" })));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("42");
  });

  it("streams a no-store Unicode CSV honoring every filter", async () => {
    const response = await GET(new Request(requestUrl({
      format: "csv",
      category: "Startup Founder",
      search: "sample",
      city: "Coimbatore",
      industry: "Technology & Artificial Intelligence",
      stage: "Prototype / MVP",
      support: "Startup Mentorship",
      from: "2026-11-01",
      to: "2026-11-09",
    })));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const raw = new Uint8Array(await response.clone().arrayBuffer());
    expect(Array.from(raw.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const body = await response.text();
    expect(body).toContain("Élodie Founder");
    expect(body).toContain("\"Startup Mentorship; Investor / Funding Connections\"");
    expect(vi.mocked(getCommunityExportRows)).toHaveBeenCalledTimes(1);
    const filter = vi.mocked(getCommunityExportRows).mock.calls[0][0];
    expect(filter).toMatchObject({
      category: "Startup Founder",
      search: "sample",
      city: "Coimbatore",
      industry: "Technology & Artificial Intelligence",
      stage: "Prototype / MVP",
      support: "Startup Mentorship",
      from: "2026-11-01",
      to: "2026-11-09",
    });
  });

  it("streams a no-store PDF report", async () => {
    const response = await GET(new Request(requestUrl({ format: "pdf" })));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    const bytes = await response.arrayBuffer();
    expect(bytes.byteLength).toBeGreaterThan(1000);
  }, 20_000);
});
