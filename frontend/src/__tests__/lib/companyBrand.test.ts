/**
 * The generated employer mark.
 *
 * Its whole value is that it is STABLE — the same company must look the same on
 * every card, every page and every reload. A hash that drifts, or initials that
 * treat "OOO Nishon" and "Nishon" as two companies, quietly turns the feed back
 * into noise.
 */

import { companyBrand, initialsOf } from "@/lib/companyBrand";

describe("initialsOf", () => {
  it("takes the first letter of the first two real words", () => {
    expect(initialsOf("TATA Building Company")).toBe("TB");
    expect(initialsOf("Nishon Group")).toBe("NG");
  });

  it("gives a single word two letters — one reads as an error at tile size", () => {
    expect(initialsOf("PRONTO")).toBe("PR");
  });

  it("ignores legal forms, so one company is one mark", () => {
    expect(initialsOf("OOO Nishon Group")).toBe(initialsOf("Nishon Group"));
    expect(initialsOf("MCHJ Akfa Food")).toBe("AF");
  });

  it("does not crash on a name that is only punctuation", () => {
    expect(initialsOf("«»")).toBe("?");
    expect(initialsOf("")).toBe("?");
  });
});

describe("companyBrand", () => {
  it("is deterministic — the same name always gets the same colours", () => {
    const a = companyBrand("Nishon Group");
    const b = companyBrand("Nishon Group");
    expect(a).toEqual(b);
  });

  it("ignores case and surrounding space", () => {
    expect(companyBrand("  nishon group ")).toEqual(companyBrand("Nishon Group"));
  });

  it("separates names that differ only by letter order", () => {
    // A charCode sum collides on anagrams; FNV-1a does not. Both would have
    // shown the same colour for these two.
    expect(companyBrand("Nishon").from).not.toBe(companyBrand("Noshin").from);
  });

  it("always returns a usable pair and a motif in range", () => {
    for (const n of ["A", "Zebra LLC", "", "ООО Ромашка", "35 Health Clubs"]) {
      const b = companyBrand(n);
      expect(b.from).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(b.to).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(b.motif).toBeGreaterThanOrEqual(0);
      expect(b.motif).toBeLessThan(6);
      expect(b.initials.length).toBeGreaterThan(0);
    }
  });

  it("spreads a realistic set of employers across the palette", () => {
    // Not a guarantee of uniqueness — 12 stops, more employers than that — but
    // if this collapses to one or two colours the mark has stopped working.
    const names = [
      "TATA Building Company", "Nishon Group", "PRONTO", "NAVBAHOR APTEKA",
      "35 Health Clubs", "LIWAYWAY FOOD", "Print Media", "GERRY WEBER",
      "COSMO WORLD", "Gostinitsa Artist",
    ];
    const used = new Set(names.map((n) => companyBrand(n).from));
    expect(used.size).toBeGreaterThanOrEqual(5);
  });
});
