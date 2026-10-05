import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
}

test.describe("public and authentication pages", () => {
  test("homepage exposes the primary product navigation", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Small bites from the live web.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Create a feed", exact: true })).toHaveAttribute("href", "/dashboard/feeds/new");
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login");
    await expect(page.getByRole("link", { name: "Sign up", exact: true })).toHaveAttribute("href", "/signup");
    await expect(page.getByRole("heading", { name: "Export feeds to your stack" })).toBeVisible();
    await page.getByRole("link", { name: "Explore feeds" }).click();
    await expect(page).toHaveURL(/#feeds$/u);
    await expect(page.getByRole("heading", { name: "Turn any useful source into a feed" })).toBeInViewport();
    await expectNoAccessibilityViolations(page);
  });

  test("restored landing stays within narrow mobile viewports", async ({ page }) => {
    for (const width of [320, 390, 720, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "Create a feed", exact: true })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    }
  });

  for (const route of ["/login", "/signup"] as const) {
    test(`${route} has an accessible form`, async ({ page }) => {
      await page.goto(route);

      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expectNoAccessibilityViolations(page);
    });
  }
});

test("a new user can sign up, use the dashboard, and sign out", async ({ page }) => {
  const uniqueId = `${Date.now()}-${crypto.randomUUID()}`;
  const email = `e2e-${uniqueId}@example.test`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("E2E-password-1234");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/u);
  await expect(page.getByRole("heading", { level: 1, name: "E2E User's Workspace" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create feed" }).first()).toBeVisible();
  await expectNoAccessibilityViolations(page);

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in to Srotiva" })).toBeVisible();
});
