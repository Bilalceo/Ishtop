"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, PlayCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

type HeroCmsPayload = {
  hero?: { title?: string; subtitle?: string; primaryCta?: string; secondaryCta?: string };
} | null;

type Locale = "uz" | "ru" | "en";

const COPY: Record<Locale, {
  eyebrow: string;
  title: (highlight: (s: string) => JSX.Element) => JSX.Element;
  subtitle: string;
  primary: string;
  secondary: string;
  badges: string[];
}> = {
  uz: {
    eyebrow: "Talabalar va junior mutaxassislar uchun AI-karyera",
    title: (h) => (
      <>
        Birinchi ishingizni {h("ishonchli")}
        <br className="hidden sm:block" /> tarzda toping.
      </>
    ),
    subtitle:
      "AI rezyumengizni tahlil qiladi, kasbingizga mos vakansiyalarni topadi va arizani soniyalar ichida tayyorlaydi — O'zbekiston talabalari va junior mutaxassislari uchun.",
    primary: "Bepul boshlash",
    secondary: "AI demo ko'rish",
    badges: ["AI rezyume", "Tushuntiriladigan moslik", "Ishonch reytingi"],
  },
  ru: {
    eyebrow: "AI-карьера для студентов и junior-специалистов",
    title: (h) => (
      <>
        Найди первую работу {h("осознанно")}
        <br className="hidden sm:block" /> и быстро.
      </>
    ),
    subtitle:
      "AI анализирует ваше резюме, подбирает подходящие вакансии и готовит отклик за секунды — для студентов и junior-специалистов Узбекистана.",
    primary: "Начать бесплатно",
    secondary: "Посмотреть AI демо",
    badges: ["AI-резюме", "Объяснимый матчинг", "Рейтинг доверия"],
  },
  en: {
    eyebrow: "AI career platform for students & juniors",
    title: (h) => (
      <>
        Land your first job {h("with confidence")}.
      </>
    ),
    subtitle:
      "AI reviews your resume, matches you to relevant roles and prepares your application in seconds — for students and junior talent in Uzbekistan.",
    primary: "Get started free",
    secondary: "Watch AI demo",
    badges: ["AI resume", "Explainable match", "Trust score"],
  },
};

function renderCmsTitleWithAccent(title: string, highlight: (s: string) => JSX.Element): JSX.Element {
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (cleaned.length < 8) return <span>{cleaned}</span>;
  const words = cleaned.split(" ");
  let idx = -1;
  for (let i = words.length - 1; i >= 0; i--) {
    if (words[i].replace(/[.,!?;:"']/g, "").length > 4) { idx = i; break; }
  }
  if (idx === -1) return <span>{cleaned}</span>;
  const before = words.slice(0, idx).join(" ");
  const after = words.slice(idx + 1).join(" ");
  return (
    <>
      {before ? `${before} ` : ""}
      {highlight(words[idx])}
      {after ? ` ${after}` : ""}
    </>
  );
}

export function Hero({ cms }: { cms?: HeroCmsPayload }) {
  const { locale } = useTranslation();
  const reduce = useReducedMotion();
  const L = (locale as Locale) in COPY ? (locale as Locale) : "uz";
  const c = COPY[L];

  const highlight = (s: string) => <span className="text-emerald-400">{s}</span>;
  const heroTitle = cms?.hero?.title
    ? renderCmsTitleWithAccent(cms.hero.title, highlight)
    : c.title(highlight);

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.19, 1, 0.22, 1] as const },
        };

  return (
    <section className="relative overflow-hidden bg-[#0a0a0b] pt-28 sm:pt-32 lg:pt-36">
      {/* One restrained accent glow — no rainbow of orbs. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-44 left-1/2 h-[460px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[150px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:64px_64px]"
      />

      <div className="section-shell relative grid items-center gap-12 pb-20 sm:pb-28 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-32">
        {/* Left — copy */}
        <div>
          <motion.span
            {...fade(0)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {c.eyebrow}
          </motion.span>

          <motion.h1
            {...fade(0.06)}
            className="mt-6 text-balance text-4xl font-bold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[58px] lg:leading-[1.08]"
          >
            {heroTitle}
          </motion.h1>

          <motion.p
            {...fade(0.12)}
            className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/60 sm:text-lg"
          >
            {cms?.hero?.subtitle ?? c.subtitle}
          </motion.p>

          <motion.div {...fade(0.18)} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-[#0a0a0b] transition hover:bg-emerald-400"
            >
              {cms?.hero?.primaryCta ?? c.primary}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <a
              href="#live-demo"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/5"
            >
              <PlayCircle className="h-4 w-4" aria-hidden />
              {cms?.hero?.secondaryCta ?? c.secondary}
            </a>
          </motion.div>

          <motion.div {...fade(0.26)} className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {c.badges.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 text-sm text-white/55">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />
                {b}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Right — one clean product card */}
        <motion.div
          {...(reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: 0.2, ease: [0.19, 1, 0.22, 1] as const } })}
          className="relative mx-auto w-full max-w-md lg:ml-auto lg:max-w-lg"
          aria-hidden
        >
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-sm font-bold text-white ring-1 ring-inset ring-white/10">
                  UM
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight text-white">Junior Frontend Developer</p>
                  <p className="mt-0.5 text-xs text-white/50">Uzum Market · Toshkent</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-400/20">
                94% mos
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Nega mos keladi</p>
              <ul className="mt-3 space-y-2.5 text-sm text-white/80">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  React, TypeScript va Tailwind portfolioda topildi
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  3 ta open-source PR — junior darajadan yuqori
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  Kompaniya ishonch reytingi: 88 (tasdiqlangan)
                </li>
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="inline-flex items-center gap-2 text-xs text-white/70">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                AI ariza tayyorladi
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0a0a0b]">Yuborish</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Soft fade into next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#070A16]" />
    </section>
  );
}

export default Hero;
