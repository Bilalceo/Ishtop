"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Bot,
  Eye,
  Zap,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ScrollReveal3D, Spotlight, Tilt } from "./primitives";

type Locale = "uz" | "ru" | "en";

const COPY: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    cards: { title: string; desc: string; bullets: string[]; tag: string }[];
  }
> = {
  uz: {
    eyebrow: "AI imkoniyatlar",
    title: "Sun'iy idrok — sizning karyera mentoringiz",
    subtitle: "Black-box emas. Har bir natija tushuntiriladi va sizga nazorat qoldiriladi.",
    cards: [
      {
        title: "Explainable Match",
        tag: "Trust-first AI",
        desc: "Har bir vakansiya uchun aniq, o'qiladigan sabab. Qaysi ko'nikma yetarli, qaysisini o'rganish kerakligi.",
        bullets: ["Resume + JD vector analizi", "Ko'nikmalar farqi", "Ish darajasi mosligi"],
      },
      {
        title: "Resume AI",
        tag: "GPT-class",
        desc: "ATS-friendly, kuchli bullet pointlar, 5 ta professional dizayn — 60 soniyada eksport.",
        bullets: ["Action-verb tahrir", "Quantified achievement", "PDF / DOCX eksport"],
      },
      {
        title: "Auto-Apply",
        tag: "10x tezroq",
        desc: "Mos vakansiyalarga avtomatik ariza: cover letter va resume har bir kompaniyaga moslangan.",
        bullets: ["1 bosish, 10+ ariza", "Tailored cover letter", "Status real-time"],
      },
      {
        title: "Interview Coach",
        tag: "Beta",
        desc: "Kompaniya bo'yicha real savollar, AI bilan mock interview, fikr va o'sish trekeri.",
        bullets: ["Realtime feedback", "Sohaga moslangan savollar", "Progress tracker"],
      },
    ],
  },
  ru: {
    eyebrow: "AI возможности",
    title: "AI как карьерный наставник",
    subtitle: "Никакого чёрного ящика — объяснимые результаты и контроль за тобой.",
    cards: [
      {
        title: "Explainable Match",
        tag: "Trust-first AI",
        desc: "Понятная причина совпадения по каждой вакансии: что подходит, что подтянуть.",
        bullets: ["Resume + JD vector match", "Skill gap анализ", "Уровень опыта"],
      },
      {
        title: "Resume AI",
        tag: "GPT-class",
        desc: "ATS-friendly, сильные булиты, 5 готовых дизайнов — экспорт за 60 секунд.",
        bullets: ["Action verbs", "Метрики достижений", "PDF / DOCX"],
      },
      {
        title: "Auto-Apply",
        tag: "10x быстрее",
        desc: "Откликается по подходящим вакансиям. Cover letter и резюме адаптируются под каждую.",
        bullets: ["1 клик — 10+ откликов", "Tailored cover letter", "Статусы в реальном времени"],
      },
      {
        title: "Interview Coach",
        tag: "Beta",
        desc: "Реальные вопросы компаний, mock-интервью с AI и трекер прогресса.",
        bullets: ["Realtime feedback", "Под индустрию", "Трекер навыков"],
      },
    ],
  },
  en: {
    eyebrow: "AI features",
    title: "AI as your career coach",
    subtitle: "No black box. Every output is explained and stays under your control.",
    cards: [
      {
        title: "Explainable Match",
        tag: "Trust-first AI",
        desc: "A clear, human-readable reason for every job match — what fits, what to grow.",
        bullets: ["Resume + JD vector match", "Skill gap analysis", "Seniority alignment"],
      },
      {
        title: "Resume AI",
        tag: "GPT-class",
        desc: "ATS-friendly bullet points, 5 polished templates — export in 60 seconds.",
        bullets: ["Strong action verbs", "Quantified achievements", "PDF / DOCX export"],
      },
      {
        title: "Auto-Apply",
        tag: "10x faster",
        desc: "Auto-apply to ranked roles with cover letter and resume tailored to each company.",
        bullets: ["1 tap, 10+ applications", "Tailored cover letter", "Realtime status"],
      },
      {
        title: "Interview Coach",
        tag: "Beta",
        desc: "Company-specific questions, AI mock interview and a structured prep tracker.",
        bullets: ["Realtime feedback", "Industry-tuned questions", "Progress tracker"],
      },
    ],
  },
};

const ICONS = [Eye, Bot, Zap, Sparkles];

export function AIFeatures() {
  const { locale } = useTranslation();
  const reduce = useReducedMotion();
  const L = (["uz", "ru", "en"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "uz";
  const c = COPY[L];

  return (
    <Spotlight>
      <section
        id="features"
        className="aurora-bg grain perspective-1600 section-y"
        aria-labelledby="features-heading"
      >
        <div className="section-shell">
          <div className="mx-auto max-w-2xl text-center">
            <span className="h-eyebrow !border-white/10 !bg-white/[0.06] !text-white/80">
              <ShieldCheck className="h-3 w-3 text-emerald-300" />
              {c.eyebrow}
            </span>
            <ScrollReveal3D>
              <h2 id="features-heading" className="h-display mt-4 text-3xl text-white sm:text-5xl">
                {c.title}
              </h2>
            </ScrollReveal3D>
            <p className="mt-4 text-lg text-white/70">{c.subtitle}</p>
          </div>

          <div className="mt-14 grid items-stretch gap-5 md:grid-cols-2">
            {c.cards.map((card, i) => {
              const Icon = ICONS[i];
              return (
                <ScrollReveal3D key={card.title} delay={i * 0.08} amount={0.25} fullHeight>
                  <Tilt max={8} className="group h-full">
                    <div
                      className="depth-card group relative flex h-full flex-col overflow-hidden p-7"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {/* Top accent */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent"
                      />
                      <div
                        className="flex items-start justify-between gap-4"
                        style={{ transform: "translateZ(30px)" }}
                      >
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-400/30 text-white ring-1 ring-inset ring-white/15 shadow-lg shadow-emerald-500/20">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/85 ring-1 ring-inset ring-white/10">
                          {card.tag}
                        </span>
                      </div>
                      <h3
                        className="mt-6 font-display text-2xl font-semibold text-white"
                        style={{ transform: "translateZ(24px)" }}
                      >
                        {card.title}
                      </h3>
                      <p
                        className="mt-2 text-white/75"
                        style={{ transform: "translateZ(16px)" }}
                      >
                        {card.desc}
                      </p>
                      <ul
                        className="mt-5 grid gap-2"
                        style={{ transform: "translateZ(12px)" }}
                      >
                        {card.bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2 text-sm text-white/85">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" aria-hidden />
                            {b}
                          </li>
                        ))}
                      </ul>

                      {/* Hover sheen */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-400/30 opacity-0 blur-3xl transition group-hover:opacity-100"
                      />

                      {/* Reduce-motion fallback note */}
                      {reduce ? null : null}
                    </div>
                  </Tilt>
                </ScrollReveal3D>
              );
            })}
          </div>
        </div>
      </section>
    </Spotlight>
  );
}

export default AIFeatures;
