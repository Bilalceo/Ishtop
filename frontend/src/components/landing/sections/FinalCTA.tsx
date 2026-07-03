"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Reveal } from "./primitives";

type Locale = "uz" | "ru" | "en";

const COPY: Record<Locale, { eyebrow: string; title: string; sub: string; primary: string; secondary: string; bullets: string[] }> = {
  uz: {
    eyebrow: "Hozir vaqt",
    title: "Bugun boshla — birinchi oferta uzoq emas",
    sub: "Bepul ro'yxatdan o'tish, 60 soniyada profil, soniyalar ichida birinchi mos vakansiya.",
    primary: "Bepul ro'yxatdan o'tish",
    secondary: "Kompaniyalarga ko'rsat",
    bullets: ["Kredit karta talab qilinmaydi", "60 soniyada AI profil", "Ma'lumotlar shifrlangan"],
  },
  ru: {
    eyebrow: "Время сейчас",
    title: "Начни сегодня — первый оффер ближе, чем кажется",
    sub: "Бесплатная регистрация, профиль за 60 секунд, первая подходящая вакансия — за секунды.",
    primary: "Зарегистрироваться бесплатно",
    secondary: "Я компания",
    bullets: ["Без банковской карты", "AI-профиль за 60с", "Данные зашифрованы"],
  },
  en: {
    eyebrow: "Now is the time",
    title: "Start today — your first offer is closer than you think",
    sub: "Free signup, AI profile in 60 seconds, your first matched job in moments.",
    primary: "Sign up free",
    secondary: "I'm a company",
    bullets: ["No credit card", "AI profile in 60s", "End-to-end encrypted"],
  },
};

export function FinalCTA() {
  const { locale } = useTranslation();
  const L = (["uz", "ru", "en"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "uz";
  const c = COPY[L];

  return (
    // Silver rebrand: full-width pastel gradient wash on the silver ground,
    // with a floating white card holding the CTA.
    <section
      className="silver-ground relative overflow-hidden py-24 sm:py-32"
      aria-labelledby="cta-heading"
    >
      {/* Full-bleed pastel wash behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[420px] -translate-y-1/2 bg-gradient-to-r from-[#d7e7ff]/70 via-[#e3ddff]/60 to-[#ffe9d6]/60 blur-3xl"
      />

      <div className="section-shell relative">
        <Reveal className="mx-auto max-w-3xl">
          <div className="card-silver p-8 text-center sm:p-14">
            <span className="chip-silver uppercase tracking-[0.18em] !text-[11px]">
              <Sparkles className="h-3 w-3 text-[#e2b184]" />
              {c.eyebrow}
            </span>
            <h2
              id="cta-heading"
              className="h-display mt-6 pb-1 text-3xl leading-[1.15] text-[#18181b] sm:text-5xl sm:leading-[1.12]"
            >
              {c.title}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-[#63636b]">{c.sub}</p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className="btn-silver-primary focus-ring group">
                {c.primary}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                href="/business"
                className="btn-silver-ghost focus-ring !bg-[#f6f6f4]"
              >
                {c.secondary}
              </Link>
            </div>

            <ul className="mt-8 flex flex-col items-center gap-2 text-sm text-[#71717a] sm:flex-row sm:justify-center sm:gap-6">
              {c.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#7cc7a2]" aria-hidden /> {b}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default FinalCTA;
