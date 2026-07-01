/**
 * =============================================================================
 * LANGUAGE SWITCHER COMPONENT
 * =============================================================================
 *
 * Til almashtirgich komponenti
 * Компонент переключения языка
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { localeNames, localeFlags, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  variant?: "default" | "minimal" | "dropdown";
  className?: string;
  /** Which edge the dropdown aligns to. Use "left" when the trigger sits near
   *  the left edge (e.g. the mobile menu) so the panel doesn't overflow. */
  align?: "left" | "right";
}

export function LanguageSwitcher({
  variant = "default",
  className,
  align = "right",
}: LanguageSwitcherProps) {
  const { locale, setLocale, locales } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Minimal variant - just flags
  if (variant === "minimal") {
    const shortLabels: Record<Locale, string> = {
      uz: "UZ",
      ru: "RU",
    };
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 text-lg rounded-md transition-all",
              locale === loc
                ? "bg-primary/10 scale-110"
                : "hover:bg-surface-100 opacity-60 hover:opacity-100",
            )}
            type="button"
            title={`${shortLabels[loc]} — ${localeNames[loc]}`}
            aria-label={`Switch language to ${localeNames[loc]}`}
            aria-pressed={locale === loc}
          >
            {localeFlags[loc]}
            <span className="text-[10px] font-semibold leading-none text-surface-600 dark:text-surface-300">
              {shortLabels[loc]}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // Default/Dropdown variant
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
          "border border-surface-200 bg-white hover:bg-surface-50",
          "text-sm font-medium text-surface-700",
          isOpen && "ring-2 ring-primary/20",
        )}
      >
        <span className="text-base">{localeFlags[locale]}</span>
        <span className="hidden sm:inline">{localeNames[locale]}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-surface-400 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute mt-2 w-40 py-1 z-50",
              align === "left" ? "left-0" : "right-0",
              "max-w-[calc(100vw-2rem)]",
              "bg-white rounded-xl shadow-lg border border-surface-200",
              "overflow-hidden",
            )}
          >
            {locales.map((loc) => (
              <button
                key={loc}
                onClick={() => {
                  setLocale(loc);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 text-left",
                  "text-sm transition-colors",
                  locale === loc
                    ? "bg-primary/5 text-primary font-medium"
                    : "text-surface-600 hover:bg-surface-50",
                )}
              >
                <span className="text-base">{localeFlags[loc]}</span>
                <span className="flex-1">{localeNames[loc]}</span>
                {locale === loc && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline language switcher for footer
export function LanguageSwitcherInline({ className }: { className?: string }) {
  const { locale, setLocale, locales } = useTranslation();

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={cn(
            "flex items-center gap-1.5 text-sm transition-all",
            locale === loc
              ? "text-primary font-medium"
              : "text-surface-500 hover:text-surface-700",
          )}
        >
          <span>{localeFlags[loc]}</span>
          <span>{localeNames[loc]}</span>
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
