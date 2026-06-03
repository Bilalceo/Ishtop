/**
 * E2E auth helpers — cookie-aware.
 *
 * The app moved to `Stage 2 cookie-only browser auth` (see api.ts): the
 * httpOnly `access_token` / `refresh_token` cookies are the single source
 * of truth for browser sessions. Bearer headers and localStorage tokens
 * are no longer consulted.
 *
 * loginViaApi() POSTs /auth/login through the BrowserContext's request
 * API, so the Set-Cookie response lands directly in the cookie jar the
 * page will use for subsequent navigations. We also pre-seed Zustand's
 * persisted `auth-storage` (current version = 3, partialize keeps only
 * { user, isAuthenticated }) so guards don't redirect during rehydration.
 */
import type { Page } from "@playwright/test";

type LoginResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: Record<string, unknown>;
  [k: string]: unknown;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

/**
 * Login via the backend API using the page's BrowserContext request, so
 * Set-Cookie populates the same cookie jar the browser will send.
 *
 * Throws with the backend body on non-2xx. Retries 429 with Retry-After.
 */
export async function loginViaApi(
  page: Page,
  email: string,
  password: string,
): Promise<LoginResponse> {
  let last: any = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    last = await page.context().request.post(`${API_URL}/auth/login`, {
      data: { email, password },
      headers: { "content-type": "application/json" },
    });
    if (last.ok()) break;
    if (last.status() === 429 && attempt < 6) {
      const retryAfter = Number(last.headers()["retry-after"] || "3");
      await new Promise((r) => setTimeout(r, Math.max(1, retryAfter) * 1000));
      continue;
    }
    break;
  }
  if (!last?.ok()) {
    const body = last ? await last.text() : "";
    throw new Error(`login failed for ${email} (${last?.status?.()}): ${body}`);
  }
  const data = (await last.json()) as LoginResponse;

  // Pre-seed Zustand's persisted auth-storage so the dashboard guards
  // don't flash a redirect to /login during rehydration. Persist shape
  // mirrors authStore.ts: name "auth-storage", version 3, partialize
  // keeps only { user, isAuthenticated }.
  const storageValue = JSON.stringify({
    state: { user: data.user, isAuthenticated: true },
    version: 3,
  });
  await page.addInitScript((value) => {
    if (typeof value === "string") {
      try {
        window.localStorage.setItem("auth-storage", value);
      } catch {
        // ignore — fresh contexts always allow localStorage
      }
    }
  }, storageValue);

  return data;
}

/**
 * Clear the session both server-side (cookies) and client-side
 * (localStorage). Mirrors what the in-app logout button does end-to-end:
 * POST /auth/logout invalidates and clears cookies, then we clear the
 * persisted user metadata so the next navigation hits the guard.
 */
export async function logoutViaApi(page: Page): Promise<void> {
  try {
    await page.context().request.post(`${API_URL}/auth/logout`);
  } catch {
    // Even if logout request fails (no session), continue to clear locally.
  }
  // Force-clear the cookie jar in case the backend's Set-Cookie clear
  // headers didn't reach this context (e.g. on hard failure paths).
  await page.context().clearCookies();
  await page
    .evaluate(() => {
      try {
        window.localStorage.removeItem("auth-storage");
      } catch {
        /* noop */
      }
    })
    .catch(() => {
      /* page may not be loaded yet */
    });
}
