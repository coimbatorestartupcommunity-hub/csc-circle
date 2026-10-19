import { afterEach, it, expect, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ getAuthUser: async () => null, createClient: vi.fn() }));
import { getAdminContext } from "@/lib/admin/gate";
import { isMemberPreviewEnabled } from "@/lib/services/member/gate";
afterEach(() => vi.unstubAllEnvs());
it("production flags cannot activate demo member or administrator authority", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("MEMBER_PORTAL_PREVIEW", "true"); vi.stubEnv("ADMIN_PORTAL_PREVIEW", "true");
  expect(isMemberPreviewEnabled()).toBe(false);
  const ctx = await getAdminContext(); expect(ctx.mode).toBe("closed"); expect(ctx.permissions.size).toBe(0);
});
