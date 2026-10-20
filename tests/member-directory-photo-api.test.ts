// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const { state } = vi.hoisted(() => ({
  state: {
    profile: { directory_photo_path: "member-a/old-directory.webp" },
    update: vi.fn(),
    upload: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("@/lib/services/member/context", () => ({
  getMemberContext: async () => ({ mode: "live", user: { id: "member-a", email: "member@example.test" } }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.profile, error: null }) }) }),
    }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ upload: state.upload, remove: state.remove }) },
    from: () => ({ update: state.update.mockReturnValue({ eq: async () => ({ error: null }) }) }),
  }),
}));

import { POST } from "@/app/api/member/directory-photo/route";

function buildRequest(file: File, origin = "https://csc.example") {
  const form = new FormData();
  form.append("image", file);
  return new Request("https://csc.example/api/member/directory-photo", { method: "POST", headers: { origin }, body: form });
}

describe("private founder directory photo endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.profile.directory_photo_path = "member-a/old-directory.webp";
    state.upload.mockResolvedValue({ error: null });
    state.remove.mockResolvedValue({ error: null });
  });

  it("saves a validated 4:3 crop without changing the 4:5 identity portrait", async () => {
    const bytes = await sharp({ create: { width: 600, height: 450, channels: 3, background: "#9bc" } }).png().toBuffer();
    const file = new File([bytes], "founder.png", { type: "image/png" });
    const response = await POST(buildRequest(file));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, url: "/api/member/portrait?variant=directory" });
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ directory_photo_path: expect.stringMatching(/^member-a\/.+-directory\.webp$/) }));
    expect(state.update.mock.calls[0][0]).toEqual({ directory_photo_path: expect.any(String) });
    expect(state.remove).toHaveBeenCalledWith(["member-a/old-directory.webp"]);
  });

  it("rejects a non-4:3 image and cross-origin upload", async () => {
    const bytes = await sharp({ create: { width: 600, height: 800, channels: 3, background: "#9bc" } }).png().toBuffer();
    const tall = new File([bytes], "portrait.png", { type: "image/png" });
    expect((await POST(buildRequest(tall))).status).toBe(422);
    expect((await POST(buildRequest(tall, "https://attacker.example"))).status).toBe(403);
    expect(state.upload).not.toHaveBeenCalled();
  });
});
