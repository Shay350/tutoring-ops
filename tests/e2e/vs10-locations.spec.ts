import { expect, test, type Page } from "@playwright/test";

const shouldRun = process.env.E2E_RUN_VS10 === "1";
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

test.describe("@smoke VS10 manager locations admin", () => {
  test.skip(!shouldRun, "Set E2E_RUN_VS10=1 to enable VS10 locations flow.");

  test("manager can create and edit locations", async ({ page }) => {
    const createdName = `QA Location ${Date.now()}`;
    const updatedName = `${createdName} Updated`;
    const createdNotes = "Initial QA note";
    const updatedNotes = "Updated QA note";

    await login(page, "manager");
    await page.goto(`${baseUrl}/manager/locations`);

    await expect(page.getByRole("heading", { name: "Locations" })).toBeVisible();
    await expect(page.getByTestId("location-create")).toBeVisible();
    await expect(page.getByTestId("locations-list")).toBeVisible();

    await page.getByTestId("location-create").getByTestId("location-name").fill(createdName);
    await page.getByTestId("location-create").getByLabel("Notes").fill(createdNotes);
    await expect(
      page.getByTestId("location-create").getByTestId("location-active")
    ).toBeChecked();
    await page.getByTestId("location-create").getByTestId("location-save").click();

    await expect(page.getByText("Location created.")).toBeVisible();
    const row = page.getByTestId("location-row").filter({ hasText: createdName });
    await expect(row).toBeVisible();

    await row.getByTestId("location-name").fill(updatedName);
    await row.getByLabel("Notes").fill(updatedNotes);
    await row.getByTestId("location-active").uncheck();
    await row.getByTestId("location-save").click();
    await expect(row.getByText("Location updated.")).toBeVisible();
    await expect(row.getByTestId("location-name")).toHaveValue(updatedName);
    await expect(row.getByLabel("Notes")).toHaveValue(updatedNotes);
    await expect(row.getByTestId("location-active")).not.toBeChecked();
  });
});
