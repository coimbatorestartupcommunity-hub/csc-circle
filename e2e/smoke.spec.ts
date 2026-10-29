import { test, expect } from "@playwright/test";

for (const route of ["/member/profile", "/member/startups", "/member/resume", "/admin", "/admin/startups", "/admin/invitations", "/admin/roles", "/auth/success", "/events"]) {
  test(`${route} requires a verified session`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?/);
    await expect(page.getByRole("heading", { name: "Welcome to CSC Circle" })).toBeVisible();
    await expect(page.locator("footer")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

for (const route of ["/", "/about", "/directory", "/collaborations", "/members", "/admin/accept-invitation"]) {
  test(`${route} is available without an authenticated session`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page).not.toHaveURL(/\/login\?/);
    await expect(page.getByRole("button", { name: /^Notifications(?:, \d+ unread)?$/ })).toHaveCount(0);
  });
}

test("legal policy pages remain available to visitors from the auth disclosure", async ({ page }) => {
  for (const [route, heading] of [["/privacy", /privacy/i], ["/terms", /terms/i], ["/security", /security/i]] as const) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
});

test("login is a compact centered auth experience without the marketing shell", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome to CSC Circle" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue with Google/ })).toBeVisible();
  await expect(page.locator("header, footer")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("social previews use the homepage screenshot banner", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
  const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute("content");
  expect(ogImage).toContain("/brand/csc-homepage-banner.png");
  expect(twitterImage).toContain("/brand/csc-homepage-banner.png");
  const imageResponse = await request.get("/brand/csc-homepage-banner.png");
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()["content-type"]).toContain("image/png");
});

test("OAuth callback leaves the PKCE verifier cookie untouched", async ({ request }) => {
  const verifierCookie = "csc-test-auth-token-flow-abcdef123456-code-verifier=pending-verifier";
  const response = await request.get("/auth/callback?next=%2Fmember%2Fprofile", {
    headers: { cookie: verifierCookie },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  const setCookie = response.headers()["set-cookie"] ?? "";
  expect(setCookie).not.toMatch(/code-verifier=.*(?:Max-Age=0|1970)/i);
});

test("password visibility and signup validation", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill("Test Member");
  await page.getByLabel("Email", { exact: true }).fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("weak");
  await page.getByLabel("Confirm password", { exact: true }).fill("different");
  await page.getByRole("button", { name: "Show password" }).first().click();
  await expect(page.locator("#su-password")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("Use at least 12 characters.")).toBeVisible();
});

test("unauthorized admin APIs and recovery are denied", async ({ request }) => {
  for (const route of ["actions", "events", "check-in", "collaborations", "collaboration-organizations", "invitations", "roles"]) {
    const response = await request.post(`/api/admin/${route}`, { data: {} });
    expect(response.status()).toBe(403);
  }
  const response = await request.get("/api/auth/recovery-status");
  expect(await response.json()).toEqual({ ok: false });
  const attendanceExport = await request.get("/api/admin/attendance/export");
  expect(attendanceExport.status()).toBe(403);
  const eventSurfaces = await request.post("/api/admin/events/00000000-0000-4000-8000-000000000001/publish-surfaces", { data: { publicationConsent: true } });
  expect(eventSurfaces.status()).toBe(403);
});

for (const width of [320, 360, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920]) {
  test(`login experience stays within the ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome to CSC Circle" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
