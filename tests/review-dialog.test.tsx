import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import * as React from "react";
import { ReviewDialog } from "@/components/reviews/review-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

describe("ReviewDialog", () => {
  it("renders trigger button and opens dialog with glassmorphism layout and 'View in My Ratings & Reviews' link", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, review: null }),
      }),
    );

    const { container } = render(
      <ReviewDialog type="general" buttonLabel="Rate & Review CSC Circle" variant="glass" />,
    );

    const trigger = screen.getByRole("button", { name: /Rate & Review CSC Circle/i });
    expect(trigger).toBeInTheDocument();
    fireEvent.click(trigger);

    // Dialog content should open
    expect(await screen.findByRole("heading", { name: "Ratings & Review" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Rating" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Feedback & Comments/i)).toBeInTheDocument();

    // Check for "View in My Ratings & Reviews" link at the bottom
    const reviewsLink = screen.getByRole("link", { name: /View in My Ratings & Reviews/i });
    expect(reviewsLink).toBeInTheDocument();
    expect(reviewsLink).toHaveAttribute("href", "/member/reviews");

    vi.unstubAllGlobals();
  });

  it("submits the rating, review and explicit consent, and displays submitted result", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, review: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          id: "review-test-1",
          review: {
            id: "review-test-1",
            rating: 5,
            review: "Fantastic community and founder discussions! Highly recommended.",
            moderation: "submitted",
          },
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <ReviewDialog
        type="event"
        eventId="11111111-1111-4111-8111-111111111111"
        eventTitle="Demo Connect"
        buttonLabel="Ratings and Review"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ratings and Review" }));

    expect(await screen.findByRole("heading", { name: "Ratings & Review" })).toBeInTheDocument();

    // Pick 5 stars
    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));

    // Type feedback
    fireEvent.change(screen.getByLabelText(/Your Feedback & Comments/i), {
      target: { value: "Fantastic community and founder discussions! Highly recommended." },
    });

    // Check consent
    const consent = screen.getByLabelText(/I agree to share this review publicly/i);
    if (!(consent as HTMLInputElement).checked) {
      fireEvent.click(consent);
    }

    // Submit
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    // Should transition to Review Submitted view
    expect(await screen.findByRole("heading", { name: "Review Submitted" })).toBeInTheDocument();
    expect(screen.getByText(/5 out of 5 stars/i)).toBeInTheDocument();
    expect(screen.getByText(/Fantastic community and founder discussions/i)).toBeInTheDocument();

    // Bottom link still present
    expect(screen.getByRole("link", { name: /View in My Ratings & Reviews/i })).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
