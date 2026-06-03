/**
 * =============================================================================
 * useTranslation Hook
 * =============================================================================
 * 
 * Tarjima hook - til almashtirish va tarjimalarni olish
 * Хук перевода - переключение языка и получение переводов
 * 
 * Re-exports from TranslationContext for backward compatibility
 */

"use client";

import { useTranslation as useTranslationFromContext } from "@/contexts/TranslationContext";

export function useTranslation() {
  return useTranslationFromContext();
}

export default useTranslation;
