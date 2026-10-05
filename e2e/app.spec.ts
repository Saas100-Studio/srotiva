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
        name: "Turn a website into a feed you can use anywhere.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
    await expectNoAccessibilityViolations(page);
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
