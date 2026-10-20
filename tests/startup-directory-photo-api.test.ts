// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = vi.hoisted(() => ({
  startup: "123e4567-e89b-42d3-a456-426614174000",
  owner: "123e4567-e89b-42d3-a456-426614174001",
}));
const state = vi.hoisted(() => ({
  startup: { id: ids.startup, user_id: ids.owner, directory_image_path: `${ids.owner}/${ids.startup}-directory-startup.webp` },
  profile: { display_name: "Founder", consent: { directoryParticipation: true, displayNamePublicly: true, displayPhotoPublicly: false }, directory_photo_path: `${ids.owner}/member-directory.webp` },
  download: vi.fn(),
}));

vi.mock("@/lib/supabase/anon", () => ({
  createAnonClient: () => ({
    from: () => {
      const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { id: ids.startup }, error: null }) };
      return query;
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  from: (table: string) => {
    const data = table === "directory_startups" ? state.startup : state.profile;
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data, error: null }) };
    return query;
  },
  storage: { from: () => ({ download: state.download }) },
}) }));

import { GET } from "@/app/api/directory/startups/[startupId]/photo/route";

describe("published startup directory photograph endpoint", () => {
  beforeEach(() => {
    state.startup.directory_image_path = `${ids.owner}/${ids.startup}-directory-startup.webp`;
    state.download.mockReset().mockResolvedValue({ data: new Blob(["webp"]), error: null });
  });

  it("serves the startup-specific approved media object", async () => {
    const response = await GET(new Request("https://csc.example/image"), { params: Promise.resolve({ startupId: ids.startup }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(state.download).toHaveBeenCalledWith(`${ids.owner}/${ids.startup}-directory-startup.webp`);
  });

  it("never substitutes a member directory portrait when the startup image reference is missing", async () => {
    state.startup.directory_image_path = null as unknown as string;
    const response = await GET(new Request("https://csc.example/image"), { params: Promise.resolve({ startupId: ids.startup }) });
    expect(response.status).toBe(404);
    expect(state.download).not.toHaveBeenCalled();
  });
});
