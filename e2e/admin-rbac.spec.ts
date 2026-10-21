import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

type Account = { userId: string; email: string; password: string };
type FixtureFile = { accounts: Record<string, Account> };

const fixturePath = process.env.CSC_E2E_USERS_FILE;
const fixtures: FixtureFile | null = fixturePath ? JSON.parse(readFileSync(fixturePath, "utf8")) as FixtureFile : null;
const expectedNavigation: Record<string, { visible: string[]; hidden: string[] }> = {
  super_admin: { visible: ["Dashboard", "Members", "Claims", "Startups", "Events", "Registrations", "Check-in", "Payments", "Reviews", "Content", "Media", "Audit logs", "Settings", "Administrator Invitations", "Roles & Permissions"], hidden: [] },
  community_admin: { visible: ["Dashboard", "Members", "Claims", "Startups", "Registrations", "Consultations", "Reviews"], hidden: ["Events", "Check-in", "Payments", "Audit logs", "Settings", "Administrator Invitations", "Roles & Permissions"] },
  event_manager: { visible: ["Dashboard", "Events", "Registrations", "Check-in", "Attendance"], hidden: ["Members", "Claims", "Payments", "Reviews", "Audit logs", "Settings", "Administrator Invitations", "Roles & Permissions"] },
  checkin_staff: { visible: ["Dashboard", "Check-in"], hidden: ["Members", "Claims", "Events", "Registrations", "Attendance", "Payments", "Reviews", "Audit logs", "Settings", "Administrator Invitations", "Roles & Permissions"] },
  finance_reviewer: { visible: ["Dashboard", "Registrations", "Payments"], hidden: ["Members", "Claims", "Events", "Check-in", "Reviews", "Audit logs", "Settings", "Administrator Invitations", "Roles & Permissions"] },
  content_manager: { visible: ["Dashboard", "Reviews", "Content", "Media", "Collaborations"], hidden: ["Members", "Claims", "Events", "Registrations", "Check-in", "Payments", "Audit logs", "Settings", "Administrator Invitations", "Roles & Permissions"] },
  tech_admin: { visible: ["Dashboard", "Audit logs", "Settings"], hidden: ["Members", "Claims", "Events", "Registrations", "Check-in", "Payments", "Reviews", "Content", "Media", "Administrator Invitations", "Roles & Permissions"] },
};

const directRouteChecks: Record<string, { allowed: string; denied?: string; secondAllowed?: string }> = {
  super_admin: { allowed: "/admin/payments", secondAllowed: "/admin/roles" },
  community_admin: { allowed: "/admin/members", denied: "/admin/payments" },
  event_manager: { allowed: "/admin/events", denied: "/admin/members" },
  checkin_staff: { allowed: "/admin/check-in", denied: "/admin/payments" },
  finance_reviewer: { allowed: "/admin/payments", denied: "/admin/events/new" },
  content_manager: { allowed: "/admin/content", denied: "/admin/members" },
  tech_admin: { allowed: "/admin/settings", denied: "/admin/roles" },
};

async function signInAsAdmin(page: import("@playwright/test").Page, account: Account) {
  // Use a distinct reserved TEST-NET source address per synthetic identity so
  // the application's intentional five-attempt/IP throttle is not tripped by
  // the seven-role suite sharing one local browser runner. This affects only
  // requests to the loopback E2E app, never production traffic.
  const roleKeys = Object.keys(fixtures?.accounts ?? {});
  const roleIndex = roleKeys.findIndex((role) => account.email.includes(`-${role}-`));
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${Math.max(1, roleIndex + 1)}` });
  await page.goto("/login?next=%2Fadmin");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const response = await responsePromise;
  const body = await response.json() as { ok?: boolean; error?: string };
  if (!response.ok() || !body.ok) {
    const headers = await response.request().allHeaders();
    const requestOrigin = new URL(response.url()).origin;
    const origin = headers.origin ?? "missing";
    const originMatches = origin === requestOrigin;
    const contentType = headers["content-type"] ?? "missing";
    const postData = response.request().postData() ?? "";
    const bodyKeys = (() => { try { return Object.keys(JSON.parse(postData)).sort().join(","); } catch { return "invalid-json"; } })();
    throw new Error(`Local test login rejected (${response.status()} ${body.error ?? "unknown"}; originPresent=${origin !== "missing"}, originMatches=${originMatches}, contentType=${contentType}, contentLength=${headers["content-length"] ?? "missing"}, bodyBytes=${Buffer.byteLength(postData)}, bodyKeys=${bodyKeys}).`);
  }
  await expect(page).toHaveURL(/\/admin(?:\?.*)?$/,{ timeout: 15_000 });
}

for (const [role, expected] of Object.entries(expectedNavigation)) {
  test(`${role} authenticates and sees only its permitted admin navigation`, async ({ page }) => {
    test.skip(!fixtures, "Requires the isolated local Supabase fixture runner.");
    const account = fixtures!.accounts[role];
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signInAsAdmin(page, account);
    await expect(page.locator("main h1")).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Admin" }).first();
    for (const name of expected.visible) await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
    for (const name of expected.hidden) await expect(nav.getByRole("link", { name, exact: true })).toHaveCount(0);

    const direct = directRouteChecks[role];
    const allowedResponse = await page.goto(direct.allowed);
    expect(allowedResponse?.status(), `${role} should render ${direct.allowed}`).toBe(200);
    if (direct.secondAllowed) {
      const secondResponse = await page.goto(direct.secondAllowed);
      expect(secondResponse?.status(), `${role} should render ${direct.secondAllowed}`).toBe(200);
    }
    if (direct.denied) {
      const deniedResponse = await page.goto(direct.denied);
      // Next may have streamed the shared shell before the page-level guard
      // throws notFound(); in that case the HTTP status remains 200, while the
      // route renders the app's generic 404 boundary and no module content.
      expect([200, 404]).toContain(deniedResponse?.status());
      await expect(page.getByRole("heading", { name: "This page took a different path." })).toBeVisible();
    }
  });
}

test("Check-In Staff cannot open a prohibited finance route", async ({ page }) => {
  test.skip(!fixtures, "Requires the isolated local Supabase fixture runner.");
  const account = fixtures!.accounts.checkin_staff;
  await signInAsAdmin(page, account);
  const paymentResponse = await page.goto("/admin/payments");
  expect([200, 404]).toContain(paymentResponse?.status());
  await expect(page.getByRole("heading", { name: "This page took a different path." })).toBeVisible();
  await expect(page.getByRole("heading", { name: /payment review/i })).toHaveCount(0);
  const eventCreationResponse = await page.goto("/admin/events/new");
  expect([200, 404]).toContain(eventCreationResponse?.status());
  await expect(page.getByRole("heading", { name: "This page took a different path." })).toBeVisible();
  await expect(page.getByText(/payment verification|pending payment/i)).toHaveCount(0);
});

test("an active CSC member can use core member pages but has no admin access", async ({ page }) => {
  test.skip(!fixtures, "Requires the isolated local Supabase fixture runner.");
  const account = fixtures!.accounts.member;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": "198.51.100.100" });
  await page.goto("/login?next=%2Fmember");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/auth/login"));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/member(?:\?.*)?$/, { timeout: 15_000 });

  const memberRoutes = [
    ["/member/profile", /Synthetic CSC member|Your profile/],
    ["/member/id-card", /Digital membership ID/],
    ["/member/startups", /My Startups/],
    ["/member/reviews", /My ratings & reviews/],
  ] as const;
  for (const [route, heading] of memberRoutes) {
    await page.goto(route);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /don't have admin access/i })).toBeVisible();
});
