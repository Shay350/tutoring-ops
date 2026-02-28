import { expect, test, type Page } from "@playwright/test";

const shouldRun = process.env.E2E_RUN_VS11 === "1";
const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const seededEmailByRole: Record<"admin" | "manager" | "customer", string> = {
  admin: "admin@tutorops.local",
  manager: "manager@tutorops.local",
  customer: "parent1@tutorops.local",
};

async function login(
  page: Page,
  role: "admin" | "manager" | "customer"
): Promise<void> {
  const email = process.env[`E2E_${role.toUpperCase()}_EMAIL`] ?? seededEmailByRole[role];
  const password = process.env[`E2E_${role.toUpperCase()}_PASSWORD`] ?? "Password123!";

  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForLoadState("networkidle");
}

test.describe("@smoke VS11 admin boundary coverage", () => {
  test.skip(!shouldRun, "Set E2E_RUN_VS11=1 to enable VS11 coverage.");

  test("admin can access /admin and view admin-owned stats", async ({ page }) => {
    await login(page, "admin");

    await page.goto(`${baseUrl}/admin`);
    await expect(page.getByRole("heading", { name: "Admin portal" })).toBeVisible();
    await expect(page.getByText("Profiles")).toBeVisible();
    await expect(page.getByText("Open invites")).toBeVisible();
    await expect(page.getByText("Active locations")).toBeVisible();

    const statValues = page.locator("p.text-2xl.font-semibold.text-slate-900");
    await expect(statValues.first()).toBeVisible();
    const values = await statValues.allTextContents();
    for (const value of values) {
      expect(Number.isFinite(Number(value.trim()))).toBe(true);
    }
  });

  test("manager is denied from /admin and remains location-scoped", async ({ page }) => {
    await login(page, "manager");

    await page.goto(`${baseUrl}/admin`);
    await page.waitForURL("**/manager");
    await expect(page).toHaveURL(/\/manager$/);

    await page.goto(`${baseUrl}/manager/schedule`);
    const locationFilter = page.getByTestId("schedule-location-select");
    await expect(locationFilter).toBeVisible();

    const options = await locationFilter
      .locator("option")
      .allTextContents();
    const cleaned = options.map((value) => value.trim()).filter(Boolean);
    expect(cleaned).toContain("Milton");
    expect(cleaned).not.toContain("Mississauga");
    expect(cleaned).not.toContain("Oakville");
  });

  test("customer self-access remains unchanged", async ({ page }) => {
    await login(page, "customer");

    await page.goto(`${baseUrl}/customer`);
    await expect(page).toHaveURL(/\/customer$/);
    await expect(page.getByText("Customer").first()).toBeVisible();

    await page.goto(`${baseUrl}/admin`);
    await page.waitForURL("**/customer");
    await expect(page).toHaveURL(/\/customer$/);
  });
});
