"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Clock, Briefcase, Globe, Sparkles } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Reveal } from "./primitives";

type Locale = "uz" | "ru" | "en";

// Honest, product-true highlights (no fabricated user/scale metrics).
const STATS: Record<Locale, { value: string; label: string; icon: typeof Clock }[]> = {
  uz: [
    { value: "2 daqiqa", label: "AI bilan rezyume", icon: Clock },
    { value: "50+", label: "Kasb bo'yicha ko'nikma bazasi", icon: Briefcase },
    { value: "UZ · RU", label: "Ikki tilda", icon: Globe },
    { value: "Bepul", label: "Boshlash uchun", icon: Sparkles },
  ],
  ru: [
    { value: "2 мин", label: "AI-резюме", icon: Clock },
    { value: "50+", label: "Профессий с навыками", icon: Briefcase },
    { value: "UZ · RU", label: "На двух языках", icon: Globe },
    { value: "Бесплатно", label: "Для старта", icon: Sparkles },
  ],
  en: [
    { value: "2 min", label: "AI resume builder", icon: Clock },
    { value: "50+", label: "Profession skill sets", icon: Briefcase },
    { value: "UZ · RU", label: "Bilingual", icon: Globe },
    { value: "Free", label: "To get started", icon: Sparkles },
  ],
};

const LOGOS = [
  "EPAM", "Uzum", "TBC Bank", "Click", "Payme", "Beeline",
  "Humans", "Korzinka", "MyTaxi", "Anorbank", "Kapital",
];

// Pastel icon tiles cycle through the silver palette
const TILE_STYLES = [
  "bg-[#d7e7ff] text-[#3856a5]",
  "bg-[#e3ddff] text-[#5b4a9e]",
  "bg-[#d9f1e4] text-[#2f7a56]",
  "bg-[#ffe9d6] text-[#9a5b28]",
];

export function TrustLayer() {
  const { locale } = useTranslation();
  const reduce = useReducedMotion();
  const L = (["uz", "ru", "en"] as const).includes(locale as Locale)
    ? (locale as Locale)
    : "uz";
  const stats = STATS[L];
  const logos = [...LOGOS, ...LOGOS];

  return (
    <section className="silver-ground section-y" aria-labelledby="trust-heading">
      <div className="section-shell">
        <Reveal className="flex flex-col items-center text-center">
          <span className="chip-silver uppercase tracking-[0.18em] !text-[11px]">
            {L === "ru" ? "Возможности" : L === "en" ? "Features" : "Imkoniyatlar"}
          </span>
          <h2 id="trust-heading" className="h-display mt-4 text-3xl text-[#18181b] sm:text-4xl">
            {L === "ru" ? "Почему IshTop?" : L === "en" ? "Why IshTop?" : "Nega IshTop?"}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={reduce ? false : { opacity: 0, y: 22, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.19, 1, 0.22, 1] }}
              className="card-silver card-silver-hover p-6"
            >
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-2xl ${TILE_STYLES[i % TILE_STYLES.length]}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-semibold tracking-tight text-[#18181b]">
                  {s.value}
                </p>
              </div>
              <p className="mt-3 text-sm text-[#63636b]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Logo marquee */}
        <Reveal className="mt-16" delay={0.1}>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#8e8e96]">
            {L === "ru"
              ? "Команды нанимают через IshTop"
              : L === "en"
              ? "Teams hire through IshTop"
              : "Kompaniyalar IshTop orqali yollaydi"}
          </p>
          <div className="marquee mt-6 overflow-hidden">
            <div
              className="flex w-max gap-10"
              style={{ animation: reduce ? undefined : "marqueeX 36s linear infinite" }}
            >
              {logos.map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="grid h-12 w-32 shrink-0 place-items-center rounded-2xl bg-white px-5 text-sm font-semibold tracking-wide text-[#8e8e96] shadow-[0_2px_8px_-2px_rgba(24,24,27,0.08)]"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default TrustLayer;
