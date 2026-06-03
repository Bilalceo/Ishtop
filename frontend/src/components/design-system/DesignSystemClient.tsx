"use client";

/**
 * IshTop — Living Design System
 *
 * Acts as Storybook + Figma replacement in a single route.
 * Lists every primitive with the underlying token, code snippet,
 * and a live preview. Designed to be the source of truth for
 * design/dev handoff.
 *
 * Routes: /design-system
 */

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  Sparkles,
  ShieldCheck,
  Star,
  Bot,
  Eye,
  Zap,
  Bookmark,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { SwipeStack } from "@/components/ui/swipe-cards";
import { Tilt, ScrollReveal3D } from "@/components/landing/sections/primitives";
import tokens from "@/lib/design-tokens.json";

const SECTIONS = [
  { id: "foundations", label: "Foundations" },
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing" },
  { id: "radius", label: "Radius" },
  { id: "shadow", label: "Shadow" },
  { id: "motion", label: "Motion" },
  { id: "buttons", label: "Buttons" },
  { id: "badges", label: "Badges" },
  { id: "cards", label: "Cards" },
  { id: "forms", label: "Forms" },
  { id: "feedback", label: "Feedback" },
  { id: "mobile", label: "Mobile patterns" },
  { id: "primitives", label: "Motion primitives" },
] as const;

export default function DesignSystemClient() {
  return (
    <div className="min-h-screen bg-white text-surface-900 antialiased dark:bg-[#0B1020] dark:text-white">
      <Header />
      <div className="section-shell grid gap-12 py-12 lg:grid-cols-[220px_1fr] lg:gap-16 lg:py-16">
        <SideNav />
        <main className="min-w-0 space-y-20">
          <Foundations />
          <Colors />
          <Typography />
          <Spacing />
          <Radius />
          <Shadow />
          <Motion />
          <Buttons />
          <Badges />
          <Cards />
          <Forms />
          <Feedback />
          <MobilePatterns />
          <Primitives />
        </main>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Header */

function Header() {
  return (
    <header className="aurora-bg grain border-b border-white/[0.06]">
      <div className="section-shell py-16 sm:py-24">
        <span className="h-eyebrow !border-white/10 !bg-white/[0.06] !text-white/80">
          <Sparkles className="h-3 w-3 text-amber-300" />
          Aurora Design System · v1.0
        </span>
        <h1 className="h-display mt-6 text-4xl text-white sm:text-6xl">
          IshTop component lab
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg text-white/70">
          Live component gallery, design tokens, motion primitives and brand
          guidelines. The single source of truth for designer-developer handoff.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <span className="chip !border-white/10 !bg-white/[0.04] !text-white/80">
            <CheckCircle2 className="h-3 w-3 text-emerald-300" /> 60+ components
          </span>
          <span className="chip !border-white/10 !bg-white/[0.04] !text-white/80">
            <CheckCircle2 className="h-3 w-3 text-emerald-300" /> W3C tokens
          </span>
          <span className="chip !border-white/10 !bg-white/[0.04] !text-white/80">
            <CheckCircle2 className="h-3 w-3 text-emerald-300" /> WCAG AA
          </span>
          <span className="chip !border-white/10 !bg-white/[0.04] !text-white/80">
            <CheckCircle2 className="h-3 w-3 text-emerald-300" /> Reduce-motion safe
          </span>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn-aurora focus-ring">
            ← Landing
          </Link>
          <a
            href="/design-tokens.json"
            className="btn-ghost-dark focus-ring"
            download="ishtop-design-tokens.json"
          >
            Download tokens.json
          </a>
          <Link href="/brand-guidelines" className="btn-ghost-dark focus-ring">
            Brand guidelines
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------- Side Nav */

function SideNav() {
  return (
    <aside className="sticky top-6 hidden h-fit max-h-[80vh] overflow-y-auto rounded-2xl border border-surface-200/70 bg-white p-3 shadow-soft dark:border-white/[0.06] dark:bg-white/[0.02] lg:block">
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/55">
        Components
      </p>
      <ul className="space-y-0.5">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="focus-ring block rounded-xl px-3 py-1.5 text-sm font-medium text-surface-700 hover:bg-surface-100 hover:text-violet-600 dark:text-white/70 dark:hover:bg-white/[0.04] dark:hover:text-violet-300"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/* -------------------------------------------------------------- Section */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20">
      <header className="border-b border-surface-200/70 pb-4 dark:border-white/[0.06]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">
          /{id}
        </p>
        <h2 id={`${id}-h`} className="h-display mt-1 text-2xl text-surface-900 dark:text-white sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-surface-600 dark:text-white/65">{description}</p>
        )}
      </header>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function PreviewBox({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-surface-200 bg-surface-50 p-6 dark:border-white/[0.06] dark:bg-white/[0.02] ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-2xl border border-surface-200 bg-[#0B1020] p-4 text-xs leading-relaxed text-white/85 dark:border-white/[0.06]">
        <code className="font-mono">{code}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        aria-label="Copy code"
        className="focus-ring absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-white/[0.08] text-white/70 transition hover:bg-white/[0.14] hover:text-white"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------- Foundations */

function Foundations() {
  const items = [
    { label: "Audience", value: "Students & juniors 18-28 in Uzbekistan" },
    { label: "Locales", value: "uz (primary), ru, en" },
    { label: "Theme", value: "Dark-first, light supported · system-aware" },
    { label: "Density", value: "Comfortable · 8pt baseline grid" },
    { label: "Iconography", value: "Lucide 1.5px stroke, 18-20px size" },
    { label: "Photography", value: "Editorial portraits + abstract gradients" },
    { label: "Tone of voice", value: "Calm confidence, plain language, no hype" },
    { label: "Brand pillars", value: "Trust-first · Explainable AI · Student-friendly" },
  ];
  return (
    <Section
      id="foundations"
      title="Foundations"
      description="Brand decisions encoded as primitives. These never change without a brand review."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.label} className="card-aurora p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/55">
              {it.label}
            </p>
            <p className="mt-1 text-sm font-medium text-surface-900 dark:text-white">{it.value}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- Colors */

function Colors() {
  const swatches = [
    { name: "ink/900", hex: "#0B1020", role: "Hero / dark surface" },
    { name: "ink/800", hex: "#111733", role: "Card on dark" },
    { name: "aurora/violet", hex: "#7C5CFF", role: "Primary brand" },
    { name: "aurora/cyan", hex: "#22D3EE", role: "Secondary brand" },
    { name: "gold/500", hex: "#F5B544", role: "Warm signal" },
    { name: "mint/trust", hex: "#3CCB7F", role: "Trust / success" },
    { name: "mist/100", hex: "#F6F7FB", role: "Light surface" },
    { name: "surface/500", hex: "#6B7280", role: "Muted text" },
    { name: "surface/900", hex: "#111827", role: "Body text" },
  ];
  return (
    <Section
      id="colors"
      title="Color"
      description="All values are tokens. Never reference raw hex inside components — always go through tokens or Tailwind."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {swatches.map((s) => (
          <div key={s.name} className="card-aurora overflow-hidden">
            <div
              className="h-24 w-full"
              style={{ background: s.hex }}
              aria-hidden
            />
            <div className="p-4">
              <p className="font-mono text-xs text-surface-500 dark:text-white/55">{s.name}</p>
              <p className="font-mono text-sm font-medium text-surface-900 dark:text-white">
                {s.hex}
              </p>
              <p className="mt-1 text-xs text-surface-500 dark:text-white/60">{s.role}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="mt-10 font-display text-lg font-semibold">Gradients</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card-aurora overflow-hidden">
          <div
            className="h-28"
            style={{
              background:
                "linear-gradient(120deg, #7C5CFF 0%, #5B8CFF 60%, #22D3EE 110%)",
            }}
          />
          <div className="p-4">
            <p className="font-mono text-xs text-surface-500 dark:text-white/55">gradient/aurora-primary</p>
            <p className="text-xs text-surface-500 dark:text-white/60">Primary CTA, hero accents</p>
          </div>
        </div>
        <div className="card-aurora overflow-hidden">
          <div
            className="h-28"
            style={{
              background:
                "conic-gradient(from 120deg at 50% 50%, #7C5CFF, #22D3EE, #F5B544, #7C5CFF)",
            }}
          />
          <div className="p-4">
            <p className="font-mono text-xs text-surface-500 dark:text-white/55">gradient/aurora-conic</p>
            <p className="text-xs text-surface-500 dark:text-white/60">Halos behind depth cards</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------- Typography */

function Typography() {
  const samples: { className: string; label: string; sample: string }[] = [
    { className: "h-display text-5xl sm:text-6xl", label: "display/xl · 64", sample: "Birinchi ishingizni toping" },
    { className: "h-display text-4xl sm:text-5xl", label: "display/lg · 48", sample: "Tushuntiriladigan match" },
    { className: "h-display text-2xl sm:text-3xl", label: "h2 · 30", sample: "Qanday ishlaydi" },
    { className: "font-display text-xl font-semibold", label: "h3 · 20", sample: "Resume AI" },
    { className: "text-lg leading-relaxed text-surface-600 dark:text-white/70", label: "lead · 18", sample: "Karyerangizni soniyalar ichida boshlang." },
    { className: "text-sm text-surface-600 dark:text-white/70", label: "body/sm · 14", sample: "AI sizning ko'nikmalaringizni tahlil qiladi." },
    { className: "h-eyebrow", label: "eyebrow · 11", sample: "AI-quvvatli karyera" },
  ];
  return (
    <Section
      id="typography"
      title="Typography"
      description="Inter at all weights. Display headings ship with safe line-height (1.12) and 0.06em padding-bottom to avoid descender clip."
    >
      <PreviewBox>
        <div className="space-y-8">
          {samples.map((s, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[160px_1fr] sm:items-center">
              <p className="font-mono text-xs text-surface-500 dark:text-white/55">{s.label}</p>
              <p className={s.className}>{s.sample}</p>
            </div>
          ))}
        </div>
      </PreviewBox>
      <div className="mt-4">
        <CodeBlock
          code={`// Display heading
<h1 className="h-display text-5xl sm:text-6xl">…</h1>

// Eyebrow tag
<span className="h-eyebrow">AI-powered</span>

// Aurora gradient text
<span className="aurora-text">premium</span>`}
        />
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- Spacing */

function Spacing() {
  const scale = [1, 2, 3, 4, 6, 8, 12, 16, 20, 24];
  return (
    <Section
      id="spacing"
      title="Spacing"
      description="8pt baseline grid. Section vertical rhythm: 80px mobile · 96-128px desktop."
    >
      <PreviewBox>
        <div className="space-y-3">
          {scale.map((n) => (
            <div key={n} className="flex items-center gap-4">
              <span className="w-12 font-mono text-xs text-surface-500 dark:text-white/55">
                {n} · {n * 4}px
              </span>
              <span
                aria-hidden
                className="block h-3 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                style={{ width: n * 4 }}
              />
            </div>
          ))}
        </div>
      </PreviewBox>
    </Section>
  );
}

/* ---------------------------------------------------------------- Radius */

function Radius() {
  const radii = [
    { name: "sm · 8", className: "rounded-lg" },
    { name: "md · 12", className: "rounded-xl" },
    { name: "lg · 16", className: "rounded-2xl" },
    { name: "xl · 24", className: "rounded-3xl" },
    { name: "full", className: "rounded-full" },
  ];
  return (
    <Section id="radius" title="Radius" description="Cards use 24-28px. Pills/buttons use full radius for friendly feel.">
      <PreviewBox>
        <div className="flex flex-wrap items-end gap-5">
          {radii.map((r) => (
            <div key={r.name} className="text-center">
              <div className={`h-20 w-20 ${r.className} bg-gradient-to-br from-violet-500 to-cyan-400`} />
              <p className="mt-2 font-mono text-xs text-surface-500 dark:text-white/55">{r.name}</p>
            </div>
          ))}
        </div>
      </PreviewBox>
    </Section>
  );
}

/* ---------------------------------------------------------------- Shadow */

function Shadow() {
  const shadows = [
    { name: "card", className: "shadow-card" },
    { name: "lift", className: "shadow-card-hover" },
    { name: "soft", className: "shadow-soft" },
    { name: "aurora", className: "shadow-glow-purple" },
  ];
  return (
    <Section id="shadow" title="Shadow" description="Layered shadows with brand glow at higher elevations.">
      <PreviewBox>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {shadows.map((s) => (
            <div key={s.name} className="text-center">
              <div
                className={`mx-auto h-24 w-32 rounded-2xl bg-white dark:bg-white/[0.04] ${s.className}`}
              />
              <p className="mt-3 font-mono text-xs text-surface-500 dark:text-white/55">{s.name}</p>
            </div>
          ))}
        </div>
      </PreviewBox>
    </Section>
  );
}

/* ---------------------------------------------------------------- Motion */

function Motion() {
  return (
    <Section
      id="motion"
      title="Motion"
      description="Easing: out-expo (signature) · cubic-bezier(0.19, 1, 0.22, 1). Durations: 150 / 250 / 400 / 600 / 900ms."
    >
      <PreviewBox>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "fast · 150ms", c: "duration-150" },
            { label: "base · 250ms", c: "duration-250" },
            { label: "moderate · 400ms", c: "duration-400" },
          ].map((m) => (
            <button
              key={m.c}
              type="button"
              className={`group h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-semibold text-white transition-transform ${m.c} hover:scale-105 hover:rotate-1`}
            >
              <span className="block">Hover · {m.label}</span>
            </button>
          ))}
        </div>
      </PreviewBox>
      <p className="mt-3 text-sm text-surface-500 dark:text-white/55">
        ✓ All motion respects <code className="font-mono">prefers-reduced-motion: reduce</code>.
      </p>
    </Section>
  );
}

/* --------------------------------------------------------------- Buttons */

function Buttons() {
  return (
    <Section id="buttons" title="Buttons" description="Primary uses aurora gradient. Ghost on dark surfaces. Always rounded-full for primary actions.">
      <div className="grid gap-6 lg:grid-cols-2">
        <PreviewBox className="space-y-4">
          <button className="btn-aurora focus-ring">
            Bepul boshlash
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <div className="rounded-2xl bg-[#0B1020] p-6">
            <button className="btn-ghost-dark focus-ring">Qanday ishlaydi</button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Default shadcn</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Sm</Button>
            <Button>Md</Button>
            <Button size="lg">Lg</Button>
          </div>
        </PreviewBox>
        <CodeBlock
          code={`<button className="btn-aurora focus-ring">
  Bepul boshlash
  <ArrowRight className="h-4 w-4" aria-hidden />
</button>

<button className="btn-ghost-dark focus-ring">
  Qanday ishlaydi
</button>

<Button variant="outline">Outline</Button>`}
        />
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- Badges */

function Badges() {
  return (
    <Section id="badges" title="Badges & chips" description="Use for tags, status, and meta information. Never decoration.">
      <PreviewBox>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="error">Error</Badge>
          <span className="chip">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Verified
          </span>
          <span className="chip">
            <Star className="h-3 w-3 text-amber-500" /> 4.9 rating
          </span>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            94% match
          </span>
        </div>
      </PreviewBox>
    </Section>
  );
}

/* ----------------------------------------------------------------- Cards */

function Cards() {
  return (
    <Section id="cards" title="Cards" description="Three elevations: flat (shadcn), aurora (depth-card), tilt 3D.">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-violet-500" />
              shadcn / Card
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-surface-600 dark:text-white/70">
              Default elevation. Use for dashboard widgets and side panels.
            </p>
          </CardContent>
        </Card>

        <div className="card-aurora p-6">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-500" />
            <p className="font-display text-base font-semibold">card-aurora</p>
          </div>
          <p className="mt-3 text-sm text-surface-600 dark:text-white/70">
            Premium card with token-aligned shadow + glass surface.
          </p>
        </div>

        <Tilt max={8} className="group">
          <div className="depth-card p-6">
            <div className="flex items-center gap-2 text-white">
              <Zap className="h-4 w-4 text-amber-300" />
              <p className="font-display text-base font-semibold">depth-card + Tilt</p>
            </div>
            <p className="mt-3 text-sm text-white/70">
              Pointer-tilted 3D card with glare + edge-glow. Hover me.
            </p>
          </div>
        </Tilt>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------------- Forms */

function Forms() {
  return (
    <Section id="forms" title="Forms" description="Always pair label + input + helper text. Validation surfaces inline.">
      <PreviewBox>
        <form className="grid max-w-md gap-4">
          <label className="block">
            <span className="text-sm font-medium text-surface-700 dark:text-white/80">Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              className="focus-ring mt-1.5 w-full rounded-2xl border border-surface-200 bg-white px-4 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            />
            <span className="mt-1.5 block text-xs text-surface-500 dark:text-white/55">
              We&apos;ll never share your email.
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-surface-700 dark:text-white/80">
              Password
            </span>
            <input
              type="password"
              className="focus-ring mt-1.5 w-full rounded-2xl border border-red-300 bg-red-50/50 px-4 py-2.5 text-sm text-surface-900 dark:border-red-500/40 dark:bg-red-500/10 dark:text-white"
              defaultValue="123"
            />
            <span className="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-300">
              <AlertCircle className="h-3 w-3" /> Kamida 8 ta belgi bo&apos;lsin
            </span>
          </label>
        </form>
      </PreviewBox>
    </Section>
  );
}

/* -------------------------------------------------------------- Feedback */

function Feedback() {
  return (
    <Section id="feedback" title="Feedback states" description="Skeleton on load. Empty + retry on error. Confirmation on success.">
      <div className="grid gap-5 lg:grid-cols-3">
        <PreviewBox>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/55">
            Loading
          </p>
          <div className="mt-3 space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </PreviewBox>

        <PreviewBox>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/55">
            Empty
          </p>
          <div className="mt-3 rounded-2xl border border-dashed border-surface-300 p-6 text-center dark:border-white/15">
            <Bookmark className="mx-auto h-7 w-7 text-violet-500" />
            <p className="mt-2 text-sm font-medium text-surface-900 dark:text-white">
              Saqlangan vakansiyalar yo&apos;q
            </p>
            <Button size="sm" variant="outline" className="mt-3 rounded-full">
              Ko&apos;rib chiqish
            </Button>
          </div>
        </PreviewBox>

        <PreviewBox>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/55">
            Progress
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-1 text-xs text-surface-500 dark:text-white/55">Profile 72%</p>
              <Progress value={72} />
            </div>
            <div>
              <p className="mb-1 text-xs text-surface-500 dark:text-white/55">Resume score 87/100</p>
              <Progress value={87} />
            </div>
          </div>
        </PreviewBox>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------- Mobile Patterns */

function MobilePatterns() {
  const [open, setOpen] = useState(false);
  const slides = [
    { title: "AI Resume", body: "Bullet pointlar bir tugma bilan kuchayadi", color: "#7C5CFF" },
    { title: "Smart match", body: "Ko'nikmalaringizga mos vakansiyalar", color: "#22D3EE" },
    { title: "Auto-apply", body: "10 ta vakansiyaga 1 tugma bilan", color: "#F5B544" },
  ];
  return (
    <Section
      id="mobile"
      title="Mobile signature patterns"
      description="Bottom sheet (filters, mobile dialogs) + swipe stack (testimonials, jobs)."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <PreviewBox>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/55">
            BottomSheet
          </p>
          <p className="mt-2 text-sm text-surface-600 dark:text-white/65">
            Drag-to-dismiss · backdrop tap · ESC close · focus trap
          </p>
          <Button onClick={() => setOpen(true)} className="mt-4 rounded-full">
            Open sheet
          </Button>
          <BottomSheet
            open={open}
            onClose={() => setOpen(false)}
            title="Filters"
            description="3 ta filtr tanlangan"
            footer={
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setOpen(false)}>
                  Tozalash
                </Button>
                <Button className="flex-1 rounded-full" onClick={() => setOpen(false)}>
                  Qo&apos;llash
                </Button>
              </div>
            }
          >
            <div className="space-y-3">
              {["Toshkent", "Remote", "Junior", "React", "Python"].map((t) => (
                <label key={t} className="flex items-center gap-3 rounded-2xl border border-surface-200 p-3 dark:border-white/[0.06]">
                  <input type="checkbox" defaultChecked className="h-4 w-4 accent-violet-500" />
                  <span className="text-sm font-medium">{t}</span>
                </label>
              ))}
            </div>
          </BottomSheet>
        </PreviewBox>

        <PreviewBox>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/55">
            SwipeStack
          </p>
          <p className="mt-2 mb-4 text-sm text-surface-600 dark:text-white/65">
            Drag · arrow keys · dots · stacked depth
          </p>
          <div className="mx-auto max-w-sm">
            <SwipeStack
              items={slides}
              ariaLabel="AI feature demo"
              renderItem={(s) => (
                <div className="card-aurora h-full p-6">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-2xl text-white"
                    style={{ background: s.color }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <h4 className="mt-5 font-display text-xl font-semibold">{s.title}</h4>
                  <p className="mt-2 text-sm text-surface-600 dark:text-white/70">{s.body}</p>
                </div>
              )}
            />
          </div>
        </PreviewBox>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------- Motion primitives */

function Primitives() {
  return (
    <Section
      id="primitives"
      title="Motion primitives"
      description="Composable wrappers. Use across landing + dashboard for consistent motion."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <PreviewBox>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/55">
            Tilt
          </p>
          <Tilt max={10} className="group mt-4">
            <div className="depth-card p-6 text-white">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 font-display text-lg font-semibold">Hover me</p>
              <p className="mt-1 text-sm text-white/70">3D perspective + glare</p>
            </div>
          </Tilt>
        </PreviewBox>

        <PreviewBox>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/55">
            ScrollReveal3D
          </p>
          <p className="mt-2 text-sm text-surface-600 dark:text-white/65">
            Scroll up and back — cards rotate in from -80z + 18°.
          </p>
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((n) => (
              <ScrollReveal3D key={n} delay={n * 0.05}>
                <div className="card-aurora p-4">
                  <p className="text-sm font-medium">Card {n}</p>
                </div>
              </ScrollReveal3D>
            ))}
          </div>
        </PreviewBox>
      </div>

      <h3 className="mt-10 font-display text-lg font-semibold">Token reference</h3>
      <p className="mt-2 text-sm text-surface-500 dark:text-white/55">
        {Object.keys(tokens.color).length} color groups · {Object.keys(tokens.space).length} spacing values · {Object.keys(tokens.motion.easing).length} easings.
      </p>
      <div className="mt-4">
        <CodeBlock
          code={`import tokens from "@/lib/design-tokens.json";

tokens.color.aurora.violet.$value;   // "#7C5CFF"
tokens.motion.easing["out-expo"].$value;
// "cubic-bezier(0.19, 1, 0.22, 1)"`}
        />
      </div>
    </Section>
  );
}
