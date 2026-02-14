import { test, expect, type Page } from "@playwright/test";

const shouldRun = process.env.E2E_RUN_VS8 === "1";
const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function login(page: Page, role: "manager") {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`];

  if (!email || !password) {
    throw new Error(`Missing E2E credentials for ${role}`);
  }

  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForLoadState("networkidle");
}

test.describe("@smoke VS8 schedule UX", () => {
  test.skip(!shouldRun, "Set E2E_RUN_VS8=1 to enable VS8 smoke flow.");

  test("manager schedule renders calendar and operating hours", async ({ page }) => {
    await login(page, "manager");
    await page.goto(`${baseUrl}/manager/schedule`);

    await expect(
      page.getByRole("heading", { name: /master schedule/i })
    ).toBeVisible();

    await expect(page.getByTestId("week-calendar")).toBeVisible();
    await expect(page.getByTestId("operating-hours-form")).toBeVisible();

    await expect(
      page.getByLabel("Allow scheduling beyond prepaid hours")
    ).toBeVisible();
  });
});

