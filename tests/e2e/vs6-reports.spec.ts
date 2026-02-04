import { test, expect, type Page } from "@playwright/test";

const shouldRun = process.env.E2E_RUN_VS6 === "1";
const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function login(page: Page, role: "customer" | "manager" | "tutor") {
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
  await page.getByTestId("intake-location").fill("Chicago, IL");
  await page.getByTestId("intake-submit").click();
  await expect(page.getByTestId("intake-success")).toBeVisible();
}

async function approveIntake(page: Page, studentName: string) {
  await page.goto(`${baseUrl}/manager/pipeline`);

  await expect(page.getByTestId("intake-list")).toBeVisible();
  await page.getByTestId("intake-search").fill(studentName);
  const intakeRow = page.getByTestId("intake-row").filter({ hasText: studentName });
  await expect(intakeRow).toBeVisible();
  await intakeRow.getByRole("link", { name: "Review" }).click();
  await expect(page.getByTestId("intake-approve")).toBeVisible();
  await page.getByTestId("intake-approve").click();
  await expect(page.getByTestId("intake-approved")).toBeVisible();
}

async function assignTutor(page: Page) {
  const tutorName = process.env.E2E_TUTOR_NAME ?? "";
  if (!tutorName) {
    throw new Error("Missing E2E_TUTOR_NAME for tutor assignment.");
  }

  await page.getByTestId("assign-tutor").click();
  await page.getByTestId("assign-tutor-select").selectOption({ label: tutorName });
  await page.getByTestId("assign-submit").click();
  await expect(page.getByTestId("assign-success")).toBeVisible();
}

async function createSession(page: Page, sessionDate: string, start: string, end: string) {
  await page.getByTestId("session-date").fill(sessionDate);
  await page.getByTestId("session-start-time").fill(start);
  await page.getByTestId("session-end-time").fill(end);
  await page.getByTestId("session-submit").click();
  await expect(page.getByTestId("session-created")).toBeVisible();
}

async function logSession(page: Page, sessionDate: string, studentName: string) {
  await page.goto(`${baseUrl}/tutor/schedule?week=${sessionDate}`);

  const sessionRow = page.getByRole("row", { name: new RegExp(studentName) }).first();
  await expect(sessionRow).toBeVisible();
  await sessionRow.getByRole("link", { name: /start log|edit log/i }).click();

  await expect(page.getByTestId("session-log-topics")).toBeVisible();
  await page.getByTestId("session-log-topics").fill("Algebra practice");
  await page.getByTestId("session-log-summary").fill("Reviewed core algebra concepts.");
  await page.getByTestId("session-log-submit").click();
  await expect(page.getByTestId("session-log-saved")).toBeVisible();
}

test.describe("@smoke VS6 reports", () => {
  test.skip(!shouldRun, "Set E2E_RUN_VS6=1 to enable VS6 reports flow.");

  test("manager views monthly summaries and exports CSV", async ({ page }) => {
    const studentName = `QA Reports ${Date.now()}`;
    const month = "2026-02";
    const sessionDate1 = "2026-02-05";
    const sessionDate2 = "2026-02-12";

    await createStudentIntake(page, studentName);
    await page.context().clearCookies();

    await login(page, "manager");
    await approveIntake(page, studentName);
    await assignTutor(page);
    await createSession(page, sessionDate1, "15:00", "16:00");
    await createSession(page, sessionDate2, "15:00", "17:00");

    await page.context().clearCookies();

    await login(page, "tutor");
    await logSession(page, sessionDate1, studentName);
    await logSession(page, sessionDate2, studentName);

    await page.context().clearCookies();

    await login(page, "manager");
    await page.goto(`${baseUrl}/manager/reports?month=${month}`);

    const studentTable = page.getByTestId("reports-student-table");
    await expect(studentTable).toBeVisible();
    const studentRow = studentTable.getByRole("row", {
      name: new RegExp(studentName),
    });
    const studentCells = studentRow.locator("td");
    await expect(studentCells.nth(1)).toHaveText("2");
    await expect(studentCells.nth(2)).toHaveText("3");
    await expect(studentCells.nth(3)).toHaveText("0");

    const tutorTable = page.getByTestId("reports-tutor-table");
    await expect(tutorTable).toBeVisible();
    const tutorRow = tutorTable.getByRole("row", {
      name: new RegExp(process.env.E2E_TUTOR_NAME ?? "Tutor"),
    });
    const tutorCells = tutorRow.locator("td");
    await expect(tutorCells.nth(1)).toHaveText("2");
    await expect(tutorCells.nth(2)).toHaveText("3");
    await expect(tutorCells.nth(3)).toHaveText("1");

    const [sessionsResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response
          .url()
          .includes(`/manager/reports/export/sessions?month=${month}`)
      ),
      page.getByTestId("export-sessions").click(),
    ]);
    const sessionsText = await sessionsResponse.text();
    expect(sessionsResponse.headers()["content-disposition"]).toContain(
      `sessions-${month}.csv`
    );
    expect(sessionsText).toContain(studentName);
    expect(sessionsText).toContain(sessionDate2);

    const [logsResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response
          .url()
          .includes(`/manager/reports/export/session-logs?month=${month}`)
      ),
      page.getByTestId("export-logs").click(),
    ]);
    const logsText = await logsResponse.text();
    expect(logsResponse.headers()["content-disposition"]).toContain(
      `session-logs-${month}.csv`
    );
    expect(logsText).toContain(studentName);
    expect(logsText).toContain(sessionDate1);
  });
});
