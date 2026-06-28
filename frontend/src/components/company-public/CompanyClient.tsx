"use client";

/**
 * IshTop — /company (Bento Maximal)
 *
 * B2B landing for employers in Apple AirPods-style modular bento grid.
 * Mixed media tiles: large numbers, mock UIs, gradient chunks, screenshots.
 *
 * Audience: HR managers, hiring teams at Uzum, EPAM, TBC, Click, etc.
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Users,
  Zap,
  ShieldCheck,
  TrendingUp,
  Brain,
  CheckCircle2,
  Star,
  Clock,
  BadgeCheck,
} from "lucide-react";
import "./company.css";

export default function CompanyClient() {
  const reduce = useReducedMotion();

  return (
    <main className="bn-root">
      {/* Nav */}
      <nav aria-label="Primary" className="border-b" style={{ borderColor: "var(--bn-rule)" }}>
        <div className="bn-shell flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-xl text-white"
              style={{
                background: "linear-gradient(135deg, var(--bn-accent), #8B89FF)",
              }}
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="bn-display text-base font-semibold">IshTop</span>
            <span className="bn-eyebrow ml-2 hidden sm:inline">For Business</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden text-sm font-medium hover:text-[var(--bn-accent)] sm:block"
              style={{ color: "var(--bn-ink-soft)" }}
            >
              Talabalar uchun
            </Link>
            <Link href="/contact" className="bn-btn">
              Demo so&apos;rash
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative py-16 sm:py-24" aria-labelledby="hero-h">
        <div className="bn-shell">
          <p className="bn-eyebrow">For Business · 2026</p>
          <motion.h1
            id="hero-h"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="bn-display mt-5 text-5xl sm:text-7xl lg:text-[88px]"
          >
            Hire faster.<br />
            <span style={{ color: "var(--bn-accent)" }}>Hire smarter.</span>
          </motion.h1>
          <p
            className="mt-6 max-w-2xl text-lg sm:text-xl"
            style={{ color: "var(--bn-ink-soft)" }}
          >
            O&apos;zbekiston'dagi 10,000+ junior talant. AI screening. Verified Trust Score.
            Pipeline avtomatlashtirilgan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact" className="bn-btn">
              Demo so&apos;rash
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/plans"
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--bn-ink)" }}
            >
              Tariflarni ko&apos;rish
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* BENTO GRID */}
      <section className="pb-24 sm:pb-32" aria-label="Features">
        <div className="bn-shell">
          <div className="grid auto-rows-[minmax(180px,auto)] gap-4 sm:grid-cols-6 sm:gap-5">
            {/* Big stat — 10,000+ candidates */}
            <Tile
              i={0}
              reduce={!!reduce}
              className="sm:col-span-3 sm:row-span-2"
              variant="dark"
            >
              <span className="bn-eyebrow">Verified candidates</span>
              <div className="mt-6 flex items-end gap-2">
                <p className="bn-num text-7xl sm:text-8xl lg:text-[128px]">10K+</p>
              </div>
              <p className="mt-4 max-w-sm text-sm text-white/70">
                Hozir faol talaba, ko&apos;nikmalari AI tomonidan tekshirilgan.
                Junior'lardan mid-level'gacha.
              </p>

              {/* Avatars stack */}
              <div className="mt-8 flex items-center gap-2" aria-hidden>
                <div className="flex -space-x-2">
                  {["#10B981", "#22D3EE", "#F5B544", "#3CCB7F", "#FF6B35"].map((c, i) => (
                    <span
                      key={i}
                      className="grid h-9 w-9 place-items-center rounded-full text-[11px] font-semibold text-white ring-2 ring-[#0E0F12]"
                      style={{ background: c }}
                    >
                      {["S", "N", "A", "B", "L"][i]}
                    </span>
                  ))}
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-white ring-2 ring-[#0E0F12]"
                  >
                    +9K
                  </span>
                </div>
                <p className="ml-2 text-xs text-white/60">faol talaba</p>
              </div>
            </Tile>

            {/* Time to hire */}
            <Tile i={1} reduce={!!reduce} className="sm:col-span-3" variant="accent">
              <span className="bn-eyebrow">Time to hire</span>
              <p className="bn-num mt-4 text-5xl sm:text-6xl">12 kun</p>
              <p className="mt-2 text-sm text-white/85">
                O&apos;rtacha post → hire vaqti.{" "}
                <span className="text-white/65">Bozorda — 47 kun.</span>
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-white/80" aria-hidden />
                <span className="text-white/85">4× tezroq</span>
              </div>
            </Tile>

            {/* AI screening mock */}
            <Tile i={2} reduce={!!reduce} className="sm:col-span-3">
              <span className="bn-eyebrow">AI Screening</span>
              <h3 className="bn-display mt-3 text-xl">
                Resume — 60 soniya, score — 5 soniya
              </h3>
              <div
                className="mt-5 rounded-2xl border p-4"
                style={{ borderColor: "var(--bn-rule)", background: "var(--bn-bg)" }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Sevinch Q.</p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: "rgba(0, 168, 107, 0.12)", color: "var(--bn-success)" }}
                  >
                    94% match
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {["React", "TypeScript", "Tailwind"].map((s) => (
                    <span
                      key={s}
                      className="rounded-full px-2 py-1 text-center text-xs"
                      style={{
                        background: "var(--bn-accent-soft)",
                        color: "var(--bn-accent)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bn-rule)" }}>
                  <motion.div
                    initial={reduce ? false : { width: 0 }}
                    whileInView={{ width: "94%" }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 1.1, ease: [0.19, 1, 0.22, 1], delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, var(--bn-accent), var(--bn-success))",
                    }}
                  />
                </div>
              </div>
            </Tile>

            {/* Trust score auto-filter */}
            <Tile i={3} reduce={!!reduce} className="sm:col-span-2">
              <span className="bn-eyebrow">Trust filter</span>
              <h3 className="bn-display mt-3 text-lg">
                Soxta CV'lar avtomatik filterda
              </h3>
              <div className="mt-5 flex items-center gap-3">
                <ShieldCheck
                  className="h-10 w-10"
                  style={{ color: "var(--bn-success)" }}
                  aria-hidden
                />
                <div>
                  <p className="bn-num text-2xl">98%</p>
                  <p className="text-xs" style={{ color: "var(--bn-mute)" }}>
                    aniqlik darajasi
                  </p>
                </div>
              </div>
            </Tile>

            {/* Pipeline mock */}
            <Tile i={4} reduce={!!reduce} className="sm:col-span-2">
              <span className="bn-eyebrow">Pipeline</span>
              <h3 className="bn-display mt-3 text-lg">
                Hammasi — bitta dashboard
              </h3>
              <div className="mt-5 grid grid-cols-4 gap-1.5">
                {[
                  { l: "Apply", v: 47, c: "var(--bn-accent)" },
                  { l: "Review", v: 23, c: "var(--bn-warm)" },
                  { l: "Inter.", v: 8, c: "#FFB800" },
                  { l: "Hired", v: 3, c: "var(--bn-success)" },
                ].map((p) => (
                  <div key={p.l} className="text-center">
                    <p className="bn-num text-base" style={{ color: p.c }}>
                      {p.v}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--bn-mute)" }}>
                      {p.l}
                    </p>
                  </div>
                ))}
              </div>
            </Tile>

            {/* Sourcing automation */}
            <Tile i={5} reduce={!!reduce} className="sm:col-span-2" variant="warm">
              <span className="bn-eyebrow">Auto-sourcing</span>
              <h3 className="bn-display mt-3 text-lg">
                AI sizning o&apos;rningizga qidiradi
              </h3>
              <div className="mt-5">
                <p className="bn-num text-4xl">+3</p>
                <p className="mt-1 text-sm text-white/85">
                  yangi top match bugun
                </p>
              </div>
              <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
                <Zap className="h-3 w-3" aria-hidden />
                Realtime
              </div>
            </Tile>

            {/* Logos / customers */}
            <Tile i={6} reduce={!!reduce} className="sm:col-span-6">
              <p className="bn-eyebrow">Bizga ishonganlar</p>
              <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-6">
                {["Uzum", "EPAM", "TBC Bank", "Click", "Payme", "Beeline"].map((n) => (
                  <div
                    key={n}
                    className="text-center text-sm font-semibold"
                    style={{ color: "var(--bn-mute)" }}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </Tile>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section
        className="border-t py-20 sm:py-24"
        style={{ borderColor: "var(--bn-rule)", background: "var(--bn-card)" }}
        aria-label="Testimonial"
      >
        <div className="bn-shell">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-1" style={{ color: "var(--bn-warm)" }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" aria-hidden />
              ))}
            </div>
            <p className="bn-display mt-4 text-2xl leading-tight sm:text-3xl">
              &ldquo;IshTop bilan junior frontend hire vaqtimiz 6 haftadan 11 kunga
              kamaydi. AI screening bizning HR jamoamizning haftalik 20 soatini
              tejaydi.&rdquo;
            </p>
            <p className="bn-eyebrow mt-6">
              Diyora R. · HR Lead at Uzum Market
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-32" aria-labelledby="cta-h">
        <div className="bn-shell">
          <div
            className="bn-tile bn-tile-dark p-10 sm:p-16"
            style={{ borderRadius: 36 }}
          >
            <div
              aria-hidden
              className="bn-blob"
              style={{
                top: "-20%",
                right: "10%",
                width: 400,
                height: 400,
                background: "var(--bn-accent)",
              }}
            />
            <div
              aria-hidden
              className="bn-blob"
              style={{
                bottom: "-30%",
                left: "10%",
                width: 350,
                height: 350,
                background: "var(--bn-warm)",
              }}
            />
            <div className="relative">
              <span className="bn-eyebrow">{"// CTA"}</span>
              <h2
                id="cta-h"
                className="bn-display mt-5 text-4xl sm:text-6xl lg:text-7xl"
              >
                10K+ talant. <br />
                <span style={{ color: "var(--bn-accent)" }}>Sizning navbatingiz.</span>
              </h2>
              <p className="mt-5 max-w-xl text-white/75 sm:text-lg">
                30 daqiqalik demo. Birinchi 10 ta vakansiya bepul. Karta yo&apos;q.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className="bn-btn bn-btn-light">
                  Demo so&apos;rash
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/plans"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]"
                >
                  Tariflarni ko&apos;rish
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-10"
        style={{ borderColor: "var(--bn-rule)" }}
        aria-label="Footer"
      >
        <div className="bn-shell flex flex-col items-start justify-between gap-3 text-sm sm:flex-row sm:items-center">
          <p style={{ color: "var(--bn-mute)" }}>
            © {new Date().getFullYear()} IshTop · For Business
          </p>
          <p style={{ color: "var(--bn-mute)" }}>Bento v1 · Apple-style modular</p>
        </div>
      </footer>
    </main>
  );
}

/* ----------------------------------------------------------------- Tile */

function Tile({
  children,
  className,
  variant,
  i,
  reduce,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "dark" | "accent" | "warm";
  i: number;
  reduce: boolean;
}) {
  const variantClass =
    variant === "dark"
      ? "bn-tile-dark"
      : variant === "accent"
      ? "bn-tile-accent"
      : variant === "warm"
      ? "bn-tile-warm"
      : "";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: [0.19, 1, 0.22, 1], delay: i * 0.05 }}
      className={`bn-tile ${variantClass} ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

// Unused but kept for future tiles
const _unused = { Users, Brain, CheckCircle2, Clock, BadgeCheck };
