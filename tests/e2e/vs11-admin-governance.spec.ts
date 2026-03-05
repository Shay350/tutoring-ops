import { expect, test, type Page } from "@playwright/test";

const shouldRun = process.env.E2E_RUN_VS11 === "1";
const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function login(page: Page): Promise<void> {
  const email = process.env.E2E_ADMIN_EMAIL ?? "admin@tutorops.local";
  const password = process.env.E2E_ADMIN_PASSWORD ?? "Password123!";

  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForLoadState("networkidle");
}

test.describe("@smoke VS11 admin governance", () => {
  test.skip(!shouldRun, "Set E2E_RUN_VS11=1 to enable VS11 governance coverage.");

  test("admin can use governance routes and receives safeguard feedback", async ({ page }) => {
    await login(page);

    await page.goto(`${baseUrl}/admin/invites`);
    await expect(page.getByTestId("admin-invites-page")).toBeVisible();
    await page.getByTestId("admin-invite-email").fill(`vs11-${Date.now()}@example.com`);
    await page.getByTestId("admin-invite-role").selectOption("tutor");
    await page.getByTestId("admin-invite-submit").click();
    await expect(page.getByTestId("admin-invite-message")).toContainText("Invite");

    await page.goto(`${baseUrl}/admin/locations`);
    await expect(page.getByTestId("admin-locations-page")).toBeVisible();

    await page.goto(`${baseUrl}/admin/access`);
    await expect(page.getByTestId("admin-access-page")).toBeVisible();

    const managerRoleForm = page.locator('form[data-testid^="admin-access-row-"]:has-text("manager@tutorops.local")').first();
    await expect(managerRoleForm).toBeVisible();

    await managerRoleForm.locator('select[name="next_role"]').selectOption("tutor");
    await managerRoleForm.getByRole("button", { name: "Save role" }).click();
    await expect(managerRoleForm.locator('[data-testid^="admin-role-message-"]')).toContainText("[CONFIRMATION_REQUIRED]");

    await managerRoleForm.locator('input[name="confirm_role_change"]').check();
    await managerRoleForm.getByRole("button", { name: "Save role" }).click();
    await expect(managerRoleForm.locator('[data-testid^="admin-role-message-"]')).toContainText("Role");
  });
});
