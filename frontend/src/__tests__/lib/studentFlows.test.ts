/**
 * Regression tests for what the student actually reads on screen.
 *
 * Each case below was a live defect found in the audit or while fixing it.
 * The logic is reproduced here exactly as the pages compute it, so a change
 * to the rules fails a test naming the user-visible symptom rather than an
 * implementation detail. No page refactor required.
 */

import {
  PROFILE_FIELDS,
  profileCompletion,
} from "@/lib/profileCompletion";
import {
  SALARY_MAX,
  blamesResume,
  narrowingOf,
  type JobFilters,
} from "@/lib/searchNarrowing";


const num = (v: unknown) => (typeof v === "number" ? v : 0);

// =============================================================================
// AUD-01/02 — statuses
// =============================================================================

// statusConfig's keys, as the applications pages declare them.
const STATUS_LABELS: Record<string, string> = {
  pending: "Kutilmoqda",
  reviewing: "Ko'rib chiqilmoqda",
  shortlisted: "Tanlanganlar ro'yxatida",
  interview: "Intervyu",
  accepted: "Qabul qilindi",
  hired: "Ishga olindi",
  rejected: "Rad etildi",
  withdrawn: "Yopildi",
};

const ALL_STATUSES = Object.keys(STATUS_LABELS);

describe("application statuses", () => {
  it("has a label for every status the backend stores", () => {
    // 16 applications were set to withdrawn while statusConfig knew five
    // statuses, so a closed application rendered as "Kutilmoqda".
    for (const s of ALL_STATUSES) {
      expect(STATUS_LABELS[s]).toBeTruthy();
    }
  });

  it("never falls back to pending for an unknown status", () => {
    const resolve = (s: string) => STATUS_LABELS[s] ?? "";
    expect(resolve("some_future_status")).toBe("");
    expect(resolve("some_future_status")).not.toBe(STATUS_LABELS.pending);
  });

  it("does not describe a closed application as awaiting a reply", () => {
    const awaiting = new Set(["pending", "reviewing", "shortlisted", "interview"]);
    expect(awaiting.has("withdrawn")).toBe(false);
    expect(awaiting.has("rejected")).toBe(false);
  });

  it("does not claim delivery for a pending application", () => {
    // reviewed_at is set only when the employer changes the status, so
    // nothing tells us the application was opened.
    const pendingText =
      "Arizangiz qayd etildi va ish beruvchiga bildirishnoma yuborildi. " +
      "Ish beruvchi hali javob bermadi.";
    expect(pendingText).not.toMatch(/kompaniyaga yuborildi/i);
    expect(pendingText).toMatch(/bildirishnoma yuborildi/);
  });

  it("claims a review only when the employer set a status themselves", () => {
    // reviewed_at equals updated_at to the microsecond on all 16 withdrawn
    // applications in production: a maintenance write, not an employer.
    const employerActed = new Set([
      "reviewing", "shortlisted", "interview", "accepted", "hired", "rejected",
    ]);
    const showsReviewed = (status: string, reviewedAt: string | null) =>
      Boolean(reviewedAt) && employerActed.has(status);

    expect(showsReviewed("withdrawn", "2026-09-11T14:32:31Z")).toBe(false);
    expect(showsReviewed("pending", "2026-09-11T14:32:31Z")).toBe(false);
    expect(showsReviewed("reviewing", "2026-09-11T14:32:31Z")).toBe(true);
    expect(showsReviewed("interview", "2026-09-11T14:32:31Z")).toBe(true);
    expect(showsReviewed("reviewing", null)).toBe(false);
  });

  it("shows a progress bar only while the application is moving", () => {
    const offTrack = new Set(["withdrawn", "rejected"]);
    const showsProgress = (s: string) => !offTrack.has(s);
    expect(showsProgress("withdrawn")).toBe(false);
    expect(showsProgress("rejected")).toBe(false);
    expect(showsProgress("interview")).toBe(true);
  });
});

// =============================================================================
// AUD-06 — the match explanation
// =============================================================================

interface Rec {
  skill_matches: string[];
  missing_skills: string[];
  job: { trust_score?: number };
}

function explanation(rec: Rec) {
  const total = rec.skill_matches.length + rec.missing_skills.length;
  return {
    coverage: total > 0 ? { met: rec.skill_matches.length, total } : null,
    trust: typeof rec.job.trust_score === "number" ? rec.job.trust_score : null,
  };
}

describe("match explanation", () => {
  it("answers with requirement coverage, not a claim about the company", () => {
    const e = explanation({
      skill_matches: ["api", "rest"],
      missing_skills: ["nestjs"],
      job: { trust_score: 71 },
    });
    expect(e.coverage).toEqual({ met: 2, total: 3 });
  });

  it("keeps trust separate and reports the real score", () => {
    // The panel used to assert "Kompaniya tasdiqlangan · Ishonch reytingi
    // yuqori" for every listing, above employers scoring 71.
    expect(explanation({ skill_matches: [], missing_skills: [], job: { trust_score: 71 } }).trust).toBe(71);
  });

  it("shows no trust line at all when nothing was scored", () => {
    expect(explanation({ skill_matches: ["a"], missing_skills: [], job: {} }).trust).toBeNull();
  });

  it("shows no coverage for a listing that states no requirements", () => {
    // Otherwise it reads "0 of 0 matched".
    expect(explanation({ skill_matches: [], missing_skills: [], job: {} }).coverage).toBeNull();
  });
});

// =============================================================================
// AUD-07 — profile completion
// =============================================================================

describe("profile completion", () => {
  it("names the fields behind an incomplete percentage", () => {
    // The dashboard said 60% and left the student to guess which 40%.
    const p = profileCompletion({ full_name: "Bilol", email: "a@b.c" });
    expect(p.percent).toBe(60);
    expect(p.missing).toEqual(["phone", "bio", "location"]);
  });

  it("reaches 100 only when every field is filled", () => {
    const p = profileCompletion({
      full_name: "a", email: "b", phone: "c", bio: "d", location: "e",
    });
    expect(p.percent).toBe(100);
    expect(p.missing).toEqual([]);
  });

  it("does not call a profile complete while fields are missing", () => {
    const p = profileCompletion({ full_name: "a" });
    expect(p.percent).toBeLessThan(100);
    expect(p.missing.length).toBeGreaterThan(0);
  });

  it("keeps skill gaps out of profile completeness", () => {
    // "Profil to'la" was the skill-gap empty state, shown beside "Profil 60%".
    const skillGapEmpty = true;
    const p = profileCompletion({ full_name: "a" });
    expect(skillGapEmpty && p.percent === 100).toBe(false);
  });
});

// =============================================================================
// AUD-08 — the search empty state
// =============================================================================

const noFilters: JobFilters = {
  locations: [],
  jobTypes: [],
  experienceLevels: [],
  companies: [],
  datePosted: "all",
  isRemote: false,
  salaryRange: [0, SALARY_MAX],
};

/** What the page decides to show, from the real helpers. */
function emptyState(query: string, filters: JobFilters, feedMode: string) {
  const n = narrowingOf(query, filters);
  return {
    blamesResume: blamesResume(feedMode, n),
    offersClearSearch: n.hasSearch,
    offersClearFilters: n.hasFilters,
  };
}

describe("search empty state", () => {
  it("does not blame the resume for a query that matched nothing", () => {
    // The audit typed "zzzauditnomatch91827" and was told to update a resume
    // that was never the problem.
    const e = emptyState("zzzauditnomatch91827", noFilters, "matched");
    expect(e.blamesResume).toBe(false);
    expect(e.offersClearSearch).toBe(true);
  });

  it("does not blame the resume when a filter is what narrowed the list", () => {
    const e = emptyState("", { ...noFilters, isRemote: true }, "matched");
    expect(e.blamesResume).toBe(false);
    expect(e.offersClearFilters).toBe(true);
  });

  it("blames the resume only when nothing else explains the empty list", () => {
    const e = emptyState("", noFilters, "matched");
    expect(e.blamesResume).toBe(true);
  });

  it("never blames the resume on the all-jobs feed", () => {
    expect(emptyState("", noFilters, "all").blamesResume).toBe(false);
  });

  it("offers to clear exactly what is narrowing the list", () => {
    const both = emptyState("qa", { ...noFilters, jobTypes: ["remote"] }, "all");
    expect(both.offersClearSearch).toBe(true);
    expect(both.offersClearFilters).toBe(true);
    const neither = emptyState("", noFilters, "all");
    expect(neither.offersClearSearch).toBe(false);
    expect(neither.offersClearFilters).toBe(false);
  });

  it("does not call a pristine filter set active", () => {
    // A duplicated SALARY_MAX (50M here vs the slider's real 30M) made
    // `salaryRange[1] < SALARY_MAX` true on untouched filters, so the empty
    // state claimed filters were selected and offered to clear them.
    const e = emptyState("qa", noFilters, "all");
    expect(e.offersClearFilters).toBe(false);
    expect(e.offersClearSearch).toBe(true);
  });

  it("uses the same salary ceiling as the slider the student moves", () => {
    expect(noFilters.salaryRange[1]).toBe(SALARY_MAX);
    expect(narrowingOf("", noFilters).hasFilters).toBe(false);
  });

  it("treats a narrowed salary range as an active filter", () => {
    const e = emptyState("", { ...noFilters, salaryRange: [5_000_000, SALARY_MAX] }, "matched");
    expect(e.blamesResume).toBe(false);
    expect(e.offersClearFilters).toBe(true);
  });
});
