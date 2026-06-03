/**
 * =============================================================================
 * TRANSLATION CONTEXT
 * =============================================================================
 * 
 * Tarjima konteksti - til holatini barcha komponentlar aro ulashish
 * Контекст перевода - общее состояние языка для всех компонентов
 */

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Locale, locales, defaultLocale, getPreferredLocale, setLocale as saveLocale } from "@/lib/i18n";
import { uz } from "@/lib/i18n/translations/uz";
import { ru } from "@/lib/i18n/translations/ru";

// Translation type
type TranslationType = typeof uz;

const translations: Record<Locale, TranslationType> = {
  uz,
  ru,
};

// Get nested value from object by path
function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let value: unknown = obj;
  
  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  
  return typeof value === "string" ? value : undefined;
}

function humanizeKey(path: string): string {
  const lastSegment = path.split(".").pop() || path;
  return lastSegment
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}

// Replace template variables
function replaceVariables(text: string, variables?: Record<string, string | number>): string {
  if (!variables) return text;
  
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key]?.toString() ?? match;
  });
}

// Context type
interface TranslationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  translations: TranslationType;
  isLoading: boolean;
  locales: readonly Locale[];
}

// Create context
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Provider component
export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize locale from localStorage
  useEffect(() => {
    const preferred = getPreferredLocale();
    setLocaleState(preferred);
    setIsLoading(false);
  }, []);

  // Change locale
  const setLocale = useCallback((newLocale: Locale) => {
    if (locales.includes(newLocale)) {
      setLocaleState(newLocale);
      saveLocale(newLocale);
    }
  }, []);

  // Get translation
  const t = useCallback(
    (key: string, variables?: Record<string, string | number>): string => {
      const translation =
        getNestedValue(translations[locale], key) ??
        getNestedValue(translations[defaultLocale], key) ??
        humanizeKey(key);

      if (process.env.NODE_ENV !== "production" && !getNestedValue(translations[locale], key)) {
        console.warn(`[i18n] Missing translation key for locale "${locale}": ${key}`);
      }

      return replaceVariables(translation, variables);
    },
    [locale]
  );

  // Get current translations object
  const translationsObj = useMemo(() => translations[locale], [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      translations: translationsObj,
      isLoading,
      locales,
    }),
    [locale, setLocale, t, translationsObj, isLoading]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

// Hook to use translation context
export function useTranslation() {
  const context = useContext(TranslationContext);

  // Keep hook order stable even when context is missing.
  const [fallbackLocale, setFallbackLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return getPreferredLocale();
    }
    return defaultLocale;
  });

  const fallbackSetLocale = useCallback((newLocale: Locale) => {
    if (locales.includes(newLocale)) {
      setFallbackLocaleState(newLocale);
      saveLocale(newLocale);
    }
  }, []);

  const fallbackT = useCallback(
    (key: string, variables?: Record<string, string | number>): string => {
      const translation =
        getNestedValue(translations[fallbackLocale], key) ??
        getNestedValue(translations[defaultLocale], key) ??
        humanizeKey(key);
      return replaceVariables(translation, variables);
    },
    [fallbackLocale]
  );

  const fallbackValue = useMemo(
    () => ({
      locale: fallbackLocale,
      setLocale: fallbackSetLocale,
      t: fallbackT,
      translations: translations[fallbackLocale],
      isLoading: false,
      locales,
    }),
    [fallbackLocale, fallbackSetLocale, fallbackT]
  );

  if (context !== undefined) {
    return context;
  }

  // Fallback for components outside provider.
  console.warn("useTranslation must be used within a TranslationProvider");
  return fallbackValue;
}

export default TranslationProvider;













