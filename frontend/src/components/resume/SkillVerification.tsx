"use client";

/**
 * SkillVerification — lightweight, optional, junior-friendly skill check.
 *
 * Shows inside the resume Skills step. Asks ONE simple question for up to
 * MAX_QUESTIONS_PER_SESSION important skills. Never blocks, never deletes:
 *   correct  → "verified"
 *   wrong    → "learning"   (still kept, just lower confidence)
 *   skipped  → "unverified"
 *
 * Fully frontend / local question bank. Bilingual (uz/ru) via a local string
 * table so it needs no global i18n keys.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, BookOpen, Check, ChevronRight, Sparkles } from "lucide-react";
import {
  getVerifiableSkills,
  pickQuestionForSkill,
  MAX_QUESTIONS_PER_SESSION,
  type VerificationStatus,
  type VerificationQuestion,
} from "@/lib/resume/skillQuestions";

type Locale = "uz" | "ru" | string;

const L = {
  uz: {
    title: "Ko'nikmalaringizni tasdiqlang",
    subtitle: "Bir nechta oddiy savol — tasdiqlangan ko'nikmalar ish beruvchilarga ko'proq ishonch beradi.",
    optional: "ixtiyoriy",
    start: "Tasdiqlashni boshlash",
    skipAll: "Hozir o'tkazib yuborish",
    skip: "Bu savolni o'tkazish",
    next: "Keyingi",
    finish: "Yakunlash",
    progress: (a: number, b: number) => `${a} / ${b}-savol`,
    correct: "To'g'ri! Bu ko'nikma tasdiqlandi ✓",
    wrong: "Zarari yo'q — bu ko'nikma \"o'rganilyapti\" sifatida belgilandi 📘",
    skipped: "O'tkazib yuborildi",
    doneTitle: "Tasdiqlash yakunlandi",
    summary: (v: number, l: number) => `Tasdiqlandi: ${v} · O'rganilyapti: ${l}`,
    verified: "Tasdiqlangan",
    learning: "O'rganilyapti",
    again: "Qaytadan",
    noSkills: "Tasdiqlash uchun mos ko'nikma topilmadi.",
    forSkill: "Ko'nikma",
  },
  ru: {
    title: "Подтвердите свои навыки",
    subtitle: "Несколько простых вопросов — подтверждённые навыки вызывают больше доверия у работодателей.",
    optional: "необязательно",
    start: "Начать подтверждение",
    skipAll: "Пропустить сейчас",
    skip: "Пропустить вопрос",
    next: "Далее",
    finish: "Завершить",
    progress: (a: number, b: number) => `Вопрос ${a} / ${b}`,
    correct: "Верно! Навык подтверждён ✓",
    wrong: "Ничего страшного — навык отмечен как «изучается» 📘",
    skipped: "Пропущено",
    doneTitle: "Подтверждение завершено",
    summary: (v: number, l: number) => `Подтверждено: ${v} · Изучается: ${l}`,
    verified: "Подтверждён",
    learning: "Изучается",
    again: "Заново",
    noSkills: "Подходящих для проверки навыков не найдено.",
    forSkill: "Навык",
  },
} as const;

interface Props {
  skills: string[];
  statuses: Record<string, VerificationStatus>;
  onChange: (skill: string, status: VerificationStatus) => void;
  locale: Locale;
}

type Phase = "idle" | "active" | "done";

export function SkillVerification({ skills, statuses, onChange, locale }: Props) {
  const t = L[locale === "ru" ? "ru" : "uz"];

  // Build a stable, deduped question plan (max N) for the current skills.
  const plan = useMemo(() => {
    const verifiable = getVerifiableSkills(skills).slice(0, MAX_QUESTIONS_PER_SESSION);
    const used = new Set<string>();
    const items: { skill: string; question: VerificationQuestion }[] = [];
    for (const skill of verifiable) {
      const q = pickQuestionForSkill(skill, used);
      if (q) {
        used.add(q.id);
        items.push({ skill, question: q });
      }
    }
    return items;
  }, [skills]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const verifiedCount = Object.values(statuses).filter((s) => s === "verified").length;
  const learningCount = Object.values(statuses).filter((s) => s === "learning").length;

  if (plan.length === 0) return null; // nothing to verify → don't show anything

  const current = plan[idx];
  const localized = current ? current.question[locale === "ru" ? "ru" : "uz"] : null;

  const answer = (optionIdx: number) => {
    if (picked !== null) return; // already answered this question
    const correct = optionIdx === current.question.correct;
    setPicked(optionIdx);
    setFeedback(correct ? "correct" : "wrong");
    onChange(current.skill, correct ? "verified" : "learning");
  };

  const advance = () => {
    setPicked(null);
    setFeedback(null);
    if (idx + 1 < plan.length) {
      setIdx(idx + 1);
    } else {
      setPhase("done");
    }
  };

  const skipCurrent = () => {
    if (statuses[current.skill] === undefined) onChange(current.skill, "unverified");
    advance();
  };

  const skipAll = () => {
    plan.forEach(({ skill }) => {
      if (statuses[skill] === undefined) onChange(skill, "unverified");
    });
    setPhase("done");
  };

  // -------------------------------------------------------------- IDLE
  if (phase === "idle") {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-emerald-600/15 text-emerald-600 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
              {t.title}
              <span className="rounded-full bg-surface-200 px-2 py-0.5 text-[10px] font-medium text-surface-600 dark:bg-surface-700 dark:text-surface-300">
                {t.optional}
              </span>
            </p>
            <p className="mt-1 text-xs text-surface-600 dark:text-surface-400">{t.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPhase("active")}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Sparkles className="h-4 w-4" /> {t.start} ({plan.length})
              </button>
              <button
                type="button"
                onClick={skipAll}
                className="inline-flex min-h-[40px] items-center rounded-lg px-3 text-sm font-medium text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white"
              >
                {t.skipAll}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- DONE
  if (phase === "done") {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-emerald-600/15 text-emerald-600 dark:text-emerald-300">
            <Check className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-surface-900 dark:text-white">{t.doneTitle}</p>
            <p className="mt-0.5 text-xs text-surface-600 dark:text-surface-400">
              {t.summary(verifiedCount, learningCount)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setIdx(0); setPicked(null); setFeedback(null); setPhase("active"); }}
            className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-300"
          >
            {t.again}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- ACTIVE
  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-500/30 dark:bg-surface-900">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
          {t.progress(idx + 1, plan.length)}
        </span>
        <span className="max-w-[55%] truncate rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
          {t.forSkill}: {current.skill}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.question.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-sm font-semibold text-surface-900 dark:text-white">{localized!.q}</p>

          <div className="mt-3 space-y-2">
            {localized!.options.map((opt, i) => {
              const isPicked = picked === i;
              const isCorrect = current.question.correct === i;
              let cls =
                "border-surface-200 hover:border-emerald-300 hover:bg-emerald-50 dark:border-surface-700 dark:hover:bg-surface-800";
              if (picked !== null) {
                if (isCorrect) cls = "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10";
                else if (isPicked) cls = "border-amber-400 bg-amber-50 dark:bg-amber-500/10";
                else cls = "border-surface-200 opacity-60 dark:border-surface-700";
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => answer(i)}
                  className={`flex min-h-[44px] w-full items-center justify-between rounded-lg border px-3 text-left text-sm text-surface-800 transition dark:text-surface-100 ${cls}`}
                >
                  <span>{opt}</span>
                  {picked !== null && isCorrect && <Check className="h-4 w-4 text-emerald-600" />}
                </button>
              );
            })}
          </div>

          {feedback && (
            <p
              className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${
                feedback === "correct" ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"
              }`}
            >
              {feedback === "correct" ? <Check className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
              {feedback === "correct" ? t.correct : t.wrong}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={skipCurrent}
              className="text-xs font-medium text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-white"
            >
              {t.skip}
            </button>
            {picked !== null && (
              <button
                type="button"
                onClick={advance}
                className="inline-flex min-h-[40px] items-center gap-1 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                {idx + 1 < plan.length ? t.next : t.finish}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default SkillVerification;
