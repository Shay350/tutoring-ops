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
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});
