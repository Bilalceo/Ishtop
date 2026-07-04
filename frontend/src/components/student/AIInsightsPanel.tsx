"use client";

/**
 * AIInsightsPanel — streaming AI thoughts about the student.
 *
 * On mount, types out a short personalized analysis based on real data
 * (resume count, application stats, top recommendation, skill gaps).
 *
 * This is the dashboard's equivalent of /demo's reasoning trace — it makes
 * the AI feel present and explainable, even on the work surface.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Brain, CheckCircle2, RefreshCw } from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";

export type InsightsInput = {
  fullName?: string;
  resumes: number;
  applications: number;
  interviews: number;
  topMatchScore?: number;
  topMatchTitle?: string;
  topMatchCompany?: string;
  topMissingSkills?: string[];
};

function buildInsightLines(input: InsightsInput, isRu: boolean): string[] {
  const fallbackName = isRu ? "Вы" : "siz";
  const name = (input.fullName?.split(" ")[0] || fallbackName).trim();
  const lines: string[] = [];

  if (isRu) {
    lines.push(`> Анализирую ваш профиль, ${name}…`);
    if (input.resumes > 0) {
      lines.push(`> Найдено резюме: ${input.resumes} — отличный старт`);
    } else {
      lines.push(`> Пока нет резюме — соберём с помощью AI за 60 секунд`);
    }
    if (input.applications > 0) {
      lines.push(`> Отправлено откликов: ${input.applications}`);
    }
    if (input.interviews > 0) {
      lines.push(`> ✓ Назначено собеседований: ${input.interviews} — хорошая динамика`);
    }
    if (input.topMatchTitle && typeof input.topMatchScore === "number") {
      lines.push(
        `> Лучшее совпадение: ${input.topMatchTitle}${
          input.topMatchCompany ? ` (${input.topMatchCompany})` : ""
        } — ${Math.round(input.topMatchScore)}%`
      );
    }
    if (input.topMissingSkills && input.topMissingSkills.length > 0) {
      lines.push(
        `> Фокус на следующий месяц: ${input.topMissingSkills.slice(0, 3).join(", ")}`
      );
    }
    lines.push("✓ Анализ завершён. Рекомендации ниже.");
  } else {
    lines.push(`> Profilingizni tahlil qilyapman, ${name}…`);
    if (input.resumes > 0) {
      lines.push(`> ${input.resumes} ta resume topildi — kuchli boshlash`);
    } else {
      lines.push(`> Hali resume yo'q — AI Resume bilan 60 soniyada tayyor`);
    }
    if (input.applications > 0) {
      lines.push(`> ${input.applications} ta ariza yuborilgan`);
    }
    if (input.interviews > 0) {
      lines.push(`> ✓ ${input.interviews} ta suhbat tayinlangan — yaxshi traksiya`);
    }
    if (input.topMatchTitle && typeof input.topMatchScore === "number") {
      lines.push(
        `> Eng yaxshi mosligingiz: ${input.topMatchTitle}${
          input.topMatchCompany ? ` (${input.topMatchCompany})` : ""
        } — ${Math.round(input.topMatchScore)}%`
      );
    }
    if (input.topMissingSkills && input.topMissingSkills.length > 0) {
      lines.push(
        `> Keyingi oy uchun fokus: ${input.topMissingSkills.slice(0, 3).join(", ")}`
      );
    }
    lines.push("✓ Tahlil tugadi. Tavsiyalar pastda.");
  }
  return lines;
}

export function AIInsightsPanel({ input }: { input: InsightsInput }) {
  const reduce = useReducedMotion();
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const ui = isRu
    ? { thinking: "обдумываю…", ready: "готово", refresh: "Повторить анализ" }
    : { thinking: "o'ylayapti…", ready: "tayyor", refresh: "Tahlilni qayta yuritish" };
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState(0);

  // Recompute the script when inputs materially change
  const script = useMemo(() => buildInsightLines(input, isRu), [
    isRu,
    input.fullName,
    input.resumes,
    input.applications,
    input.interviews,
    input.topMatchScore,
    input.topMatchTitle,
    input.topMatchCompany,
    input.topMissingSkills?.join(","),
  ]);

  useEffect(() => {
    setThoughts([]);
    setDone(false);

    if (reduce) {
      setThoughts(script);
      setDone(true);
      return;
    }

    let idx = 0;
    let cancelled = false;
    let nextTimer: number | null = null;
    const tick = () => {
      if (cancelled) return;
      if (idx >= script.length) {
        setDone(true);
        return;
      }
      const line = script[idx];
      idx += 1;
      if (line === undefined) return;
      setThoughts((prev) => [...prev, line]);
      nextTimer = window.setTimeout(tick, 220 + Math.random() * 110);
    };
    nextTimer = window.setTimeout(tick, 280);
    return () => {
      cancelled = true;
      if (nextTimer !== null) window.clearTimeout(nextTimer);
    };
  }, [script, reduce, token]);

  return (
    <div className="rounded-3xl border border-surface-200/70 bg-white p-5 text-sm dark:border-white/[0.06] dark:bg-surface-900 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400 dark:text-white/55">
          <Brain className="h-3.5 w-3.5 text-brand-500 dark:text-brand-300" aria-hidden />
          {isRu ? "AI изучает ваши данные" : "AI ma'lumotlaringizni o'qiyapti"}
        </p>
        <div className="flex items-center gap-3">
          {!done ? (
            <span className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500 dark:bg-brand-300" />
              {ui.thinking}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-[#2f7a56] dark:text-brand-300">
              <CheckCircle2 className="h-3 w-3" aria-hidden /> {ui.ready}
            </span>
          )}
          <button
            type="button"
            onClick={() => setToken((t) => t + 1)}
            aria-label={ui.refresh}
            className="focus-ring grid h-7 w-7 place-items-center rounded-full bg-surface-100 text-surface-500 transition hover:bg-surface-200 hover:text-surface-800 dark:bg-white/[0.05] dark:text-white/60 dark:hover:bg-white/[0.1] dark:hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="min-h-[100px] space-y-2 rounded-2xl bg-surface-50 p-4 dark:bg-white/[0.03]">
        <AnimatePresence>
          {thoughts.filter(Boolean).map((line, i, arr) => {
            const isDone = line.startsWith("✓");
            const isArrow = line.startsWith(">");
            return (
              <motion.p
                key={`${i}-${line}`}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex items-start gap-2 text-[13px] leading-relaxed ${
                  isDone
                    ? "font-medium text-[#2f7a56] dark:text-brand-300"
                    : "text-surface-600 dark:text-white/75"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <span
                    aria-hidden
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300 dark:bg-brand-400"
                  />
                )}
                <span>{line.replace(/^[>✓]\s*/, "")}</span>

              </motion.p>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AIInsightsPanel;
