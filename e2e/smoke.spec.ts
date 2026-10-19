import { test, expect } from "@playwright/test";
for (const route of ["/", "/about", "/directory", "/events", "/login", "/signup", "/forgot-password", "/reset-password"]) {
  test(`${route} renders CSC branding and stays within a mobile viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page).not.toHaveTitle(/Create Next App/);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
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
  for (const route of ["actions", "events", "check-in"]) {
    const response = await request.post(`/api/admin/${route}`, { data: {} });
    expect(response.status()).toBe(403);
  }
  const response = await request.get("/api/auth/recovery-status");
  expect(await response.json()).toEqual({ ok: false });
});
test("production-mode pages never display demo private records", async ({ page }) => {
  for (const route of ["/member", "/admin", "/admin/members", "/admin/payments"]) {
    await page.goto(route);
    await expect(page.getByText("Demo Super Admin", { exact: true })).toHaveCount(0);
    await expect(page.getByText("DEMO admin preview", { exact: false })).toHaveCount(0);
  }
});
