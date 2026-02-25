import { test, expect, type Page } from "@playwright/test";

const shouldRun = process.env.E2E_RUN_VS9 === "1";
const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function login(page: Page, role: "customer" | "manager") {
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

async function createStudentIntake(page: Page, studentName: string) {
  await login(page, "customer");
  await page.goto(`${baseUrl}/customer/intake`);

  await page.getByTestId("intake-student-name").fill(studentName);
  await page.getByTestId("intake-student-grade").fill("9");
  await page.getByTestId("intake-subjects").fill("Math");
  await page.getByTestId("intake-availability").fill("Weekdays after 6pm");
  await page.getByTestId("intake-goals").fill("Improve algebra skills");
  await page.getByTestId("intake-location-select").selectOption({ index: 1 });
  await page.getByTestId("intake-submit").click();
  await expect(page.getByTestId("intake-success")).toBeVisible();
}

test.describe("@smoke VS9 intake -> suggestions -> approve -> session created", () => {
  test.skip(!shouldRun, "Set E2E_RUN_VS9=1 to enable VS9 flow.");

  test("manager approves a suggestion and sees sessions created", async ({ page }) => {
    const studentName = `QA VS9 ${Date.now()}`;

    await createStudentIntake(page, studentName);
    await page.context().clearCookies();

    await login(page, "manager");
    await page.goto(`${baseUrl}/manager/pipeline`);

    await expect(page.getByTestId("intake-list")).toBeVisible();
    await page.getByTestId("intake-search").fill(studentName);

    const intakeRow = page.getByTestId("intake-row").filter({ hasText: studentName });
    await expect(intakeRow).toBeVisible();
    await intakeRow.getByRole("link", { name: "Review" }).click();

    await expect(page.getByRole("heading", { name: /intake review/i })).toBeVisible();

    await page.getByTestId("intake-approve").click();
    await expect(page.getByTestId("intake-approved")).toBeVisible();

    await expect(page.getByTestId("slotting-suggestions-list")).toBeVisible();

    const firstSuggestionRow = page.getByTestId("slotting-suggestion-row").first();
    await expect(firstSuggestionRow).toBeVisible();

    await firstSuggestionRow.getByTestId("slotting-approve").click();
    await expect(page.getByTestId("slotting-approved")).toBeVisible();

    await expect(firstSuggestionRow).toContainText(/approved/i);

    const sessionsTable = page.getByRole("table").nth(1);
    await expect(sessionsTable).toBeVisible();
    await expect(sessionsTable.getByText("No sessions yet.")).toHaveCount(0);
    await expect(
      sessionsTable.getByRole("row").filter({ hasText: /scheduled/i }).first()
    ).toBeVisible();
  });
});
