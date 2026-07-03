"use client";

/**
 * IshTop — /about page (Editorial Calm)
 *
 * Mood: magazine editorial, generous whitespace, serif display, one warm accent
 * Inspired by: Stripe Press, Apple Newsroom, Notion homepage, Linear changelog
 * Tone: calm confidence, plain language, no marketing hype
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import "./about.css";

const NUMBERS = [
  { num: "10,247", label: "talaba ro'yxatda" },
  { num: "1,180", label: "birinchi oferta tasdiqlangan" },
  { num: "500+", label: "tekshirilgan kompaniya" },
  { num: "24 oy", label: "loyiha yoshi" },
];

const PRINCIPLES = [
  {
    n: "01",
    title: "Trust kelmaydi, qurib olinadi.",
    body:
      "Har bir kompaniyani 0-100 Trust Score bilan baholaymiz. Soxta vakansiyalar avtomatik filtrlanadi. Talaba review birinchi navbatda — biznes javobidan oldin.",
  },
  {
    n: "02",
    title: "Black box bo'lishidan ko'ra, kichikroq bo'lish yaxshi.",
    body:
      "AI har bir tavsiyani tushuntiradi. Match score nima uchun 94%? Qaysi ko'nikma yetadi, qaysi etishmaydi — siz bilasiz. Ishonchsiz natijani ko'rsatishdan ko'ra, jim qolishni afzal ko'ramiz.",
  },
  {
    n: "03",
    title: "Talaba avval. Har doim.",
    body:
      "Biz daromadni Premium plandan olamiz, lekin asosiy imkoniyatlar — profil, match, ariza — bepul qoladi. Birinchi ishni topish hech qachon to'lov bo'lmasligi kerak.",
  },
  {
    n: "04",
    title: "Tezlik — ehtirom belgisi.",
    body:
      "Sayt yuklanishi 1.8s, ariza bir bosishda. Foydalanuvchi vaqti bizning eng qadrli resurs ekanligini bilamiz — uni isrof qilmaymiz.",
  },
];

export default function AboutClient() {
  const reduce = useReducedMotion();

  return (
    <main className="ed-root" lang="uz">
      {/* ===== Nav (minimal) ===== */}
      <nav aria-label="Primary" className="border-b" style={{ borderColor: "var(--ed-rule)" }}>
        <div className="ed-shell flex h-16 items-center justify-between">
          <Link
            href="/"
            className="ed-display text-lg font-semibold"
            style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            aria-label="IshTop home"
          >
            IshTop
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="ed-meta hidden sm:block hover:text-[var(--ed-ink)]">
              Landing
            </Link>
            <Link href="/design-system" className="ed-meta hidden sm:block hover:text-[var(--ed-ink)]">
              Design system
            </Link>
            <Link href="/register" className="ed-pill">
              Boshlash <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative pt-20 pb-24 sm:pt-32 sm:pb-32" aria-labelledby="about-hero">
        <div className="ed-shell">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="ed-eyebrow"
          >
            Biz haqimizda · 2026
          </motion.p>

          <motion.h1
            id="about-hero"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08 }}
            className="ed-display mt-8 text-[56px] sm:text-[88px] lg:text-[120px]"
          >
            Birinchi ish.<br />
            <span className="ed-display-soft">Soddaroq yo&apos;l.</span>
          </motion.h1>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.18 }}
            className="ed-prose mt-12"
          >
            <p className="ed-lead">
              IshTop — O&apos;zbekistondagi talabalar va junior mutaxassislar uchun karyera platformasi.
              Biz AI bilan sehr qilmaymiz — biz aniq, tushunarli va ishonchli yo&apos;l qo&apos;yamiz.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link href="/register" className="ed-pill">
                Bepul ro&apos;yxatdan o&apos;tish <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <a href="#manifesto" className="ed-link">
                Manifestni o&apos;qish
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <hr className="ed-rule" />

      {/* ===== MANIFESTO ===== */}
      <section
        id="manifesto"
        className="scroll-mt-20 py-20 sm:py-28"
        aria-labelledby="manifesto-h"
      >
        <div className="ed-shell">
          <div className="ed-prose">
            <p className="ed-eyebrow">Manifesto</p>
            <h2
              id="manifesto-h"
              className="ed-display mt-6 text-[40px] leading-[1.08] sm:text-[56px]"
            >
              Birinchi ishni topish — hech qachon{" "}
              <em className="ed-display-soft">qiyin emas edi</em>.
            </h2>
            <hr className="ed-rule mt-10" />

            <p className="ed-body ed-drop-cap mt-10">
              2024-yilda biz oddiy savol bilan boshladik: nega O&apos;zbekistondagi talabalar
              hali ham 50-100 ta arizadan keyin ham birinchi ish topa olmaydi? Resume yozish
              shablonlar bo&apos;yicha, vakansiyalar nima qilishni anglatishini tushuntirmaydi,
              kompaniyalar javob bermaydi — bu sistemada nuqson bor.
            </p>

            <p className="ed-body mt-6">
              Biz ushbu nuqsonlarni AI bilan tuzatishga qaror qildik — lekin AI sehrli quti
              emas. Har bir natija tushuntiriladi. Sizning ko&apos;nikmangiz nega vakansiyaga
              mos, qaysi qism etishmaydi, qanday tuzatish kerak — barchasi ko&apos;rinadi.
            </p>

            <p className="ed-body mt-6">
              Bugun IshTop O&apos;zbekistonda eng tez o&apos;sayotgan karyera platformasi.
              Birinchi oferta o&apos;rtacha 4 hafta — bozordagi 12 hafta o&apos;rniga.
            </p>

            <div className="ed-rule-accent mt-10">
              <p className="ed-body">
                <strong style={{ color: "var(--ed-ink)", fontWeight: 600 }}>Biz nima qilmaymiz:</strong>{" "}
                kompaniyalardan to&apos;lov olib, vakansiyalarni reyting tepasiga ko&apos;tarmaymiz.
                Sizga balanssiz reklama ko&apos;rsatmaymiz. Ma&apos;lumotlaringizni uchinchi
                tomonga sotmaymiz. Bu ish modeli emas — bu va&apos;da.
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr className="ed-rule" />

      {/* ===== BY THE NUMBERS ===== */}
      <section className="py-20 sm:py-28" aria-labelledby="numbers-h">
        <div className="ed-shell">
          <p className="ed-eyebrow">Raqamlar bo&apos;yicha</p>
          <h2 id="numbers-h" className="ed-display mt-6 text-[40px] sm:text-[56px]">
            24 oyda. <em className="ed-display-soft">O&apos;sib.</em>
          </h2>
          <hr className="ed-rule mt-12" />

          <dl className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {NUMBERS.map((n, i) => (
              <motion.div
                key={n.label}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
              >
                <dt className="ed-stat-num">{n.num}</dt>
                <dd className="mt-3 max-w-[180px] text-sm" style={{ color: "var(--ed-mute)" }}>
                  {n.label}
                </dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </section>

      <hr className="ed-rule" />

      {/* ===== PRINCIPLES ===== */}
      <section className="py-20 sm:py-28" aria-labelledby="principles-h">
        <div className="ed-shell">
          <div className="ed-prose">
            <p className="ed-eyebrow">Tamoyillarimiz</p>
            <h2 id="principles-h" className="ed-display mt-6 text-[40px] leading-tight sm:text-[56px]">
              4 ta qoida bilan{" "}
              <em className="ed-display-soft">ishlaymiz</em>.
            </h2>
          </div>

          <ol className="mt-16 space-y-16">
            {PRINCIPLES.map((p, i) => (
              <motion.li
                key={p.n}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, delay: i * 0.05 }}
                className="grid gap-6 sm:grid-cols-[120px_1fr] sm:gap-12"
              >
                <div>
                  <p
                    className="ed-display text-[40px]"
                    style={{ color: "var(--ed-accent)", fontVariationSettings: '"opsz" 96, "SOFT" 0' }}
                  >
                    {p.n}
                  </p>
                </div>
                <div>
                  <h3 className="ed-display text-2xl leading-tight sm:text-3xl">{p.title}</h3>
                  <p className="ed-body mt-4 max-w-2xl">{p.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <hr className="ed-rule" />

      {/* ===== PULL QUOTE ===== */}
      <section
        className="py-20 sm:py-32"
        style={{ background: "var(--ed-paper-warm)" }}
        aria-label="Quote"
      >
        <div className="ed-shell">
          <div className="ed-prose text-center">
            <p className="ed-eyebrow">Talabadan</p>
            <blockquote className="ed-quote mt-8">
              &ldquo;12 ta ariza, 4 ta suhbat, 2 ta oferta. IshTop tushuntirib bergan match
              score sababli qaysi ishga e&apos;tibor qaratishni bildim — bu o&apos;zgartirgan
              narsa.&rdquo;
            </blockquote>
            <p className="ed-meta mt-8">
              Sevinch Q. · Junior Frontend Developer · EPAM
            </p>
          </div>
        </div>
      </section>

      <hr className="ed-rule" />

      {/* ===== CTA ===== */}
      <section className="py-24 sm:py-32" aria-labelledby="about-cta">
        <div className="ed-shell">
          <div className="ed-prose">
            <h2 id="about-cta" className="ed-display text-[48px] leading-tight sm:text-[72px]">
              Birinchi ishingiz —{" "}
              <em className="ed-display-soft">bu yerda</em> boshlanadi.
            </h2>
            <p className="ed-lead mt-8">
              60 soniyada profil. Ariza — bir tugma. To&apos;lovsiz, va&apos;dasiz.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/register" className="ed-pill">
                Bepul ro&apos;yxatdan o&apos;tish <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <Link href="/" className="ed-link">
                Aurora landing
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer
        className="py-10"
        style={{ borderTop: "1px solid var(--ed-rule)" }}
        aria-label="Footer"
      >
        <div className="ed-shell flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="ed-meta">
            © {new Date().getFullYear()} IshTop · Tashkent ·{" "}
            <Link href="/brand-guidelines" className="hover:text-[var(--ed-ink)]">
              Brand guidelines
            </Link>
          </p>
          <p className="ed-meta">
            Editorial v1 · Set in <em>Fraunces</em> + <em>Inter</em>
          </p>
        </div>
      </footer>
    </main>
  );
}
