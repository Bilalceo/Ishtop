/**
 * URL-state helpers for shareable demo results.
 *
 * Encoding: ?s=react,typescript,tailwind
 * - Short key (`s`) keeps URL tweetable
 * - Comma-separated skill ids
 * - Validated against the SKILLS catalog so invalid links degrade gracefully
 */

import { SKILLS } from "./match-engine";

const QUERY_KEY = "s";
const VALID_IDS = new Set(SKILLS.map((s) => s.id));

/** Parse current URL's `?s=` param into a list of valid skill ids. */
export function readSkillsFromUrl(search: string | null | undefined): string[] {
  if (!search) return [];
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const raw = params.get(QUERY_KEY);
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && VALID_IDS.has(s));
}

/** Build a URL-safe `s=…` segment from a list of skill ids. */
export function buildSkillsQuery(selected: string[]): string {
  const clean = selected.filter((id) => VALID_IDS.has(id));
  if (clean.length === 0) return "";
  return `${QUERY_KEY}=${clean.join(",")}`;
}

/** Replace the current URL's query (no navigation, no history bloat). */
export function syncUrlWithSkills(selected: string[]) {
  if (typeof window === "undefined") return;
  const q = buildSkillsQuery(selected);
  const next = q
    ? `${window.location.pathname}?${q}${window.location.hash}`
    : `${window.location.pathname}${window.location.hash}`;
  window.history.replaceState(null, "", next);
}

/** Build an absolute URL to share — anchored at /demo for full experience. */
export function buildShareUrl(selected: string[], origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const q = buildSkillsQuery(selected);
  return q ? `${base}/demo?${q}` : `${base}/demo`;
}

/* -------------------------------------------------------- localStorage */

const STORAGE_KEY = "ishtop_demo_skills_v1";

/** Persist selected skills locally so a returning visitor sees their last picks. */
export function saveSkillsLocally(selected: string[]) {
  if (typeof window === "undefined") return;
  try {
    const clean = selected.filter((id) => VALID_IDS.has(id));
    if (clean.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // localStorage may be disabled (private mode, quota) — fail silently.
  }
}

/** Load the last-saved selection. Returns [] if nothing valid stored. */
export function loadSkillsLocally(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string" && VALID_IDS.has(s));
  } catch {
    return [];
  }
}
