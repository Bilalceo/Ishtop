/**
 * Splitting an aggregated listing into a title and a real employer.
 *
 * These all sit under one import account called "Ish beruvchi" with the real
 * employer appended to the title, so this split decides what the reader sees on
 * every card — and got it wrong in both directions before.
 */

import { experienceLabel, jobDisplayIdentity, jobTypeLabel, jobTypeOptions } from "@/lib/jobLabels";
import { categoryLabel, categoryStyle } from "@/lib/jobCategories";

describe("jobDisplayIdentity", () => {
  it("pulls the employer out of the trailing bracket", () => {
    const r = jobDisplayIdentity("Frontend Dasturchi (I TECH IT GROUP)", "Ish beruvchi");
    expect(r.title).toBe("Frontend Dasturchi");
    expect(r.company).toBe("I TECH IT GROUP");
  });

  it("never badges an aggregated listing as a verified company", () => {
    // The import account is verified; the employer inside the title is not.
    const r = jobDisplayIdentity("Savdo vakili (Nishon Group)", "Ish beruvchi");
    expect(r.companyIsReal).toBe(false);
  });

  it("keeps a nested employer name whole", () => {
    const r = jobDisplayIdentity(
      "Savdo vakili (Nishon Group (go'sht mahsulotlari))", "Ish beruvchi");
    expect(r.company).toBe("Nishon Group (go'sht mahsulotlari)");
  });

  it("leaves a real company's own posting untouched", () => {
    const r = jobDisplayIdentity("Backend Developer", "Akfa Food");
    expect(r.company).toBe("Akfa Food");
    expect(r.companyIsReal).toBe(true);
  });

  it("does not mistake a district or a shift for an employer", () => {
    for (const t of [
      "Oshpaz (Yunusobod tumani)",
      "Sotuvchi (2/2 grafik)",
      "Dasturchi (Senior)",
    ]) {
      expect(jobDisplayIdentity(t, "Ish beruvchi").company).toBe("");
    }
  });

  it("reports no company rather than echoing the placeholder", () => {
    const r = jobDisplayIdentity("Kuryer", "Ish beruvchi");
    expect(r.company).toBe("");
    expect(r.title).toBe("Kuryer");
  });
});

describe("labels", () => {
  it("translates the enums the backend actually returns", () => {
    expect(jobTypeLabel("internship", false)).toBe("Amaliyot");
    expect(experienceLabel("intern", false)).toContain("Amaliyotchi");
    expect(experienceLabel("lead", false)).toContain("Rahbar");
  });

  it("humanises an unknown value instead of leaking a raw enum token", () => {
    expect(jobTypeLabel("some_new_type", false)).toBe("some new type");
  });

  it("returns an empty string for a missing value", () => {
    expect(jobTypeLabel(undefined, false)).toBe("");
    expect(experienceLabel(null, false)).toBe("");
  });
});

describe("categoryStyle", () => {
  it("maps a known category to its own icon and colour", () => {
    expect(categoryStyle("it").id).toBe("it");
    expect(categoryStyle("sales").tile).not.toBe(categoryStyle("food").tile);
  });

  it("falls back to 'other' for anything it does not know", () => {
    expect(categoryStyle("something-else").id).toBe("other");
    expect(categoryStyle(undefined).id).toBe("other");
    expect(categoryStyle(null).id).toBe("other");
  });

  it("has a label in both languages for every category", () => {
    for (const id of ["it", "sales", "food", "logistics", "other"]) {
      expect(categoryLabel(id, false)).not.toBe("");
      expect(categoryLabel(id, true)).not.toBe("");
    }
  });
});

describe("every enum member the backend stores has a label", () => {
  // Mirrors JobType / ExperienceLevel in backend/app/models/job.py. The
  // auto-apply screen kept a second copy of these maps; it was missing
  // "internship" entirely and printed "Rahbar" for both lead and executive,
  // so a student could filter the catalogue for an internship but never ask
  // auto-apply for one.
  const JOB_TYPES = [
    "full_time",
    "part_time",
    "remote",
    "hybrid",
    "contract",
    "internship",
  ] as const;
  const LEVELS = [
    "intern",
    "junior",
    "mid",
    "senior",
    "lead",
    "executive",
  ] as const;

  it.each([
    ["uz", false],
    ["ru", true],
  ])("labels every job type in %s", (_l, isRu) => {
    const labels = JOB_TYPES.map((t) => jobTypeLabel(t, isRu as boolean));
    for (const [i, label] of labels.entries()) {
      expect(label).toBeTruthy();
      expect(label.toLowerCase()).not.toBe(JOB_TYPES[i]); // not the raw key
    }
    expect(new Set(labels).size).toBe(labels.length); // no duplicates
  });

  it.each([
    ["uz", false],
    ["ru", true],
  ])("labels every experience level distinctly in %s", (_l, isRu) => {
    const labels = LEVELS.map((v) => experienceLabel(v, isRu as boolean));
    for (const label of labels) expect(label).toBeTruthy();
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("offers internship among the job type options", () => {
    expect(jobTypeOptions(false).map((o) => o.value)).toContain("internship");
  });
});
