import { test, expect } from "@playwright/test";
import { e2eCredentials } from "./fixtures/credentials";
import { loginAs } from "./helpers/auth";

test.describe("Caller Workspace", () => {
  test("caller lands in caller workspace and can open leads", async ({ page }) => {
    await loginAs(page, e2eCredentials.caller);
    await page.goto("/caller");
    await expect(page).toHaveURL(/\/caller/);
    await expect(page.locator("body")).toContainText(/caller|lead|workspace|queue/i);
  });

  test("caller cannot open admin users management", async ({ page }) => {
    await loginAs(page, e2eCredentials.caller);
    await page.goto("/users");
    await expect(page).toHaveURL(/\/(caller|unauthorized|login)/);
  });
});
