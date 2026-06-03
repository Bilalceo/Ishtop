import { test, expect } from '@playwright/test';
import { loginViaApi, logoutViaApi } from './helpers/auth';

/**
 * =============================================================================
 * Authentication E2E Tests
 * =============================================================================
 * 
 * Tests for user authentication flows:
 * - Landing page
 * - Registration
 * - Login
 * - Logout
 */

test.describe('Authentication Flow', () => {
  async function goToRegisterCredentialsStep(page: any) {
    await page.goto('/register');
    await page
      .getByRole('button', { name: /ish izlovchiman|job seeker|соискатель/i })
      .first()
      .click();
    await page.getByRole('button', { name: /davom|continue|next|далее/i }).click();
    await expect(page.locator('input[name="email"]').first()).toBeVisible();
  }

  async function submitLoginAndWait(page: any) {
    const loginResponsePromise = page.waitForResponse(
      (res: any) =>
        res.url().includes('/api/v1/auth/login') &&
        res.request().method() === 'POST'
    );
    await page.locator('form button[type="submit"]').click();
    const response = await loginResponsePromise;
    return response;
  }

  async function submitLoginWithRetry(page: any, maxAttempts = 6) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await submitLoginAndWait(page);
      if (response.ok()) return response;

      if (response.status() === 429 && attempt < maxAttempts) {
        const retryAfterHeader = response.headers()['retry-after'];
        const retryAfterSeconds = Number(retryAfterHeader || '3');
        await page.waitForTimeout(Math.max(1, retryAfterSeconds) * 1000);
        continue;
      }

      return response;
    }

    throw new Error('Login retry attempts exhausted');
  }

  test.beforeEach(async ({ page }) => {
    // Go to landing page
    await page.goto('/');
  });

  // ===========================================================================
  // LANDING PAGE
  // ===========================================================================

  test('should display landing page correctly', async ({ page }) => {
    // Brand should be visible in the navbar. The logo is an <Image alt="IshTop">
    // (not text), so assert it via its accessible name / alt text.
    await expect(page.locator('nav').getByAltText(/IshTop/i).first()).toBeVisible();
    
    // Check navigation
    await expect(page.locator('a[href=\"/login\"]').first()).toBeVisible();
    await expect(page.locator('a[href=\"/register\"]').first()).toBeVisible();
    
    // Check CTA buttons
    await expect(page.locator('a[href=\"/register\"]').first()).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('input[name=\"email\"]').first()).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/register');

    await expect(page).toHaveURL('/register');
    await expect(
      page.getByRole('button', { name: /ish izlovchiman|job seeker|соискатель/i }).first()
    ).toBeVisible();
  });

  // ===========================================================================
  // REGISTRATION
  // ===========================================================================

  test('should register new student successfully', async ({ page }) => {
    await goToRegisterCredentialsStep(page);
    
    // Generate unique email
    const timestamp = Date.now();
    const email = `test.student.${timestamp}@example.com`;
    
    // Step 1: credentials
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('TestPassword123!');
    await page.locator('input[name="confirmPassword"]').fill('TestPassword123!');
    await page.getByRole('button', { name: /continue|davom|next|далее/i }).click();

    // Step 2: profile
    await page.locator('input[name="fullName"]').fill('Test Student');
    await page.locator('input[name="phone"]').fill('+998901234567');
    await page.getByRole('button', { name: /create|yarat|создать|hisob/i }).click();
    
    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/\/student/, { timeout: 15000 });
  });

  test('should show error for invalid email', async ({ page }) => {
    await goToRegisterCredentialsStep(page);
    
    await page.locator('input[name="email"]').fill('invalid-email');
    await page.locator('input[name="password"]').fill('TestPassword123!');
    await page.locator('input[name="confirmPassword"]').fill('TestPassword123!');
    await page.getByRole('button', { name: /continue|davom|next|далее/i }).click();

    // Should not advance to step 2
    await expect(page.locator('input[name=\"fullName\"]')).toHaveCount(0);
  });

  test('should show error for weak password', async ({ page }) => {
    await goToRegisterCredentialsStep(page);
    
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="password"]').fill('weak');
    await page.locator('input[name="confirmPassword"]').fill('weak');
    await page.getByRole('button', { name: /continue|davom|next|далее/i }).click();

    // Should not advance to step 2
    await expect(page.locator('input[name=\"fullName\"]')).toHaveCount(0);
  });

  test('should show error for duplicate email', async ({ page }) => {
    await goToRegisterCredentialsStep(page);
    
    // Use known existing email (from seed data)
    await page.locator('input[name="email"]').fill('john@example.com');
    await page.locator('input[name="password"]').fill('Student123!');
    await page.locator('input[name="confirmPassword"]').fill('Student123!');
    await page.getByRole('button', { name: /continue|davom|next|далее/i }).click();

    await page.locator('input[name="fullName"]').fill('Test User');
    await page.locator('input[name="phone"]').fill('+998901234567');
    await page.getByRole('button', { name: /create|yarat|создать|hisob/i }).click();

    await expect(
      page.getByText(/already exists|allaqachon.*mavjud|уже.*существует/i)
    ).toBeVisible({ timeout: 10000 });
  });

  // ===========================================================================
  // LOGIN
  // ===========================================================================

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Use test account from seed data
    await page.locator('input[name=\"email\"]').fill('john@example.com');
    await page.locator('input[name=\"password\"]').fill('Student123!');
    
    const res = await submitLoginWithRetry(page);
    expect(res.ok()).toBeTruthy();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/(student|dashboard)/, { timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Use a separate seeded account so we don't lock the main E2E user.
    await page.locator('input[name=\"email\"]').fill('negative.student@example.com');
    await page.locator('input[name=\"password\"]').fill('WrongPassword123!');
    
    const res = await submitLoginAndWait(page);
    // 401 for invalid creds, 403 if account gets temporarily locked in long multi-browser runs.
    expect([401, 403]).toContain(res.status());
  });

  test('should show error for non-existent user', async ({ page }) => {
    await page.goto('/login');
    
    await page.locator('input[name=\"email\"]').fill('nonexistent@example.com');
    await page.locator('input[name=\"password\"]').fill('SomePassword123!');
    
    const res = await submitLoginAndWait(page);
    // 401 for invalid creds, 403 if account gets temporarily locked in long multi-browser runs.
    expect([401, 403]).toContain(res.status());
  });

  // ===========================================================================
  // LOGOUT
  // ===========================================================================

  test('should logout successfully', async ({ page }) => {
    // Seed a fresh authenticated student to avoid cross-browser rate-limit collisions.
    const email = `logout.student.${Date.now()}@example.com`;
    const password = 'Student123!';
    const registerRes = await page.context().request.post(
      'http://127.0.0.1:8000/api/v1/auth/register',
      {
        data: {
          email,
          password,
          full_name: 'Logout Student',
          phone: '+998901239999',
          role: 'student',
        },
        headers: { 'content-type': 'application/json' },
      },
    );
    expect(registerRes.ok()).toBeTruthy();

    // Login through the same BrowserContext so the httpOnly auth cookies
    // land in the jar the page will use for the protected navigation.
    await loginViaApi(page, email, password);
    await page.goto('/student');
    await expect(page).toHaveURL(/\/student/, { timeout: 10000 });

    // Real logout: hit /auth/logout (server clears Set-Cookie), then
    // also force-clear the context cookies + persisted user metadata.
    await logoutViaApi(page);

    // Navigating to a protected route should now redirect to /login —
    // that's the user-observable signal that logout actually worked.
    await page.goto('/student');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  // ===========================================================================
  // LANGUAGE SWITCHING
  // ===========================================================================

  test('should switch between languages', async ({ page }) => {
    await page.goto('/');
    // Force RU locale via persisted preference and verify translated auth labels.
    await page.evaluate(() => localStorage.setItem('locale', 'ru'));
    await page.reload();
    await expect(page.getByText(/войти|регистрация/i).first()).toBeVisible();

    // Switch back to UZ and verify translated auth labels.
    await page.evaluate(() => localStorage.setItem('locale', 'uz'));
    await page.reload();
    await expect(page.getByText(/kirish|ro'yxatdan/i).first()).toBeVisible();
  });
});






