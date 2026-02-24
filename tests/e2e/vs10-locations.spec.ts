import { expect, test, type Locator, type Page } from "@playwright/test";

const shouldRun = process.env.E2E_RUN_VS10 === "1";
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

function studentName(suffix: string): string {
  return `QA VS10 ${suffix} ${Date.now()}`;
}

async function createLocation(page: Page, name: string) {
  await page.goto(`${baseUrl}/manager/locations`);
  await expect(page.getByTestId("locations-list")).toBeVisible();

  await page.getByTestId("location-create").click();
  const locationRow = page.getByTestId("location-row").last();
  await expect(locationRow).toBeVisible();

  await locationRow.getByTestId("location-name").fill(name);
  await expect(locationRow.getByTestId("location-active")).toBeVisible();
  await locationRow.getByTestId("location-save").click();
  await expect(page.getByTestId("location-row").filter({ hasText: name })).toBeVisible();
}

async function submitIntake(page: Page, name: string, locationName: string) {
  await page.goto(`${baseUrl}/customer/intake`);

  await page.getByTestId("intake-student-name").fill(name);
  await page.getByTestId("intake-student-grade").fill("8");
  await page.getByTestId("intake-subjects").fill("Math");
  await page.getByTestId("intake-availability").fill("Weekdays after 5pm");
  await page.getByTestId("intake-goals").fill("Improve confidence");
  await page.getByTestId("intake-location-select").selectOption({ label: locationName });
  await page.getByTestId("intake-submit").click();
  await expect(page.getByTestId("intake-success")).toBeVisible();
}

async function pickTutorOption(
  tutorSelect: Locator,
  preferredLabel: string | undefined,
  disallowedLabel: string | undefined
) {
  if (preferredLabel) {
    await tutorSelect.selectOption({ label: preferredLabel });
    return preferredLabel;
  }

  const options = await tutorSelect.locator("option").allTextContents();
  const valid = options
    .map((text) => text.trim())
    .filter((text) => text.length > 0 && text !== disallowedLabel);

  if (valid.length === 0) {
    throw new Error("No tutor options available for assignment.");
  }

  await tutorSelect.selectOption({ label: valid[0] });
  return valid[0];
}

async function approveAssignAndCreateSession(
  page: Page,
  intakeStudentName: string,
  tutorLabel: string | undefined,
  disallowedTutorLabel?: string
) {
  await page.goto(`${baseUrl}/manager/pipeline`);
  await expect(page.getByTestId("intake-list")).toBeVisible();

  await page.getByTestId("intake-search").fill(intakeStudentName);
  const intakeRow = page.getByTestId("intake-row").filter({ hasText: intakeStudentName });
  await expect(intakeRow).toBeVisible();

  await intakeRow.getByTestId("intake-approve").click();
  await expect(page.getByTestId("intake-approved")).toBeVisible();

  await page.getByTestId("assign-tutor").click();
  const tutorSelect = page.getByTestId("assign-tutor-select");
  const selectedTutor = await pickTutorOption(tutorSelect, tutorLabel, disallowedTutorLabel);
  await page.getByTestId("assign-submit").click();
  await expect(page.getByTestId("assign-success")).toBeVisible();

  const slotCell = page.getByTestId("assign-slot-cell-available").first();
  await expect(slotCell).toBeVisible();
  const sessionDate = (await slotCell.getAttribute("data-date-key")) ?? "";
  expect(sessionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  await slotCell.click();
  await page.getByTestId("repeat-weekly").uncheck();
  await page.getByTestId("session-submit").click();
  await expect(page.getByTestId("session-created")).toBeVisible();

  return { selectedTutor, sessionDate };
}

test.describe("@smoke VS10 multi-location coverage", () => {
  test.skip(!shouldRun, "Set E2E_RUN_VS10=1 to enable VS10 coverage.");

  test("manager filtering and tutor location scoping are enforced", async ({ page }) => {
    const primaryTutorName = process.env.E2E_TUTOR_NAME;
    const secondaryTutorName = process.env.E2E_TUTOR_ALT_NAME;
    const locationA = `QA Hub A ${Date.now()}`;
    const locationB = `QA Hub B ${Date.now()}`;
    const studentA = studentName("A");
    const studentB = studentName("B");

    await login(page, "manager");
    await createLocation(page, locationA);
    await createLocation(page, locationB);

    await page.context().clearCookies();
    await login(page, "customer");
    await submitIntake(page, studentA, locationA);
    await submitIntake(page, studentB, locationB);

    await page.context().clearCookies();
    await login(page, "manager");
    const firstAssignment = await approveAssignAndCreateSession(page, studentA, primaryTutorName);
    await approveAssignAndCreateSession(
      page,
      studentB,
      secondaryTutorName,
      firstAssignment.selectedTutor
    );

    await page.goto(`${baseUrl}/manager/schedule?week=${firstAssignment.sessionDate}`);
    const scheduleContainer = page.getByTestId("week-calendar");
    await expect(scheduleContainer).toBeVisible();

    await page.getByTestId("schedule-location-select").selectOption({ label: locationA });
    await expect(scheduleContainer).toContainText(studentA);
    await expect(scheduleContainer).not.toContainText(studentB);

    await page.getByTestId("schedule-location-select").selectOption({ label: locationB });
    await expect(scheduleContainer).toContainText(studentB);
    await expect(scheduleContainer).not.toContainText(studentA);

    await page.context().clearCookies();
    await login(page, "tutor");
    await page.goto(`${baseUrl}/tutor/schedule?week=${firstAssignment.sessionDate}`);

    await expect(page.getByTestId("session-row").filter({ hasText: studentA })).toBeVisible();
    await expect(page.getByTestId("session-row").filter({ hasText: studentB })).toHaveCount(0);
  });
});
