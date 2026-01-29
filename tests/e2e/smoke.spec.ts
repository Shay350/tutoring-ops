import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await expect(
    page.getByRole("heading", { name: "Tutoring Ops" })
  ).toBeVisible();
});

test("login page renders", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" })
  ).toBeVisible();
});

test("manager route redirects to login when logged out", async ({ page }) => {
  await page.goto("http://localhost:3000/manager");
  await page.waitForURL("**/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("no-access page renders", async ({ page }) => {
  await page.goto("http://localhost:3000/no-access");
  await expect(
    page.getByRole("heading", { name: "Not authorized" })
  ).toBeVisible();
});

test("oauth callback without code redirects with message", async ({ page }) => {
  await page.goto("http://localhost:3000/auth/callback");
  await page.waitForURL("**/login?error=oauth**");
  await expect(
    page.getByText(/OAuth sign-in failed: missing authorization code/i)
  ).toBeVisible();
});
