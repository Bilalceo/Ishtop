"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  animate,
} from "framer-motion";
import { ShieldCheck, BadgeCheck, MessageSquareWarning, Star } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ScrollReveal3D, Tilt } from "./primitives";

type Locale = "uz" | "ru" | "en";

const COPY: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    factors: { title: string; desc: string; icon: typeof BadgeCheck }[];
    scoreLabel: string;
    company: string;
    badge: string;
    note: string;
    pills: { reviews: string; reply: string; verified: string };
  }
> = {
  uz: {
    eyebrow: "Ishonch tizimi",
    title: "Soxta ish e'lonlariga “yo'q” deymiz",
    subtitle:
      "Har bir kompaniya 0-100 oralig'ida baholanadi. Talaba sharhlari, biznes ro'yxati, javob darajasi va xavfsizlik signallari asosida.",
    factors: [
      { title: "Tasdiqlangan profil", desc: "Biznes va STIR raqami avtomatik tekshiriladi.", icon: BadgeCheck },
      { title: "Talaba sharhlari", desc: "Ish bergan kompaniyalar haqida fikrlar.", icon: Star },
      { title: "Javob darajasi", desc: "Arizalar qancha tez ko'rib chiqiladi.", icon: ShieldCheck },
      { title: "Xavf signali", desc: "Spam, soxta vakansiya va shubhali xulq aniqlanadi.", icon: MessageSquareWarning },
    ],
    scoreLabel: "Ishonch reytingi",
    company: "Uzum Market",
    badge: "Tasdiqlangan",
    note: "Yuqori reyting, 24 soat ichida javob",
    pills: { reviews: "Sharhlar 4.7", reply: "Javob 92%", verified: "3 yil tasdiq" },
  },
  ru: {
    eyebrow: "Система доверия",
    title: "Без фейковых вакансий",
    subtitle:
      "Каждая компания получает оценку 0–100: отзывы студентов, регистрация бизнеса, скорость ответа и сигналы риска.",
    factors: [
      { title: "Верифицированный профиль", desc: "Авто-проверка регистрации и ИНН.", icon: BadgeCheck },
      { title: "Отзывы студентов", desc: "Реальные оценки тех, кто уже работал.", icon: Star },
      { title: "Скорость ответа", desc: "Как быстро рассматривают отклики.", icon: ShieldCheck },
      { title: "Сигнал риска", desc: "Спам и подозрительные вакансии — наружу.", icon: MessageSquareWarning },
    ],
    scoreLabel: "Рейтинг доверия",
    company: "Uzum Market",
    badge: "Проверено",
    note: "Высокий рейтинг, ответ в течение 24 часов",
    pills: { reviews: "Отзывы 4.7", reply: "Ответ 92%", verified: "Проверен 3 г" },
  },
  en: {
    eyebrow: "Job Trust Score",
    title: "No more sketchy job posts",
    subtitle:
      "Every company gets a 0–100 score: student reviews, business verification, response speed and risk signals.",
    factors: [
      { title: "Verified profile", desc: "Business and tax ID auto-validated.", icon: BadgeCheck },
      { title: "Student reviews", desc: "Honest signal from people who worked there.", icon: Star },
      { title: "Response rate", desc: "How fast applications get reviewed.", icon: ShieldCheck },
      { title: "Risk signal", desc: "Spam, scams and red flags surfaced.", icon: MessageSquareWarning },
    ],
    scoreLabel: "Trust Score",
    company: "Uzum Market",
    badge: "Verified",
    note: "High rating, responds within 24h",
    pills: { reviews: "Reviews 4.7", reply: "Reply 92%", verified: "Verified 3y" },
  },
};

export function TrustScore() {
  const { locale } = useTranslation();
  const L = (["uz", "ru", "en"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "uz";
  const c = COPY[L];

  return (
    <section
      id="trust"
      className="mist-bg section-y border-y border-surface-200/60 perspective-1600 dark:border-white/[0.06]"
      aria-labelledby="trustscore-heading"
    >
      <div className="section-shell grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <div>
          <span className="h-eyebrow">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            {c.eyebrow}
          </span>
          <ScrollReveal3D>
            <h2
              id="trustscore-heading"
              className="h-display mt-4 text-3xl text-surface-900 dark:text-white sm:text-4xl"
            >
              {c.title}
            </h2>
          </ScrollReveal3D>
          <p className="mt-4 text-lg text-surface-600 dark:text-white/70">{c.subtitle}</p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {c.factors.map((f, i) => (
              <ScrollReveal3D key={f.title} delay={i * 0.05} amount={0.3}>
                <li className="card-aurora p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                      <f.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-surface-900 dark:text-white">{f.title}</p>
                      <p className="text-xs text-surface-500 dark:text-white/60">{f.desc}</p>
                    </div>
                  </div>
                </li>
              </ScrollReveal3D>
            ))}
          </ul>
        </div>

        <ScoreDial scoreLabel={c.scoreLabel} company={c.company} badge={c.badge} note={c.note} pills={c.pills} />
      </div>
    </section>
  );
}

function ScoreDial({
  scoreLabel,
  company,
  badge,
  note,
  pills,
}: {
  scoreLabel: string;
  company: string;
  badge: string;
  note: string;
  pills: { reviews: string; reply: string; verified: string };
}) {
  const score = 88;
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  const finalOffset = circumference - (score / 100) * circumference;

  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // Use amount: 0.15 so partial visibility on small viewports still triggers.
  const inView = useInView(ref, { once: true, amount: 0.15 });

  // Robust count-up + ring fill — InView triggers + failsafe timeout guarantees
  // final state even on fast scroll, slow render, or anchor-direct landing.
  const liveScore = useMotionValue(reduce ? score : 0);
  const offsetMv = useMotionValue(reduce ? finalOffset : circumference);
  const displayScore = useTransform(liveScore, (v) => Math.round(v).toString());

  // Ref (not state) so animation start doesn't trigger re-render → effect cleanup
  // → controls.stop() race condition.
  const animatedRef = useRef(reduce);

  useEffect(() => {
    if (reduce || animatedRef.current) return;
    if (!inView) return;
    animatedRef.current = true;
    animate(liveScore, score, { duration: 1.4, ease: [0.19, 1, 0.22, 1] });
    animate(offsetMv, finalOffset, { duration: 1.6, ease: [0.19, 1, 0.22, 1] });
  }, [inView, reduce, liveScore, offsetMv, score, finalOffset]);

  // Failsafe — snap to final after 2.5s if in-view never fires (anchor direct land
  // or IntersectionObserver dropped events on fast scroll).
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => {
      if (!animatedRef.current) {
        animatedRef.current = true;
        animate(liveScore, score, { duration: 0.9, ease: [0.19, 1, 0.22, 1] });
        animate(offsetMv, finalOffset, { duration: 0.9, ease: [0.19, 1, 0.22, 1] });
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [reduce, liveScore, offsetMv, score, finalOffset]);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-md">
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[40px] bg-[conic-gradient(from_120deg_at_50%_50%,rgba(124,92,255,0.20),rgba(34,211,238,0.18),rgba(60,203,127,0.18))] opacity-70 blur-3xl" />

      <Tilt max={6} className="group">
        <div className="depth-card-light p-6 sm:p-8" style={{ transformStyle: "preserve-3d" }}>
          <div
            className="flex items-center justify-between"
            style={{ transform: "translateZ(20px)" }}
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-white font-bold">
                U
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-white">{company}</p>
                <p className="text-xs text-surface-500 dark:text-white/60">{note}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
              <BadgeCheck className="h-3 w-3" /> {badge}
            </span>
          </div>

          <div className="mt-6 grid place-items-center" style={{ transform: "translateZ(30px)" }}>
            <svg
              width="240"
              height="240"
              viewBox="0 0 240 240"
              role="img"
              aria-label={`${scoreLabel}: ${score} out of 100`}
              className="-rotate-90"
            >
              <defs>
                <linearGradient id="scoreGrad" x1="0" x2="1">
                  <stop offset="0%" stopColor="#7C5CFF" />
                  <stop offset="60%" stopColor="#22D3EE" />
                  <stop offset="100%" stopColor="#3CCB7F" />
                </linearGradient>
                <filter id="scoreGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="14"
                className="text-surface-200 dark:text-white/10"
              />
              <motion.circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="url(#scoreGrad)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={circumference}
                style={{ strokeDashoffset: offsetMv }}
                filter="url(#scoreGlow)"
              />
            </svg>
            <div className="-mt-44 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/55">
                {scoreLabel}
              </p>
              <motion.p className="font-display text-6xl font-bold text-surface-900 dark:text-white">
                {displayScore}
              </motion.p>
              <p className="text-xs text-surface-500 dark:text-white/55">/ 100</p>
            </div>
          </div>

          <div
            className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px]"
            style={{ transform: "translateZ(20px)" }}
          >
            <div className="rounded-2xl bg-emerald-500/10 px-2 py-2 text-emerald-700 dark:text-emerald-300">
              {pills.reviews}
            </div>
            <div className="rounded-2xl bg-violet-500/10 px-2 py-2 text-violet-700 dark:text-violet-300">
              {pills.reply}
            </div>
            <div className="rounded-2xl bg-cyan-500/10 px-2 py-2 text-cyan-700 dark:text-cyan-300">
              {pills.verified}
            </div>
          </div>
        </div>
      </Tilt>
    </div>
  );
}

export default TrustScore;
