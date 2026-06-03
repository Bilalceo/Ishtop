"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Star,
  PlayCircle,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Spotlight, Tilt } from "./primitives";

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
  trust: string;
}> = {
  uz: {
    eyebrow: "Talabalar va junior mutaxassislar uchun AI-karyera",
    title: (h) => (
      <>
        Birinchi ishingizni{" "}
        {h("ishonchli")}
        <br className="hidden sm:block" /> tarzda toping.
      </>
    ),
    subtitle:
      "O'zbekiston talabalari, bitiruvchilari va junior mutaxassislari uchun. AI rezyumengizni tahlil qiladi, mos internship va junior vakansiyalarni taklif etadi va arizani soniyalar ichida yuboradi.",
    // primary = signup (conversion), secondary = demo (exploration)
    primary: "Bepul boshlash",
    secondary: "AI demo ko'rish",
    badges: ["AI Resume", "Explainable Match", "Auto-apply"],
    trust: "10 000+ talaba allaqachon foydalanmoqda",
  },
  ru: {
    eyebrow: "AI-карьера для студентов и junior-специалистов",
    title: (h) => (
      <>
        Найди первую работу — {h("осознанно")}
        <br className="hidden sm:block" /> и быстро.
      </>
    ),
    subtitle:
      "Для студентов, выпускников и junior-специалистов Узбекистана. AI анализирует ваши навыки, подбирает стажировки и junior-вакансии и помогает откликаться за секунды.",
    primary: "Начать бесплатно",
    secondary: "Посмотреть AI демо",
    badges: ["AI Resume", "Explainable Match", "Auto-apply"],
    trust: "Более 10 000 студентов уже с нами",
  },
  en: {
    eyebrow: "AI career platform for students & juniors",
    title: (h) => (
      <>
        Land your first job — {h("with confidence")}.
      </>
    ),
    subtitle:
      "For students, graduates and junior talent in Uzbekistan. AI reads your skills, matches you to internships and entry-level roles and applies in seconds.",
    primary: "Get started free",
    secondary: "Watch AI demo",
    badges: ["AI Resume", "Explainable Match", "Auto-apply"],
    trust: "10,000+ students already onboard",
  },
};

/**
 * Render a CMS-provided hero title while keeping the aurora-gradient highlight
 * on the most "value-carrying" word. Heuristic: the last word longer than 4
 * chars gets the underline treatment. Falls back to plain rendering if the
 * sentence is too short or already contains markup.
 */
function renderCmsTitleWithAccent(
  title: string,
  highlight: (s: string) => JSX.Element
): JSX.Element {
  const cleaned = title.replace(/\s+/g, " ").trim();
  if (cleaned.length < 8) return <span>{cleaned}</span>;
  const words = cleaned.split(" ");
  // Find rightmost meaningful word (length > 4, not punctuation-only).
  let idx = -1;
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i].replace(/[.,!?;:"']/g, "");
    if (w.length > 4) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return <span>{cleaned}</span>;
  const before = words.slice(0, idx).join(" ");
  const target = words[idx];
  const after = words.slice(idx + 1).join(" ");
  return (
    <>
      {before ? `${before} ` : ""}
      {highlight(target)}
      {after ? ` ${after}` : ""}
    </>
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

  // 3D scroll transforms
  const heroY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const cardY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -90]);
  const cardRotateX = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -8]);
  const orbA = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -240]);
  const orbB = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 200]);

  const heroYSpring = useSpring(heroY, { stiffness: 80, damping: 22 });
  const cardYSpring = useSpring(cardY, { stiffness: 70, damping: 22 });
  const cardRxSpring = useSpring(cardRotateX, { stiffness: 70, damping: 22 });

  const highlight = (s: string) => (
    <span className="aurora-text relative inline-block">
      {s}
      <svg
        aria-hidden
        className="absolute -bottom-2 left-0 h-2 w-full"
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M2 9 C 40 2, 80 12, 120 6 S 180 2, 198 7"
          fill="none"
          stroke="url(#auroraStroke)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.19, 1, 0.22, 1] }}
        />
        <defs>
          <linearGradient id="auroraStroke" x1="0" x2="1">
            <stop offset="0%" stopColor="#7C5CFF" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );

  // Hero title rules (CMS-aware, brand-safe):
  // - If CMS supplies a title, render it with the same display typography but
  //   apply the aurora gradient to the LAST significant word (Uzbek/Russian
  //   sentences typically end with the verb — the value carrier).
  // - If no CMS, use the hand-crafted local copy with the underline animation.
  const heroTitle = cms?.hero?.title
    ? renderCmsTitleWithAccent(cms.hero.title, highlight)
    : c.title(highlight);

  return (
    <Spotlight>
      <section
        ref={sectionRef}
        className="aurora-bg grain relative overflow-hidden pt-24 sm:pt-28 lg:pt-32"
      >
        {/* Floating ambient orbs (parallax) */}
        <motion.div
          aria-hidden
          style={{ y: orbA }}
          className="pointer-events-none absolute -left-32 top-20 h-[440px] w-[440px] rounded-full bg-gradient-to-br from-violet-500/40 to-fuchsia-500/0 blur-[120px]"
        />
        <motion.div
          aria-hidden
          style={{ y: orbB }}
          className="pointer-events-none absolute -right-32 top-40 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-cyan-400/40 to-blue-500/0 blur-[120px]"
        />

        <div className="section-shell perspective-1600 relative grid items-center gap-10 pb-16 sm:gap-12 sm:pb-24 lg:grid-cols-[1fr_1.15fr] lg:gap-14 lg:pb-32">
          {/* Left: copy with scroll parallax */}
          <motion.div style={{ y: heroYSpring, opacity: heroOpacity }}>
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="h-eyebrow !border-white/10 !bg-white/[0.06] !text-white/80"
            >
              <Sparkles className="h-3 w-3 text-amber-300" aria-hidden />
              {c.eyebrow}
            </motion.span>

            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="h-display mt-6 pb-2 text-4xl leading-[1.15] text-white sm:text-5xl sm:leading-[1.14] lg:text-[60px] lg:leading-[1.14]"
            >
              {heroTitle}
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:mt-5 sm:text-lg"
            >
              {cms?.hero?.subtitle ?? c.subtitle}
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              {/* Primary: signup — direct conversion. Secondary: jump to the
                  live AI demo for visitors who want to see the product first. */}
              <Link href="/register" className="btn-aurora focus-ring group">
                {c.primary}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <a href="#live-demo" className="btn-ghost-dark focus-ring group">
                <PlayCircle className="h-4 w-4" aria-hidden />
                {c.secondary}
              </a>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6"
            >
              <div className="flex -space-x-2" aria-hidden>
                {["#7C5CFF", "#22D3EE", "#F5B544", "#3CCB7F"].map((color, i) => (
                  <span
                    key={i}
                    className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#0B1020] text-[11px] font-semibold text-white"
                    style={{ background: color }}
                  >
                    {["S", "N", "A", "B"][i]}
                  </span>
                ))}
              </div>
              <div className="text-sm text-white/70">
                <div className="flex items-center gap-1 text-amber-300">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden />
                  ))}
                  <span className="ml-1 text-white/90">4.9 / 5</span>
                </div>
                <p className="mt-0.5 text-white/60">{c.trust}</p>
              </div>
            </motion.div>

            <div className="mt-8 flex flex-wrap gap-2">
              {c.badges.map((b, i) => (
                <motion.span
                  key={b}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.45 }}
                  className="chip !border-white/10 !bg-white/[0.04] !text-white/80"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-300" aria-hidden /> {b}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Right: 3D tiltable hero mock with scroll parallax.
              On desktop, pin to the right edge of the grid cell so the right
              ambient orb fills what used to look like dead space. The card
              itself is allowed to grow up to lg:max-w-xl, and the floating
              side-cards extend slightly past it for depth. */}
          <motion.div
            style={{ y: cardYSpring, rotateX: cardRxSpring, transformStyle: "preserve-3d" }}
            className="perspective-1600 relative mx-auto w-full max-w-md lg:ml-auto lg:mr-0 lg:max-w-xl"
            aria-hidden
          >
            {/* Conic halo */}
            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[40px] bg-[conic-gradient(from_120deg_at_50%_50%,rgba(124,92,255,0.55),rgba(34,211,238,0.45),rgba(245,181,68,0.25),rgba(124,92,255,0.55))] opacity-60 blur-3xl" />

            <Tilt max={9} className="group">
              <div className="depth-card edge-glow p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3" style={{ transform: "translateZ(30px)" }}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      aria-hidden
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white ring-1 ring-inset ring-white/15"
                      style={{
                        background:
                          "linear-gradient(135deg, #4f46e5 0%, #7c5cff 50%, #22d3ee 100%)",
                      }}
                    >
                      UM
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight text-white">
                        Junior Frontend Developer
                      </p>
                      <p className="mt-0.5 text-xs leading-snug text-white/75">
                        Uzum Market · Toshkent
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    94% match
                  </span>
                </div>

                <div
                  className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  style={{ transform: "translateZ(20px)" }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    Nega mos keladi
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-white/90">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                      React, TypeScript va Tailwind portfolio'da topildi
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                      3 ta open-source PR — junior darajadan yuqori
                    </li>
                    <li className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan-300" />
                      Kompaniyaning Trust Score: 88 (verified)
                    </li>
                  </ul>
                </div>

                <div
                  className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                  style={{ transform: "translateZ(40px)" }}
                >
                  <div className="flex items-center gap-2 text-xs text-white/85">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    AI auto-apply tayyor
                  </div>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    tabIndex={-1}
                    title="Demo preview — register to apply"
                    className="cursor-default rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0B1020] shadow-lg"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </Tilt>

            {/* Floating side cards — 3D z-translated. Positioned OUTSIDE
                the main job card boundaries so they never cover its title,
                checklist, or footer:
                 - Resume score peeks above-left of the card top edge
                 - Pipeline peeks below-right of the card bottom edge
                Both are hidden on mobile (sm:block) — mobile uses the natural
                vertical stack from the parent grid, no absolute overlap. */}
            <motion.div
              initial={reduce ? false : { y: 0 }}
              animate={reduce ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-6 -top-24 hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl backdrop-blur sm:block"
              style={{ transform: "translateZ(60px) rotateZ(-4deg)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                Resume score
              </p>
              <p className="text-2xl font-bold text-white">87<span className="text-base text-white/75">/100</span></p>
              <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" />
              </div>
            </motion.div>

            <motion.div
              initial={reduce ? false : { y: 0 }}
              animate={reduce ? undefined : { y: [0, 8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-24 -right-6 hidden min-w-[180px] whitespace-nowrap rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl backdrop-blur sm:block"
              style={{ transform: "translateZ(80px) rotateZ(4deg)" }}
            >
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                <TrendingUp className="h-3 w-3" /> Pipeline
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">+3 ariza bugun</p>
              <p className="text-[11px] font-medium text-emerald-200">2 ta suhbat tayinlandi</p>
            </motion.div>

            <motion.div
              initial={reduce ? false : { y: 0 }}
              animate={reduce ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute right-8 -top-6 hidden rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur md:flex md:items-center md:gap-1.5"
              style={{ transform: "translateZ(90px)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(60,203,127,0.8)]" />
              AI online
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom fade into next section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white dark:to-[#070A16]" />

        {/* Scroll cue */}
        <motion.a
          href="#how"
          aria-label="Scroll to how it works"
          className="focus-ring absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-white/60 backdrop-blur"
          initial={reduce ? false : { y: 0, opacity: 0.6 }}
          animate={reduce ? undefined : { y: [0, 6, 0], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="block h-6 w-3 rounded-full border border-white/20">
            <span className="mx-auto mt-1 block h-1 w-0.5 rounded-full bg-white/80" />
          </span>
        </motion.a>
      </section>
    </Spotlight>
  );
}

export default Hero;
