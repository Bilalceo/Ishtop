/**
 * Runtime config helpers.
 *
 * Fail fast when required public env vars are missing so production never
 * falls back to localhost endpoints.
 */

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_URL;

  if (!value || !value.trim()) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  return normalizeUrl(value);
}

export function getBackendOrigin(): string {
  const apiBase = getApiBaseUrl();
  return apiBase.replace(/\/api\/v1\/?$/, "");
}

