import { test, expect, type Page } from "@playwright/test";

const shouldRun = process.env.E2E_RUN_VS1 === "1";

async function login(page: Page, role: "customer" | "manager" | "tutor") {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`];

  if (!email || !password) {
    throw new Error(`Missing E2E credentials for ${role}`);
  }

  await page.goto("http://localhost:3000/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForLoadState("networkidle");
}

test.describe("@smoke VS1 intake → assign → session log", () => {
  test.skip(!shouldRun, "Set E2E_RUN_VS1=1 to enable VS1 smoke flow.");

  test("happy path", async ({ page }) => {
    const studentName = `QA Student ${Date.now()}`;

    await login(page, "customer");
    await page.goto("http://localhost:3000/customer/intake");

    await page.getByTestId("intake-student-name").fill(studentName);
    await page.getByTestId("intake-student-grade").fill("7");
    await page.getByTestId("intake-subjects").fill("Math, Reading");
    await page.getByTestId("intake-availability").fill("Weekdays after 4pm");
    await page.getByTestId("intake-goals").fill("Improve test scores");
    await page.getByTestId("intake-location").fill("Austin, TX");
    await page.getByTestId("intake-submit").click();
    await expect(page.getByTestId("intake-success")).toBeVisible();

    await page.context().clearCookies();
    await login(page, "manager");
    await page.goto("http://localhost:3000/manager/pipeline");

    await expect(page.getByTestId("intake-list")).toBeVisible();
    await page.getByTestId("intake-search").fill(studentName);
    const intakeRow = page.getByTestId("intake-row").filter({ hasText: studentName });
    await expect(intakeRow).toBeVisible();
    await intakeRow.getByTestId("intake-approve").click();
    await expect(page.getByTestId("intake-approved"))
      .toHaveText(/approved/i);

    await page.getByTestId("assign-tutor").click();
    await page.getByTestId("assign-tutor-select").selectOption({
      label: process.env.E2E_TUTOR_NAME ?? "",
    });
    await page.getByTestId("assign-submit").click();
    await expect(page.getByTestId("assign-success")).toBeVisible();

    const firstAvailableCell = page.getByTestId("assign-slot-cell-available").first();
    await expect(firstAvailableCell).toBeVisible();
    const selectedDate = (await firstAvailableCell.getAttribute("data-date-key")) ?? "";
    expect(selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await firstAvailableCell.click();
    await page.getByTestId("repeat-weekly").uncheck();
    await page.getByTestId("session-submit").click();
    await expect(page.getByTestId("session-created")).toBeVisible();

    await page.context().clearCookies();
    await login(page, "tutor");
    await page.goto(`http://localhost:3000/tutor/schedule?week=${selectedDate}`);

    await page.getByTestId("session-row").filter({ hasText: studentName }).click();
    await page.waitForURL("**/tutor/sessions/**/log");
    const logUrl = page.url();
    await page.getByTestId("session-log-topics").fill("Fractions and ratios");
    await page.getByTestId("session-log-homework").fill("Practice set A");
    await page.getByTestId("session-log-next-plan").fill("Review word problems");
    await page.getByTestId("session-log-summary").fill("Great progress today.");
    await page.getByTestId("session-log-private-notes").fill("Needs confidence boosts.");
    await page.getByTestId("session-log-submit").click();
    await expect(page.getByTestId("session-log-saved")).toBeVisible();

    await page.context().clearCookies();
    await login(page, "manager");
    await page.goto(logUrl);
    await expect(
      page.getByRole("heading", { name: "Session log" })
    ).toBeVisible();

    await page.context().clearCookies();
    await login(page, "customer");
    await page.goto("http://localhost:3000/customer/history");

    await expect(page.getByTestId("history-list")).toBeVisible();
    await expect(
      page.getByTestId("history-item").filter({ hasText: studentName })
    ).toBeVisible();
    await expect(page.getByTestId("progress-snapshot")).toBeVisible();
  });
});
