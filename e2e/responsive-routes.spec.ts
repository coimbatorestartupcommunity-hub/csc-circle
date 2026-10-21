import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

type Account = { email: string; password: string };
type FixtureFile = { accounts: Record<string, Account> };
const fixturePath = process.env.CSC_E2E_USERS_FILE;
const fixtures: FixtureFile | null = fixturePath
  ? JSON.parse(readFileSync(fixturePath, "utf8")) as FixtureFile
  : null;
const viewports = [320, 390, 768, 1024, 1440];

async function signIn(page: Page, account: Account, next: string, ip: string) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?.*)?$`));
}

async function checkViewport(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    brokenImages: [...document.images]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src),
    overflowingElements: [...document.querySelectorAll("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName, className: typeof element.className === "string" ? element.className : "", text: element.textContent?.trim().slice(0, 45) ?? "", right: Math.round(rect.right * 10) / 10 };
      })
      .filter((element) => element.right > document.documentElement.clientWidth + 1)
      .slice(0, 8),
  }));
  expect(metrics.document, `document overflow at ${width}px: ${JSON.stringify(metrics.overflowingElements)}`).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.body, `body overflow at ${width}px: ${JSON.stringify(metrics.overflowingElements)}`).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.brokenImages, `broken image at ${width}px`).toEqual([]);
}

test("public startup directory and event pages fit mobile through desktop", async ({ page }) => {
  test.skip(!fixtures, "Requires isolated synthetic local Supabase identities.");
  await signIn(page, fixtures!.accounts.member, "/directory", "198.51.100.213");
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, heading] of [["/directory", /Discover Founders/], ["/events", /Events & Booking/]] as const) {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await checkViewport(page, width);
    }
    if (width === 320) {
      const menu = page.getByRole("button", { name: "Open menu" });
      if (await menu.isVisible()) {
        await menu.click();
        await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
      }
    }
  }
});

test("authenticated member profile, ID and startup form fit mobile through desktop", async ({ page }) => {
  test.skip(!fixtures, "Requires isolated synthetic local Supabase identities.");
  await signIn(page, fixtures!.accounts.member, "/member/profile", "198.51.100.211");

  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, heading] of [
      ["/member/profile", /Synthetic CSC member|Your profile/],
      ["/member/id-card", /Digital membership ID/],
      ["/member/startups", /My Startups/],
      ["/member/startups/new", /startup/i],
    ] as const) {
      await page.goto(route);
      await expect(page.locator("h1").first()).toContainText(heading);
      await checkViewport(page, width);
      const controls = await page.locator("main input, main textarea, main select").evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { id: element.id, type: (element as HTMLInputElement).type, left: rect.left, right: rect.right, visible: rect.width > 0 && rect.height > 0 };
        }).filter((rect) => rect.visible),
      );
      for (const control of controls) {
        expect(control.left, `${route} control left edge at ${width}px`).toBeGreaterThanOrEqual(-1);
        expect(control.right, `${route} control right edge at ${width}px (${JSON.stringify(control)})`).toBeLessThanOrEqual(width + 1);
      }
    }
    if (width === 320) {
      await page.goto("/member/profile");
      await page.getByRole("button", { name: "Open member navigation" }).click();
      await expect(page.getByRole("navigation", { name: "Member" })).toBeVisible();
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/member/profile");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2F$/);
  expect((await page.context().cookies()).some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name))).toBe(false);
  await page.goto("/member/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fmember%2Fprofile$/);
});

test("Super Admin overview, event form, startups and payments fit mobile through desktop", async ({ page }) => {
  test.skip(!fixtures, "Requires isolated synthetic local Supabase identities.");
  await signIn(page, fixtures!.accounts.super_admin, "/admin", "198.51.100.212");

  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/admin", "/admin/events", "/admin/events/new", "/admin/startups", "/admin/payments"]) {
      await page.goto(route);
      await expect(page.locator("main h1").first()).toBeVisible();
      await checkViewport(page, width);
      const controls = await page.locator("main input, main textarea, main select").evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { id: element.id, type: (element as HTMLInputElement).type, left: rect.left, right: rect.right, visible: rect.width > 0 && rect.height > 0 };
        }).filter((rect) => rect.visible),
      );
      for (const control of controls) {
        expect(control.left, `${route} control left edge at ${width}px`).toBeGreaterThanOrEqual(-1);
        expect(control.right, `${route} control right edge at ${width}px (${JSON.stringify(control)})`).toBeLessThanOrEqual(width + 1);
      }
    }
    if (width === 320) {
      await page.goto("/admin");
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("navigation", { name: "Admin" }).last()).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Admin" }).last().getByRole("link", { name: "Payments", exact: true })).toBeVisible();
    }
  }
});
