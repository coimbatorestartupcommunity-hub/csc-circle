import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

vi.mock("@/app/survey/member-onboarding/actions", () => ({ submitMemberSurvey: vi.fn() }));

import { submitMemberSurvey } from "@/app/survey/member-onboarding/actions";
import { SurveyForm } from "@/app/survey/member-onboarding/survey-form";

const mockedSubmit = vi.mocked(submitMemberSurvey);

function fillCommon(category: string) {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Switch Tester" } });
  fireEvent.change(screen.getByLabelText(/contact number/i), { target: { value: "+91 98765 43210" } });
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "tester@example.test" } });
  fireEvent.change(screen.getByLabelText(/city \/ location/i), { target: { value: "Coimbatore" } });
  fireEvent.change(screen.getByLabelText(/which category best describes you/i), { target: { value: category } });
  fireEvent.change(screen.getByLabelText(/business, startup, or idea name/i), { target: { value: "Test Venture" } });
  fireEvent.change(screen.getByLabelText(/which industry or sector are you involved in/i), { target: { value: "Manufacturing" } });
  fireEvent.change(screen.getByLabelText(/tell us about your business or idea/i), {
    target: { value: "A sufficiently detailed description of the test venture and its goals." },
  });
}

function supportGroup() {
  return screen.getByRole("group", { name: /what support are you looking for from csc circle/i });
}

function stageField() {
  return screen.getByLabelText(/what is your current (business|startup) stage|have you started developing your idea/i);
}

beforeEach(() => {
  mockedSubmit.mockReset();
  mockedSubmit.mockResolvedValue({ ok: true });
  Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
  const cryptoValue = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoValue && !cryptoValue.randomUUID) {
    Object.defineProperty(cryptoValue, "randomUUID", { value: () => "00000000-0000-4000-8000-000000000000" });
  }
});

describe("member survey category experience", () => {
  it("highlights the brief-overview note in the description block", () => {
    render(<SurveyForm />);
    const note = screen.getByText("A brief overview of your idea is enough.");
    expect(note.closest('[role="note"]')).not.toBeNull();
    expect(screen.getByLabelText(/tell us about your business or idea/i)).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("description-note"),
    );
  });

  it("starts with no preselected category and a guidance hint", () => {
    render(<SurveyForm />);
    expect(screen.getByLabelText(/which category best describes you/i)).toHaveValue("");
    expect(screen.getByText(/select your member category to view questions/i)).toBeInTheDocument();
    expect(screen.queryByText("Tell Us More About Your Business")).not.toBeInTheDocument();
    expect(screen.queryByText("Tell Us More About Your Startup")).not.toBeInTheDocument();
    expect(screen.queryByText("Tell Us More About Your Idea")).not.toBeInTheDocument();
  });

  it("shows the established business block with adaptive stages and submits its values", async () => {
    render(<SurveyForm />);
    fillCommon("Established Business");
    expect(screen.getByText("Tell Us More About Your Business")).toBeInTheDocument();
    expect(screen.getByLabelText(/what is your current business stage/i)).toBeInTheDocument();
    const stage = stageField();
    expect(within(stage as HTMLElement).getByRole("option", { name: "Scaling to New Markets" })).toBeInTheDocument();
    expect(within(stage as HTMLElement).queryByRole("option", { name: "Building a Prototype" })).not.toBeInTheDocument();
    fireEvent.change(stage, { target: { value: "Scaling to New Markets" } });
    fireEvent.change(screen.getByLabelText(/in which year was your business established/i), { target: { value: "2019" } });
    fireEvent.change(screen.getByLabelText(/how many people are currently working in your business/i), { target: { value: "1–5 Employees" } });
    const connections = screen.getByRole("group", { name: /what type of business connections/i });
    fireEvent.click(within(connections).getByRole("checkbox", { name: "Investors" }));
    fireEvent.click(within(supportGroup()).getByRole("checkbox", { name: "Startup Mentorship" }));
    fireEvent.change(screen.getByLabelText("Website"), { target: { value: "example.com" } });
    fireEvent.change(screen.getByLabelText("LinkedIn"), { target: { value: "linkedin.com/in/example" } });
    fireEvent.change(screen.getByLabelText("Portfolio"), { target: { value: "example.com/work" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /i understand that coimbatore/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Information" }));
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledTimes(1));
    const payload = mockedSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      member_category: "Established Business",
      current_stage: "Scaling to New Markets",
      established_year: 2019,
      business_team_size: "1–5 Employees",
      business_connections: ["Investors"],
      full_name: "Switch Tester",
      website_url: "https://example.com",
      linkedin_url: "https://linkedin.com/in/example",
      portfolio_url: "https://example.com/work",
    });
    expect(payload.startup_team_structure).toBeUndefined();
    expect(payload.seeking_cofounder).toBeUndefined();
    expect(screen.getByText(/thank you! your information has been submitted successfully/i)).toBeInTheDocument();
  });

  it("shows the startup block with startup-only stages", () => {
    render(<SurveyForm />);
    fillCommon("Startup Founder");
    expect(screen.getByText("Tell Us More About Your Startup")).toBeInTheDocument();
    expect(screen.getByLabelText(/what is your current startup stage/i)).toBeInTheDocument();
    const stage = stageField();
    expect(within(stage as HTMLElement).getByRole("option", { name: "Prototype / MVP" })).toBeInTheDocument();
    expect(within(stage as HTMLElement).queryByRole("option", { name: "Scaling to New Markets" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/do you currently have a startup team/i), { target: { value: "Solo Founder" } });
    expect(screen.getByLabelText(/what are you currently working on/i)).toBeInTheDocument();
  });

  it("shows the idea block with idea-only stages", () => {
    render(<SurveyForm />);
    fillCommon("Idea Stage");
    expect(screen.getByText("Tell Us More About Your Idea")).toBeInTheDocument();
    expect(screen.getByLabelText(/have you started developing your idea/i)).toBeInTheDocument();
    const stage = stageField();
    expect(within(stage as HTMLElement).getByRole("option", { name: "Building a Prototype" })).toBeInTheDocument();
    expect(within(stage as HTMLElement).queryByRole("option", { name: "Prototype / MVP" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/what problem are you hoping to solve/i)).toBeInTheDocument();
  });

  it("reveals and requires the industry specification only for Other", async () => {
    render(<SurveyForm />);
    fillCommon("Startup Founder");
    fireEvent.change(screen.getByLabelText(/which industry or sector are you involved in/i), { target: { value: "Other" } });
    const other = screen.getByLabelText(/please specify your industry/i);
    expect(other).toBeInTheDocument();
    fireEvent.change(stageField(), { target: { value: "Launched" } });
    fireEvent.click(within(supportGroup()).getByRole("checkbox", { name: "Startup Mentorship" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /i understand that coimbatore/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Information" }));
    expect(await screen.findByText("Please specify your industry.")).toBeInTheDocument();
    expect(mockedSubmit).not.toHaveBeenCalled();
    fireEvent.change(other, { target: { value: "Drone logistics" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Information" }));
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledTimes(1));
  });

  it("rejects invalid LinkedIn and portfolio URLs", async () => {
    render(<SurveyForm />);
    fillCommon("Startup Founder");
    fireEvent.change(stageField(), { target: { value: "Launched" } });
    fireEvent.change(screen.getByLabelText("LinkedIn"), { target: { value: "not a url" } });
    fireEvent.click(within(supportGroup()).getByRole("checkbox", { name: "Startup Mentorship" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /i understand that coimbatore/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Information" }));
    expect(await screen.findByText(/valid LinkedIn URL/)).toBeInTheDocument();
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it("requires at least one support option", async () => {
    render(<SurveyForm />);
    fillCommon("Idea Stage");
    fireEvent.change(stageField(), { target: { value: "Researching" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /i understand that coimbatore/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Information" }));
    expect(await screen.findByText("Select at least one area where you need support.")).toBeInTheDocument();
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it("clears stale category data and the stage on switch while preserving common fields", async () => {
    render(<SurveyForm />);
    fillCommon("Established Business");
    fireEvent.change(stageField(), { target: { value: "Scaling to New Markets" } });
    fireEvent.change(screen.getByLabelText(/in which year was your business established/i), { target: { value: "2019" } });
    fireEvent.change(screen.getByLabelText(/how many people are currently working in your business/i), { target: { value: "1–5 Employees" } });
    fireEvent.click(within(screen.getByRole("group", { name: /what type of business connections/i })).getByRole("checkbox", { name: "Investors" }));

    fireEvent.change(screen.getByLabelText(/which category best describes you/i), { target: { value: "Idea Stage" } });
    expect(screen.queryByText("Tell Us More About Your Business")).not.toBeInTheDocument();
    expect(screen.getByText("Tell Us More About Your Idea")).toBeInTheDocument();
    expect(stageField()).toHaveValue("");
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Switch Tester");
    expect(screen.getByLabelText(/tell us about your business or idea/i)).toHaveValue(
      "A sufficiently detailed description of the test venture and its goals.",
    );

    fireEvent.change(stageField(), { target: { value: "Validating the Idea" } });
    fireEvent.change(screen.getByLabelText(/are you looking for a co-founder or team/i), { target: { value: "Yes, Actively Looking" } });
    fireEvent.click(within(screen.getByRole("group", { name: /what would help you move forward with your idea/i })).getByRole("checkbox", { name: "Startup Mentorship" }));
    fireEvent.click(within(supportGroup()).getByRole("checkbox", { name: "Professional Networking" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /i understand that coimbatore/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Information" }));
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledTimes(1));
    const payload = mockedSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      member_category: "Idea Stage",
      current_stage: "Validating the Idea",
      seeking_cofounder: "Yes, Actively Looking",
      full_name: "Switch Tester",
    });
    expect(payload.established_year).toBeUndefined();
    expect(payload.business_team_size).toBeUndefined();
    expect(payload.business_connections).toBeUndefined();
    expect(payload.startup_team_structure).toBeUndefined();
  });
});
