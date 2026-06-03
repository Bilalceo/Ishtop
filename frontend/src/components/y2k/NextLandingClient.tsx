"use client";

/**
 * IshTop — Chromatic Y2K campaign landing (/next)
 *
 * Mood: HDR mesh + glassmorphism + RGB-split typography + variable font breathing
 * Inspired by: Vercel AI SDK, Apple Vision Pro, Spotify Wrapped 2024
 * Use case: campaign landing for trafik kampaniyalari, AI-forward positioning
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Brain,
  Layers,
  Wand2,
  ShieldCheck,
  PlayCircle,
  Star,
} from "lucide-react";
import "./y2k.css";

const LOGOS = [
  "EPAM", "Uzum", "TBC Bank", "Click", "Payme", "Beeline",
  "Humans", "Korzinka", "MyTaxi", "Anorbank", "Kapital",
];

const FEATURES = [
  {
    Icon: Brain,
    title: "Explainable AI",
    desc: "Har bir match uchun aniq sabab. Black box yo'q.",
    stat: "98%",
    statLabel: "tushuntiriladi",
  },
  {
    Icon: Wand2,
    title: "Resume AI",
    desc: "60 soniyada ATS-friendly resume. GPT-class.",
    stat: "60s",
    statLabel: "eksport",
  },
  {
    Icon: Zap,
    title: "Auto-Apply",
    desc: "Bir bosish, 10+ ariza. Tailored cover letter.",
    stat: "10x",
    statLabel: "tezroq",
  },
  {
    Icon: Layers,
    title: "Trust Score",
    desc: "Soxta vakansiyalarga 0. Har company 0-100.",
    stat: "0",
    statLabel: "soxta",
  },
];

export default function NextLandingClient() {
  const reduce = useReducedMotion();

  return (
    <main className="y2k-root relative overflow-hidden">
      {/* Ambient mesh background — covers entire page */}
      <div className="y2k-mesh" aria-hidden />
      <div className="y2k-grain" aria-hidden />

      {/* Nav */}
      <nav
        aria-label="Primary"
        className="relative z-20"
      >
        <div className="y2k-shell flex h-20 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="IshTop home"
          >
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #FF2EC4 0%, #8B5CFF 50%, #00E5FF 100%)",
                boxShadow: "0 0 24px rgba(255, 46, 196, 0.5)",
              }}
            >
              <Sparkles className="h-4 w-4 text-white" aria-hidden />
            </span>
            <span className="text-lg font-semibold tracking-tight text-white">IshTop</span>
            <span className="y2k-chip ml-2 !text-[10px]">v2 · NEXT</span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/" className="text-sm font-medium text-white/70 hover:text-white">
              ← Aurora landing
            </Link>
            <Link href="/register" className="y2k-pill">
              Boshlash <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative" aria-labelledby="next-hero">
        {/* Liquid blob behind hero */}
        <div
          aria-hidden
          className="y2k-blob"
          style={{ top: "10%", left: "-8%", animationDelay: "0s" }}
        />
        <div
          aria-hidden
          className="y2k-blob"
          style={{
            top: "30%",
            right: "-6%",
            background: "radial-gradient(circle at 30% 30%, #00E5FF 0%, #8B5CFF 50%, #FFB800 100%)",
            animationDelay: "-7s",
            width: "420px",
            height: "420px",
          }}
        />

        <div className="y2k-shell relative z-10 grid gap-12 pb-20 pt-12 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-32 lg:pt-24">
          {/* Left: copy */}
          <div>
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="y2k-chip"
            >
              <Sparkles className="h-3 w-3" aria-hidden style={{ color: "#FFB800" }} /> AI · KARYERA · 2026
            </motion.span>

            <motion.h1
              id="next-hero"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.05 }}
              className="mt-6 pb-2 text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[64px] lg:text-[80px]"
            >
              Karyerangiz<br />
              <span className="y2k-rgb y2k-breathe">yangi</span>{" "}
              <span className="y2k-gradient-text">era</span>.
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="mt-6 max-w-lg text-lg leading-relaxed text-white/75 sm:text-xl"
            >
              IshTop AI sizning ko&apos;nikmalaringizni o&apos;qiydi, eng mos ishni topadi va arizani siz uchun
              yuboradi. Birinchi oferta — 4 hafta.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.28 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link href="/register" className="y2k-pill">
                Bepul boshlash <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a href="#features" className="y2k-pill-ghost">
                <PlayCircle className="h-4 w-4" aria-hidden /> 1 daqiqali tur
              </a>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-10 flex items-center gap-4"
            >
              <div className="flex -space-x-2" aria-hidden>
                {["#FF2EC4", "#00E5FF", "#FFB800", "#8B5CFF"].map((c, i) => (
                  <span
                    key={i}
                    className="grid h-9 w-9 place-items-center rounded-full text-[11px] font-semibold text-white"
                    style={{
                      background: c,
                      border: "2px solid #050010",
                      boxShadow: `0 0 12px ${c}aa`,
                    }}
                  >
                    {["S", "N", "A", "B"][i]}
                  </span>
                ))}
              </div>
              <div className="text-sm text-white/75">
                <div className="flex items-center gap-1" style={{ color: "#FFB800" }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden />
                  ))}
                  <span className="ml-1.5 text-white">4.9 / 5</span>
                </div>
                <p className="mt-0.5 text-white/60">10 000+ talaba allaqachon</p>
              </div>
            </motion.div>
          </div>

          {/* Right: glass card stack */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2 }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
            aria-hidden
          >
            {/* Main glass card */}
            <div className="y2k-glass y2k-glass-strong p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, #FF2EC4 0%, #00E5FF 100%)",
                      boxShadow: "0 0 16px rgba(255, 46, 196, 0.5)",
                    }}
                  >
                    UM
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Junior Frontend Developer</p>
                    <p className="mt-0.5 text-xs text-white/60">Uzum Market · Toshkent</p>
                  </div>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    color: "#00E5FF",
                    background: "rgba(0, 229, 255, 0.12)",
                    border: "1px solid rgba(0, 229, 255, 0.3)",
                  }}
                >
                  94% match
                </span>
              </div>

              <div
                className="mt-5 rounded-2xl p-4"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "#FF2EC4" }}
                >
                  Why match — AI reasoning
                </p>
                <ul className="mt-3 space-y-2 text-sm text-white/85">
                  <li className="flex items-start gap-2">
                    <span aria-hidden style={{ color: "#00E5FF" }}>›</span>
                    React + TS portfolio (3 PRs merged)
                  </li>
                  <li className="flex items-start gap-2">
                    <span aria-hidden style={{ color: "#00E5FF" }}>›</span>
                    Tailwind production experience
                  </li>
                  <li className="flex items-start gap-2">
                    <span aria-hidden style={{ color: "#FFB800" }}>›</span>
                    Company Trust Score: 88 (verified)
                  </li>
                </ul>
              </div>

              <div
                className="mt-4 flex items-center justify-between rounded-2xl p-3"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div className="flex items-center gap-2 text-xs text-white/75">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden style={{ color: "#FFB800" }} />
                  AI auto-apply tayyor
                </div>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  tabIndex={-1}
                  className="cursor-default rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{
                    color: "#050010",
                    background: "linear-gradient(120deg, #FFFFFF, #E8F1FF)",
                    boxShadow: "0 0 18px rgba(255, 46, 196, 0.4)",
                  }}
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Floating glass mini card */}
            <motion.div
              initial={reduce ? false : { y: 0 }}
              animate={reduce ? undefined : { y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="y2k-glass absolute -left-4 -bottom-8 hidden p-3 sm:block"
              style={{ width: 200, transform: "rotate(-3deg)" }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "#FF2EC4" }}
              >
                Resume score
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                87<span className="text-base text-white/60">/100</span>
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: "87%",
                    background: "linear-gradient(90deg, #FF2EC4, #8B5CFF, #00E5FF)",
                  }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={reduce ? false : { y: 0 }}
              animate={reduce ? undefined : { y: [0, 8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="y2k-glass absolute -right-2 -top-6 hidden p-3 md:block"
              style={{ minWidth: 180, transform: "rotate(4deg)" }}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "#00E5FF", boxShadow: "0 0 8px #00E5FF" }}
                />
                AI online
              </p>
              <p className="mt-1 text-sm font-semibold text-white">+3 ariza bugun</p>
              <p className="text-[11px]" style={{ color: "#00E5FF" }}>
                2 ta suhbat tayinlandi
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========== Logo marquee ========== */}
      <section className="relative z-10 py-6" aria-label="Trusted by">
        <div className="y2k-marquee y2k-shell overflow-hidden">
          <div className="y2k-marquee-track">
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="text-sm font-semibold tracking-wide text-white/45"
                style={{ minWidth: "fit-content" }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Features grid ========== */}
      <section
        id="features"
        className="relative z-10 py-20 sm:py-28"
        aria-labelledby="next-features"
      >
        <div className="y2k-shell">
          <div className="mx-auto max-w-2xl text-center">
            <span className="y2k-chip">
              <ShieldCheck className="h-3 w-3" aria-hidden style={{ color: "#00E5FF" }} />
              Imkoniyatlar
            </span>
            <h2
              id="next-features"
              className="mt-6 pb-1 text-3xl font-semibold leading-tight tracking-[-0.025em] text-white sm:text-5xl"
            >
              4 ta tool. <span className="y2k-gradient-text">Bitta nishon.</span>
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Hech qanday black box yo&apos;q. Har bir AI natija siz uchun tushuntiriladi.
            </p>
          </div>

          <div className="mt-14 grid items-stretch gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
                whileHover={reduce ? undefined : { y: -4 }}
                className="y2k-glass relative flex flex-col p-7"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,46,196,0.3), rgba(0,229,255,0.3))",
                      border: "1px solid rgba(255,255,255,0.18)",
                    }}
                  >
                    <f.Icon className="h-5 w-5 text-white" aria-hidden />
                  </span>
                  <div className="text-right">
                    <p
                      className="text-3xl font-semibold tracking-tight"
                      style={{ color: "#FFFFFF" }}
                    >
                      {f.stat}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                      {f.statLabel}
                    </p>
                  </div>
                </div>
                <h3 className="mt-6 text-2xl font-semibold leading-tight text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{f.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ========== Final CTA ========== */}
      <section className="relative z-10 py-20 sm:py-32" aria-labelledby="next-cta">
        <div
          aria-hidden
          className="y2k-blob"
          style={{
            top: "30%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "560px",
            height: "560px",
            opacity: 0.5,
          }}
        />
        <div className="y2k-shell relative">
          <div className="y2k-glass y2k-glass-strong mx-auto max-w-3xl p-10 text-center sm:p-16">
            <span className="y2k-chip">
              <Sparkles className="h-3 w-3" aria-hidden style={{ color: "#FFB800" }} />
              Hozir vaqt
            </span>
            <h2
              id="next-cta"
              className="mt-6 pb-2 text-3xl font-semibold leading-tight tracking-[-0.025em] text-white sm:text-5xl"
            >
              Birinchi ofertangiz —{" "}
              <span className="y2k-rgb y2k-breathe">yaqin</span>.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-white/75">
              60 soniyada profil. AI mosligini soniyada topadi. Ariza — bir tugma.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className="y2k-pill">
                Bepul boshlash <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/" className="y2k-pill-ghost">
                Aurora landing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== Footer ========== */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10" aria-label="Footer">
        <div className="y2k-shell flex flex-col items-center justify-between gap-3 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} IshTop · Chromatic v2 · Campaign</p>
          <p>
            Made in Tashkent ·{" "}
            <Link href="/design-system" className="hover:text-white">
              /design-system
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
