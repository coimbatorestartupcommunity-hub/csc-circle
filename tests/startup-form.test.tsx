import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const requestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/member/request", () => ({ memberRequest: requestMock }));

import { MemberStartupForm } from "@/components/member/member-startup-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  requestMock.mockReset();
});

function fillRequired(form: HTMLFormElement) {
  const change = (name: string, value: string) => fireEvent.change(form.querySelector(`[name="${name}"]`) as Element, { target: { value } });
  change("name", "Northstar Robotics");
  change("industry", "Industrial automation");
  change("city", "Coimbatore");
  change("country", "India");
  change("description", "Building automation systems for small manufacturers.");
}

describe("MemberStartupForm", () => {
  it("requires a separate startup image and reports incomplete information", async () => {
    const { container } = render(<MemberStartupForm />);
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    expect(await screen.findByRole("alert")).toHaveTextContent(/startup name/i);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("uploads a startup-specific 4:3 image, submits it for admin review, and closes the form", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, path: "abababab-abab-4bab-8bab-abababababab/11111111-1111-4111-8111-111111111111-directory-startup.webp", previewUrl: "https://example.test/image.webp" }) });
    vi.stubGlobal("fetch", fetchMock);
    requestMock.mockResolvedValue({ ok: true, id: "startup-test-id" });
    const { container } = render(<MemberStartupForm />);
    const form = container.querySelector("form")!;
    fillRequired(form);
    fireEvent.change(document.getElementById("startup-directory-upload")!, { target: { files: [new File(["image"], "founder.png", { type: "image/png" })] } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(form.querySelector("button[type=submit]")).not.toBeDisabled());
    fireEvent.submit(form);
    await waitFor(() => expect(requestMock).toHaveBeenCalledWith("startup-save", expect.objectContaining({
      name: "Northstar Robotics",
      slug: "northstar-robotics",
      industry: "Industrial automation",
      city: "Coimbatore",
      directoryImagePath: expect.stringContaining("-directory-startup.webp"),
      consent: true,
    })));
    expect(await screen.findByText("Startup submitted")).toBeInTheDocument();
    expect(screen.getByText(/under active CSC administrator review/i)).toBeInTheDocument();
    expect(container.querySelector("form")).toBeNull();
  });

  it("shows backend errors instead of closing the form", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, path: "abababab-abab-4bab-8bab-abababababab/11111111-1111-4111-8111-111111111111-directory-startup.webp", previewUrl: "https://example.test/image.webp" }) }));
    requestMock.mockResolvedValue({ error: "You have reached the maximum of four startups." });
    const { container } = render(<MemberStartupForm />);
    const form = container.querySelector("form")!;
    fillRequired(form);
    fireEvent.change(document.getElementById("startup-directory-upload")!, { target: { files: [new File(["image"], "founder.png", { type: "image/png" })] } });
    await waitFor(() => expect(form.querySelector("button[type=submit]")).not.toBeDisabled());
    fireEvent.submit(form);
    expect(await screen.findByRole("alert")).toHaveTextContent("You have reached the maximum of four startups.");
    expect(screen.queryByText("Startup submitted")).not.toBeInTheDocument();
  });
});
