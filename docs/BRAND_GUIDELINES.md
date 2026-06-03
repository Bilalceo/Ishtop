# IshTop — Brand Guidelines

**Version 1.0 · Aurora Design System**
**Owner:** Design + Frontend · **Last updated:** 2026-05-29

> Live components: [`/design-system`](/design-system) · Tokens: [`design-tokens.json`](/design-tokens.json)

---

## 1. Brand essence

| Pillar | Meaning |
|---|---|
| **Trust-first** | We win because we explain. Every AI output ships with a reason. |
| **Student-friendly** | Plain language, no jargon, never patronizing. |
| **Premium without elite** | The polish of Linear / Vercel, accessible to a first-job-seeker. |
| **Aurora** | The visual metaphor — luminous, moving, never static. |

**One-liner positioning:**
> O'zbekistondagi talabalar va junior mutaxassislar uchun ishonchli AI-karyera platformasi.

---

## 2. Logo system

**Primary mark:** rounded square 36px with aurora gradient + 4-point Sparkles glyph + "IshTop" wordmark.

```
[ ◆ ]  IshTop
```

**Clear space:** at minimum, the height of the glyph (~36px) on all sides.

**Minimum sizes:** 24px height on screen, 18mm on print.

**Don'ts:**
- ❌ Never stretch or skew
- ❌ Never recolor the gradient — only the violet-to-cyan brand spec
- ❌ Never place on busy photography without a backdrop blur

---

## 3. Color system

### Primary palette

| Token | Hex | Usage |
|---|---|---|
| `ink/900` | `#0B1020` | Hero, dark backgrounds |
| `aurora/violet` | `#7C5CFF` | Primary brand · CTA · key strokes |
| `aurora/cyan` | `#22D3EE` | Secondary brand · accents |
| `gold/500` | `#F5B544` | Warm signals (ratings, "today's pick") |
| `mint/trust` | `#3CCB7F` | Trust score, success states |

### Neutral palette

`surface/50` → `surface/900` (Tailwind gray scale) for body text, borders, dividers.

### Semantic

| Token | Hex | Usage |
|---|---|---|
| `semantic/success` | `#3CCB7F` | Successful action |
| `semantic/warning` | `#F59E0B` | Caution, profile-incomplete |
| `semantic/error` | `#EF4444` | Validation failures |
| `semantic/info` | `#22D3EE` | Informational nudges |

### Contrast rules (WCAG AA)

- Body text on light: `surface/700` on white = **8.59:1** ✓
- Body text on dark: `white/85` on `ink/900` = **15:1** ✓
- CTA text: white on `aurora/violet` = **4.7:1** ✓
- Never use `surface/400` for body text (3.7:1 — fails).

---

## 4. Typography

**Inter** as both display and body. Fira Code for monospace.

| Role | Token | Size / leading | Tracking |
|---|---|---|---|
| Display XL (hero) | `display-xl` | 64 / 72 | -0.02em |
| Display LG | `display-lg` | 48 / 56 | -0.02em |
| H2 | `h2` | 30 / 36 | -0.02em |
| H3 | `h3` | 20 / 28 | -0.01em |
| Lead | `lead` | 18 / 30 | 0 |
| Body | `body` | 16 / 24 | 0 |
| Body sm | `body-sm` | 14 / 20 | 0 |
| Eyebrow | `eyebrow` | 11 / 18 uppercase | 0.18em |

**Critical rule:** all display headings ship with `line-height: 1.12` and `padding-bottom: 0.06em` to prevent descender clipping on `q`, `g`, `y`, `p`. This is enforced via the `.h-display` class.

**Aurora gradient text:**
```html
<span class="aurora-text">premium</span>
```
Use **once per page** for the hero hook word — over-use kills its impact.

---

## 5. Voice & tone

| Situation | Voice | Example |
|---|---|---|
| Hero hook | Calm confidence | "Birinchi ishingizni ishonchli tarzda toping." |
| CTA | Clear action | "Bepul boshlash" not "Click here" |
| Error | Empathetic | "Tarmoq biroz sekin. Qayta urinib ko'ring." |
| Empty | Helpful | "Hali ariza yo'q — keling, birinchisini topamiz." |
| Success | Plain | "Profil 100% to'ldi." NOT "🎉 Awesome job!!! 🚀🔥" |

**Banned words:**
- "amazing", "magical", "revolutionary", "10x" (overused, sounds like marketing)
- "click here" (use the verb of the action)
- "users" in user-facing copy (use "siz" / "вы" / "you")

**Banned in voice:**
- Emoji overload. Max one decorative emoji per page.
- Exclamation marks in body copy. Reserved for celebrations only.
- All-caps shouting. Eyebrow tags are the only place.

---

## 6. Iconography

**Library:** [Lucide](https://lucide.dev) at 1.5px stroke, 18-20px default size.

**Pairing rules:**
- Always pair an icon with a label OR `aria-hidden + sr-only` text
- Decorative icons get `aria-hidden`
- Status icons follow color rules: `success` = mint, `error` = red, etc.

**Don't:**
- Mix line + filled in the same context
- Use emoji where an icon would do
- Use the same icon for two different meanings on one page

---

## 7. Imagery

**Photography direction:**
- Editorial portraits of Uzbek students/juniors at desks, in cafes
- Natural light, shallow depth of field
- Diverse: gender, region (Tashkent + regional), tech and non-tech disciplines

**Illustration direction:**
- Abstract aurora gradients with depth (multi-layered radials)
- Avoid generic SaaS isometric illustrations
- 3D scenes (Spline/Three.js): minimal, brand-aligned palette only

**Avatar fallback:** brand-gradient circle with student initials. Never use generic person silhouette.

---

## 8. Motion

**Signature easing:** `cubic-bezier(0.19, 1, 0.22, 1)` — gentle decel.

**Duration scale (ms):** 150 / 250 / 400 / 600 / 900.
- 150: hover state, toggle
- 250: button press, simple transition
- 400: card hover lift
- 600: section reveal
- 900: scene-level choreography

**Reduce-motion compliance:** all primitives respect `prefers-reduced-motion: reduce`. If you add new motion, gate it on `useReducedMotion()`.

---

## 9. Component anatomy (the "hero card")

```
┌───────────────────────────────────────────┐
│ ◆ [ICON]      [TITLE]            [BADGE] │ ← header row · translateZ(30px)
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │  Why match                            │ │
│ │  ✓ Reason 1                           │ │ ← reason block · translateZ(20px)
│ │  ✓ Reason 2                           │ │
│ │  ✓ Reason 3                           │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ [✨ status]              [Action]         │ ← action row · translateZ(40px)
└───────────────────────────────────────────┘
   ↑
   .depth-card + Tilt(max=9°) + edge-glow
```

The Z-axis layering is what makes the 3D feel real. Apply it sparingly — only on hero / feature cards.

---

## 10. Don'ts (brand violations)

1. **Don't use AI hype copy.** "Revolutionary AI" → "Explainable match score."
2. **Don't add fake social proof.** Real numbers only.
3. **Don't ship without a reduce-motion fallback** for any animation longer than 150ms.
4. **Don't use a stock person photo where a CSS gradient avatar will do.**
5. **Don't introduce new colors** without a Trust Score AA contrast check.
6. **Don't ship "Coming soon"** anywhere user-facing. Either build it or don't mention it.
