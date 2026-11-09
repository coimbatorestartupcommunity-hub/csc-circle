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
  fireEvent.change(screen.getByLabelText(/^city/i), { target: { value: "Coimbatore" } });
  fireEvent.change(screen.getByLabelText(/which category best describes you/i), { target: { value: category } });
  fireEvent.change(screen.getByLabelText(/business, startup, or idea name/i), { target: { value: "Test Venture" } });
  fireEvent.change(screen.getByLabelText(/industry sector/i), { target: { value: "Manufacturing" } });
  fireEvent.change(screen.getByLabelText(/tell us about your business or idea/i), {
    target: { value: "A sufficiently detailed description of the test venture and its goals." },
  });
}

function supportGroup() {
  return screen.getByRole("group", { name: /what kind of support do you need from csc/i });
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
  it("starts with no preselected category and a guidance hint", () => {
    render(<SurveyForm />);
    expect(screen.getByLabelText(/which category best describes you/i)).toHaveValue("");
    expect(screen.getByText(/select a category in step 2/i)).toBeInTheDocument();
    expect(screen.queryByText("Established Business Details")).not.toBeInTheDocument();
    expect(screen.queryByText("Startup Details")).not.toBeInTheDocument();
    expect(screen.queryByText("Idea Stage Details")).not.toBeInTheDocument();
  });

  it("shows the established business block with adaptive stages and submits its values", async () => {
    render(<SurveyForm />);
    fillCommon("Established Business");
    expect(screen.getByText("Established Business Details")).toBeInTheDocument();
    const stage = screen.getByLabelText(/current stage/i);
    expect(within(stage as HTMLElement).getByRole("option", { name: "Scaling to New Markets" })).toBeInTheDocument();
    expect(within(stage as HTMLElement).queryByRole("option", { name: "Building a Prototype" })).not.toBeInTheDocument();
    fireEvent.change(stage, { target: { value: "Scaling to New Markets" } });
    fireEvent.change(screen.getByLabelText(/year of establishment/i), { target: { value: "2019" } });
    fireEvent.click(within(screen.getByRole("group", { name: "Business Team Size" })).getByRole("radio", { name: "2-5" }));
    const connections = screen.getByRole("group", { name: /what business connections/i });
    fireEvent.click(within(connections).getByRole("checkbox", { name: "Investors" }));
    fireEvent.click(within(supportGroup()).getByRole("checkbox", { name: "Mentorship" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /i understand that coimbatore/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Information" }));
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledTimes(1));
    const payload = mockedSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      member_category: "Established Business",
      current_stage: "Scaling to New Markets",
      established_year: 2019,
      business_team_size: "2-5",
      business_connections: ["Investors"],
      full_name: "Switch Tester",
    });
    expect(payload.startup_team_structure).toBeUndefined();
    expect(payload.seeking_cofounder).toBeUndefined();
    expect(screen.getByText(/thank you! your information has been submitted successfully/i)).toBeInTheDocument();
  });

  it("shows the startup block with startup-only stages", () => {
    render(<SurveyForm />);
    fillCommon("Startup Founder");
    expect(screen.getByText("Startup Details")).toBeInTheDocument();
    const stage = screen.getByLabelText(/current stage/i);
    expect(within(stage as HTMLElement).getByRole("option", { name: "Prototype / MVP" })).toBeInTheDocument();
    expect(within(stage as HTMLElement).queryByRole("option", { name: "Scaling to New Markets" })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("group", { name: "Startup Team Structure" })).getByRole("radio", { name: "Solo Founder" }));
    expect(screen.getByLabelText(/what is your startup focused on right now/i)).toBeInTheDocument();
  });

  it("shows the idea block with idea-only stages", () => {
    render(<SurveyForm />);
    fillCommon("Idea Stage");
    expect(screen.getByText("Idea Stage Details")).toBeInTheDocument();
    const stage = screen.getByLabelText(/current stage/i);
    expect(within(stage as HTMLElement).getByRole("option", { name: "Building a Prototype" })).toBeInTheDocument();
    expect(within(stage as HTMLElement).queryByRole("option", { name: "Prototype / MVP" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/what problem does your idea solve/i)).toBeInTheDocument();
  });

  it("reveals and requires the industry specification only for Other", async () => {
    render(<SurveyForm />);
    fillCommon("Startup Founder");
    fireEvent.change(screen.getByLabelText(/industry sector/i), { target: { value: "Other" } });
    const other = screen.getByLabelText(/please specify your industry/i);
    expect(other).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/current stage/i), { target: { value: "Launched" } });
    fireEvent.click(within(supportGroup()).getByRole("checkbox", { name: "Mentorship" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /i understand that coimbatore/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Information" }));
    expect(await screen.findByText("Please specify your industry.")).toBeInTheDocument();
    expect(mockedSubmit).not.toHaveBeenCalled();
    fireEvent.change(other, { target: { value: "Drone logistics" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Information" }));
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledTimes(1));
  });

  it("requires at least one support option", async () => {
    render(<SurveyForm />);
    fillCommon("Idea Stage");
    fireEvent.change(screen.getByLabelText(/current stage/i), { target: { value: "Researching" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /i understand that coimbatore/i }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Information" }));
    expect(await screen.findByText("Select at least one area where you need support.")).toBeInTheDocument();
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it("clears stale category data and the stage on switch while preserving common fields", async () => {
    render(<SurveyForm />);
    fillCommon("Established Business");
    fireEvent.change(screen.getByLabelText(/current stage/i), { target: { value: "Scaling to New Markets" } });
    fireEvent.change(screen.getByLabelText(/year of establishment/i), { target: { value: "2019" } });
    fireEvent.click(within(screen.getByRole("group", { name: "Business Team Size" })).getByRole("radio", { name: "2-5" }));
    fireEvent.click(within(screen.getByRole("group", { name: /what business connections/i })).getByRole("checkbox", { name: "Investors" }));

    fireEvent.change(screen.getByLabelText(/which category best describes you/i), { target: { value: "Idea Stage" } });
    expect(screen.queryByText("Established Business Details")).not.toBeInTheDocument();
    expect(screen.getByText("Idea Stage Details")).toBeInTheDocument();
    expect(screen.getByLabelText(/current stage/i)).toHaveValue("");
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Switch Tester");
    expect(screen.getByLabelText(/tell us about your business or idea/i)).toHaveValue(
      "A sufficiently detailed description of the test venture and its goals.",
    );

    fireEvent.change(screen.getByLabelText(/current stage/i), { target: { value: "Validating the Idea" } });
    fireEvent.click(within(screen.getByRole("group", { name: /are you looking for a co-founder/i })).getByRole("radio", { name: "Yes, Actively Looking" }));
    fireEvent.click(within(screen.getByRole("group", { name: /what support would help you develop your idea/i })).getByRole("checkbox", { name: "Mentorship" }));
    fireEvent.click(within(supportGroup()).getByRole("checkbox", { name: "Networking Opportunities" }));
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
