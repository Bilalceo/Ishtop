"use client";

import { useAuthStore } from "@/store/authStore";

/**
 * Auth-aware CTA target for the public landing page.
 *
 * `showAuthed` is only true once the session has been restored from the cookie
 * (hasHydrated) AND the visitor is authenticated — so SSR / first paint match
 * and logged-out visitors never flash the wrong control. `dashboardHref` is the
 * visitor's role home.
 */
export function useDashboardCta() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const role = useAuthStore((s) => s.user?.role);

  const showAuthed = hasHydrated && isAuthenticated;
  const dashboardHref =
    role === "company" ? "/company" : role === "admin" ? "/admin" : "/student";

  return { showAuthed, dashboardHref };
}

/** Localized "go to dashboard" label. */
export function dashboardLabel(locale: string): string {
  return locale === "ru"
    ? "Личный кабинет"
    : locale === "en"
      ? "Dashboard"
      : "Boshqaruv paneli";
}
