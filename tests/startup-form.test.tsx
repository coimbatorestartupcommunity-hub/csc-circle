import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const requestMock = vi.hoisted(() => vi.fn());
const successMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/member/request", () => ({ memberRequest: requestMock }));
vi.mock("@/lib/ui/submission-feedback", () => ({ notifySubmissionSuccess: successMock }));

import { StartupForm } from "@/components/member/startup-form";

afterEach(() => {
  cleanup();
  requestMock.mockReset();
  successMock.mockReset();
});

describe("StartupForm", () => {
  it("shows validation feedback instead of silently ignoring an incomplete submission", async () => {
    const { container } = render(<StartupForm />);
    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByText("Please complete the highlighted fields before submitting.")).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("generates the directory slug and submits a complete startup for review", async () => {
    requestMock.mockResolvedValue({ ok: true, id: "startup-test-id" });
    const { container } = render(<StartupForm />);
    const input = (id: string) => document.getElementById(id)!;

    fireEvent.change(input("startup-name"), { target: { value: "Logic Labs" } });
    fireEvent.change(input("startup-industry"), { target: { value: "Climate technology" } });
    fireEvent.change(input("startup-description"), { target: { value: "We build software to help local businesses reduce energy use." } });
    fireEvent.click(container.querySelector('input[type="checkbox"]')!);
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(requestMock).toHaveBeenCalledWith("startup", {
      name: "Logic Labs",
      slug: "logic-labs",
      industry: "Climate technology",
      description: "We build software to help local businesses reduce energy use.",
      website: "",
      consent: true,
    }));
    expect(await screen.findByText(/awaiting CSC administrator review/i)).toBeInTheDocument();
    expect(successMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Successfully submitted", reference: "startup-test-id" }));
  });

  it("displays backend errors to the member", async () => {
    requestMock.mockResolvedValue({ error: "The directory slug is already in use." });
    const { container } = render(<StartupForm />);
    fireEvent.change(document.getElementById("startup-name")!, { target: { value: "Logic Labs" } });
    fireEvent.change(document.getElementById("startup-industry")!, { target: { value: "Climate technology" } });
    fireEvent.change(document.getElementById("startup-description")!, { target: { value: "We build software to help local businesses reduce energy use." } });
    fireEvent.click(container.querySelector('input[type="checkbox"]')!);
    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("The directory slug is already in use.");
  });
});
