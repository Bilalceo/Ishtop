"use client";

/**
 * IshTop — /plans (Silver rebrand)
 *
 * Pricing page in the platform's silver design language:
 *   - E5E5E5 ground, white cards, periwinkle→lavender accents
 *   - Pro tier highlighted with a pastel halo
 *   - Blur-fade reveals matching the landing
 * Prices are in UZS so'm.
 */

import Link from "next/link";
import { TelegramProCard } from "@/components/TelegramProCard";
import { AUTO_APPLY_PER_MONTH, getPlans as getSharedPlans } from "@/lib/plans";
import Image from "next/image";
import { Check, X, Minus, ArrowRight, ChevronDown, HelpCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { Reveal } from "@/components/landing/sections/primitives";
import { useTranslation } from "@/hooks/useTranslation";

type Plan = {
  id: string;
  name: string;
  price: string;
  priceNote: string;
  tagline: string;
  features: { text: string; ok: boolean | "limited" }[];
  cta: string;
  ctaHref: string;
  accent: boolean;
};

// Built from the shared plan config rather than restated here. This page used
// to sell "Free / Pro / Team" with auto-apply at 10 and 50 per DAY, while
// /pricing sold "Bepul / Premium / Enterprise" at 50 per MONTH and checkout
// accepted only premium/enterprise — three different promises behind the same
// 25 000 so'm. See src/lib/plans.ts for which of them the backend enforces.
const getPlans = (ru: boolean): Plan[] =>
  getSharedPlans(ru).map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    priceNote: plan.priceNote,
    tagline: plan.tagline,
    features: [
      ...plan.features.map((text) => ({ text, ok: true as const })),
      ...plan.notIncluded.map((text) => ({ text, ok: false as const })),
    ],
    cta: plan.cta,
    ctaHref:
      plan.id === "free"
        ? "/register"
        : plan.id === "premium"
          ? "/checkout?plan=premium"
          : "/contact",
    accent: Boolean(plan.popular),
  }));

const getFaq = (ru: boolean): { q: string; a: string }[] => [
  {
    q: ru ? "Нужна ли карта для бесплатного тарифа?" : "Bepul tarif uchun karta kerakmi?",
    a: ru
      ? "Нет. Бесплатный тариф действительно бесплатный — без карты, триала и скрытых условий."
      : "Yo'q. Bepul tarif haqiqatan ham bepul — kredit karta, trial, hech narsa kerak emas.",
  },
  {
    q: ru ? "Можно отменить Premium в любой момент?" : "Premium'dan istalgan vaqtda chiqsam bo'ladimi?",
    a: ru
      ? "Да. После отмены следующий период не начнётся, возможности сохраняются до конца оплаченного."
      : "Ha. Bekor qilsangiz keyingi davr boshlanmaydi. To'langan davr oxirigacha imkoniyatlar saqlanadi.",
  },
  {
    // The old answer promised a 50% student discount (250 000 → 125 000) that
    // nothing in checkout or the backend applies.
    q: ru ? "В чём разница между тарифами?" : "Tariflar orasidagi farq nima?",
    a: ru
      ? `Каталог, AI-резюме, тренажёр собеседования и отклик работодателю доступны бесплатно. Premium добавляет авто-отклик — ${AUTO_APPLY_PER_MONTH.premium} откликов в месяц.`
      : `Katalog, AI rezyume, suhbat murabbiyi va ish beruvchiga ariza — bularning hammasi bepul. Premium avto-ariza qo'shadi: oyiga ${AUTO_APPLY_PER_MONTH.premium} ta.`,
  },
  {
    q: ru ? "Как работает авто-отклик?" : "Avto-ariza qanday ishlaydi?",
    a: ru
      ? `AI адаптирует резюме под каждую вакансию и показывает отклик перед отправкой. Лимит — ${AUTO_APPLY_PER_MONTH.premium} в месяц, счётчик обнуляется в начале календарного месяца.`
      : `AI rezyumeni har bir vakansiyaga moslab, yuborishdan oldin ko'rsatadi. Limit — oyiga ${AUTO_APPLY_PER_MONTH.premium} ta, hisob har oy boshida yangilanadi.`,
  },
];

export default function PlansClient() {
  const [open, setOpen] = useState<number | null>(0);
  const { locale } = useTranslation();
  const ru = locale === "ru";
  const plans = getPlans(ru);
  const faq = getFaq(ru);

  return (
    <main className="silver-ground relative min-h-screen text-[#18181b] antialiased">
      {/* Floating island nav (matches the landing) */}
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full bg-white/75 px-4 shadow-[0_6px_20px_-10px_rgba(24,24,27,0.16)] backdrop-blur-xl sm:h-16 sm:px-6">
          <Link href="/" className="focus-ring flex items-center rounded-xl" aria-label="IshTop home">
            <Image
              src="/logo-ishtop.png?v=3"
              alt="IshTop"
              width={1025}
              height={292}
              className="h-6 w-auto sm:h-7"
            />
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href="/demo"
              className="focus-ring hidden rounded-full px-4 py-2 text-sm font-medium text-[#52525b] hover:text-[#18181b] sm:block"
            >
              {ru ? "Живое демо" : "Jonli demo"}
            </Link>
            <Link href="/register" className="btn-silver-primary !px-5 !py-2.5">
              {ru ? "Начать бесплатно" : "Bepul boshlash"}
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden pt-32 sm:pt-36">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#d7e7ff]/70 via-[#e3ddff]/60 to-[#ffe9d6]/60 blur-3xl"
        />
        <div className="section-shell relative pb-6 text-center">
          <Reveal>
            <span className="chip-silver uppercase tracking-[0.18em] !text-[11px]">
              <Sparkles className="h-3 w-3 text-[#b7a4ff]" aria-hidden />
              {ru ? "Цены · для джуниоров" : "Narxlar · juniorlar uchun"}
            </span>
            <h1 className="h-display mt-6 text-4xl text-[#18181b] sm:text-6xl">
              {ru ? "Простые и честные " : "Oddiy va halol "}
              <span className="bg-gradient-to-r from-[#6f9bf0] to-[#a08de0] bg-clip-text text-transparent">
                {ru ? "цены" : "narxlar"}
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-[#63636b]">
              {ru ? "3 тарифа, одна цель — ваша первая работа. Бесплатный тариф действительно бесплатный: каталог, AI-резюме и тренажёр собеседования. Premium добавляет авто-отклик." : "3 ta tarif, bitta maqsad — birinchi ishingiz. Bepul tarif haqiqatan bepul: katalog, AI rezyume va suhbat murabbiyi. Premium avto-ariza qo'shadi."}
            </p>
          </Reveal>
        </div>
      </section>

      {/* PLANS */}
      <section className="relative py-14 sm:py-16" aria-labelledby="plans-h">
        <h2 id="plans-h" className="sr-only">
          {ru ? "Тарифы" : "Tariflar"}
        </h2>
        <div className="section-shell">
          <div className="mx-auto mb-8 max-w-2xl">
            <TelegramProCard />
          </div>
          <div className="mx-auto grid max-w-5xl items-stretch gap-5 lg:grid-cols-3">
            {plans.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 0.1} className="relative h-full">
                {plan.accent && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-3 rounded-[32px] bg-gradient-to-r from-[#d7e7ff]/80 via-[#e3ddff]/70 to-[#ffe9d6]/70 blur-xl"
                  />
                )}
                <div
                  className={`card-silver relative flex h-full flex-col !overflow-visible p-7 ${
                    plan.accent ? "ring-1 ring-[#c0d4ff]" : ""
                  }`}
                >
                  {plan.accent && (
                    <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-[#6f9bf0] to-[#8f7fe8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                      {ru ? "Самый популярный" : "Eng ommabop"}
                    </span>
                  )}

                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a0a0a8]">
                    {plan.name}
                  </p>
                  <p className="mt-1 text-sm text-[#8e8e96]">{plan.tagline}</p>

                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-bold tracking-tight text-[#18181b]">
                      {plan.price}
                    </span>
                    <span className="text-sm text-[#8e8e96]">{plan.priceNote}</span>
                  </div>

                  <hr className="my-6 border-[#ececea]" />

                  <ul className="space-y-2.5 text-sm">
                    {plan.features.map((f) => (
                      <li key={f.text} className="flex items-start gap-2.5">
                        {f.ok === true ? (
                          <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#d9f1e4]">
                            <Check className="h-3 w-3 text-[#2f7a56]" aria-hidden />
                          </span>
                        ) : f.ok === "limited" ? (
                          <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#ffe9d6]">
                            <Minus className="h-3 w-3 text-[#9a5b28]" aria-hidden />
                          </span>
                        ) : (
                          <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#f1f1ef]">
                            <X className="h-3 w-3 text-[#b6b6bd]" aria-hidden />
                          </span>
                        )}
                        <span className={f.ok === false ? "text-[#b6b6bd]" : "text-[#3f3f46]"}>
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.ctaHref}
                    className={`${
                      plan.accent ? "btn-silver-primary" : "btn-silver-ghost !bg-[#f6f6f4]"
                    } focus-ring group mt-8 w-full`}
                  >
                    {plan.cta}
                    <ArrowRight
                      className="h-4 w-4 transition group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-20" aria-labelledby="faq-h">
        <div className="section-shell">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="chip-silver uppercase tracking-[0.18em] !text-[11px]">
              <HelpCircle className="h-3 w-3 text-[#8ab4ff]" aria-hidden />
              FAQ
            </span>
            <h2 id="faq-h" className="h-display mt-4 text-3xl text-[#18181b] sm:text-4xl">
              {ru ? "Частые вопросы" : "Ko'p so'raladigan savollar"}
            </h2>
          </Reveal>

          <div className="mx-auto mt-10 max-w-3xl">
            <ul className="space-y-3">
              {faq.map((item, i) => {
                const isOpen = open === i;
                return (
                  <li key={item.q} className="card-silver overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      aria-controls={`plans-faq-${i}`}
                      className="focus-ring flex w-full items-center justify-between gap-4 p-5 text-left"
                    >
                      <span className="font-display text-base font-semibold text-[#18181b]">
                        {item.q}
                      </span>
                      <ChevronDown
                        aria-hidden
                        className={`h-5 w-5 shrink-0 text-[#8e8e96] transition-transform duration-300 ${
                          isOpen ? "rotate-180 text-[#8ab4ff]" : ""
                        }`}
                      />
                    </button>
                    <div
                      id={`plans-faq-${i}`}
                      role="region"
                      aria-hidden={!isOpen}
                      className={`grid overflow-hidden px-5 transition-all duration-400 ease-out ${
                        isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden text-pretty text-sm leading-relaxed text-[#63636b]">
                        {item.a}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[320px] -translate-y-1/2 bg-gradient-to-r from-[#d7e7ff]/70 via-[#e3ddff]/60 to-[#ffe9d6]/60 blur-3xl"
        />
        <div className="section-shell relative">
          <Reveal className="mx-auto max-w-3xl">
            <div className="card-silver p-8 text-center sm:p-12">
              <h3 className="h-display text-3xl text-[#18181b] sm:text-4xl">
                {ru ? "Первая работа — за 4 недели." : "Birinchi ish — 4 hafta."}
              </h3>
              <p className="mx-auto mt-3 max-w-md text-[#63636b]">
                {ru ? "Начните с Free. Без карты. Без спама. Просто пользуйтесь." : "Free bilan boshlang. Karta yo'q. Spam yo'q. Faqat ishlatish kerak."}
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register" className="btn-silver-primary focus-ring group">
                  {ru ? "Начать бесплатно" : "Bepul boshlash"}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <Link href="/demo" className="btn-silver-ghost focus-ring !bg-[#f6f6f4]">
                  {ru ? "Живое демо" : "Jonli demo"}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#d8d8d5] py-8" aria-label="Footer">
        <div className="section-shell flex flex-col items-start justify-between gap-2 text-xs text-[#8e8e96] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} IshTop. {ru ? "Все права защищены." : "Barcha huquqlar himoyalangan."}</p>
          <p>Made in Tashkent</p>
        </div>
      </footer>
    </main>
  );
}
