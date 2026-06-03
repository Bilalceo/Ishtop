import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = {
  title: "IshTop — Brand Guidelines",
  description: "IshTop Aurora brand: voice, color, typography, motion, and component rules.",
  robots: { index: false, follow: false },
};

export default function BrandGuidelinesPage() {
  return (
    <main className="min-h-screen bg-white text-surface-900 antialiased dark:bg-[#0B1020] dark:text-white print:bg-white print:text-black">
      <header className="aurora-bg grain border-b border-white/[0.06] print:hidden">
        <div className="section-shell py-12">
          <div className="flex items-center gap-3">
            <Link
              href="/design-system"
              className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.1]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Design system
            </Link>
          </div>
          <h1 className="h-display mt-6 text-4xl text-white sm:text-5xl">Brand guidelines</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Aurora system · v1.0 · Voice, color, typography, motion. Print this page for a brand
            sheet you can hand to partners.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/design-tokens.json"
              download="ishtop-design-tokens.json"
              className="btn-aurora focus-ring"
            >
              <Download className="h-4 w-4" aria-hidden /> Tokens (.json)
            </a>
            <PrintButton />
          </div>
        </div>
      </header>

      <article className="section-shell prose-aurora py-12 sm:py-16">
        {/* Essence */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">
            /essence
          </p>
          <h2 className="h-display mt-1 text-2xl sm:text-3xl">Brand essence</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { p: "Trust-first", d: "Every AI output ships with a reason." },
              { p: "Student-friendly", d: "Plain language. Never patronizing." },
              { p: "Premium without elite", d: "Linear/Vercel polish, accessible to a first-job seeker." },
              { p: "Aurora", d: "Luminous, moving — never static." },
            ].map((x) => (
              <li key={x.p} className="card-aurora p-5">
                <p className="font-display text-base font-semibold">{x.p}</p>
                <p className="mt-1 text-sm text-surface-600 dark:text-white/65">{x.d}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-2xl border-l-4 border-violet-500 bg-violet-50/50 p-4 italic text-surface-700 dark:bg-violet-500/5 dark:text-white/80">
            O&apos;zbekistondagi talabalar va junior mutaxassislar uchun ishonchli AI-karyera platformasi.
          </p>
        </section>

        {/* Logo */}
        <Hr />
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">
            /logo
          </p>
          <h2 className="h-display mt-1 text-2xl sm:text-3xl">Logo system</h2>
          <div className="mt-6 grid items-center gap-6 rounded-2xl border border-surface-200 bg-surface-50 p-8 dark:border-white/[0.06] dark:bg-white/[0.02] sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-lg shadow-violet-500/30"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" aria-hidden>
                  <path
                    fill="currentColor"
                    d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Zm6 11 1 2.4L21.6 17 19 18l-1 2.4L17 18l-2.4-1L17 16l1-2Z"
                  />
                </svg>
              </span>
              <span className="font-display text-2xl font-semibold tracking-tight">IshTop</span>
            </div>
            <ul className="space-y-2 text-sm text-surface-600 dark:text-white/65">
              <li>• Minimum size: 24px height on screen, 18mm in print</li>
              <li>• Clear space: 1× glyph height on every side</li>
              <li>• Never stretch, skew or recolor the gradient</li>
              <li>• On photography: always with a backdrop blur</li>
            </ul>
          </div>
        </section>

        {/* Color */}
        <Hr />
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">
            /color
          </p>
          <h2 className="h-display mt-1 text-2xl sm:text-3xl">Color palette</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { n: "ink/900", h: "#0B1020" },
              { n: "aurora/violet", h: "#7C5CFF" },
              { n: "aurora/cyan", h: "#22D3EE" },
              { n: "gold/500", h: "#F5B544" },
              { n: "mint/trust", h: "#3CCB7F" },
            ].map((c) => (
              <div key={c.n} className="card-aurora overflow-hidden">
                <div className="h-20" style={{ background: c.h }} aria-hidden />
                <div className="p-3">
                  <p className="font-mono text-[11px] text-surface-500 dark:text-white/55">{c.n}</p>
                  <p className="font-mono text-sm font-semibold">{c.h}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-surface-600 dark:text-white/65">
            <strong>Contrast rule:</strong> body text uses minimum 4.5:1 (AA). CTA white-on-violet measures
            4.7:1.
          </p>
        </section>

        {/* Voice */}
        <Hr />
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">
            /voice
          </p>
          <h2 className="h-display mt-1 text-2xl sm:text-3xl">Voice & tone</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { c: "Hero hook", t: "Calm confidence", e: "Birinchi ishingizni ishonchli tarzda toping." },
              { c: "CTA", t: "Clear action verb", e: "Bepul boshlash · not “Click here”" },
              { c: "Error", t: "Empathetic", e: "Tarmoq biroz sekin. Qayta urinib ko'ring." },
              { c: "Empty", t: "Helpful", e: "Hali ariza yo'q — keling, birinchisini topamiz." },
              { c: "Success", t: "Plain", e: "Profil 100% to'ldi." },
              { c: "Avoid", t: "Hype", e: '"amazing", "magical", "10x" — banned' },
            ].map((x) => (
              <div key={x.c} className="card-aurora p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/55">
                  {x.c}
                </p>
                <p className="mt-1 text-sm font-semibold">{x.t}</p>
                <p className="mt-1 text-sm text-surface-600 dark:text-white/65">{x.e}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Motion */}
        <Hr />
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">
            /motion
          </p>
          <h2 className="h-display mt-1 text-2xl sm:text-3xl">Motion principles</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <strong>Signature easing:</strong>{" "}
              <code className="rounded bg-surface-100 px-1 font-mono text-xs dark:bg-white/[0.06]">
                cubic-bezier(0.19, 1, 0.22, 1)
              </code>
            </li>
            <li>
              <strong>Durations:</strong> 150 / 250 / 400 / 600 / 900ms — used per intent
            </li>
            <li>
              <strong>Reduce-motion compliance</strong> on every primitive
            </li>
            <li>
              <strong>3D depth</strong> reserved for hero and feature cards — never decorative
            </li>
          </ul>
        </section>

        {/* Banned */}
        <Hr />
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-500">/banned</p>
          <h2 className="h-display mt-1 text-2xl sm:text-3xl">Brand violations</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
            <li>AI hype copy ("revolutionary", "magical", "10x")</li>
            <li>Fake numbers in social proof</li>
            <li>Animation without a reduce-motion fallback</li>
            <li>Stock person photos where a CSS gradient avatar will do</li>
            <li>New colors without an AA contrast check</li>
            <li>“Coming soon” labels — ship it or don't mention it</li>
          </ol>
        </section>
      </article>

      <footer className="border-t border-surface-200/70 py-8 text-center text-xs text-surface-500 dark:border-white/[0.06] dark:text-white/55 print:hidden">
        v1.0 · {new Date().getFullYear()} IshTop · Single source of truth: code at <code>/design-system</code>
      </footer>
    </main>
  );
}

function Hr() {
  return <hr className="my-12 hr-aurora" aria-hidden />;
}
