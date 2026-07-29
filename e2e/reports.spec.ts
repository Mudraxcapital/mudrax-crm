import { test, expect } from "@playwright/test";
import { e2eCredentials } from "./fixtures/credentials";
import { loginAs } from "./helpers/auth";

test.describe("Reports", () => {
  test("reports hub loads for admin", async ({ page }) => {
    await loginAs(page, e2eCredentials.admin);
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: /report/i }).first()).toBeVisible();
  });
});
