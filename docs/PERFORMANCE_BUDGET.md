# IshTop — Performance Budget & Lighthouse Audit

**Status:** Production target. Enforced via CI Lighthouse gate.
**Owner:** Frontend · **Last updated:** 2026-05-29

> "Performance is a feature. Slowness is a bug."

---

## 1. Targets (Lighthouse 95+)

| Category | Target | Reason |
|---|---|---|
| Performance | ≥ 95 | First-job seekers often on budget Android + 3G/4G |
| Accessibility | ≥ 95 | WCAG AA compliance, screen reader users |
| Best Practices | ≥ 95 | No security console errors, modern HTTPS, viewport |
| SEO | ≥ 95 | Critical — discoverability via Google UZ |
| PWA | ≥ 80 | Installable, offline-friendly (phase 2) |

---

## 2. Core Web Vitals budget

Measured on **moderate 4G** + **mid-tier Android (Moto G Power)**.

| Metric | Budget | Current target | Hard fail |
|---|---|---|---|
| **LCP** (largest contentful paint) | ≤ 2.0s | 1.8s | > 2.5s |
| **CLS** (cumulative layout shift) | ≤ 0.05 | 0.02 | > 0.1 |
| **INP** (interaction to next paint) | ≤ 150ms | 120ms | > 200ms |
| **TBT** (total blocking time) | ≤ 150ms | 100ms | > 300ms |
| **FCP** (first contentful paint) | ≤ 1.2s | 1.0s | > 1.8s |
| **TTFB** (time to first byte) | ≤ 400ms | 300ms | > 600ms |

---

## 3. Resource budget per page

| Asset type | Budget (gzipped) | Notes |
|---|---|---|
| **HTML** | ≤ 15KB | Server-rendered, no inline blockers |
| **CSS** | ≤ 30KB | Tailwind purged, no global utility leaks |
| **JS (first load)** | ≤ 130KB | Critical path: Nav + Hero + TrustLayer only |
| **JS (lazy)** | ≤ 80KB per chunk | Below-fold sections via `next/dynamic` |
| **Fonts** | ≤ 60KB | Inter subset (latin + cyrillic), preload + swap |
| **Images (above fold)** | ≤ 100KB | Hero uses CSS gradients — no raster |
| **3rd-party** | ≤ 50KB | Analytics deferred, no chat widget on landing |
| **Total transfer** | ≤ 400KB | First view, including everything |

### What we ship today

After optimizations:
- ✅ No raster hero image (CSS aurora + SVG)
- ✅ Below-fold sections lazy-loaded via `next/dynamic`
- ✅ Inter font: weight 400/500/600/700 only, preload + adjustFontFallback
- ✅ Fira Code: `preload: false` (deferred, only used in design system)
- ✅ Resource hints: `dns-prefetch` + `preconnect` for fonts + API
- ✅ No layout shift on font load (CSS `size-adjust` via Next.js adjustFontFallback)

---

## 4. CLS protection (the boring critical fixes)

These prevent layout shift — the #1 cause of "feels janky":

1. **All images carry explicit `width` + `height`** (or `aspect-ratio` CSS).
2. **Skeleton placeholders** match final dimensions (see `Skeleton` component).
3. **Web fonts:** Inter is loaded via `next/font` with `adjustFontFallback: true` — eliminates the FOUT/FOIT reflow.
4. **Hero ambient orbs** use `position: absolute + pointer-events: none` — never participate in layout.
5. **Scroll progress bar** is `position: fixed` — doesn't push content.
6. **No third-party scripts** above the fold.

---

## 5. INP (interactivity) protection

`useReducedMotion` everywhere. Specifically:

| Pattern | Mitigation |
|---|---|
| Tilt cards | Pointer events spring-smoothed, throttled by RAF |
| ScrollReveal3D | `viewport={{ once: true }}` — no re-animation |
| Scroll progress bar | `useSpring` on `scrollYProgress` (GPU-composited) |
| Mobile drag | Framer-motion `drag` uses transform — never triggers layout |

---

## 6. Image strategy (when we add them)

When real product screenshots / photos are added:

```tsx
import Image from "next/image";

<Image
  src="/hero/product.webp"
  alt="IshTop dashboard"
  width={960}
  height={640}
  priority         // above-fold only
  sizes="(max-width: 768px) 100vw, 50vw"
  placeholder="blur"
  blurDataURL="..."  // generated at build time
/>
```

Rules:
- Format: AVIF first, WebP fallback, JPEG last resort
- Sizes attribute matches CSS breakpoints
- `priority` on hero only; everything else lazy
- `placeholder="blur"` for above-fold, `"empty"` below

---

## 7. Lighthouse CI gate

Add to CI before merge:

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: pull_request

jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci --prefix frontend
      - run: npm run build --prefix frontend
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/student
            http://localhost:3000/design-system
          uploadArtifacts: true
          temporaryPublicStorage: true
          configPath: ./lighthouserc.json
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "settings": { "preset": "desktop" }
    },
    "assert": {
      "assertions": {
        "categories:performance":   ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices":["error", { "minScore": 0.95 }],
        "categories:seo":           ["error", { "minScore": 0.95 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "cumulative-layout-shift":  ["error", { "maxNumericValue": 0.05 }],
        "total-blocking-time":      ["error", { "maxNumericValue": 150 }]
      }
    }
  }
}
```

---

## 8. Local audit recipe

```bash
# 1. Build production bundle
cd frontend && npm run build && npm start

# 2. Run Lighthouse on landing
npx lighthouse http://localhost:3000 \
  --preset=desktop \
  --output=html \
  --output-path=./lh-landing.html \
  --chrome-flags="--headless"

# 3. Mobile audit
npx lighthouse http://localhost:3000 \
  --preset=mobile \
  --emulated-form-factor=mobile \
  --throttling-method=simulate \
  --output=html \
  --output-path=./lh-landing-mobile.html

# 4. Bundle analyzer
ANALYZE=true npm run build  # requires @next/bundle-analyzer wired
```

---

## 9. Common regressions to watch for

| Regression | Symptom | Likely cause |
|---|---|---|
| LCP > 2.5s | Hero takes too long | Someone added a hero raster image without `priority` |
| CLS > 0.1 | "Jumpy" feel during load | Web font swap without `adjustFontFallback` |
| TBT > 300ms | Stuttery on slower devices | New heavy lib added (e.g., date picker, charts) |
| JS first-load > 200KB | Bundle bloat | A below-fold section was moved into static import |
| INP > 200ms | Sluggish hover/click | Tilt math runs on main thread without RAF |

---

## 10. Performance ownership

- **Every PR touching the landing** must include a Lighthouse score in the description (CI helps automate this).
- **Bundle size regressions** > 5% are blocked at PR review.
- **A monthly perf review** — first Monday — checks p75 RUM (real-user) metrics from PostHog / Vercel Analytics.

---

## Honest disclaimer

These targets are **aspirations enforced by CI**. The current code is structured to meet them — but final scores depend on:
- Production CDN config
- Database response times for `/landing/content`
- Real-device measurements (run a few different Android models)

Re-measure after first prod deploy. If LCP > 2.5s in real-user metrics, the first action is profiling the network waterfall.
