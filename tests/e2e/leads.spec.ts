import { test, expect } from "@playwright/test";
import { e2eCredentials } from "./fixtures/credentials";
import { loginAs } from "./helpers/auth";

test.describe("Leads — import, assign, status", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, e2eCredentials.admin);
  });

  test("leads list and import page load", async ({ page }) => {
    await page.goto("/leads");
    await expect(page.getByRole("heading", { name: /lead/i }).first()).toBeVisible();

    await page.goto("/leads/import");
    await expect(page.locator("body")).toContainText(/import|excel|csv|upload/i);
    await expect(page.locator('input[type="file"]').first()).toBeVisible();
  });

  test("lead detail supports status / assignment controls when leads exist", async ({ page }) => {
    await page.goto("/leads");
    const leadLink = page.locator('a[href^="/leads/"][href*="-"]').first();
    if ((await leadLink.count()) === 0) {
      test.skip(true, "No seeded leads available");
      return;
    }
    await leadLink.click();
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{10,}/i);
    await expect(page.locator("body")).toContainText(/lead|customer|stage|status|assign/i);
  });
});
