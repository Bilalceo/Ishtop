import { expect, test } from "@playwright/test";

const APP_URL = "http://127.0.0.1:3000";

const studentAuthState = JSON.stringify({
  state: {
    user: {
      id: "e2e-student",
      email: "e2e.student@example.com",
      full_name: "E2E Student",
      role: "student",
      is_verified: true,
    },
    accessToken: "e2e-token",
    refreshToken: "e2e-refresh-token",
    isAuthenticated: true,
    hasHydrated: true,
  },
  version: 0,
});

const matchedJob = {
  id: "match-job-1",
  company_id: "company-1",
  title: "Explainable Python Developer",
  description:
    "Build reliable APIs and data workflows with a team that values transparent hiring decisions.",
  requirements: {
    skills: ["Python", "FastAPI", "SQL"],
    experience: "2+ years",
    education: "Bachelor preferred",
  },
  salary_min: 1200,
  salary_max: 2400,
  location: "Tashkent",
  job_type: "full_time",
  experience_level: "mid",
  status: "active",
  applications_count: 3,
  views_count: 42,
  trust_score: 86,
  trust_badges: ["verified_company", "clear_salary"],
  trust_factors: [
    {
      code: "company_verified",
      label: "Company verified",
      score: 0.95,
      weight: 0.5,
      state: "strong",
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  company: { name: "Trustworthy Labs" },
};

async function applyStudentAuth(page: any) {
  await page.addInitScript((value) => {
    if (typeof value === "string") {
      localStorage.setItem("auth-storage", value);
    }
    localStorage.setItem("locale", "uz");
  }, studentAuthState);
}

async function mockDashboardChromeRequests(page: any) {
  await page.route(/\/api\/v1\/auth\/refresh$/, (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "No session" }),
    }),
  );
  await page.route(/\/api\/v1\/users\/me$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ resume_count: 1, application_count: 0 }),
    }),
  );
  await page.route(/\/api\/v1\/notifications(?:\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ notifications: [], unread_count: 0 }),
    }),
  );
  await page.route(/\/api\/v1\/jobs\/saved(?:\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );
}

test.describe("Discovery and explainability UX", () => {
  test("discovery city route renders crawlable job content", async ({
    page,
  }) => {
    await page.goto(`${APP_URL}/jobs/city/tashkent`);

    await expect(page).toHaveURL(/\/jobs\/city\/tashkent/);
    await expect(
      page.getByRole("heading", { level: 1, name: /ish o.rinlari/i }),
    ).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText(/faol vakansiya|ishonch/i).first(),
    ).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("link", { name: /ariza berish|ochish/i }).first(),
    ).toBeVisible();
  });

  test("student matched jobs expose trust and explainability, and emit a view event", async ({
    page,
  }) => {
    await applyStudentAuth(page);
    await mockDashboardChromeRequests(page);
    await page.setViewportSize({ width: 1600, height: 900 });

    let explainabilityEventSeen = false;

    await page.route(/\/api\/v1\/jobs(?:\?|$)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jobs: [], total: 0, page: 1, total_pages: 1 }),
      }),
    );
    await page.route(/\/api\/v1\/resumes(?:\?|$)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          resumes: [
            {
              id: "resume-1",
              title: "Published Resume",
              updated_at: new Date().toISOString(),
            },
          ],
        }),
      }),
    );
    await page.route(/\/api\/v1\/jobs\/match$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          matches: [
            {
              job: matchedJob,
              match_score: 91,
              explainability: {
                confidence: "high",
                fit_reasons: [
                  "Your Python and FastAPI skills match the core requirements.",
                ],
                missing_items: ["Docker"],
                improvement_plan: {
                  d7: ["Review Docker basics"],
                  d14: [],
                  d30: [],
                },
              },
            },
          ],
        }),
      }),
    );
    await page.route(/\/api\/v1\/jobs\/events$/, async (route) => {
      const body = route.request().postDataJSON() as { event_name?: string };
      if (body.event_name === "view_explainability")
        explainabilityEventSeen = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(`${APP_URL}/student/jobs`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /mos ishlar|подходящие/i }).click();

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Explainable Python Developer/i,
      }),
    ).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/91%/).first()).toBeVisible();
    await expect(
      page.getByText(/86\s+ishonch|86\s+доверие/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Nega mos|Почему подходит/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Python and FastAPI skills/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /Ishonch ko'rsatkichlari|Показатели доверия/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /Nima uchun bu ish sizga mos|Почему эта вакансия вам подходит/i,
      }),
    ).toBeVisible();
    await expect.poll(() => explainabilityEventSeen).toBe(true);
  });

  test("student jobs page handles empty results without a hard failure", async ({
    page,
  }) => {
    await applyStudentAuth(page);
    await mockDashboardChromeRequests(page);

    await page.route(/\/api\/v1\/jobs(?:\?|$)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ jobs: [], total: 0, page: 1, total_pages: 1 }),
      }),
    );

    await page.goto(`${APP_URL}/student/jobs`, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/student\/jobs/);
    await expect(
      page.getByText(/Ishlar topilmadi|Вакансии не найдены/i),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", {
        name: /Filtrlarni tozalash|Сбросить фильтры/i,
      }),
    ).toBeVisible();
  });

  test("student jobs page exposes retry UI while loading takes too long", async ({
    page,
  }) => {
    await applyStudentAuth(page);
    await mockDashboardChromeRequests(page);

    await page.route(/\/api\/v1\/jobs(?:\?|$)/, () => {
      // Keep the list request pending long enough for the UI timeout affordance to render.
    });

    await page.goto(`${APP_URL}/student/jobs`, { waitUntil: "domcontentloaded" });

    await expect(
      page.getByText(
        /Yuklash odatdagidan uzoq|Загрузка занимает больше обычного/i,
      ),
    ).toBeVisible({
      timeout: 9000,
    });
    await expect(
      page.getByRole("button", { name: /Qayta urinish|Повторить/i }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/student\/jobs/);
  });
});
