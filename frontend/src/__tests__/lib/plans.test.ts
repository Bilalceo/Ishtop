/**
 * The plan copy may only state limits the backend enforces.
 *
 * Four places sold this product at once: /plans (Free/Pro/Team, auto-apply
 * 10 and 50 per day), /pricing (Bepul/Premium/Enterprise, 50 applications per
 * month), checkout (premium/enterprise, 25 000 so'm) and the landing
 * translations (a "Pro" tier at $4). The buyer could not tell what 25 000 so'm
 * bought.
 *
 * The numbers here are mirrored from backend/app/core/premium.py:
 *     FEATURE_LIMITS["auto_apply"] = {free: 0, premium: 50, enterprise: None}
 * and the window is a month, set by _get_month_start() in the auto-apply route.
 * tests/unit/test_premium_limits.py pins the same values on the other side, so
 * changing one without the other fails a build.
 */

import {
  AUTO_APPLY_PER_MONTH,
  PLAN_PRICES_UZS,
  autoApplyLabel,
  getPlans,
  type PlanId,
} from "@/lib/plans";

describe("plan configuration", () => {
  it("mirrors the backend's enforced auto-apply quota", () => {
    expect(AUTO_APPLY_PER_MONTH).toEqual({
      free: 0,
      premium: 50,
      enterprise: null,
    });
  });

  it("charges what checkout charges", () => {
    expect(PLAN_PRICES_UZS.premium).toEqual({ monthly: 25_000, yearly: 250_000 });
  });

  it("uses the tier ids the database and payment intent store", () => {
    const ids = getPlans(false).map((p) => p.id);
    expect(ids).toEqual<PlanId[]>(["free", "premium", "enterprise"]);
  });

  describe.each([
    ["uz", false],
    ["ru", true],
  ])("%s copy", (_locale, isRu) => {
    const plans = getPlans(isRu as boolean);
    const all = plans.flatMap((p) => [...p.features, ...p.notIncluded, p.tagline]);

    it("never states a per-day allowance", () => {
      // "10/kun" and "50/kun" described a quota the backend never had.
      const perDay = all.filter((line) => /\/\s*(kun|день)|в день|kuniga/i.test(line));
      expect(perDay).toEqual([]);
    });

    it("states the auto-apply quota with its period", () => {
      const premium = plans.find((p) => p.id === "premium")!;
      const line = premium.features.find((f) => /50/.test(f));
      expect(line).toBeDefined();
      expect(line).toMatch(isRu ? /в месяц/i : /oyiga/i);
    });

    it("quotes no figure the backend does not enforce", () => {
      // Every number in the copy must be a price or the auto-apply quota.
      const allowed = new Set(["0", "50", "25 000", "250 000"]);
      for (const line of all) {
        for (const found of line.match(/\d[\d\s]*/g) ?? []) {
          expect(allowed).toContain(found.trim());
        }
      }
    });

    it("says plainly that the free tier has no auto-apply", () => {
      const free = plans.find((p) => p.id === "free")!;
      expect(free.notIncluded.length).toBeGreaterThan(0);
      expect(autoApplyLabel("free", isRu as boolean)).toMatch(
        isRu ? /Недоступно/ : /Mavjud emas/
      );
    });

    it("calls enterprise auto-apply unlimited rather than a number", () => {
      expect(autoApplyLabel("enterprise", isRu as boolean)).toMatch(
        isRu ? /Без лимита/ : /Cheklovsiz/
      );
    });
  });
});
