import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));

import { ContentEditor } from "@/components/admin/content-editor";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refreshMock.mockReset();
});

describe("ContentEditor", () => {
  it("saves a draft and then publishes it to the homepage", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, published: false }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, published: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<ContentEditor isDemo={false} initialContent={[]} />);
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "Founder meetup registration is open." } });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Draft saved/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish Content" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Publish Content" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ content_key: "homepage.announcement", publish: false });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ content_key: "homepage.announcement", publish: true });
    expect(await screen.findByText(/now visible on the homepage/i)).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });

  it("loads the saved section and reports API errors instead of claiming success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Your administrator account does not have permission to manage website content." }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<ContentEditor isDemo={false} initialContent={[{ key: "homepage.announcement", label: "Homepage announcement", value: "Existing announcement", status: "draft", updatedAt: "2026-10-20T00:00:00Z" }]} />);
    expect(screen.getByLabelText("Text")).toHaveValue("Existing announcement");
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "Updated announcement" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish Content" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/does not have permission/i);
  });
});
