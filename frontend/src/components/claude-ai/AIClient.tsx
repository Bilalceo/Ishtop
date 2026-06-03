"use client";

/**
 * IshTop · /ai page — Claude/Anthropic brand styling.
 *
 * Official palette: warm cream (#faf9f5) + coral (#d97757) + Poppins/Lora type.
 * Calm, intelligent, warm — explains how IshTop uses AI to help students.
 *
 * Reference: Anthropic brand guidelines (Poppins headings, Lora body).
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Heart, ShieldCheck, Sparkles } from "lucide-react";
import "./ai.css";

export default function AIClient() {
  const reduce = useReducedMotion();

  return (
    <main className="cl-root" lang="uz">
      {/* ===== Nav ===== */}
      <nav aria-label="Primary" className="border-b" style={{ borderColor: "var(--cl-rule)" }}>
        <div className="cl-shell flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cl-display text-base">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-full"
              style={{ background: "var(--cl-coral)" }}
            >
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </span>
            IshTop
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="cl-meta hover:text-[var(--cl-dark)]">
              ← Asosiy
            </Link>
            <Link href="/register" className="cl-btn">
              Boshlash
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="py-20 sm:py-32" aria-labelledby="ai-h">
        <div className="cl-shell">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="cl-eyebrow"
          >
            AI · Karyera · Hikoya
          </motion.p>

          <motion.h1
            id="ai-h"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08 }}
            className="cl-display mt-6 text-[52px] sm:text-[80px] lg:text-[104px]"
          >
            AI <span className="cl-sparkle">✦</span> kim<br />
            uchun ishlaydi?
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
            className="cl-lead mt-10 max-w-2xl"
          >
            Biz AI'ni shu narsa uchun qurdik: birinchi ishini izlayotgan talabaga
            tushunarli, halol va xavfsiz yo&apos;l ko&apos;rsatish.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.26 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link href="/demo" className="cl-btn">
              AI'ni sinab ko&apos;rish
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/about" className="cl-btn-ghost">
              Biz haqimizda
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </motion.div>
        </div>
      </section>

      <hr className="cl-rule" />

      {/* ===== Philosophy ===== */}
      <section className="py-20 sm:py-28" aria-labelledby="philo-h">
        <div className="cl-shell cl-prose">
          <p className="cl-eyebrow">Falsafamiz</p>
          <h2 id="philo-h" className="cl-display mt-5 text-[36px] sm:text-[48px]">
            Sehrli quti emas. Hamkor.
          </h2>

          <p className="cl-body mt-8">
            Ko&apos;p AI mahsulotlari javob beradi, lekin nima uchun shu javobni
            berganini tushuntirmaydi. Biz boshqacha ishlaymiz. Har bir match score,
            har bir tavsiya, har bir &ldquo;ushbu vakansiya sizga mos keladi&rdquo; degan
            xulosa — sabab bilan birga keladi.
          </p>

          <p className="cl-body mt-6">
            Sevinch nima uchun 94% mos? Chunki React + TypeScript + Tailwind to&apos;g&apos;ridan-to&apos;g&apos;ri
            mos keladi, lekin Next.js etishmaydi. Bu — black box emas. Bu — birgalikda
            tuziladigan karyera.
          </p>

          <blockquote className="mt-10 border-l-4 pl-6" style={{ borderColor: "var(--cl-coral)" }}>
            <p className="cl-quote">
              &ldquo;Bizning AI hech qachon foydalanuvchi o&apos;rniga qaror qabul qilmaydi.
              U faqat tushuntiradi.&rdquo;
            </p>
            <p className="cl-meta mt-4">— IshTop Manifesto, 2024</p>
          </blockquote>
        </div>
      </section>

      <hr className="cl-rule" />

      {/* ===== 3 commitments ===== */}
      <section className="py-20 sm:py-28" aria-labelledby="commits-h">
        <div className="cl-shell">
          <div className="cl-prose">
            <p className="cl-eyebrow">3 ta va&apos;da</p>
            <h2 id="commits-h" className="cl-display mt-5 text-[36px] sm:text-[48px]">
              Sizga shularni va&apos;da qilamiz.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            <Commitment
              i={0}
              reduce={!!reduce}
              accent="coral"
              Icon={Sparkles}
              num="01"
              title="Tushuntiriladi"
              body="Har bir AI tavsiya sabab bilan keladi. Qaysi ko'nikma mos, qaysi etishmaydi — har doim ko'rinadi."
            />
            <Commitment
              i={1}
              reduce={!!reduce}
              accent="blue"
              Icon={ShieldCheck}
              num="02"
              title="Xavfsiz"
              body="Ma'lumotlaringiz shifrlangan, hech qachon sotilmaydi. Trust Score soxta vakansiyalardan himoya qiladi."
            />
            <Commitment
              i={2}
              reduce={!!reduce}
              accent="green"
              Icon={Heart}
              num="03"
              title="Talaba avval"
              body="Asosiy imkoniyatlar bepul. AI hech qachon kompaniya tomonidan sotib olinmaydi — siz tomonda turamiz."
            />
          </div>
        </div>
      </section>

      <hr className="cl-rule" />

      {/* ===== CTA ===== */}
      <section className="py-20 sm:py-32" aria-labelledby="ai-cta">
        <div className="cl-shell cl-prose text-center">
          <p className="cl-eyebrow">Boshlash</p>
          <h2 id="ai-cta" className="cl-display mt-6 text-[40px] sm:text-[64px]">
            Birinchi ishingiz —<br />
            <em
              style={{ color: "var(--cl-coral)", fontStyle: "italic" }}
              className="cl-display"
            >
              tushunarli yo&apos;l bilan
            </em>
            .
          </h2>
          <p className="cl-lead mt-8">
            5 soniyada AI ni sinab ko&apos;ring. Ro&apos;yxatdan o&apos;tish kerak emas.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/demo" className="cl-btn">
              Demo'ni ochish
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/register" className="cl-btn-ghost">
              Bepul ro&apos;yxat
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer
        className="py-10"
        style={{ borderTop: "1px solid var(--cl-rule)" }}
        aria-label="Footer"
      >
        <div className="cl-shell flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="cl-meta">
            © {new Date().getFullYear()} IshTop · Tashkent ·{" "}
            <Link href="/brand-guidelines" className="hover:text-[var(--cl-dark)]">
              Brand
            </Link>
          </p>
          <p className="cl-meta">
            AI sahifa · Inspired by{" "}
            <a
              href="https://www.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--cl-coral)]"
            >
              Anthropic
            </a>{" "}
            brand · Set in <em style={{ fontStyle: "italic" }}>Poppins</em> + <em style={{ fontStyle: "italic" }}>Lora</em>
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ----------------------------------------------------------------- Commitment */

type Accent = "coral" | "blue" | "green";

function Commitment({
  Icon,
  num,
  title,
  body,
  i,
  reduce,
  accent,
}: {
  Icon: React.ElementType;
  num: string;
  title: string;
  body: string;
  i: number;
  reduce: boolean;
  accent: Accent;
}) {
  const color =
    accent === "coral"
      ? "var(--cl-coral)"
      : accent === "blue"
      ? "var(--cl-blue)"
      : "var(--cl-green)";

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1], delay: i * 0.08 }}
      className="cl-card"
    >
      <div className="flex items-start justify-between">
        <span
          className="grid h-12 w-12 place-items-center rounded-full text-white"
          style={{ background: color }}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="cl-meta" style={{ color }}>
          {num}
        </span>
      </div>
      <h3 className="cl-h-small mt-6 text-2xl">{title}</h3>
      <p className="cl-body mt-3 text-base leading-relaxed">{body}</p>
    </motion.article>
  );
}
