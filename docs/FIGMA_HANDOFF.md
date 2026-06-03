# IshTop — Figma ↔ Code Handoff

**Single source of truth:** the codebase. Figma is a **mirror** of the code, not the other way around.

This document tells designers how to set up Figma to perfectly match what's already shipping in production.

---

## 1. Why code is the source of truth

We had two options:
1. **Figma-first:** designer ships Figma → developer translates → drift happens
2. **Code-first:** developer ships components → designer imports tokens → no drift

We picked **code-first** because:
- The components already exist as `card-aurora`, `btn-aurora`, etc.
- Tokens are exported as a W3C JSON file
- Figma has plugins to import this directly

This means: **no Figma library to maintain separately.** Every brand update happens in code, and Figma re-imports.

---

## 2. One-time Figma setup

### Step 1 — Create the file structure

```
📁 IshTop Design System
  ├── 📄 00 · Cover
  ├── 📄 01 · Foundations (tokens)
  ├── 📄 02 · Components (mirror of /design-system route)
  ├── 📄 03 · Patterns (landing, dashboard, mobile sheets)
  ├── 📄 04 · Templates (full-page mockups)
  └── 📄 99 · Archive
```

### Step 2 — Install Tokens Studio plugin

[Tokens Studio for Figma](https://tokens.studio/) — free, open-source.

### Step 3 — Import the tokens

1. Open Tokens Studio plugin
2. Click `Tools` → `Import` → `JSON`
3. Paste the contents of [`frontend/public/design-tokens.json`](../frontend/public/design-tokens.json) (or fetch from `https://ishtop.uz/design-tokens.json`)
4. Click `Apply to document` — every color, type ramp, spacing scale, radius, shadow becomes a Figma style

### Step 4 — Set up text styles

Run this checklist (Tokens Studio auto-generates most):

| Figma style | Token | Settings |
|---|---|---|
| `display-xl` | `typography.fontSize.6xl` | Inter Semibold 64 / 72 · letter -2% |
| `display-lg` | `typography.fontSize.5xl` | Inter Semibold 48 / 56 · letter -2% |
| `h2` | `typography.fontSize.3xl` | Inter Semibold 30 / 36 · letter -2% |
| `h3` | `typography.fontSize.xl` | Inter Semibold 20 / 28 |
| `body` | `typography.fontSize.base` | Inter Regular 16 / 24 |
| `body-sm` | `typography.fontSize.sm` | Inter Regular 14 / 20 |
| `eyebrow` | (custom) | Inter Semibold 11 · letter +18% · UPPERCASE |

### Step 5 — Color styles

Tokens Studio creates:
- `color/ink/{900,800,700}`
- `color/aurora/{violet,cyan,pink}`
- `color/gold/500`
- `color/mint/trust`
- `color/surface/{50…900}`
- `color/semantic/{success,warning,error,info}`

Plus gradients (paint styles):
- `gradient/aurora-primary` — 120° linear
- `gradient/aurora-conic` — 120° conic
- `gradient/trust-score` — 90° linear

### Step 6 — Effect styles (shadows)

Convert from tokens:
- `shadow/card`
- `shadow/lift`
- `shadow/soft`
- `shadow/aurora` (the primary CTA glow)
- `shadow/depth` (the depth-card)

---

## 3. Component mirror (page 02)

For each shipped component, create a Figma frame named exactly the same as the React component file.

| React component | Figma frame | Variants |
|---|---|---|
| `Button` (shadcn) | `Button` | default / outline / ghost / destructive · sm / md / lg |
| `.btn-aurora` | `Button / Aurora` | default · hover · focus · disabled |
| `.btn-ghost-dark` | `Button / Ghost dark` | default · hover · focus |
| `.card-aurora` | `Card / Aurora` | default · hover · loading |
| `.depth-card` | `Card / Depth` | default · hover (tilt -8°) |
| `Badge` | `Badge` | default · secondary · outline · destructive |
| `Progress` | `Progress` | empty · 25% · 50% · 75% · full |
| `Skeleton` | `Skeleton` | text · card · avatar |
| `BottomSheet` | `Sheet / Bottom` | full · half · with footer |
| `SwipeStack` | `Carousel / Swipe` | 1 of 3 · 2 of 3 · 3 of 3 |

**Rule:** if a Figma component diverges from code, code wins. File a PR; don't redraw.

---

## 4. Annotation conventions

When designers spec something new, annotate with:

```
○ <Token name>     for colors, type, spacing
□ <Component>      for an existing component reference
↳ <Behavior>       for an interaction
✦ <Motion token>   for animation timing
```

Example:
```
Hero CTA
○ btn-aurora · text white
□ Button · primary · size lg
↳ on hover: translateY(-1px), shadow grows
✦ duration/base · easing/out-expo
```

This way the developer can scan the annotation and grep the codebase.

---

## 5. Inspect → code workflow

When a developer needs to ship a designed screen:

1. Open the Figma frame
2. Use Figma's **Inspect** panel — values should match the imported tokens (e.g., `color/aurora/violet` not raw `#7C5CFF`)
3. Map to Tailwind class:
   - `color/aurora/violet` → `bg-[#7C5CFF]` or just `bg-violet-500` (Tailwind already aligned)
   - `radius/3xl` → `rounded-3xl`
   - `space/6` → `gap-6` / `p-6`
   - `shadow/aurora` → use `.btn-aurora` directly (the class includes it)
4. **Never** translate raw pixel values. Always trace back to a token.

---

## 6. Mobile-first specs

Always design at **375px** first. Snap larger breakpoints (768, 1024, 1280) afterwards.

| Breakpoint | Figma frame width | Notes |
|---|---|---|
| Mobile | 375 | iPhone 12/13/14 standard |
| Mobile (small) | 360 | Galaxy A series |
| Tablet | 768 | iPad mini |
| Desktop | 1280 | Most common viewport |
| Wide | 1536 | 2-column hero comfortable |

Hover states don't exist on touch. Don't lean on them for critical actions.

---

## 7. Sync cadence

| When | What |
|---|---|
| New token added in code | Re-export `design-tokens.json` → re-import in Tokens Studio |
| New component shipped | Designer creates Figma mirror within 5 days |
| Design proposes change | Designer creates a separate branch in Figma, links the PR to code |
| Figma drift detected | Open a "design-debt" ticket — fix code or Figma to match |

---

## 8. What designers ship to developers

For new screens, include:
1. **Frame at 375 + 1280** minimum
2. **Token annotations** (not raw values)
3. **Empty / loading / error states** for any data view
4. **Reduce-motion fallback** — describe how the screen behaves without animation
5. **Locale check** — translate the hero hook to RU; does it still fit?

---

## 9. What we explicitly skip

- **Pixel-perfect pursuit** — code always wins on sub-pixel details. Designers, do not nitpick 1px vs 2px shadows.
- **Hover states on mobile** — irrelevant.
- **Maintaining a Figma component library by hand** — Tokens Studio does it for us.
- **Designing from scratch when a token + component exists** — always reuse.

---

## 10. Single command for designers

To get started in 60 seconds, send the designer this:

```
1. Open: https://www.figma.com (new file)
2. Install: Tokens Studio plugin
3. Import: https://ishtop.uz/design-tokens.json
4. Browse: https://ishtop.uz/design-system (live components, copy-paste any spec)
```

Done. Figma is now in sync with code.
