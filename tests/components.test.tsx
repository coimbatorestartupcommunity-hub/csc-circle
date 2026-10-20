import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RatingStars } from "@/components/testimonials/rating-stars";
import { StatusBadge } from "@/components/member/status-badge";
import { ReviewInvitation } from "@/components/testimonials/review-invitation";
import { ActionButton } from "@/components/admin/action-button";
import { DataTable } from "@/components/admin/data-table";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("RatingStars", () => {
  it("renders the two-decimal value and an accessible label", () => {
    render(<RatingStars rating={5} />);
    expect(screen.getByText("5.00")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Rated 5.00 out of 5/i })).toBeInTheDocument();
  });

  it("can hide the numeric value", () => {
    render(<RatingStars rating={4} showValue={false} />);
    expect(screen.queryByText("4.00")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Rated 4.00 out of 5/i })).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("renders its label", () => {
    render(<StatusBadge label="Active member" tone="bg-green-100 text-green-700" />);
    expect(screen.getByText("Active member")).toBeInTheDocument();
  });
});

describe("ReviewInvitation", () => {
  it("keeps both review actions in a centered, width-constrained card column", () => {
    render(<ReviewInvitation />);
    const actions = screen.getByTestId("review-invitation-actions");
    expect(actions).toHaveClass("w-full", "max-w-md", "min-w-0", "items-stretch");
    expect(screen.getByRole("button", { name: "Check my review" })).toHaveClass("w-full", "whitespace-normal");
    expect(screen.getByRole("button", { name: /Review submission opens with member accounts/ })).toHaveClass("w-full", "whitespace-normal");
  });
});

describe("membership approval dialog", () => {
  it("shows submitted details in the wide, non-scrolling free-card approval layout", () => {
    render(<ActionButton
      label="Approve"
      operation={{ kind: "claim", target: "abababab-abab-4bab-8bab-abababababab", decision: "active" }}
      details={{ applicantName: "Vikash Saravanan", email: "vikash@example.test", applicantType: "new_applicant" }}
    />);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(screen.getByText(/Membership cards are free.*no payment is required/i)).toBeInTheDocument();
    expect(screen.getByText("Vikash Saravanan")).toBeInTheDocument();
    expect(screen.getByText("vikash@example.test")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("max-w-5xl", "sm:max-w-5xl", "overflow-hidden");
    expect(dialog).not.toHaveClass("overflow-y-auto");
  });
});

describe("admin review table actions", () => {
  it("shows the startup decision controls for pending rows and unpublish only for published rows", () => {
    render(<DataTable
      rows={[{ id: "pending-id", name: "Pending startup", status: "pending" }, { id: "published-id", name: "Live startup", status: "published" }]}
      columns={[{ key: "name", header: "Startup" }, { key: "status", header: "Status" }]}
      actions={[
        { label: "Approve & publish", operation: { kind: "startup", decision: "published" }, visibleForStatuses: ["pending"] },
        { label: "Cancel submission", operation: { kind: "startup", decision: "archived" }, visibleForStatuses: ["pending"] },
        { label: "Unpublish", operation: { kind: "startup", decision: "archived" }, visibleForStatuses: ["published"] },
      ]}
    />);
    expect(screen.getAllByRole("button", { name: "Approve & publish" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Cancel submission" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Unpublish" })).toHaveLength(1);
  });
});
