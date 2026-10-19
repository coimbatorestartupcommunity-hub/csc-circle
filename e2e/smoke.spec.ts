import { test, expect } from "@playwright/test";
for (const route of ["/", "/about", "/directory", "/events", "/login", "/signup", "/forgot-password", "/reset-password", "/privacy", "/security", "/terms"]) {
  test(`${route} renders CSC branding and stays within a mobile viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page).not.toHaveTitle(/Create Next App/);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
test("legal and security pages are linked visibly from the site footer", async ({ page }) => {
  for (const [route, label] of [["/privacy", "Privacy Policy"], ["/security", "Security"], ["/terms", "Terms and Conditions"]]) {
    await page.goto(route);
    const link = page.locator("footer nav[aria-label='Legal and security']").getByRole("link", { name: label });
    await expect(link).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  }
});
test("about leadership shows the supplied founder portrait and both organization links", async ({ page }) => {
  await page.goto("/about");
  const reyash = page.locator("article").filter({ has: page.getByRole("heading", { name: "Reyash", exact: true }) });
  await expect(reyash.getByRole("img", { name: "Reyash, Founder — Coimbatore Startup Community" })).toHaveAttribute("src", /Reyash\.png/);
  await expect(reyash.getByRole("link", { name: "Belvoria" })).toHaveAttribute("href", "https://belvoria.vercel.app/");

  const vikash = page.locator("article").filter({ has: page.getByRole("heading", { name: "Vikash Saravanan", exact: true }) });
  await expect(vikash.getByRole("link", { name: "Logic Intelligence Technologies" })).toHaveAttribute("href", "https://www.logicintelligencetechnologies.in");
});
test("mobile footer centers CSC and policies with Get Involved left of Community", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const layout = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing footer element: ${selector}`);
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, center: (box.left + box.right) / 2 };
    };
    return {
      brand: rect('[data-testid="footer-brand"]'),
      involved: rect('[data-testid="footer-get-involved"]'),
      community: rect('[data-testid="footer-community"]'),
      legal: rect('[data-testid="footer-legal"]'),
      width: innerWidth,
    };
  });

  expect(Math.abs(layout.brand.center - layout.width / 2)).toBeLessThan(2);
  expect(layout.involved.left).toBeLessThan(layout.community.left);
  expect(Math.abs(layout.legal.center - layout.width / 2)).toBeLessThan(2);
  for (const selector of ['[data-testid="footer-get-involved"]', '[data-testid="footer-community"]']) {
    const alignment = await page.locator(selector).evaluate((element) => {
      const nav = element.getBoundingClientRect();
      const center = nav.left + nav.width / 2;
      const heading = element.querySelector("h2")!.getBoundingClientRect();
      const links = [...element.querySelectorAll("li a")].map((link) => {
        const box = link.getBoundingClientRect();
        return Math.abs(box.left + box.width / 2 - center);
      });
      return {
        headingCentered: getComputedStyle(element).textAlign === "center" && Math.abs(heading.left + heading.width / 2 - center) < 2,
        linkOffsets: links,
      };
    });
    expect(alignment.headingCentered).toBe(true);
    expect(alignment.linkOffsets.every((offset) => offset < 2)).toBe(true);
  }
  await expect(page.locator('footer [aria-label="CSC Circle on Instagram"]')).toBeVisible();
  await expect(page.locator('footer [aria-label="Join the CSC Circle WhatsApp community"]')).toBeVisible();
  await expect(page.locator('footer [aria-label="Email CSC Circle"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("OAuth callback leaves the PKCE verifier cookie untouched", async ({ request }) => {
  const verifierCookie = "sb-mmsrtfktwcrbyrucjmzo-auth-token-flow-abcdef123456-code-verifier=pending-verifier";
  const response = await request.get("/auth/callback?next=%2Fmember", {
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
  for (const route of ["actions", "events", "check-in", "collaborations", "collaboration-organizations"]) {
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

for (const width of [320,430]) {
 test(`home keeps animated decorations within the ${width}px viewport`,async({page})=>{
  await page.setViewportSize({width,height:812});await page.goto("/");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}
