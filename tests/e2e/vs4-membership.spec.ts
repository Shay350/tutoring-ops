import { test, expect, type Page } from "@playwright/test";

const shouldRun = process.env.E2E_RUN_VS4 === "1";
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
  await page.getByTestId("intake-student-grade").fill("7");
  await page.getByTestId("intake-subjects").fill("Math, Reading");
  await page.getByTestId("intake-availability").fill("Weekdays after 4pm");
  await page.getByTestId("intake-goals").fill("Improve test scores");
  await page.getByTestId("intake-location-select").selectOption({ index: 1 });
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
  await page.getByTestId("assign-tutor").click();
  await page.getByTestId("assign-tutor-select").selectOption({
    label: process.env.E2E_TUTOR_NAME ?? "",
  });
  await page.getByTestId("assign-submit").click();
  await expect(page.getByTestId("assign-success")).toBeVisible();
}

async function createSession(page: Page) {
  await page.getByTestId("assign-slot-cell-available").first().click();
  await page.getByTestId("repeat-weekly").uncheck();
  await page.getByTestId("session-submit").click();
  await expect(page.getByTestId("session-created")).toBeVisible();
}

async function openIntakeReview(page: Page, studentName: string) {
  await page.goto(`${baseUrl}/manager/pipeline`);
  await expect(page.getByTestId("intake-list")).toBeVisible();
  await page.getByTestId("intake-search").fill(studentName);
  const intakeRow = page.getByTestId("intake-row").filter({ hasText: studentName });
  await expect(intakeRow).toBeVisible();
  await intakeRow.getByRole("link", { name: "Review" }).click();
}

async function openStudentMembership(page: Page, studentName: string) {
  await page.goto(`${baseUrl}/manager/students`);
  const list = page.getByTestId("manager-student-list");
  await expect(list).toBeVisible();
  const studentRow = list.getByRole("row", { name: new RegExp(studentName) });
  await expect(studentRow).toBeVisible();
  await studentRow.getByRole("link", { name: "View" }).click();
  await expect(page.getByTestId("membership-form")).toBeVisible();
}

async function createMembership(page: Page, options: {
  planType: string;
  status: string;
  hoursTotal: string;
  hoursRemaining: string;
  renewalDate: string;
  notes?: string;
}) {
  await page.getByTestId("membership-plan").fill(options.planType);
  await page.getByTestId("membership-status").selectOption(options.status);
  await page.getByTestId("membership-hours-total").fill(options.hoursTotal);
  await page.getByTestId("membership-hours-remaining-input").fill(options.hoursRemaining);
  await page.getByTestId("membership-renewal").fill(options.renewalDate);

  if (options.notes) {
    await page.getByTestId("membership-notes").fill(options.notes);
  }

  await page.getByTestId("membership-save").click();
  await expect(page.getByTestId("membership-saved")).toBeVisible();
}

async function adjustMembershipHours(page: Page, delta: string, reason: string) {
  await page.getByTestId("membership-adjust-open").click();
  await page.getByTestId("membership-adjust-delta").fill(delta);
  await page.getByTestId("membership-adjust-reason").fill(reason);
  await page.getByTestId("membership-adjust-submit").click();
  await expect(page.getByTestId("membership-adjusted")).toBeVisible();
}

function parseHours(text: string | null) {
  if (!text) {
    return NaN;
  }

  const match = text.match(/[\d.]+/);
  return match ? Number(match[0]) : NaN;
}

test.describe("@smoke VS4 membership visibility", () => {
  test.skip(!shouldRun, "Set E2E_RUN_VS4=1 to enable VS4 smoke flow.");

  test("manager creates membership and adjusts hours", async ({ page }) => {
    const studentName = `QA Membership ${Date.now()}`;

    await createStudentIntake(page, studentName);
    await page.context().clearCookies();

    await login(page, "manager");
    await approveIntake(page, studentName);
    await assignTutor(page);
    await openStudentMembership(page, studentName);

    await createMembership(page, {
      planType: "monthly",
      status: "active",
      hoursTotal: "10",
      hoursRemaining: "10",
      renewalDate: "2026-02-28",
      notes: "QA membership setup",
    });

    await adjustMembershipHours(page, "-2", "Makeup session");
    await expect(page.getByTestId("membership-hours-remaining")).toHaveText(/8/);
    await expect(page.getByTestId("membership-adjustment-history")).toContainText(
      "Makeup session"
    );
  });

  test("tutor can view hours but cannot edit", async ({ page }) => {
    const studentName = `QA Tutor View ${Date.now()}`;

    await createStudentIntake(page, studentName);
    await page.context().clearCookies();

    await login(page, "manager");
    await approveIntake(page, studentName);
    await assignTutor(page);
    await openStudentMembership(page, studentName);
    await createMembership(page, {
      planType: "monthly",
      status: "active",
      hoursTotal: "6",
      hoursRemaining: "6",
      renewalDate: "2026-02-28",
    });

    await page.context().clearCookies();
    await login(page, "tutor");
    await page.goto(`${baseUrl}/tutor/students`);

    const studentRow = page.getByRole("row", { name: new RegExp(studentName) });
    await expect(studentRow).toBeVisible();
    await expect(studentRow.getByTestId("tutor-hours-remaining")).toHaveText(/6/);
    await expect(page.getByTestId("membership-form")).toHaveCount(0);
    await expect(page.getByTestId("membership-adjust-open")).toHaveCount(0);
  });

  test("customer sees membership for own student only", async ({ page }) => {
    const studentName = `QA Customer View ${Date.now()}`;

    await createStudentIntake(page, studentName);
    await page.context().clearCookies();

    await login(page, "manager");
    await approveIntake(page, studentName);
    await openStudentMembership(page, studentName);
    await createMembership(page, {
      planType: "monthly",
      status: "active",
      hoursTotal: "12",
      hoursRemaining: "12",
      renewalDate: "2026-02-28",
    });

    await page.context().clearCookies();
    await login(page, "customer");
    await page.goto(`${baseUrl}/customer/membership`);

    const membershipList = page.getByTestId("customer-membership-list");
    await expect(membershipList).toBeVisible();
    const membershipRow = membershipList.getByRole("row", {
      name: new RegExp(studentName),
    });
    await expect(membershipRow).toBeVisible();
    await expect(membershipRow).toHaveText(/12/);
    await expect(page.getByTestId("membership-form")).toHaveCount(0);
    await expect(page.getByTestId("membership-adjust-open")).toHaveCount(0);

    const otherStudentName = process.env.E2E_OTHER_STUDENT_NAME;
    if (otherStudentName) {
      await expect(page.getByText(otherStudentName)).toHaveCount(0);
    }
  });

  test("completing a session decrements hours exactly once", async ({ page }) => {
    const studentName = `QA Billing ${Date.now()}`;

    await createStudentIntake(page, studentName);
    await page.context().clearCookies();

    await login(page, "manager");
    await approveIntake(page, studentName);
    await assignTutor(page);
    await createSession(page);
    await openStudentMembership(page, studentName);
    await createMembership(page, {
      planType: "monthly",
      status: "active",
      hoursTotal: "2",
      hoursRemaining: "2",
      renewalDate: "2026-02-28",
    });

    const hoursLocator = page.getByTestId("membership-hours-remaining");
    const startingHours = parseHours(await hoursLocator.textContent());
    const expectedHours = startingHours - 1;

    await openIntakeReview(page, studentName);
    const sessionRow = page
      .getByRole("row")
      .filter({ has: page.locator('[data-testid^="session-complete-"]') })
      .first();
    const completeButton = sessionRow.locator(
      '[data-testid^="session-complete-"]'
    );
    await expect(completeButton).toBeVisible();
    await completeButton.click();
    await expect(sessionRow).toContainText("Billed");

    await openStudentMembership(page, studentName);
    await expect(page.getByTestId("membership-hours-remaining")).toHaveText(
      new RegExp(`\\b${expectedHours}\\b`)
    );

    await openIntakeReview(page, studentName);
    await expect(
      sessionRow.locator('[data-testid^="session-bill-"]')
    ).toHaveCount(0);
    await expect(sessionRow).toContainText("Billed");

    await openStudentMembership(page, studentName);
    await expect(page.getByTestId("membership-hours-remaining")).toHaveText(
      new RegExp(`\\b${expectedHours}\\b`)
    );
  });
});
