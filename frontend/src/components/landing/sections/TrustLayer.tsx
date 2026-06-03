"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Users, TrendingUp, Briefcase, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

type Locale = "uz" | "ru" | "en";

const STATS: Record<Locale, { value: string; label: string; icon: typeof Users }[]> = {
  uz: [
    { value: "10 000+", label: "Faol talabalar", icon: Users },
    { value: "500+", label: "Tekshirilgan kompaniya", icon: Briefcase },
    { value: "95%", label: "Suhbatga chaqiruv darajasi", icon: TrendingUp },
    { value: "<24s", label: "O'rtacha javob vaqti", icon: ShieldCheck },
  ],
  ru: [
    { value: "10 000+", label: "Активных студентов", icon: Users },
    { value: "500+", label: "Проверенных компаний", icon: Briefcase },
    { value: "95%", label: "Процент приглашений", icon: TrendingUp },
    { value: "<24ч", label: "Среднее время ответа", icon: ShieldCheck },
  ],
  en: [
    { value: "10,000+", label: "Active students", icon: Users },
    { value: "500+", label: "Verified companies", icon: Briefcase },
    { value: "95%", label: "Interview invite rate", icon: TrendingUp },
    { value: "<24h", label: "Avg. response time", icon: ShieldCheck },
  ],
};

const LOGOS = [
  "EPAM", "Uzum", "TBC Bank", "Click", "Payme", "Beeline",
  "Humans", "Korzinka", "MyTaxi", "Anorbank", "Kapital",
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
    <section className="mist-bg section-y border-y border-surface-200/60 dark:border-white/[0.06]" aria-labelledby="trust-heading">
      <div className="section-shell">
        <div className="flex flex-col items-center text-center">
          <span className="h-eyebrow">
            {L === "ru" ? "Доверие" : L === "en" ? "Trust" : "Ishonch"}
          </span>
          <h2 id="trust-heading" className="h-display mt-4 text-3xl text-surface-900 dark:text-white sm:text-4xl">
            {L === "ru"
              ? "Цифры, которым доверяют"
              : L === "en"
              ? "Numbers students trust"
              : "Talabalar ishonadigan raqamlar"}
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="card-aurora card-aurora-hover p-6"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-cyan-400/15 text-violet-600 dark:text-violet-300">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-semibold tracking-tight text-surface-900 dark:text-white">
                  {s.value}
                </p>
              </div>
              <p className="mt-3 text-sm text-surface-600 dark:text-white/65">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Logo marquee */}
        <div className="mt-16">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-surface-500 dark:text-white/50">
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
                  className="grid h-12 w-32 shrink-0 place-items-center rounded-2xl border border-surface-200/70 bg-white/70 px-5 text-sm font-semibold tracking-wide text-surface-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-white/55"
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TrustLayer;
