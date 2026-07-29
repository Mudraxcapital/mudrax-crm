import { test, expect } from "@playwright/test";
import { e2eCredentials } from "./fixtures/credentials";
import { loginAs } from "./helpers/auth";

test.describe("RBAC and hierarchy restrictions", () => {
  test("team lead can open team-scoped CRM surfaces", async ({ page }) => {
    await loginAs(page, e2eCredentials.teamLead);
    await page.goto("/leads");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).toContainText(/lead/i);
  });

  test("manager can open campaigns and reports", async ({ page }) => {
    await loginAs(page, e2eCredentials.manager);
    await page.goto("/campaigns");
    await expect(page.getByRole("heading", { name: /campaign/i }).first()).toBeVisible();
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: /report/i }).first()).toBeVisible();
  });

  test("caller is confined away from organization-wide users admin", async ({ page }) => {
    await loginAs(page, e2eCredentials.caller);
    await page.goto("/users");
    await expect(page).toHaveURL(/\/(caller|unauthorized|login)/);
  });

  test("admin retains full users access", async ({ page }) => {
    await loginAs(page, e2eCredentials.admin);
    await page.goto("/users");
    await expect(page).toHaveURL(/\/users/);
    await expect(page.getByRole("heading", { name: /user|employee|team/i }).first()).toBeVisible();
  });
});
