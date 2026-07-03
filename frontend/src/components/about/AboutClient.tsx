"use client";

/**
 * IshTop — /about page (Editorial Calm)
 *
 * Mood: magazine editorial, generous whitespace, serif display, one warm accent
 * Inspired by: Stripe Press, Apple Newsroom, Notion homepage, Linear changelog
 * Tone: calm confidence, plain language, no marketing hype
 * Locales: UZ (default) + RU.
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import "./about.css";

type Copy = {
  navStart: string;
  eyebrow: string;
  heroA: string;
  heroB: string;
  lead: string;
  ctaRegister: string;
  readManifesto: string;
  manifesto: string;
  manifestoTitleA: string;
  manifestoTitleEm: string;
  para1: string;
  para2: string;
  para3: string;
  dontLabel: string;
  dontBody: string;
  numbersEyebrow: string;
  numbersTitleA: string;
  numbersTitleEm: string;
  numbers: { num: string; label: string }[];
  principlesEyebrow: string;
  principlesTitleA: string;
  principlesTitleEm: string;
  principles: { n: string; title: string; body: string }[];
  quoteEyebrow: string;
  quote: string;
  quoteAuthor: string;
  ctaTitleA: string;
  ctaTitleEm: string;
  ctaTitleB: string;
  ctaLead: string;
  home: string;
};

const UZ: Copy = {
  navStart: "Boshlash",
  eyebrow: "Biz haqimizda · 2026",
  heroA: "Birinchi ish.",
  heroB: "Soddaroq yo'l.",
  lead:
    "IshTop — O'zbekistondagi talabalar va junior mutaxassislar uchun karyera platformasi. Biz AI bilan sehr qilmaymiz — biz aniq, tushunarli va ishonchli yo'l qo'yamiz.",
  ctaRegister: "Bepul ro'yxatdan o'tish",
  readManifesto: "Manifestni o'qish",
  manifesto: "Manifesto",
  manifestoTitleA: "Birinchi ishni topish — hech qachon ",
  manifestoTitleEm: "qiyin emas edi",
  para1:
    "2024-yilda biz oddiy savol bilan boshladik: nega O'zbekistondagi talabalar hali ham 50-100 ta arizadan keyin ham birinchi ish topa olmaydi? Resume yozish shablonlar bo'yicha, vakansiyalar nima qilishni anglatishini tushuntirmaydi, kompaniyalar javob bermaydi — bu sistemada nuqson bor.",
  para2:
    "Biz ushbu nuqsonlarni AI bilan tuzatishga qaror qildik — lekin AI sehrli quti emas. Har bir natija tushuntiriladi. Sizning ko'nikmangiz nega vakansiyaga mos, qaysi qism etishmaydi, qanday tuzatish kerak — barchasi ko'rinadi.",
  para3:
    "Bugun IshTop O'zbekistonda eng tez o'sayotgan karyera platformasi. Birinchi oferta o'rtacha 4 hafta — bozordagi 12 hafta o'rniga.",
  dontLabel: "Biz nima qilmaymiz:",
  dontBody:
    " kompaniyalardan to'lov olib, vakansiyalarni reyting tepasiga ko'tarmaymiz. Sizga balanssiz reklama ko'rsatmaymiz. Ma'lumotlaringizni uchinchi tomonga sotmaymiz. Bu ish modeli emas — bu va'da.",
  numbersEyebrow: "Raqamlar bo'yicha",
  numbersTitleA: "24 oyda. ",
  numbersTitleEm: "O'sib.",
  numbers: [
    { num: "10,247", label: "talaba ro'yxatda" },
    { num: "1,180", label: "birinchi oferta tasdiqlangan" },
    { num: "500+", label: "tekshirilgan kompaniya" },
    { num: "24 oy", label: "loyiha yoshi" },
  ],
  principlesEyebrow: "Tamoyillarimiz",
  principlesTitleA: "4 ta qoida bilan ",
  principlesTitleEm: "ishlaymiz",
  principles: [
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
  ],
  quoteEyebrow: "Talabadan",
  quote:
    "“12 ta ariza, 4 ta suhbat, 2 ta oferta. IshTop tushuntirib bergan match score sababli qaysi ishga e'tibor qaratishni bildim — bu o'zgartirgan narsa.”",
  quoteAuthor: "Sevinch Q. · Junior Frontend Developer · EPAM",
  ctaTitleA: "Birinchi ishingiz — ",
  ctaTitleEm: "bu yerda",
  ctaTitleB: " boshlanadi.",
  ctaLead: "60 soniyada profil. Ariza — bir tugma. To'lovsiz, va'dasiz.",
  home: "Bosh sahifa",
};

const RU: Copy = {
  navStart: "Начать",
  eyebrow: "О нас · 2026",
  heroA: "Первая работа.",
  heroB: "Более простой путь.",
  lead:
    "IshTop — карьерная платформа для студентов и junior-специалистов Узбекистана. Мы не творим магию с AI — мы строим понятный, прозрачный и надёжный путь.",
  ctaRegister: "Зарегистрироваться бесплатно",
  readManifesto: "Читать манифест",
  manifesto: "Манифест",
  manifestoTitleA: "Найти первую работу никогда не должно было быть ",
  manifestoTitleEm: "так сложно",
  para1:
    "В 2024 году мы начали с простого вопроса: почему студенты в Узбекистане даже после 50-100 откликов не могут найти первую работу? Резюме пишутся по шаблонам, вакансии не объясняют, что нужно делать, компании не отвечают — в системе есть изъян.",
  para2:
    "Мы решили исправить эти изъяны с помощью AI — но AI не волшебная коробка. Каждый результат объясняется. Почему ваши навыки подходят вакансии, чего не хватает, как это исправить — всё видно.",
  para3:
    "Сегодня IshTop — самая быстрорастущая карьерная платформа в Узбекистане. Первый оффер в среднем за 4 недели — вместо 12 недель по рынку.",
  dontLabel: "Чего мы не делаем:",
  dontBody:
    " не берём плату с компаний за поднятие вакансий в рейтинге. Не показываем вам несбалансированную рекламу. Не продаём ваши данные третьим лицам. Это не бизнес-модель — это обещание.",
  numbersEyebrow: "В цифрах",
  numbersTitleA: "За 24 месяца. ",
  numbersTitleEm: "Рост.",
  numbers: [
    { num: "10,247", label: "студентов зарегистрировано" },
    { num: "1,180", label: "первых офферов подтверждено" },
    { num: "500+", label: "проверенных компаний" },
    { num: "24 мес", label: "возраст проекта" },
  ],
  principlesEyebrow: "Наши принципы",
  principlesTitleA: "Работаем по ",
  principlesTitleEm: "4 правилам",
  principles: [
    {
      n: "01",
      title: "Доверие не приходит само — оно строится.",
      body:
        "Каждая компания получает Trust Score 0-100. Фейковые вакансии фильтруются автоматически. Отзывы студентов — в приоритете, раньше ответа бизнеса.",
    },
    {
      n: "02",
      title: "Лучше быть меньше, чем быть чёрным ящиком.",
      body:
        "AI объясняет каждую рекомендацию. Почему match score 94%? Какие навыки подходят, каких не хватает — вы знаете. Мы предпочитаем промолчать, чем показать ненадёжный результат.",
    },
    {
      n: "03",
      title: "Студент прежде всего. Всегда.",
      body:
        "Мы зарабатываем на Premium-плане, но базовые возможности — профиль, подбор, отклики — остаются бесплатными. Поиск первой работы никогда не должен быть платным.",
    },
    {
      n: "04",
      title: "Скорость — знак уважения.",
      body:
        "Сайт грузится за 1.8s, отклик — в один клик. Мы знаем, что время пользователя — наш самый ценный ресурс, и не тратим его впустую.",
    },
  ],
  quoteEyebrow: "От студента",
  quote:
    "«12 откликов, 4 интервью, 2 оффера. Благодаря объяснимому match score от IshTop я поняла, на какие вакансии стоит делать ставку — это всё изменило.»",
  quoteAuthor: "Севинч К. · Junior Frontend Developer · EPAM",
  ctaTitleA: "Ваша первая работа ",
  ctaTitleEm: "начинается здесь",
  ctaTitleB: ".",
  ctaLead: "Профиль за 60 секунд. Отклик — одна кнопка. Без оплаты и обещаний.",
  home: "Главная",
};

export default function AboutClient() {
  const reduce = useReducedMotion();
  const { locale } = useTranslation();
  const ru = locale === "ru";
  const c = ru ? RU : UZ;

  return (
    <main className="ed-root" lang={ru ? "ru" : "uz"}>
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
              {c.home}
            </Link>
            <Link href="/register" className="ed-pill">
              {c.navStart} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
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
            {c.eyebrow}
          </motion.p>

          <motion.h1
            id="about-hero"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08 }}
            className="ed-display mt-8 text-[56px] sm:text-[88px] lg:text-[120px]"
          >
            {c.heroA}
            <br />
            <span className="ed-display-soft">{c.heroB}</span>
          </motion.h1>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.18 }}
            className="ed-prose mt-12"
          >
            <p className="ed-lead">{c.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link href="/register" className="ed-pill">
                {c.ctaRegister} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <a href="#manifesto" className="ed-link">
                {c.readManifesto}
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
            <p className="ed-eyebrow">{c.manifesto}</p>
            <h2
              id="manifesto-h"
              className="ed-display mt-6 text-[40px] leading-[1.08] sm:text-[56px]"
            >
              {c.manifestoTitleA}
              <em className="ed-display-soft">{c.manifestoTitleEm}</em>.
            </h2>
            <hr className="ed-rule mt-10" />

            <p className="ed-body ed-drop-cap mt-10">{c.para1}</p>
            <p className="ed-body mt-6">{c.para2}</p>
            <p className="ed-body mt-6">{c.para3}</p>

            <div className="ed-rule-accent mt-10">
              <p className="ed-body">
                <strong style={{ color: "var(--ed-ink)", fontWeight: 600 }}>{c.dontLabel}</strong>
                {c.dontBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr className="ed-rule" />

      {/* ===== BY THE NUMBERS ===== */}
      <section className="py-20 sm:py-28" aria-labelledby="numbers-h">
        <div className="ed-shell">
          <p className="ed-eyebrow">{c.numbersEyebrow}</p>
          <h2 id="numbers-h" className="ed-display mt-6 text-[40px] sm:text-[56px]">
            {c.numbersTitleA}
            <em className="ed-display-soft">{c.numbersTitleEm}</em>
          </h2>
          <hr className="ed-rule mt-12" />

          <dl className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {c.numbers.map((n, i) => (
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
            <p className="ed-eyebrow">{c.principlesEyebrow}</p>
            <h2 id="principles-h" className="ed-display mt-6 text-[40px] leading-tight sm:text-[56px]">
              {c.principlesTitleA}
              <em className="ed-display-soft">{c.principlesTitleEm}</em>.
            </h2>
          </div>

          <ol className="mt-16 space-y-16">
            {c.principles.map((p, i) => (
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
            <p className="ed-eyebrow">{c.quoteEyebrow}</p>
            <blockquote className="ed-quote mt-8">{c.quote}</blockquote>
            <p className="ed-meta mt-8">{c.quoteAuthor}</p>
          </div>
        </div>
      </section>

      <hr className="ed-rule" />

      {/* ===== CTA ===== */}
      <section className="py-24 sm:py-32" aria-labelledby="about-cta">
        <div className="ed-shell">
          <div className="ed-prose">
            <h2 id="about-cta" className="ed-display text-[48px] leading-tight sm:text-[72px]">
              {c.ctaTitleA}
              <em className="ed-display-soft">{c.ctaTitleEm}</em>
              {c.ctaTitleB}
            </h2>
            <p className="ed-lead mt-8">{c.ctaLead}</p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/register" className="ed-pill">
                {c.ctaRegister} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
              <Link href="/" className="ed-link">
                {c.home}
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
          <p className="ed-meta">© {new Date().getFullYear()} IshTop · Tashkent</p>
          <p className="ed-meta">Made in Tashkent</p>
        </div>
      </footer>
    </main>
  );
}
