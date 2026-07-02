"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";

/**
 * Friendly replacement for the native `<input type="month">`, whose
 * "--------- ----" placeholder and English-only month dropdown looked ugly and
 * confusing. Renders two plain selects (Month + Year) and emits the SAME
 * "YYYY-MM" string the rest of the app already stores — so no data or backend
 * changes are needed. Year-only selection emits "YYYY"; a month picked before
 * the year is kept locally and only emitted once a year is entered, so a
 * malformed "-MM" value can never reach the stored resume. Values that aren't
 * "YYYY" / "YYYY-MM" (free-text dates from AI-generated resumes, e.g.
 * "Jan 2020") leave the selects blank rather than mis-parsing.
 */

const VALUE_PATTERN = /^(\d{4})(?:-(\d{2}))?$/;

const MONTHS: Record<"uz" | "ru", string[]> = {
  uz: [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
  ],
  ru: [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ],
};

export function MonthYearPicker({
  value,
  onChange,
  disabled,
  minYear = 1975,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minYear?: number;
}) {
  const { locale } = useTranslation();
  const lang = locale === "ru" ? "ru" : "uz";
  const months = MONTHS[lang];

  const maxYear = new Date().getFullYear() + 1;

  // Local state (instead of deriving from `value`) keeps a half-filled
  // selection — e.g. month chosen before year — without writing it upstream.
  const initial = VALUE_PATTERN.exec(value || "");
  const [year, setYear] = useState(initial?.[1] ?? "");
  const [month, setMonth] = useState(initial?.[2] ?? "");
  const lastEmitted = useRef(value || "");

  useEffect(() => {
    // Sync only on external value changes (e.g. resume loaded from the API),
    // not on our own emits — those may be intentionally partial.
    if ((value || "") === lastEmitted.current) return;
    lastEmitted.current = value || "";
    const match = VALUE_PATTERN.exec(value || "");
    setYear(match?.[1] ?? "");
    setMonth(match?.[2] ?? "");
  }, [value]);

  const emit = (nextYear: string, nextMonth: string) => {
    setYear(nextYear);
    setMonth(nextMonth);
    // Order-independent: a month picked first stays local until the year is
    // typed; only "YYYY-MM", "YYYY" or "" are ever emitted.
    const next = nextYear && nextMonth ? `${nextYear}-${nextMonth}` : nextYear;
    lastEmitted.current = next;
    onChange(next);
  };

  const selectClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100";

  return (
    <div className="mt-1 grid grid-cols-2 gap-2">
      <select
        className={selectClass}
        value={month}
        disabled={disabled}
        onChange={(event) => emit(year, event.target.value)}
        aria-label={lang === "ru" ? "Месяц" : "Oy"}
      >
        <option value="">{lang === "ru" ? "Месяц" : "Oy"}</option>
        {months.map((label, index) => {
          const mm = String(index + 1).padStart(2, "0");
          return (
            <option key={mm} value={mm}>
              {label}
            </option>
          );
        })}
      </select>
      {/* Year is a compact number input — a 50-option native <select> opened a
          full-screen dropdown. Typing four digits is faster and far cleaner. */}
      <input
        type="number"
        inputMode="numeric"
        className={selectClass}
        value={year}
        disabled={disabled}
        min={minYear}
        max={maxYear}
        placeholder={lang === "ru" ? "Год" : "Yil"}
        onChange={(event) => emit(event.target.value.replace(/\D/g, "").slice(0, 4), month)}
        aria-label={lang === "ru" ? "Год" : "Yil"}
      />
    </div>
  );
}
