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
import Image from "next/image";
import { Check, X, Minus, ArrowRight, ChevronDown, HelpCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { Reveal } from "@/components/landing/sections/primitives";

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

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "0 so'm",
    priceNote: "/ oy",
    tagline: "Birinchi ish uchun yetarli",
    features: [
      { text: "AI Resume — 1 ta", ok: true },
      { text: "Explainable Match", ok: true },
      { text: "100 ta vakansiya / oy", ok: true },
      { text: "Trust Score filter", ok: true },
      { text: "Auto-apply", ok: false },
      { text: "Interview Coach", ok: false },
      { text: "Priority support", ok: false },
    ],
    cta: "Boshlash",
    ctaHref: "/register",
    accent: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "25 000 so'm",
    priceNote: "/ oy",
    tagline: "Tezlik + AI Coach",
    features: [
      { text: "AI Resume — cheksiz", ok: true },
      { text: "Explainable Match", ok: true },
      { text: "Cheksiz vakansiya", ok: true },
      { text: "Trust Score filter", ok: true },
      { text: "Auto-apply (10/kun)", ok: true },
      { text: "Interview Coach", ok: true },
      { text: "Priority support", ok: "limited" },
    ],
    cta: "Pro'ga o'tish",
    ctaHref: "/register",
    accent: true,
  },
  {
    id: "team",
    name: "Team",
    price: "Maxsus",
    priceNote: "kelishiladi",
    tagline: "5+ talaba uchun · Bootcamp",
    features: [
      { text: "Pro'ning hamma narsasi", ok: true },
      { text: "Team dashboard", ok: true },
      { text: "Bootcamp analytics", ok: true },
      { text: "Mentor seat — 2", ok: true },
      { text: "Auto-apply (50/kun)", ok: true },
      { text: "Custom AI tuning", ok: true },
      { text: "SLA support", ok: true },
    ],
    cta: "Bog'lanish",
    ctaHref: "/contact",
    accent: false,
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Free plan uchun karta kerakmi?",
    a: "Yo'q. Free plan haqiqatan ham bepul — kredit karta, trial, hech narsa kerak emas.",
  },
  {
    q: "Pro'dan istalgan vaqtda chiqsam bo'ladimi?",
    a: "Ha. Bekor qilsangiz keyingi davr boshlanmaydi. Joriy davr oxirigacha imkoniyatlar saqlanadi.",
  },
  {
    q: "Talabalar uchun chegirma bormi?",
    a: "Pro plan barcha .edu va talaba ID'lar uchun 50% chegirma — yiliga 250 000 so'm → 125 000 so'm.",
  },
  {
    q: "Auto-apply qanday ishlaydi?",
    a: "AI rezyumeni har bir vakansiyaga moslab yuboradi. Limit (10 yoki 50) har kuni UTC yarim tunda yangilanadi.",
  },
];

export default function PlansClient() {
  const [open, setOpen] = useState<number | null>(0);

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
              Jonli demo
            </Link>
            <Link href="/register" className="btn-silver-primary !px-5 !py-2.5">
              Bepul boshlash
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
              Narxlar · juniorlar uchun
            </span>
            <h1 className="h-display mt-6 text-4xl text-[#18181b] sm:text-6xl">
              Oddiy va halol{" "}
              <span className="bg-gradient-to-r from-[#6f9bf0] to-[#a08de0] bg-clip-text text-transparent">
                narxlar
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-[#63636b]">
              3 ta plan, bitta maqsad — birinchi ishingiz. Free haqiqatan bepul,
              Pro AI Coach qo&apos;shadi, Team bootcamplar uchun.
            </p>
          </Reveal>
        </div>
      </section>

      {/* PLANS */}
      <section className="relative py-14 sm:py-16" aria-labelledby="plans-h">
        <h2 id="plans-h" className="sr-only">
          Tariflar
        </h2>
        <div className="section-shell">
          <div className="mx-auto grid max-w-5xl items-stretch gap-5 lg:grid-cols-3">
            {PLANS.map((plan, i) => (
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
                      Eng ommabop
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
              Ko&apos;p so&apos;raladigan savollar
            </h2>
          </Reveal>

          <div className="mx-auto mt-10 max-w-3xl">
            <ul className="space-y-3">
              {FAQ.map((item, i) => {
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
                Birinchi ish — 4 hafta.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-[#63636b]">
                Free bilan boshlang. Karta yo&apos;q. Spam yo&apos;q. Faqat ishlatish kerak.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register" className="btn-silver-primary focus-ring group">
                  Bepul boshlash
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <Link href="/demo" className="btn-silver-ghost focus-ring !bg-[#f6f6f4]">
                  Jonli demo
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#d8d8d5] py-8" aria-label="Footer">
        <div className="section-shell flex flex-col items-start justify-between gap-2 text-xs text-[#8e8e96] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} IshTop. Barcha huquqlar himoyalangan.</p>
          <p>Made in Tashkent</p>
        </div>
      </footer>
    </main>
  );
}
