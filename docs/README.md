# IshTop — Design + Engineering Docs

Single index for design-system, brand, performance, and experiment documentation.

## Live routes (visual)

| Route | What |
|---|---|
| `/` | Landing page (Aurora redesign) |
| `/student` | Student dashboard |
| `/design-system` | Live component gallery (Storybook replacement) |
| `/brand-guidelines` | Brand sheet — printable to PDF |
| `/design-tokens.json` | W3C Design Tokens (downloadable) |

## Docs

| Doc | Audience | Read time |
|---|---|---|
| [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md) | Design, Marketing, PR | 8 min |
| [FIGMA_HANDOFF.md](./FIGMA_HANDOFF.md) | Design, Frontend | 10 min |
| [PERFORMANCE_BUDGET.md](./PERFORMANCE_BUDGET.md) | Frontend, QA | 12 min |
| [AB_TEST_PLAN.md](./AB_TEST_PLAN.md) | Growth, Design | 10 min |

## Source of truth

> **Code wins.** Design system is mirrored in Figma via Tokens Studio, never the other way around.

If Figma diverges from `/design-system`, fix Figma — not code.

## Maintenance

- **Tokens change?** Update `frontend/src/lib/design-tokens.json` → re-copy to `frontend/public/design-tokens.json` → designers re-import in Tokens Studio.
- **Component added?** Add a section to `DesignSystemClient.tsx`. Designers mirror within 5 days.
- **Brand voice changes?** Update `BRAND_GUIDELINES.md` + the printable `/brand-guidelines` route.
- **A/B test shipped?** Log result in `EXPERIMENTS_LOG.md` (not yet created — add on first experiment).
