/**
 * =============================================================================
 * UTILITY FUNCTIONS
 * =============================================================================
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with Tailwind merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Uzbek relative-time words, keyed by singular Intl unit. Chrome's ICU has no
// real uz-UZ relative-time data, so Intl.RelativeTimeFormat("uz-UZ") silently
// falls back to a generic format like "-3 w" — leaking the minus sign and a
// non-localized unit into the UI. We format Uzbek by hand instead.
const UZ_REL_UNITS: Partial<Record<Intl.RelativeTimeFormatUnit, string>> = {
  second: "soniya",
  minute: "daqiqa",
  hour: "soat",
  day: "kun",
  week: "hafta",
  month: "oy",
  quarter: "chorak",
  year: "yil",
};

/**
 * Format a signed relative value (negative = past) for the given locale.
 * Russian uses Intl (well-supported); Uzbek is formatted manually.
 */
function formatRelValue(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: "uz" | "ru",
): string {
  if (locale === "ru") {
    return new Intl.RelativeTimeFormat("ru-RU", { numeric: "auto" }).format(value, unit);
  }
  const n = Math.abs(value);
  if (n === 0) return "hozirgina";
  const word = UZ_REL_UNITS[unit] ?? String(unit);
  return value < 0 ? `${n} ${word} oldin` : `${n} ${word}dan keyin`;
}

/**
 * Parse a timestamp coming from the backend.
 *
 * The API serializes naive UTC datetimes with no timezone marker
 * (e.g. "2026-06-26T08:20:27.209079"). `new Date()` would read those as the
 * viewer's LOCAL time, skewing every relative/absolute time by the local UTC
 * offset (e.g. a just-created record shows "5 hours ago" in UTC+5). When a
 * bare ISO datetime has no zone, interpret it as UTC.
 */
export function parseServerDate(value: string): Date {
  let s = (value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !/([zZ]|[+-]\d{2}:?\d{2})$/.test(s)) {
    s += "Z";
  }
  return new Date(s);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  dateString: string,
  locale: "uz" | "ru" = "uz",
): string {
  const normalized = dateString.trim().toLowerCase();
  const shorthandMatch = normalized.match(
    /^(-?\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks)(?:\s*(ago|oldin|назад))?$/i,
  );
  if (shorthandMatch) {
    const rawValue = Number(shorthandMatch[1]);
    const unit = shorthandMatch[2].toLowerCase();
    const explicitPast = Boolean(shorthandMatch[3]);
    const unitMap: Record<string, Intl.RelativeTimeFormatUnit> = {
      s: "second",
      sec: "second",
      second: "second",
      seconds: "second",
      m: "minute",
      min: "minute",
      minute: "minute",
      minutes: "minute",
      h: "hour",
      hr: "hour",
      hour: "hour",
      hours: "hour",
      d: "day",
      day: "day",
      days: "day",
      w: "week",
      week: "week",
      weeks: "week",
    };
    const value = explicitPast ? -Math.abs(rawValue) : rawValue < 0 ? rawValue : -rawValue;
    return formatRelValue(value, unitMap[unit], locale);
  }

  const date = parseServerDate(dateString);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const absDiffInSeconds = Math.abs(diffInSeconds);
  const direction = diffInSeconds >= 0 ? -1 : 1;

  if (absDiffInSeconds < 60) return formatRelValue(0, "second", locale);

  const diffInMinutes = Math.floor(absDiffInSeconds / 60);
  if (diffInMinutes < 60) return formatRelValue(direction * diffInMinutes, "minute", locale);

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return formatRelValue(direction * diffInHours, "hour", locale);

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return formatRelValue(direction * diffInDays, "day", locale);

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return formatRelValue(direction * diffInWeeks, "week", locale);

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return formatRelValue(direction * diffInMonths, "month", locale);

  const diffInYears = Math.floor(diffInDays / 365);
  return formatRelValue(direction * diffInYears, "year", locale);
}

/**
 * Format date (e.g., "Jan 15, 2024")
 */
export function formatDate(dateString: string): string {
  const date = parseServerDate(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format date and time (e.g., "Jan 15, 2024 at 10:30 AM")
 */
export function formatDateTime(dateString: string): string {
  const date = parseServerDate(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format salary range
 */
export function formatSalaryRange(
  min?: number,
  max?: number,
  locale: "uz" | "ru" = "uz",
  currency: string = "USD",
): string {
  const labels =
    locale === "ru"
      ? { notDisclosed: "Зарплата не указана", from: "От", upTo: "До" }
      : {
          notDisclosed: "Maosh ko'rsatilmagan",
          from: "Dan boshlab",
          upTo: "Gacha",
        };

  if (!min && !max) return labels.notDisclosed;

  // UZS is the local currency: show plain grouped numbers with a single
  // "so'm"/"сум" suffix (not the en-US "UZS 2,500,000" style, and never "$").
  if ((currency || "").toUpperCase() === "UZS") {
    const unit = locale === "ru" ? "сум" : "so'm";
    const n = (v: number) => v.toLocaleString("en-US");
    if (min && max) return `${n(min)} – ${n(max)} ${unit}`;
    if (min) return `${labels.from} ${n(min)} ${unit}`;
    return `${labels.upTo} ${n(max as number)} ${unit}`;
  }

  if (min && max) return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
  if (min) return `${labels.from} ${formatCurrency(min, currency)}`;
  if (max) return `${labels.upTo} ${formatCurrency(max, currency)}`;
  return labels.notDisclosed;
}

export function stripHtmlTags(input?: string | null): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function plainTextToRichHtml(input?: string | null): string {
  if (!input) return "";
  const lines = input.split("\n").map((line) => line.trim());
  const chunks: string[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    chunks.push(`<ul>${listBuffer.join("")}</ul>`);
    listBuffer = [];
  };

  for (const line of lines) {
    if (!line) {
      flushList();
      continue;
    }

    if (line.startsWith("• ")) {
      listBuffer.push(`<li>${line.slice(2)}</li>`);
      continue;
    }

    flushList();
    chunks.push(`<p>${line}</p>`);
  }

  flushList();
  return chunks.join("");
}

export function sanitizeRichTextHtml(input?: string | null): string {
  if (!input) return "";
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + "...";
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-]{9,}$/;
  return phoneRegex.test(phone);
}

/**
 * Slugify text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep/delay utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Parse query string
 */
export function parseQueryString(query: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(query));
}

/**
 * Build query string
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download file from URL
 */
export function downloadFile(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Calculate reading time
 */
export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Get color for status badge
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    published: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-800",
    pending: "bg-blue-100 text-blue-800",
    reviewing: "bg-purple-100 text-purple-800",
    interview: "bg-indigo-100 text-indigo-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    active: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
  };
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
