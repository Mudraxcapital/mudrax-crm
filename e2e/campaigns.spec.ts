import { test, expect } from "@playwright/test";
import { e2eCredentials } from "./fixtures/credentials";
import { loginAs } from "./helpers/auth";

test.describe("Campaigns", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, e2eCredentials.admin);
  });

  test("create campaign workspace is reachable", async ({ page }) => {
    await page.goto("/campaigns");
    await expect(page.getByRole("heading", { name: /campaign/i }).first()).toBeVisible();
    await page.getByRole("button", { name: /new campaign/i }).click();
    await expect(page.getByRole("heading", { name: /create campaign/i })).toBeVisible();
    await expect(page.locator("form").first()).toBeVisible();
  });
});
