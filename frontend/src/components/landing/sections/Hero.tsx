"use client";

/**
 * Hero — "Silver" light rebrand.
 * E5E5E5 ground, white cards, soft pastel accents only.
 * Motion: staggered blur-fade entrance, drifting pastel blobs,
 * scroll parallax on the floating product card.
 */

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
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
    title: (h) => <>Land your first job {h("with confidence")}.</>,
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

/* Drifting pastel blob — pure ambience, GPU-cheap (transform + blur only) */
function Blob({
  className,
  duration = 18,
  delay = 0,
}: {
  className: string;
  duration?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute rounded-full ${className}`}
      animate={
        reduce
          ? undefined
          : { x: [0, 30, -20, 0], y: [0, -24, 18, 0], scale: [1, 1.06, 0.97, 1] }
      }
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function Hero({ cms }: { cms?: HeroCmsPayload }) {
  const { locale } = useTranslation();
  const reduce = useReducedMotion();
  const L = (locale as Locale) in COPY ? (locale as Locale) : "uz";
  const c = COPY[L];

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  // Parallax: the product card drifts up slower than the copy scrolls away
  const cardYRaw = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const cardY = useSpring(cardYRaw, { stiffness: 90, damping: 24, mass: 0.4 });

  const highlight = (s: string) => (
    <span className="relative inline-block">
      <span className="relative z-10">{s}</span>
      {/* soft pastel underline wash instead of a colored word */}
      <span
        aria-hidden
        className="absolute inset-x-[-4px] bottom-[0.08em] z-0 h-[0.38em] rounded-md bg-gradient-to-r from-[#d7e7ff] via-[#e3ddff] to-[#ffe9d6]"
      />
    </span>
  );
  const heroTitle = cms?.hero?.title
    ? renderCmsTitleWithAccent(cms.hero.title, highlight)
    : c.title(highlight);

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20, filter: "blur(8px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { duration: 0.7, delay, ease: [0.19, 1, 0.22, 1] as const },
        };

  return (
    <section
      ref={sectionRef}
      className="silver-ground relative overflow-hidden pt-32 sm:pt-36 lg:pt-40"
    >
      {/* Ambient pastel blobs on the silver ground */}
      <Blob className="-top-24 left-[8%] h-[380px] w-[380px] bg-[#d7e7ff]/70 blur-[110px]" duration={20} />
      <Blob className="top-[16%] right-[6%] h-[320px] w-[320px] bg-[#e3ddff]/70 blur-[110px]" duration={24} delay={2} />
      <Blob className="bottom-[-120px] left-[38%] h-[360px] w-[360px] bg-[#ffe9d6]/60 blur-[120px]" duration={26} delay={4} />

      <div className="section-shell relative pb-24 sm:pb-32">
        {/* Centered copy */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.span {...fade(0)} className="chip-silver">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#8ab4ff] to-[#b7a4ff]" />
            {c.eyebrow}
          </motion.span>

          <motion.h1
            {...fade(0.08)}
            className="mt-7 text-balance text-4xl font-bold leading-[1.1] tracking-tight text-[#18181b] sm:text-5xl lg:text-[64px] lg:leading-[1.05]"
          >
            {heroTitle}
          </motion.h1>

          <motion.p
            {...fade(0.16)}
            className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-[#63636b] sm:text-lg"
          >
            {cms?.hero?.subtitle ?? c.subtitle}
          </motion.p>

          {/* Perfectly balanced CTA row — primary left, demo right, equal height */}
          <motion.div
            {...fade(0.24)}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/register" className="btn-silver-primary group w-full sm:w-auto">
              {cms?.hero?.primaryCta ?? c.primary}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <a href="#live-demo" className="btn-silver-ghost group w-full sm:w-auto">
              <PlayCircle className="h-4 w-4 text-[#8ab4ff]" aria-hidden />
              {cms?.hero?.secondaryCta ?? c.secondary}
            </a>
          </motion.div>

          <motion.div
            {...fade(0.32)}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          >
            {c.badges.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 text-sm text-[#71717a]">
                <CheckCircle2 className="h-4 w-4 text-[#7cc7a2]" aria-hidden />
                {b}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Floating product card — parallax on scroll */}
        <motion.div
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, y: 36, filter: "blur(10px)" },
                animate: { opacity: 1, y: 0, filter: "blur(0px)" },
                transition: { duration: 0.9, delay: 0.34, ease: [0.19, 1, 0.22, 1] as const },
              })}
          style={{ y: cardY }}
          className="relative mx-auto mt-14 w-full max-w-2xl sm:mt-16"
          aria-hidden
        >
          {/* soft pastel halo behind the card */}
          <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-gradient-to-r from-[#d7e7ff]/60 via-[#e3ddff]/50 to-[#ffe9d6]/50 blur-2xl" />

          <div className="card-silver relative p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#d7e7ff] text-sm font-bold text-[#3856a5]">
                  UM
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold leading-tight text-[#18181b]">
                    Junior Frontend Developer
                  </p>
                  <p className="mt-0.5 text-xs text-[#8e8e96]">Uzum Market · Toshkent</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-[#d9f1e4] px-3 py-1 text-xs font-semibold text-[#2f7a56]">
                {L === "ru" ? "94% совпадение" : "94% mos"}
              </span>
            </div>

            <div className="mt-5 rounded-2xl bg-[#f6f6f4] p-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a0a0a8]">
                {L === "ru" ? "Почему подходит" : "Nega mos keladi"}
              </p>
              <ul className="mt-3 space-y-2.5 text-sm text-[#3f3f46]">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7cc7a2]" />
                  {L === "ru"
                    ? "React, TypeScript и Tailwind найдены в портфолио"
                    : "React, TypeScript va Tailwind portfolioda topildi"}
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7cc7a2]" />
                  {L === "ru"
                    ? "3 open-source PR — выше уровня junior"
                    : "3 ta open-source PR — junior darajadan yuqori"}
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#8ab4ff]" />
                  {L === "ru"
                    ? "Рейтинг доверия компании: 88 (проверено)"
                    : "Kompaniya ishonch reytingi: 88 (tasdiqlangan)"}
                </li>
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f6f6f4] p-3">
              <span className="inline-flex items-center gap-2 text-xs text-[#63636b]">
                <Sparkles className="h-3.5 w-3.5 text-[#b7a4ff]" />
                {L === "ru" ? "AI подготовил отклик" : "AI ariza tayyorladi"}
              </span>
              <span className="btn-silver-primary !px-4 !py-1.5 !text-xs">
                {L === "ru" ? "Отправить" : "Yuborish"}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
