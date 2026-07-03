"use client";

/**
 * IshTop — /plans (Brutalist Mono)
 *
 * Pricing landing in terminal aesthetic:
 *   - Mono typography, sharp grid lines
 *   - Single electric blue accent
 *   - Pricing tiers as ASCII-feel code blocks
 *   - Terminal prompt CTAs
 *
 * Pro CTA goes to /register (checkout keyinroq ulanadi).
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, X, Minus, Terminal } from "lucide-react";
import "./plans.css";

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
    a: "Ha. Cancel bilan keyingi davr boshlanmaydi. Joriy davr oxirigacha imkoniyatlar saqlanadi.",
  },
  {
    q: "Talabalar uchun chegirma bormi?",
    a: "Pro plan barcha .edu va talaba ID'lar uchun 50% chegirma — yiliga 250 000 so'm → 125 000 so'm.",
  },
  {
    q: "Auto-apply qanday ishlaydi?",
    a: "AI sizning resume'ni har vakansiya uchun tailored qilib yuboradi. Limit (10 yoki 50) reset bo'ladi UTC yarim tunda.",
  },
];

export default function PlansClient() {
  const reduce = useReducedMotion();

  return (
    <main className="br-root">
      {/* Nav */}
      <nav aria-label="Primary" className="border-b" style={{ borderColor: "var(--br-rule-strong)" }}>
        <div className="br-shell flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 br-display text-base font-medium">
            <Terminal className="h-4 w-4 br-prompt" aria-hidden />
            IshTop
          </Link>
          <div className="flex items-center gap-3 text-xs br-meta">
            <Link href="/" className="hover:text-[var(--br-ink)]">~/landing</Link>
            <span style={{ color: "var(--br-rule)" }}>/</span>
            <Link href="/demo" className="hover:text-[var(--br-ink)]">~/demo</Link>
            <span style={{ color: "var(--br-rule)" }}>/</span>
            <span style={{ color: "var(--br-accent)" }}>~/plans</span>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="border-b py-20 sm:py-28" style={{ borderColor: "var(--br-rule)" }}>
        <div className="br-shell">
          <p className="br-eyebrow">{"// JUNIORLAR_UCHUN_NARXLAR · v2"}</p>
          <h1 className="br-display mt-6 text-5xl sm:text-7xl lg:text-[88px]">
            $ narxlar<span className="br-cursor" aria-hidden />
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-relaxed" style={{ color: "var(--br-ink-soft)" }}>
            3 ta plan. Bitta maqsad — birinchi ishingiz. Free haqiqatan bepul, Pro AI Coach
            qo&apos;shadi, Team bootcampler uchun.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-px border" style={{ borderColor: "var(--br-rule-strong)" }}>
            {[
              { k: "MAX_FREE_JOBS", v: "100/oy" },
              { k: "MAX_AUTO_APPLY", v: "50/kun" },
              { k: "SUPPORT_SLA", v: "<24h" },
            ].map((stat) => (
              <div key={stat.k} className="bg-[var(--br-card)] p-5">
                <p className="br-meta">{stat.k}</p>
                <p className="mt-2 br-display text-2xl">{stat.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="py-20 sm:py-28" aria-labelledby="plans-h">
        <div className="br-shell">
          <p className="br-eyebrow" id="plans-h-eyebrow">{"// PLANS"}</p>
          <h2 id="plans-h" className="br-display mt-4 text-3xl sm:text-4xl">
            Tariflar<span className="text-[var(--br-mute)]">.solishtirish()</span>
          </h2>

          <div className="mt-12 grid gap-px lg:grid-cols-3" style={{ background: "var(--br-rule-strong)" }}>
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className={`relative flex flex-col p-7 ${plan.accent ? "br-card-accent" : "br-card"}`}
                style={plan.accent ? { boxShadow: "4px 4px 0 0 var(--br-accent)" } : undefined}
              >
                {plan.accent && (
                  <p
                    className="absolute -top-3 left-7 bg-[var(--br-accent)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white"
                    style={{ letterSpacing: "0.18em" }}
                  >
                    Eng ommabop
                  </p>
                )}

                <p className="br-eyebrow">{`// ${plan.id.toUpperCase()}`}</p>
                <h3 className="br-display mt-3 text-2xl">{plan.name}</h3>
                <p className="mt-1 text-xs" style={{ color: "var(--br-ink-soft)" }}>
                  {plan.tagline}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="br-display text-5xl">{plan.price}</span>
                  <span className="text-sm" style={{ color: "var(--br-mute)" }}>
                    {plan.priceNote}
                  </span>
                </div>

                <hr className="br-rule my-6" />

                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2">
                      {f.ok === true ? (
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: "var(--br-success)" }}
                          aria-hidden
                        />
                      ) : f.ok === "limited" ? (
                        <Minus
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: "var(--br-warn)" }}
                          aria-hidden
                        />
                      ) : (
                        <X
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: "var(--br-mute)" }}
                          aria-hidden
                        />
                      )}
                      <span
                        style={{
                          color: f.ok === false ? "var(--br-mute)" : "var(--br-ink)",
                          textDecoration: f.ok === false ? "line-through" : "none",
                        }}
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={`mt-8 ${plan.accent ? "br-btn br-btn-accent" : "br-btn br-btn-ghost"}`}
                >
                  $ {plan.cta}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="border-t py-20 sm:py-28"
        style={{ borderColor: "var(--br-rule)" }}
        aria-labelledby="faq-h"
      >
        <div className="br-shell">
          <p className="br-eyebrow">{"// FAQ"}</p>
          <h2 id="faq-h" className="br-display mt-4 text-3xl sm:text-4xl">
            Savol.javob()
          </h2>

          <dl className="mt-12 divide-y" style={{ borderTop: "1px solid var(--br-rule)", borderBottom: "1px solid var(--br-rule)", borderColor: "var(--br-rule)" }}>
            {FAQ.map((item) => (
              <details key={item.q} className="group" style={{ borderColor: "var(--br-rule)" }}>
                <summary className="flex cursor-pointer items-start justify-between gap-6 py-5 text-sm focus-ring">
                  <span className="br-display text-base">
                    <span className="br-prompt" aria-hidden>
                      ›{" "}
                    </span>
                    {item.q}
                  </span>
                  <span
                    className="br-meta shrink-0 text-xs transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p
                  className="pb-5 pl-4 text-sm leading-relaxed"
                  style={{ color: "var(--br-ink-soft)" }}
                >
                  {item.a}
                </p>
              </details>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-16 sm:py-24" style={{ borderColor: "var(--br-rule)", background: "var(--br-card)" }}>
        <div className="br-shell">
          <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="br-meta">$ npm run ish_topish</p>
              <h3 className="br-display mt-3 text-3xl sm:text-4xl">
                Birinchi ish — 4 hafta.
              </h3>
              <p className="mt-2 text-sm" style={{ color: "var(--br-ink-soft)" }}>
                Free bilan boshlang. Karta yo&apos;q. Spam yo&apos;q. Faqat ishlatish kerak.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="br-btn br-btn-accent">
                $ ro'yxatdan o'tish
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <Link href="/demo" className="br-btn br-btn-ghost">
                $ demo ko'rish
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-10"
        style={{ borderColor: "var(--br-rule)" }}
        aria-label="Footer"
      >
        <div className="br-shell flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="br-meta">© {new Date().getFullYear()} IshTop / Tashkent</p>
          <p className="br-meta">v2 · Set in <span style={{ color: "var(--br-ink)" }}>Fira Code</span></p>
        </div>
      </footer>
    </main>
  );
}
