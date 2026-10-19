import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RatingStars } from "@/components/testimonials/rating-stars";
import { StatusBadge } from "@/components/member/status-badge";

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
