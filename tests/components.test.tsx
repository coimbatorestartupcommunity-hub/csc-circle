import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
  it("activates the authenticated submission form and removes the old disabled placeholder", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, review: null }) }));
    const { container } = render(<ReviewInvitation />);
    const submit = await screen.findByRole("button", { name: "Submit Review" });
    expect(submit).toBeEnabled();
    expect(screen.getByRole("radiogroup", { name: "Your rating" })).toBeInTheDocument();
    expect(within(container).getByLabelText(/shown publicly after administrator approval/i)).toBeInTheDocument();
    expect(screen.queryByText(/publishing activates in Phase 1/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Review submission opens with member accounts/i })).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("submits the rating, review and explicit consent to the member review endpoint", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true, review: null }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true, id: "review-1", review: { id: "review-1", rating: 5, review: "A detailed review of my experience with CSC.", moderation: "submitted" } }) });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<ReviewInvitation />);
    fireEvent.click(await within(container).findByRole("radio", { name: "5 stars" }));
    fireEvent.change(within(container).getByPlaceholderText("What has your experience with CSC Circle been like?"), { target: { value: "A detailed review of my experience with CSC." } });
    fireEvent.click(within(container).getByLabelText(/shown publicly after administrator approval/i));
    fireEvent.click(within(container).getByRole("button", { name: "Submit Review" }));
    expect(await screen.findByText(/waiting for CSC administrator review/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/member/review", expect.objectContaining({ method: "POST" }));
    vi.unstubAllGlobals();
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
    // Renders in both desktop table view and mobile card view
    expect(screen.getAllByRole("button", { name: "Approve & publish" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: "Cancel submission" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: "Unpublish" }).length).toBeGreaterThanOrEqual(1);
  });

  it("shows manual check-in only for confirmed attendees", () => {
    render(<DataTable
      rows={[
        { id: "confirmed-registration", memberName: "Ready Attendee", status: "confirmed", attendance: "not_attended" },
        { id: "checked-registration", memberName: "Arrived Attendee", status: "checked_in", attendance: "checked_in" },
      ]}
      columns={[
        { key: "memberName", header: "Attendee" },
        { key: "status", header: "Registration", type: "statusRegistration" },
        { key: "attendance", header: "Attendance", type: "badge" },
      ]}
      actions={[{
        label: "Check In",
        operation: { kind: "manual_check_in", decision: "checked_in" },
        visibleForStatuses: ["confirmed"],
      }]}
    />);

    // The eligible row is rendered once in the mobile card and once in the desktop table.
    expect(screen.getAllByRole("button", { name: "Check In" })).toHaveLength(2);
  });
});
