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

function nextWeekdayDate(weekday: number, offsetDays = 0): string {
  const today = new Date();
  const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const currentWeekday = base.getUTCDay();
  const delta = (weekday - currentWeekday + 7) % 7;
  base.setUTCDate(base.getUTCDate() + delta + offsetDays);
  return base.toISOString().slice(0, 10);
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

  test("manager updates operating hours and sees save confirmation", async ({ page }) => {
    await login(page, "manager");
    await page.goto(`${baseUrl}/manager/schedule`);

    const mondayRow = page.getByTestId("operating-hours-row-1");
    await mondayRow.locator('input[name="weekday_1_open"]').fill("08:00");
    await mondayRow.locator('input[name="weekday_1_close"]').fill("18:00");
    await page.getByRole("button", { name: "Save hours" }).click();

    await expect(page.getByText("Operating hours saved.")).toBeVisible();
    await expect(page.getByTestId("week-calendar")).toContainText("slots left");
  });

  test("prepaid guardrail blocks by default and allows manager override", async ({ page }) => {
    await login(page, "manager");
    await page.goto(`${baseUrl}/manager/schedule`);

    const startDate = nextWeekdayDate(1, 28);
    const endDate = nextWeekdayDate(5, 84);

    await page.getByTestId("recurring-assignment").selectOption({ index: 1 });
    await page.getByTestId("recurring-start-date").fill(startDate);
    await page.getByTestId("recurring-end-date").fill(endDate);
    await page.getByTestId("recurring-start-time").fill("10:00");
    await page.getByTestId("recurring-end-time").fill("11:00");
    await page.getByTestId("weekday-mon").check();
    await page.getByTestId("weekday-wed").check();
    await page.getByTestId("weekday-fri").check();
    await page.getByTestId("recurring-submit").click();

    await expect(
      page.getByText(/exceed membership hours remaining/i)
    ).toBeVisible();

    await page.getByLabel("Allow scheduling beyond prepaid hours").check();
    await page.getByTestId("recurring-submit").click();
    await expect(page.getByTestId("recurring-success")).toContainText("Created");
  });
});
