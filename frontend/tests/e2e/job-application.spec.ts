import { test, expect } from "@playwright/test";
import { loginViaApi } from "./helpers/auth";

/**
 * =============================================================================
 * Job Application E2E Tests (Aligned With Current UI)
 * =============================================================================
 *
 * This suite focuses on the real user journey that is implemented today:
 * - Login as student
 * - Browse jobs (list page)
 * - Open job details page
 * - Apply via the multi-step application page
 * - Verify applications page loads
 */

const APP_URL = "http://127.0.0.1:3000";

async function fetchJobs(request: any) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
  const res = await request.get(`${apiBase}/jobs?limit=50&page=1`);
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  // Support both shapes: { jobs: [...] } or { data: { jobs: [...] } } or list.
  const jobs = (data?.jobs ?? data?.data?.jobs ?? data?.data ?? data) as any[];
  return Array.isArray(jobs) ? jobs : [];
}

test.describe("Job Application Flow", () => {
  // Cookie-only auth: re-login per test so each fresh BrowserContext gets
  // its own Set-Cookie. The shared `beforeAll` localStorage seeding was
  // broken because it didn't carry the httpOnly access_token cookie that
  // the server now actually checks.
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, "john@example.com", "Student123!");
  });

  test("should display jobs list", async ({ page }) => {
    await page.goto(`${APP_URL}/student/jobs`);
    await expect(page.getByText(/No jobs found/i)).toHaveCount(0);
    await expect(page.getByText(/Senior Software Engineer|Python Developer/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("should search for jobs", async ({ page }) => {
    await page.goto(`${APP_URL}/student/jobs`);
    const searchInput = page.getByPlaceholder(
      /Search jobs, companies, skills|Vakansiya, kompaniya, ko'nikmalarni qidiring|Ищите вакансии, компании и навыки/i
    );
    await searchInput.fill("Python");

    await expect(page.getByText(/Python Developer/i).first()).toBeVisible({ timeout: 15000 });
  });

  test("should view job details page", async ({ page, request }) => {
    const jobs = await fetchJobs(request);
    expect(jobs.length).toBeGreaterThan(0);

    const jobId = jobs[0].id as string;
    await page.goto(`${APP_URL}/student/jobs/${jobId}`);

    // Current job details page is in Uzbek; assert the key sections exist.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Ish tavsifi/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Talablar/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ariza berish/i }).first()).toBeVisible();
  });

  test("should apply to a job successfully", async ({ page, request }) => {
    const jobs = await fetchJobs(request);
    expect(jobs.length).toBeGreaterThan(0);

    // Prefer the seeded job that is meant for applying.
    const target = jobs.find((j) => String(j.title || "").toLowerCase().includes("python")) ?? jobs[0];
    const jobId = target.id as string;

    await page.goto(`${APP_URL}/student/jobs/${jobId}/apply`);

    // Step 1: select resume
    await expect(page.getByText(/Select a Resume|Rezyumeni tanlang|Выберите резюме/i)).toBeVisible({ timeout: 15000 });
    const resumeCard = page
      .getByText(/John Doe Resume/i)
      .first()
      .locator('xpath=ancestor::*[contains(@class,"cursor-pointer")]')
      .first();
    await resumeCard.click();
    await page.getByRole("button", { name: /Next|Keyingi|Далее/i }).click();

    // Step 2: cover letter is optional
    await page.getByRole("button", { name: /Next|Keyingi|Далее/i }).click();

    // Step 3: answer required questions (q1 textarea + q3 select)
    await page.locator("textarea").first().fill("I am excited about this role and I can contribute immediately.");
    await page.locator("select").first().selectOption({ index: 1 });
    await page.getByRole("button", { name: /Next|Keyingi|Далее/i }).click();

    // Step 4: submit
    const submitResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/applications/apply") &&
        res.request().method() === "POST"
    );
    await page.getByRole("button", { name: /Submit Application|Arizani yuborish|Отправить заявку/i }).click();
    const submitResponse = await submitResponsePromise;
    expect([201, 409]).toContain(submitResponse.status());
  });

  test("should view my applications", async ({ page }) => {
    await page.goto(`${APP_URL}/student/applications`);
    await expect(page.getByRole("heading", { name: /Arizalarim|Мои заявки|My Applications/i })).toBeVisible();
  });
});
