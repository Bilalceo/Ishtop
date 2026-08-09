/**
 * Runtime config helpers.
 *
 * Fail fast when required public env vars are missing so production never
 * falls back to localhost endpoints.
 */

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function getConfiguredApiUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_URL;

  if (!value || !value.trim()) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return normalizeUrl(value);
}

/**
 * Base URL for all browser data/auth requests.
 *
 * In the browser we intentionally return a SAME-ORIGIN relative path
 * ("/api/v1"). A Next.js rewrite (see next.config.js) proxies /api/* to the
 * real backend. Serving the API from the same origin as the page makes the
 * httpOnly auth cookies strictly first-party, so the session survives Safari
 * ITP, Telegram/Instagram in-app webviews, and third-party-cookie blocking —
 * none of which reliably keep cookies for a separate api.* subdomain.
 *
 * On the server (SSR) there is no "same origin" to speak of, so we fall back to
 * the absolute backend URL.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api/v1";
  }
  return getConfiguredApiUrl();
}

/**
 * Absolute backend origin (e.g. https://api.ishtopuz.uz). Used for full-page
 * navigations that must hit the backend directly — notably the Google OAuth
 * redirect, which cannot go through the same-origin fetch proxy.
 */
export function getBackendOrigin(): string {
  return getConfiguredApiUrl().replace(/\/api\/v1$/, "");
}

