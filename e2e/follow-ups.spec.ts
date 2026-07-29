import { test, expect } from "@playwright/test";
import { e2eCredentials } from "./fixtures/credentials";
import { loginAs } from "./helpers/auth";

test.describe("Follow-ups", () => {
  test("follow-ups portfolio is reachable for admin", async ({ page }) => {
    await loginAs(page, e2eCredentials.admin);
    await page.goto("/follow-ups");
    await expect(page.getByRole("heading", { name: /follow-?up/i }).first()).toBeVisible();
  });
});
