/**
 * Why a job list came back empty — and therefore what to offer the student.
 *
 * The empty state used to blame the resume whenever the matched feed was
 * empty, so typing a query that matched nothing sent the student off to edit
 * a resume that was never the problem. Extracted so the page and its test
 * share one definition.
 */

// Re-exported, never redeclared. A second copy of this constant is exactly
// what broke it: the slider's real ceiling is 30_000_000, a duplicate here
// said 50_000_000, and so `salaryRange[1] < SALARY_MAX` was true on a
// pristine filter set — the empty state told the student filters were
// selected when none were, and offered to clear them.
export { SALARY_MAX } from "@/components/jobs/SalarySlider";
import { SALARY_MAX } from "@/components/jobs/SalarySlider";

export interface JobFilters {
  locations: string[];
  jobTypes: string[];
  experienceLevels: string[];
  companies: string[];
  datePosted: string;
  isRemote: boolean;
  salaryRange: [number, number];
}

export interface Narrowing {
  /** The student typed a query. */
  hasSearch: boolean;
  /** At least one filter is away from its default. */
  hasFilters: boolean;
  /** Either of the above: the student narrowed the list themselves. */
  isNarrowed: boolean;
}

export function narrowingOf(query: string, filters: JobFilters): Narrowing {
  const hasSearch = query.trim().length > 0;
  const hasFilters =
    filters.locations.length > 0 ||
    filters.jobTypes.length > 0 ||
    filters.experienceLevels.length > 0 ||
    filters.companies.length > 0 ||
    filters.datePosted !== "all" ||
    filters.isRemote ||
    filters.salaryRange[0] > 0 ||
    filters.salaryRange[1] < SALARY_MAX;
  return { hasSearch, hasFilters, isNarrowed: hasSearch || hasFilters };
}

/**
 * The resume may be blamed only on the matched feed, and only when nothing
 * the student did explains the empty list.
 */
export function blamesResume(
  feedMode: string,
  narrowing: Narrowing
): boolean {
  return feedMode === "matched" && !narrowing.isNarrowed;
}
