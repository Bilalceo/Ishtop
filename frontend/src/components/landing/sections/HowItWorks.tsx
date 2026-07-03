"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { User2, Sparkles, Send, Trophy } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Reveal } from "./primitives";

type Locale = "uz" | "ru" | "en";

const STEPS: Record<Locale, { title: string; desc: string }[]> = {
  uz: [
    { title: "Profil yarating", desc: "Ko'nikma, tajriba va maqsadlaringizni 3 daqiqada to'ldiring. AI qolganini o'zi to'ldiradi." },
    { title: "AI sizga mos topadi", desc: "Har bir vakansiya uchun aniq tushuntirish: nega mos, qaysi ko'nikmalar etishmaydi." },
    { title: "Bir tugma bilan ariza", desc: "AI cover letter va resume to'g'rilanadi. 1 click bilan yuboring." },
    { title: "Suhbat va offer", desc: "Suhbatga tayyorgarlik va savol bankasi bilan o'ziga ishonch — birinchi offer bilan yakun." },
  ],
  ru: [
    { title: "Создай профиль", desc: "За 3 минуты внеси навыки, опыт и цели. AI дополнит остальное." },
    { title: "AI найдёт совпадения", desc: "Объяснение для каждой вакансии: почему подходит и каких навыков не хватает." },
    { title: "Отклик в один клик", desc: "AI подстраивает резюме и cover letter — отправляем за секунду." },
    { title: "Интервью и оффер", desc: "Готовимся к собеседованию с банком вопросов — финал — твой первый оффер." },
  ],
  en: [
    { title: "Build your profile", desc: "Add skills, experience and goals in 3 minutes — AI fills the rest." },
    { title: "AI finds your matches", desc: "Every job gets a clear explanation: why it fits and what skills to grow." },
    { title: "Apply with one tap", desc: "AI tailors the resume and cover letter — send in a single click." },
    { title: "Interview & land it", desc: "Question bank and live prep flow — finish with your first real offer." },
  ],
};

const ICONS = [User2, Sparkles, Send, Trophy];

// One pastel tile per step — sky, lavender, mint, peach
const STEP_TILES = [
  "bg-[#d7e7ff] text-[#3856a5]",
  "bg-[#e3ddff] text-[#5b4a9e]",
  "bg-[#d9f1e4] text-[#2f7a56]",
  "bg-[#ffe9d6] text-[#9a5b28]",
];

export function HowItWorks() {
  const { locale } = useTranslation();
  const reduce = useReducedMotion();
  const L = (["uz", "ru", "en"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "uz";
  const steps = STEPS[L];

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
  const lineLen = useTransform(progress, [0.15, 0.85], ["0%", "100%"]);

  return (
    <section
      ref={sectionRef}
      id="how"
      className="silver-ground section-y relative"
      aria-labelledby="how-heading"
    >
      <div className="section-shell">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="chip-silver uppercase tracking-[0.18em] !text-[11px]">
            {L === "ru" ? "Как это работает" : L === "en" ? "How it works" : "Qanday ishlaydi"}
          </span>
          <h2 id="how-heading" className="h-display mt-4 text-3xl text-[#18181b] sm:text-5xl">
            {L === "ru"
              ? "Профиль → Совпадение → Отклик → Интервью"
              : L === "en"
              ? "Profile → Match → Apply → Interview"
              : "Profil → Mos topish → Ariza → Suhbat"}
          </h2>
          <p className="mt-4 text-lg text-[#63636b]">
            {L === "ru"
              ? "Прозрачный путь от первого клика до подписанного оффера."
              : L === "en"
              ? "A transparent path from first click to signed offer."
              : "Birinchi bosishdan oferta imzolagunga qadar tushunarli yo'l."}
          </p>
        </Reveal>

        <ol className="relative mt-16 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Scroll-driven pastel connector line */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px overflow-hidden lg:block"
          >
            <div className="h-full w-full bg-[#d4d4d1]" />
            <motion.div
              className="absolute inset-y-0 left-0 h-full origin-left"
              style={{
                width: lineLen,
                background:
                  "linear-gradient(90deg, #a5c4ff 0%, #c4b5fd 50%, #ffd1a8 100%)",
              }}
            />
          </div>

          {steps.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={step.title} delay={i * 0.1} className="h-full">
                <motion.li
                  whileHover={reduce ? undefined : { y: -6 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  className="card-silver card-silver-hover relative flex h-full flex-col p-6"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid h-12 w-12 place-items-center rounded-2xl ${STEP_TILES[i % STEP_TILES.length]}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-5xl font-bold text-[#ececea]">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold text-[#18181b]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#63636b]">
                    {step.desc}
                  </p>
                </motion.li>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
