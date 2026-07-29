import { type Page, expect } from "@playwright/test";

export async function loginAs(
  page: Page,
  credentials: { email: string; password: string },
): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login(\?|$)/, { timeout: 30_000 });
}

export async function expectUnauthorizedOrRedirect(page: Page, path: string): Promise<void> {
  await page.goto(path);
  const url = page.url();
  const blocked =
    /\/login|\/unauthorized|\/caller/.test(url) ||
    (await page.getByText(/unauthorized|forbidden|access denied/i).count()) > 0;
  expect(blocked).toBeTruthy();
}
