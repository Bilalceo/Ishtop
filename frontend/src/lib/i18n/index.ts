/**
 * =============================================================================
 * INTERNATIONALIZATION (i18n) CONFIGURATION
 * =============================================================================
 * 
 * O'zbekiston uchun ko'p tilli qo'llab-quvvatlash
 * Поддержка многоязычности для Узбекистана
 * 
 * Languages:
 * - uz: O'zbek tili (Uzbek)
 * - ru: Русский язык (Russian)
 */

export const locales = ["uz", "ru"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "uz";

export const localeNames: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
};

export const localeFlags: Record<Locale, string> = {
  uz: "🇺🇿",
  ru: "🇷🇺",
};

// Get browser language or default
export function getPreferredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  
  const stored = localStorage.getItem("locale");
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale;
  }
  
  const browserLang = navigator.language.split("-")[0];
  if (browserLang === "ru") return "ru";
  
  return defaultLocale;
}

// Save locale preference
export function setLocale(locale: Locale) {
  if (typeof window !== "undefined") {
    localStorage.setItem("locale", locale);
  }
}













