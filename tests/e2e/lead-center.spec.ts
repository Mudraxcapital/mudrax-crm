import { test, expect } from "@playwright/test";
import { e2eCredentials } from "./fixtures/credentials";
import { loginAs } from "./helpers/auth";

test.describe("Lead Center", () => {
  test("lead center import workspace loads for admin", async ({ page }) => {
    await loginAs(page, e2eCredentials.admin);
    await page.goto("/lead-center");
    // Some deployments mount under /crm/lead-center — try fallback.
    if (page.url().includes("/login") || (await page.getByText(/not found|404/i).count()) > 0) {
      await page.goto("/crm/lead-center");
    }
    await expect(page.locator("body")).toContainText(/lead center|staged|import|source/i);
  });
});
