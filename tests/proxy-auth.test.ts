// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));

import { proxy } from "@/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

function configureLocalAuth() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "local-test-publishable-key");
}

it("redirects a request without a session cookie without initializing Supabase Auth", async () => {
  configureLocalAuth();
  const response = await proxy(new NextRequest("http://localhost/admin/members?tab=pending"));

  expect(response.status).toBe(307);
  expect(new URL(response.headers.get("location")!).searchParams.get("next")).toBe("/admin/members?tab=pending");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.createServerClient).not.toHaveBeenCalled();
});

it("keeps auth-public pages available without initializing Supabase Auth", async () => {
  configureLocalAuth();
  const response = await proxy(new NextRequest("http://localhost/login"));

  expect(response.status).toBe(200);
  expect(mocks.createServerClient).not.toHaveBeenCalled();
});

it.each(["/", "/about", "/events", "/events/synthetic-event", "/directory", "/members", "/members/synthetic-profile", "/collaborations"]) (
  "keeps public marketing route %s available without a session",
  async (path) => {
    configureLocalAuth();
    const response = await proxy(new NextRequest(`http://localhost${path}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("location")).toBeNull();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  },
);

it("keeps the administrator invitation acceptance page public so email tokens survive the initial navigation", async () => {
  configureLocalAuth();
  const response = await proxy(new NextRequest("http://localhost/admin/accept-invitation#token=synthetic-invitation-token"));

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("location")).toBeNull();
  expect(mocks.createServerClient).not.toHaveBeenCalled();
});

it("verifies requests carrying a Supabase session cookie", async () => {
  configureLocalAuth();
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "synthetic-user-id" } }, error: null });
  mocks.createServerClient.mockReturnValue({ auth: { getClaims: mocks.getClaims } });
  const request = new NextRequest("http://localhost/member/profile");
  request.cookies.set("sb-mmsrtfktwcrbyrucjmzo-auth-token.0", "base64-eyJhbGciOiJIUzI1NiJ9");
  request.cookies.set("sb-mmsrtfktwcrbyrucjmzo-auth-token.1", "synthetic-session-cookie-chunk");

  const response = await proxy(request);

  expect(response.status).toBe(200);
  expect(mocks.createServerClient).toHaveBeenCalledTimes(1);
  expect(mocks.getClaims).toHaveBeenCalledTimes(1);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});

it("verifies an existing session before allowing auth callback or logout handlers", async () => {
  configureLocalAuth();
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "synthetic-user-id" } }, error: null });
  mocks.createServerClient.mockReturnValue({ auth: { getClaims: mocks.getClaims } });

  const callbackRequest = new NextRequest("http://localhost/auth/callback?code=synthetic-code");
  callbackRequest.cookies.set("sb-mmsrtfktwcrbyrucjmzo-auth-token.0", "synthetic-session-cookie");
  await proxy(callbackRequest);

  const logoutRequest = new NextRequest("http://localhost/auth/signout", { method: "POST" });
  logoutRequest.cookies.set("sb-mmsrtfktwcrbyrucjmzo-auth-token", "synthetic-session-cookie");
  await proxy(logoutRequest);

  expect(mocks.createServerClient).toHaveBeenCalledTimes(2);
  expect(mocks.getClaims).toHaveBeenCalledTimes(2);
});

it("keeps refreshed Supabase session cookies on the response", async () => {
  configureLocalAuth();
  mocks.getClaims.mockImplementation(async () => {
    const options = mocks.createServerClient.mock.calls[0]?.[2] as {
      cookies: { setAll: (cookies: { name: string; value: string; options?: { httpOnly?: boolean; path?: string } }[]) => void };
    };
    options.cookies.setAll([{ name: "sb-mmsrtfktwcrbyrucjmzo-auth-token.0", value: "rotated-session", options: { httpOnly: true, path: "/" } }]);
    return { data: { claims: { sub: "synthetic-user-id" } }, error: null };
  });
  mocks.createServerClient.mockReturnValue({ auth: { getClaims: mocks.getClaims } });

  const request = new NextRequest("http://localhost/member/profile");
  request.cookies.set("sb-mmsrtfktwcrbyrucjmzo-auth-token.0", "expired-session");
  const response = await proxy(request);

  expect(response.cookies.get("sb-mmsrtfktwcrbyrucjmzo-auth-token.0")?.value).toBe("rotated-session");
});

it("still verifies and refreshes session cookies on private-route prefetches", async () => {
  configureLocalAuth();
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "synthetic-user-id" } }, error: null });
  mocks.createServerClient.mockReturnValue({ auth: { getClaims: mocks.getClaims } });
  const request = new NextRequest("http://localhost/admin/members", {
    headers: { "next-router-prefetch": "1" },
  });
  request.cookies.set("sb-local-auth-token.0", "synthetic-session-cookie-chunk");

  const response = await proxy(request);

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.createServerClient).toHaveBeenCalledTimes(1);
  expect(mocks.getClaims).toHaveBeenCalledTimes(1);
});
