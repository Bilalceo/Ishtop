import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loginViaApi } from "./helpers/auth";

type Json = Record<string, any>;

const APP_URL = "http://127.0.0.1:3000";
const E2E_SEED_FILE = path.join(process.cwd(), "test-results", "e2e-seed.json");

function getSeededSmokeAdmin() {
  try {
    const seed = JSON.parse(readFileSync(E2E_SEED_FILE, "utf8")) as Json;
    const smokeAdmin = seed.smokeAdmin as Json | undefined;
    if (smokeAdmin?.email && smokeAdmin?.password) {
      return { email: String(smokeAdmin.email), password: String(smokeAdmin.password) };
    }
  } catch {
    // Fall through to the legacy admin for externally pre-seeded environments.
  }

  return {
    email: process.env.E2E_ADMIN_EMAIL || "admin@ishtop.uz",
    password: process.env.E2E_ADMIN_PASSWORD || "Admin123!",
  };
}

test.describe("Smoke Expansion", () => {
  test("admin dashboard loads with seeded admin account", async ({ page }) => {
    const admin = getSeededSmokeAdmin();
    await loginViaApi(page, admin.email, admin.password);

    await page.goto(`${APP_URL}/admin`);

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Platformani kuzating/i, {
      timeout: 15000,
    });
    await expect(page.getByText(/Foydalanuvchi statistikasi/i)).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /system health|tizim holati|состояние системы/i,
      })
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test("company job post flow creates and publishes a new job", async ({ page }) => {
    await loginViaApi(page, "acme.hr@example.com", "Company123!");

    const uniqueTitle = `E2E QA Engineer ${Date.now()}`;

    await page.goto(`${APP_URL}/company/jobs/new`);

    await expect(page).toHaveURL(/\/company\/jobs\/new/);

    await page.locator("#title").fill(uniqueTitle);
    await page.locator("#location").fill("Tashkent, Uzbekistan");
    await page.getByRole("button", { name: /Keyingi|Next/i }).first().click({ force: true });

    const descriptionText =
      "We are looking for a QA engineer who can write reliable automated tests, collaborate with product teams, and improve release quality.";
    const legacyDescriptionField = page.getByPlaceholder(/Lavozim haqida batafsil ma'lumot/i);
    const hasLegacyDescriptionField = (await legacyDescriptionField.count()) > 0;
    if (hasLegacyDescriptionField) {
      await legacyDescriptionField.fill(descriptionText);
    } else {
      // Rich-text editor path (React Quill contenteditable area).
      await page.locator(".ql-editor[contenteditable='true']").first().fill(descriptionText);
    }
    await page.getByRole("button", { name: /Keyingi|Next/i }).first().click({ force: true });

    await page.getByPlaceholder(/Nomzodga qo'yiladigan talablar/i).fill(
      "Manual testing, automated testing, test design, bug reporting, regression analysis, API testing."
    );
    await page.getByPlaceholder(/Ko'nikma qo'shish/i).fill("Testing");
    await page.getByRole("button", { name: /Qo'shish|Add/i }).click();
    await page.getByRole("button", { name: /Keyingi|Next/i }).first().click({ force: true });

    await page.getByRole("button", { name: /E'lon qilish|Publish/i }).first().click({ force: true });

    await expect(page).toHaveURL(/\/company\/jobs/);
    await expect(page.getByText(uniqueTitle).first()).toBeVisible({ timeout: 15000 });
  });
});
