"use client";

/**
 * IshTop — /business (Silver rebrand)
 *
 * B2B landing for employers in the platform's silver design language:
 * E5E5E5 ground, white + pastel bento tiles, periwinkle accents,
 * floating island nav, blur-fade reveals. Copy is Uzbek.
 */

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Zap,
  ShieldCheck,
  TrendingUp,
  Star,
} from "lucide-react";
import { Reveal } from "@/components/landing/sections/primitives";
import { useTranslation } from "@/hooks/useTranslation";

export default function CompanyClient() {
  const reduce = useReducedMotion();
  const { locale } = useTranslation();
  const ru = locale === "ru";

  return (
    <main className="silver-ground relative min-h-screen text-[#18181b] antialiased">
      {/* Floating island nav */}
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full bg-white/75 px-4 shadow-[0_6px_20px_-10px_rgba(24,24,27,0.16)] backdrop-blur-xl sm:h-16 sm:px-6">
          <Link href="/" className="focus-ring flex items-center gap-2 rounded-xl" aria-label="IshTop home">
            <Image
              src="/logo-ishtop.png?v=3"
              alt="IshTop"
              width={1025}
              height={292}
              className="h-6 w-auto sm:h-7"
            />
            <span className="hidden rounded-full bg-[#e3ddff] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5b4a9e] sm:inline">
              {ru ? "Бизнес" : "Biznes"}
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className="focus-ring hidden rounded-full px-4 py-2 text-sm font-medium text-[#52525b] hover:text-[#18181b] sm:block"
            >
              {ru ? "Для студентов" : "Talabalar uchun"}
            </Link>
            <Link href="/contact" className="btn-silver-primary !px-5 !py-2.5">
              {ru ? "Запросить демо" : "Demo so'rash"}
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 sm:pt-36" aria-labelledby="hero-h">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#d7e7ff]/70 via-[#e3ddff]/60 to-[#ffe9d6]/60 blur-3xl"
        />
        <div className="section-shell relative pb-14 text-center sm:pb-16">
          <Reveal>
            <span className="chip-silver uppercase tracking-[0.18em] !text-[11px]">
              {ru ? "Для бизнеса · 2026" : "Biznes uchun · 2026"}
            </span>
            <h1 id="hero-h" className="h-display mx-auto mt-6 max-w-3xl text-4xl text-[#18181b] sm:text-6xl lg:text-7xl">
              {ru ? "Нанимайте быстрее. " : "Tezroq yollang. "}
              <span className="bg-gradient-to-r from-[#6f9bf0] to-[#a08de0] bg-clip-text text-transparent">
                {ru ? "Нанимайте умнее." : "Aqlliroq yollang."}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-[#63636b] sm:text-xl">
              {ru ? "Тысячи junior-талантов Узбекистана. AI-скрининг, проверенный рейтинг доверия и автоматизированный процесс найма." : "O'zbekistondagi minglab junior talant. AI saralash, tasdiqlangan ishonch reytingi va avtomatlashtirilgan yollash jarayoni."}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/contact" className="btn-silver-primary focus-ring group">
                {ru ? "Запросить демо" : "Demo so'rash"}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link href="/plans" className="btn-silver-ghost focus-ring">
                {ru ? "Смотреть тарифы" : "Tariflarni ko'rish"}
                <ArrowUpRight className="h-3.5 w-3.5 text-[#8ab4ff]" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* BENTO GRID */}
      <section className="pb-20 sm:pb-28" aria-label="Imkoniyatlar">
        <div className="section-shell">
          <div className="grid auto-rows-[minmax(180px,auto)] gap-4 sm:grid-cols-6 sm:gap-5">
            {/* Big stat — candidates (pastel gradient tile) */}
            <Reveal className="sm:col-span-3 sm:row-span-2">
              <div className="card-silver h-full !bg-gradient-to-br !from-[#d7e7ff] !via-[#e0e2ff] !to-[#e3ddff] p-7">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5470b8]">
                  {ru ? "Проверенные кандидаты" : "Tasdiqlangan nomzodlar"}
                </span>
                <p className="font-display mt-6 text-7xl font-bold tracking-tight text-[#2e4278] sm:text-8xl lg:text-[120px]">
                  10K+
                </p>
                <p className="mt-4 max-w-sm text-sm text-[#4a5a85]">
                  {ru ? "Активные студенты, навыки проверены AI. От junior до mid-level." : "Hozir faol talaba, ko'nikmalari AI tomonidan tekshirilgan. Junior'lardan mid-level'gacha."}
                </p>
                <div className="mt-8 flex items-center gap-2" aria-hidden>
                  <div className="flex -space-x-2">
                    {[
                      ["S", "#6f9bf0"],
                      ["N", "#8f7fe8"],
                      ["A", "#e2a86b"],
                      ["B", "#5fb98a"],
                      ["L", "#e88fae"],
                    ].map(([ch, c]) => (
                      <span
                        key={ch}
                        className="grid h-9 w-9 place-items-center rounded-full text-[11px] font-semibold text-white ring-2 ring-white"
                        style={{ background: c }}
                      >
                        {ch}
                      </span>
                    ))}
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[11px] font-semibold text-[#3856a5] ring-2 ring-white">
                      +9K
                    </span>
                  </div>
                  <p className="ml-2 text-xs text-[#4a5a85]">{ru ? "активных студентов" : "faol talaba"}</p>
                </div>
              </div>
            </Reveal>

            {/* Time to hire */}
            <Reveal className="sm:col-span-3" delay={0.06}>
              <div className="card-silver h-full p-7">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a0a0a8]">
                  {ru ? "Время найма" : "Yollash vaqti"}
                </span>
                <p className="font-display mt-4 text-5xl font-bold tracking-tight text-[#18181b] sm:text-6xl">
                  {ru ? "12 дней" : "12 kun"}
                </p>
                <p className="mt-2 text-sm text-[#63636b]">
                  {ru ? "В среднем от публикации до найма. " : "O'rtacha e'londan yollashgacha. "}
                  <span className="text-[#8e8e96]">{ru ? "По рынку — 47 дней." : "Bozorda — 47 kun."}</span>
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#d9f1e4] px-3 py-1 text-xs font-semibold text-[#2f7a56]">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                  {ru ? "в 4× быстрее" : "4× tezroq"}
                </div>
              </div>
            </Reveal>

            {/* AI screening mock */}
            <Reveal className="sm:col-span-3" delay={0.1}>
              <div className="card-silver h-full p-7">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a0a0a8]">
                  {ru ? "AI-скрининг" : "AI saralash"}
                </span>
                <h3 className="font-display mt-3 text-xl font-semibold text-[#18181b]">
                  {ru ? "Резюме — 60 секунд, оценка — 5 секунд" : "Rezyume — 60 soniya, baho — 5 soniya"}
                </h3>
                <div className="mt-5 rounded-2xl bg-[#f6f6f4] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#18181b]">Sevinch Q.</p>
                    <span className="rounded-full bg-[#d9f1e4] px-2.5 py-0.5 text-[10px] font-semibold text-[#2f7a56]">
                      {ru ? "94% совпадение" : "94% moslik"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {["React", "TypeScript", "Tailwind"].map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-[#d7e7ff] px-2 py-1 text-center text-xs text-[#3856a5]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ececea]">
                    <motion.div
                      initial={reduce ? false : { width: 0 }}
                      whileInView={{ width: "94%" }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 1.1, ease: [0.19, 1, 0.22, 1], delay: 0.2 }}
                      className="h-full rounded-full bg-gradient-to-r from-[#8ab4ff] via-[#b7a4ff] to-[#7cc7a2]"
                    />
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Trust filter */}
            <Reveal className="sm:col-span-2" delay={0.12}>
              <div className="card-silver h-full p-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a0a0a8]">
                  {ru ? "Фильтр доверия" : "Ishonch filtri"}
                </span>
                <h3 className="font-display mt-3 text-lg font-semibold text-[#18181b]">
                  {ru ? "Фейковые CV отсеиваются автоматически" : "Soxta CV'lar avtomatik filtrda"}
                </h3>
                <div className="mt-5 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d9f1e4]">
                    <ShieldCheck className="h-5 w-5 text-[#2f7a56]" aria-hidden />
                  </span>
                  <div>
                    <p className="font-display text-2xl font-bold text-[#18181b]">98%</p>
                    <p className="text-xs text-[#8e8e96]">{ru ? "точность" : "aniqlik darajasi"}</p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Pipeline */}
            <Reveal className="sm:col-span-2" delay={0.14}>
              <div className="card-silver h-full p-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a0a0a8]">
                  {ru ? "Процесс" : "Jarayon"}
                </span>
                <h3 className="font-display mt-3 text-lg font-semibold text-[#18181b]">
                  {ru ? "Всё — в одной панели" : "Hammasi — bitta dashboard"}
                </h3>
                <div className="mt-5 grid grid-cols-4 gap-1.5">
                  {[
                    { l: ru ? "Отклики" : "Ariza", v: 47, c: "#3856a5", bg: "#d7e7ff" },
                    { l: ru ? "Ревью" : "Ko'rik", v: 23, c: "#5b4a9e", bg: "#e3ddff" },
                    { l: ru ? "Интервью" : "Suhbat", v: 8, c: "#9a5b28", bg: "#ffe9d6" },
                    { l: ru ? "Наняты" : "Yollandi", v: 3, c: "#2f7a56", bg: "#d9f1e4" },
                  ].map((p) => (
                    <div key={p.l} className="rounded-xl py-2 text-center" style={{ background: p.bg }}>
                      <p className="font-display text-base font-bold" style={{ color: p.c }}>
                        {p.v}
                      </p>
                      <p className="text-[10px]" style={{ color: p.c }}>
                        {p.l}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Auto-sourcing (peach pastel tile) */}
            <Reveal className="sm:col-span-2" delay={0.16}>
              <div className="card-silver h-full !bg-gradient-to-br !from-[#ffe9d6] !to-[#ffdfc2] p-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a5642e]">
                  {ru ? "Авто-поиск" : "Avto-qidiruv"}
                </span>
                <h3 className="font-display mt-3 text-lg font-semibold text-[#5c3a1c]">
                  {ru ? "AI ищет за вас" : "AI sizning o'rningizga qidiradi"}
                </h3>
                <div className="mt-5">
                  <p className="font-display text-4xl font-bold text-[#5c3a1c]">+3</p>
                  <p className="mt-1 text-sm text-[#8a5a30]">{ru ? "новых топ-совпадения сегодня" : "yangi top moslik bugun"}</p>
                </div>
                <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[#9a5b28]">
                  <Zap className="h-3 w-3" aria-hidden />
                  {ru ? "В реальном времени" : "Jonli rejim"}
                </div>
              </div>
            </Reveal>

            {/* Logos */}
            <Reveal className="sm:col-span-6" delay={0.18}>
              <div className="card-silver h-full p-6">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a0a0a8]">
                  {ru ? "Нам доверяют" : "Bizga ishonganlar"}
                </p>
                <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-6">
                  {["Uzum", "EPAM", "TBC Bank", "Click", "Payme", "Beeline"].map((n) => (
                    <div key={n} className="text-center text-sm font-semibold text-[#8e8e96]">
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 sm:py-20" aria-label="Mijoz fikri">
        <div className="section-shell">
          <Reveal className="mx-auto max-w-3xl">
            <div className="card-silver p-8 sm:p-10">
              <div className="flex items-center gap-1 text-[#e2b184]" aria-label="5 yulduz">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" aria-hidden />
                ))}
              </div>
              <p className="font-display mt-4 text-2xl font-semibold leading-tight text-[#18181b] sm:text-3xl">
                {ru ? "«С IshTop время найма junior-фронтендера сократилось с 6 недель до 11 дней. AI-скрининг экономит нашей HR-команде 20 часов в неделю.»" : "“IshTop bilan junior frontend yollash vaqtimiz 6 haftadan 11 kunga qisqardi. AI saralash HR jamoamizning haftasiga 20 soatini tejaydi.”"}
              </p>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#8e8e96]">
                {ru ? "Диёра Р. · HR-руководитель Uzum Market" : "Diyora R. · Uzum Market HR rahbari"}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-16 sm:py-28" aria-labelledby="cta-h">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[360px] -translate-y-1/2 bg-gradient-to-r from-[#d7e7ff]/70 via-[#e3ddff]/60 to-[#ffe9d6]/60 blur-3xl"
        />
        <div className="section-shell relative">
          <Reveal className="mx-auto max-w-3xl">
            <div className="card-silver p-10 text-center sm:p-16">
              <h2 id="cta-h" className="h-display text-4xl text-[#18181b] sm:text-5xl">
                {ru ? "10K+ талантов. " : "10K+ talant. "}
                <span className="bg-gradient-to-r from-[#6f9bf0] to-[#a08de0] bg-clip-text text-transparent">
                  {ru ? "Ваша очередь." : "Sizning navbatingiz."}
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[#63636b] sm:text-lg">
                {ru ? "30-минутное демо. Первые 10 вакансий бесплатно. Без карты." : "30 daqiqalik demo. Birinchi 10 ta vakansiya bepul. Karta yo'q."}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/contact" className="btn-silver-primary focus-ring group">
                  {ru ? "Запросить демо" : "Demo so'rash"}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <Link href="/plans" className="btn-silver-ghost focus-ring !bg-[#f6f6f4]">
                  {ru ? "Смотреть тарифы" : "Tariflarni ko'rish"}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#d8d8d5] py-8" aria-label="Footer">
        <div className="section-shell flex flex-col items-start justify-between gap-2 text-xs text-[#8e8e96] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} IshTop · {ru ? "Для бизнеса" : "Biznes uchun"}</p>
          <p>Made in Tashkent</p>
        </div>
      </footer>
    </main>
  );
}
