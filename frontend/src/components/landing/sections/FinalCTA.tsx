"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

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
    // Full-bleed dark gradient — matches Hero / AIFeatures / LiveDemoSection
    // pattern (aurora-bg on the section itself). The earlier `absolute inset-x-4
    // sm:inset-x-8 lg:inset-x-12 rounded-[40px]` wrapper left visible page
    // background as side margins, which looked like the section was a floating
    // card instead of an intentional full-width hero.
    <section className="aurora-bg grain relative overflow-hidden py-24 sm:py-32" aria-labelledby="cta-heading">
      <div className="section-shell relative">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl sm:p-14">
          <span className="h-eyebrow !border-white/15 !bg-white/[0.06] !text-white/85">
            <Sparkles className="h-3 w-3 text-amber-300" />
            {c.eyebrow}
          </span>
          <h2 id="cta-heading" className="h-display mt-6 pb-1 text-3xl leading-[1.15] text-white sm:text-5xl sm:leading-[1.12]">
            {c.title}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-white/75">{c.sub}</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn-aurora focus-ring group">
              {c.primary}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link href="/company" className="btn-ghost-dark focus-ring">
              {c.secondary}
            </Link>
          </div>

          <ul className="mt-8 flex flex-col items-center gap-2 text-sm text-white/70 sm:flex-row sm:justify-center sm:gap-6">
            {c.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden /> {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default FinalCTA;
