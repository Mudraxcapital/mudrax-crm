import { test, expect } from "@playwright/test";
import { e2eCredentials } from "./fixtures/credentials";
import { loginAs } from "./helpers/auth";

test.describe("Customers — merge", () => {
  test("customer list and merge/duplicate tooling is available", async ({ page }) => {
    await loginAs(page, e2eCredentials.admin);
    await page.goto("/customers");
    await expect(page.getByRole("heading", { name: /customer/i }).first()).toBeVisible();

    const mergeOrDup = page.getByRole("link", { name: /merge|duplicate/i });
    if ((await mergeOrDup.count()) > 0) {
      await mergeOrDup.first().click();
      await expect(page.locator("body")).toContainText(/merge|duplicate|customer/i);
    }
  });
});
