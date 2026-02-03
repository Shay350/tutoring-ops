import { test, expect, type Page } from "@playwright/test";

const shouldRun = process.env.E2E_RUN_VS5 === "1";
const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function login(page: Page, role: "customer" | "manager" | "tutor") {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`];
  const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`];

  if (!email || !password) {
    throw new Error(`Missing E2E credentials for ${role}`);
  }

  await loginWithCredentials(page, email, password);
}

async function loginWithCredentials(page: Page, email: string, password: string) {
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
  await page.getByTestId("intake-student-grade").fill("8");
  await page.getByTestId("intake-subjects").fill("Math");
  await page.getByTestId("intake-availability").fill("Weekdays after 5pm");
  await page.getByTestId("intake-goals").fill("Improve grades");
  await page.getByTestId("intake-location").fill("Seattle, WA");
  await page.getByTestId("intake-submit").click();
  await expect(page.getByTestId("intake-success")).toBeVisible();
}

async function approveIntake(page: Page, studentName: string) {
  await page.goto(`${baseUrl}/manager/pipeline`);
  await expect(page.getByTestId("intake-list")).toBeVisible();
  await page.getByTestId("intake-search").fill(studentName);
  const intakeRow = page
    .getByTestId("intake-row")
    .filter({ hasText: studentName });
  await expect(intakeRow).toBeVisible();
  await intakeRow.getByTestId("intake-approve").click();
  await expect(page.getByTestId("intake-approved")).toHaveText(/approved/i);
}

test.describe("@smoke VS5 messaging", () => {
  test.skip(!shouldRun, "Set E2E_RUN_VS5=1 to enable VS5 messaging flow.");

  test("customer sends message and manager replies", async ({ page }) => {
    const studentName = `QA Msg ${Date.now()}`;

    await createStudentIntake(page, studentName);
    await page.context().clearCookies();

    await login(page, "manager");
    await approveIntake(page, studentName);
    await page.context().clearCookies();

    await login(page, "customer");
    await page.goto(`${baseUrl}/customer`);
    const studentRow = page.getByRole("row", { name: new RegExp(studentName) });
    await expect(studentRow).toBeVisible();
    await studentRow.getByRole("link", { name: "Message" }).click();

    await expect(page.getByTestId("message-body")).toBeVisible();
    await page.getByTestId("message-body").fill("Hello from customer");
    await page.getByTestId("message-send").click();
    await expect(page.getByText("Hello from customer")).toBeVisible();

    await page.context().clearCookies();

    await login(page, "manager");
    await page.goto(`${baseUrl}/manager/messages`);

    const threadLink = page.getByRole("link", { name: new RegExp(studentName) });
    await expect(threadLink).toBeVisible();
    await expect(threadLink.getByTestId("thread-unread")).toBeVisible();

    await threadLink.click();
    await expect(page.getByText("Hello from customer")).toBeVisible();

    await page.getByTestId("message-body").fill("Thanks for the update!");
    await page.getByTestId("message-send").click();
    await expect(page.getByText("Thanks for the update!")).toBeVisible();
  });

  test("unread indicator clears after opening thread", async ({ page }) => {
    const studentName = `QA Unread ${Date.now()}`;

    await createStudentIntake(page, studentName);
    await page.context().clearCookies();

    await login(page, "manager");
    await approveIntake(page, studentName);
    await page.context().clearCookies();

    await login(page, "customer");
    await page.goto(`${baseUrl}/customer`);
    const studentRow = page.getByRole("row", { name: new RegExp(studentName) });
    await expect(studentRow).toBeVisible();
    await studentRow.getByRole("link", { name: "Message" }).click();

    await page.getByTestId("message-body").fill("Unread check message");
    await page.getByTestId("message-send").click();
    await expect(page.getByText("Unread check message")).toBeVisible();

    await page.context().clearCookies();

    await login(page, "manager");
    await page.goto(`${baseUrl}/manager/messages`);

    const threadLink = page.getByRole("link", { name: new RegExp(studentName) });
    await expect(threadLink.getByTestId("thread-unread")).toBeVisible();

    await threadLink.click();
    await expect(page.getByText("Unread check message")).toBeVisible();

    await expect(
      page.getByRole("link", { name: new RegExp(studentName) }).getByTestId("thread-unread")
    ).toHaveCount(0);
  });

  test("customer cannot access another customer thread", async ({ page }) => {
    const otherEmail = process.env.E2E_OTHER_CUSTOMER_EMAIL;
    const otherPassword = process.env.E2E_OTHER_CUSTOMER_PASSWORD;

    if (!otherEmail || !otherPassword) {
      test.skip(true, "Missing other customer credentials for isolation test.");
    }

    const otherStudentName = `QA Other ${Date.now()}`;

    await loginWithCredentials(page, otherEmail!, otherPassword!);
    await page.goto(`${baseUrl}/customer/intake`);

    await page.getByTestId("intake-student-name").fill(otherStudentName);
    await page.getByTestId("intake-student-grade").fill("6");
    await page.getByTestId("intake-subjects").fill("English");
    await page.getByTestId("intake-availability").fill("Weekends");
    await page.getByTestId("intake-goals").fill("Writing practice");
    await page.getByTestId("intake-location").fill("Denver, CO");
    await page.getByTestId("intake-submit").click();
    await expect(page.getByTestId("intake-success")).toBeVisible();
    await page.context().clearCookies();

    await login(page, "manager");
    await approveIntake(page, otherStudentName);
    await page.context().clearCookies();

    await loginWithCredentials(page, otherEmail!, otherPassword!);

    await page.goto(`${baseUrl}/customer`);
    const otherRow = page.getByRole("row", { name: new RegExp(otherStudentName) });
    await expect(otherRow).toBeVisible();
    await otherRow.getByRole("link", { name: "Message" }).click();

    await page.getByTestId("message-body").fill("Private thread");
    await page.getByTestId("message-send").click();
    await expect(page.getByText("Private thread")).toBeVisible();

    const otherThreadUrl = page.url();
    const match = otherThreadUrl.match(/thread=([^&]+)/);
    const otherThreadId = match?.[1];
    expect(otherThreadId).toBeTruthy();

    await page.context().clearCookies();

    await login(page, "customer");
    await page.goto(`${baseUrl}/customer/messages?thread=${otherThreadId}`);

    await expect(page.getByText("Private thread")).toHaveCount(0);
    await expect(page.getByText(otherStudentName)).toHaveCount(0);
  });
});
