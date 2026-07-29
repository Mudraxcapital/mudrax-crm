import { test, expect } from "@playwright/test";
import { e2eCredentials } from "./fixtures/credentials";
import { loginAs } from "./helpers/auth";

test.describe("Authentication", () => {
  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("nobody@example.com");
    await page.locator("#password").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator("p.mx-error")).toContainText(/invalid email or password/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin can sign in and reach the app shell", async ({ page }) => {
    await loginAs(page, e2eCredentials.admin);
    await expect(page.locator("body")).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });
});
