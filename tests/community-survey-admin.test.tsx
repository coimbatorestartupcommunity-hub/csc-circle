import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { CommunityDataDashboard } from "@/app/admin/(workspace)/community-data/dashboard";
import type { CommunityDataFilter } from "@/lib/community-data/schema";
import type { CommunityMember, CommunityMemberPage } from "@/lib/community-data/service";

const fullRow: CommunityMember = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Startup Member",
  contact_number: "+91 98765 43210",
  email: "startup@example.test",
  city: "Coimbatore",
  member_category: "Startup Founder",
  business_or_idea_name: "Sample Startup",
  industry_sector: "Technology & Artificial Intelligence",
  industry_other: null,
  current_stage: "Prototype / MVP",
  description: "Building an education product.",
  support_needed: ["Startup Mentorship", "Investor / Funding Connections"],
  support_needed_other: null,
  biggest_challenge: "Finding customers.",
  website_url: "https://example.test",
  discovery_source: "CSC Event",
  discovery_source_other: null,
  preferred_contact_method: "WhatsApp",
  established_year: null,
  business_team_size: null,
  business_connections: null,
  business_connections_other: null,
  startup_team_structure: "Solo Founder",
  startup_support: ["Startup Mentorship"],
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
  description: "Legacy submission.",
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

const baseFilter: CommunityDataFilter = { sort: "newest", page: 1, pageSize: 25 };
const page: CommunityMemberPage = { rows: [fullRow, legacyRow], total: 2, page: 1, pageSize: 25 };
const summary = { total: 2, establishedBusiness: 1, startupFounder: 1, ideaStage: 0 };

function renderDashboard(filter: CommunityDataFilter = baseFilter) {
  return render(
    <CommunityDataDashboard initialFilter={filter} page={page} summary={summary} canExport />,
  );
}

beforeEach(() => {
  push.mockReset();
});

describe("community data admin dashboard", () => {
  it("keeps the four summary cards and the extended filters and columns", () => {
    renderDashboard();
    expect(screen.getByText("Total Submissions")).toBeInTheDocument();
    expect(screen.getByText("Established Businesses")).toBeInTheDocument();
    expect(screen.getByText("Startup Founders")).toBeInTheDocument();
    expect(screen.getByText("Idea Stage Members")).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toBeInTheDocument();
    expect(screen.getByLabelText("Industry")).toBeInTheDocument();
    expect(screen.getByLabelText("Stage")).toBeInTheDocument();
    expect(screen.getByLabelText("Support Needed")).toBeInTheDocument();
    expect(screen.getByLabelText("Submitted From")).toBeInTheDocument();
    expect(screen.getByLabelText("Submitted To")).toBeInTheDocument();
    const table = screen.getByRole("table");
    for (const header of ["City", "Industry", "Stage", "Support Needed"]) {
      expect(within(table).getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(within(table).getByText("Coimbatore")).toBeInTheDocument();
    expect(within(table).getAllByText("Not provided").length).toBeGreaterThan(0);
  });

  it("navigates with every active filter when applying", () => {
    renderDashboard();
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Coimbatore" } });
    fireEvent.change(screen.getByLabelText("Industry"), { target: { value: "Technology & Artificial Intelligence" } });
    fireEvent.change(screen.getByLabelText("Stage"), { target: { value: "Prototype / MVP" } });
    fireEvent.change(screen.getByLabelText("Support Needed"), { target: { value: "Startup Mentorship" } });
    fireEvent.change(screen.getByLabelText("Submitted From"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Submitted To"), { target: { value: "2026-11-09" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(push).toHaveBeenCalledTimes(1);
    const target = String(push.mock.calls[0][0]);
    expect(target).toContain("city=Coimbatore");
    expect(target).toContain("industry=Technology+%26+Artificial+Intelligence");
    expect(target).toContain("stage=Prototype+%2F+MVP");
    expect(target).toContain("support=Startup+Mentorship");
    expect(target).toContain("from=2026-11-01");
    expect(target).toContain("to=2026-11-09");
  });

  it("opens a sectioned detail drawer with history-safe fallbacks", async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Startup Member" }));
    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByText("Personal Information")).toBeInTheDocument();
    expect(within(drawer).getByText("Business Information")).toBeInTheDocument();
    expect(within(drawer).getByText("Category-Specific Information")).toBeInTheDocument();
    expect(within(drawer).getByText("Community Interests")).toBeInTheDocument();
    expect(within(drawer).getByText("Additional Information")).toBeInTheDocument();
    expect(within(drawer).getByText("Submission Information")).toBeInTheDocument();
    expect(within(drawer).getByText("Solo Founder")).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Legacy Member" }));
    const legacyDrawer = await screen.findByRole("dialog");
    expect(within(legacyDrawer).getByText("Category-Specific Information")).toBeInTheDocument();
    expect(within(legacyDrawer).getAllByText("Not provided").length).toBeGreaterThan(5);
  });

  it("keeps export links on the active filtered query", () => {
    renderDashboard({ ...baseFilter, city: "Coimbatore", industry: "Technology & Artificial Intelligence" });
    const csv = screen.getByRole("link", { name: /export csv/i });
    expect(csv.getAttribute("href")).toContain("format=csv");
    expect(csv.getAttribute("href")).toContain("city=Coimbatore");
    expect(csv.getAttribute("href")).toContain("industry=Technology+%26+Artificial+Intelligence");
  });
});
