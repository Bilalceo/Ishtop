# IshTop — Landing A/B Test Plan

**Hypothesis-driven, conversion-focused experiments to run after launch.**

Owner: Growth + Design · Last updated: 2026-05-29

---

## Methodology

**Primary metric:** signup completion rate (visitor → registered student)
**Secondary metrics:**
- Hero CTA CTR
- Scroll depth ≥ 75%
- Time to first interaction
- Bounce rate
- Mobile signup rate (segmented)

**Statistical setup:**
- Minimum sample: **8,000 visitors per variant** (powered to detect 10% relative lift, 80% power, α=0.05)
- Maximum run: 14 days. Stop early if 95% confidence reached at ≥7 days.
- Stratify by: locale (uz/ru/en), device (mobile/desktop), traffic source
- Tool: PostHog feature flags + experiment events

**Don't ship until:** primary CTA reaches at least **95% confidence** AND no secondary metric drops by >5%.

---

## Test 1 · Hero hook word

**Hypothesis:** Replacing "ishonchli" with an outcome-focused word will raise CTA CTR because outcome-focused language outperforms attribute-focused language for first-job seekers.

| Variant | Hero hook |
|---|---|
| Control | "Birinchi ishingizni ishonchli tarzda toping." |
| B | "Birinchi ishingizni 4 haftada toping." (concrete timeframe) |
| C | "Birinchi ishingizni AI yordamida toping." (mechanism-focused) |

**Primary metric:** hero CTA CTR. **Secondary:** signup completion.
**Expected lift:** B +12-18%, C ±5%.
**Risk:** B sets timeframe expectation — only ship if our actual data supports "4 weeks median."

---

## Test 2 · Primary CTA copy

**Hypothesis:** Action-specific copy beats generic "Get started" because students respond to clear next steps.

| Variant | Primary CTA |
|---|---|
| Control | "Bepul boshlash" |
| B | "Profil yaratish" (specific next action) |
| C | "60 soniyada profil" (time + outcome) |

**Primary metric:** click-through to /register.
**Hypothesis confidence:** medium-high. Industry data shows action-specific +18% avg.

---

## Test 3 · Trust signal placement

**Hypothesis:** Placing the Trust Score teaser higher in the page reduces bounce because the audience is risk-averse.

| Variant | Layout |
|---|---|
| Control | Hero → Stats → How → Features → Trust |
| B | Hero → Trust teaser → Stats → How → Features → Trust details |

**Primary metric:** scroll depth ≥ 50%.
**Secondary:** signup rate from mobile (more bounce-sensitive).

---

## Test 4 · Mobile sticky CTA

**Hypothesis:** A sticky bottom CTA on mobile raises signups because mobile users don't scroll back up.

| Variant | Mobile CTA |
|---|---|
| Control | Top nav CTA only |
| B | Bottom sticky bar after hero scroll-out, with "Bepul boshlash" |

**Primary metric:** mobile signup rate.
**Risk:** sticky bar conflicts with bottom-sheet filter pattern. Validate UX on iOS Safari + Chrome Android before ship.

---

## Test 5 · Social proof format

**Hypothesis:** Real names + companies (testimonials) outperform aggregate stats ("10K+ students").

| Variant | Layer |
|---|---|
| Control | Hero stat row ("10K+ talaba · 4.9/5 · 500+ kompaniya") |
| B | Hero rotates 3 short student quotes ("12 ariza · 4 suhbat · 2 oferta — Sevinch") |

**Primary metric:** hero CTA CTR.
**Hypothesis confidence:** medium. Specific outcomes have stronger psychological weight than aggregates.

---

## Test 6 · "Explainable match" demo

**Hypothesis:** An interactive mini-demo (live match calculation) lifts qualified signups (users who complete profile).

| Variant | Hero right side |
|---|---|
| Control | Static mock card |
| B | Interactive: visitor selects 3 skills → demo shows live match % |

**Primary metric:** profile-completion rate among new signups.
**Risk:** dev cost ~3 days. Run only if Tests 1-3 don't move the needle.

---

## Test 7 · FAQ position

**Hypothesis:** Moving the FAQ above Final CTA catches objections at the conversion moment.

| Variant | Order |
|---|---|
| Control | Testimonials → FAQ → CTA |
| B | Testimonials → CTA → FAQ (FAQ as last-resort) |

**Primary metric:** signup completion rate.
**Note:** small-impact test. Run after higher-impact tests.

---

## Test 8 · Locale-specific hero

**Hypothesis:** RU-locale visitors convert higher with a Russian-language hook from the start (no UZ-first then RU-fallback).

| Variant | RU hero |
|---|---|
| Control | UZ hero translates to RU on language switch |
| B | RU-first hero with native-Russian voice writing (not literal translation) |

**Primary metric:** RU-segmented signup rate.

---

## What we won't test (yet)

These are tempting but premature:
- ❌ Pricing page changes (no paid tier live yet)
- ❌ Color/theme switching (brand cost > experiment value)
- ❌ Logo variants (brand stability cost too high)
- ❌ Auto-applying paywall (will damage trust signal)

---

## Test calendar (suggested)

| Week | Test | Owner |
|---|---|---|
| 1-2 | Test 2 (CTA copy) — fastest signal | Growth |
| 3-4 | Test 1 (Hero hook) | Growth + Design |
| 5-6 | Test 4 (Mobile sticky) | Growth + Design |
| 7-8 | Test 3 (Trust placement) | Design |
| 9-10 | Test 5 (Social proof format) | Growth |
| 11-12 | Test 6 (Interactive demo) — only if needed | Eng + Design |

---

## Post-test ritual

For every shipped winner:
1. Update [`BRAND_GUIDELINES.md`](./BRAND_GUIDELINES.md) if voice changed
2. Update [`design-tokens.json`](../frontend/src/lib/design-tokens.json) if visuals changed
3. Document the result + sample size + confidence interval in `docs/EXPERIMENTS_LOG.md`
4. Sunset the losing variant code within 14 days

For every shipped loser: post a 2-paragraph retro. Why we expected it to win. Why it didn't. What we learned about the audience.
