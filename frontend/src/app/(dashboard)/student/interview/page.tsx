"use client";

/**
 * AI Interview Coach — Gemini-powered mock interview for students.
 * Flow: setup (role + level) -> Q&A loop (question, answer, AI feedback)
 * -> summary (average score). Silver design, UZ/RU. Text-based MVP.
 */

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  RotateCcw,
  MessageSquare,
  Trophy,
} from "lucide-react";
import { aiApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

type Question = { q: string; type: string };
type Feedback = {
  score: number;
  strengths: string[];
  improvements: string[];
  model_answer: string;
};

const LEVELS = ["intern", "junior", "mid"] as const;

export default function InterviewCoachPage() {
  const { user } = useAuth();
  const { locale } = useTranslation();
  const ru = locale === "ru";
  const params = useSearchParams();

  const t = useMemo(
    () =>
      ru
        ? {
            title: "AI Тренажёр собеседований",
            subtitle:
              "Потренируйтесь перед реальным собеседованием. AI задаёт вопросы по вашей роли и оценивает ответы.",
            roleLabel: "Должность / роль",
            rolePh: "Например: Junior Frontend Developer",
            levelLabel: "Уровень",
            levels: { intern: "Стажёр", junior: "Junior", mid: "Middle" },
            start: "Начать тренировку",
            generating: "Готовлю вопросы…",
            question: "Вопрос",
            of: "из",
            answerPh: "Напишите ваш ответ…",
            evaluate: "Оценить ответ",
            evaluating: "Оцениваю…",
            score: "Оценка",
            strengths: "Сильные стороны",
            improvements: "Что улучшить",
            model: "Пример ответа",
            next: "Следующий вопрос",
            finish: "Завершить",
            summaryTitle: "Тренировка завершена!",
            avgScore: "Средний балл",
            again: "Пройти заново",
            backToDash: "На панель",
            needRole: "Введите должность",
            emptyAnswer: "Напишите ответ",
            aiBusy: "AI занят, попробуйте ещё раз.",
            behavioral: "Поведенческий",
            technical: "Технический",
            situational: "Ситуационный",
          }
        : {
            title: "AI Suhbat murabbiyi",
            subtitle:
              "Haqiqiy suhbatdan oldin mashq qiling. AI kasbingiz bo'yicha savol beradi va javobingizni baholaydi.",
            roleLabel: "Lavozim / rol",
            rolePh: "Masalan: Junior Frontend Developer",
            levelLabel: "Daraja",
            levels: { intern: "Amaliyotchi", junior: "Junior", mid: "Middle" },
            start: "Mashqni boshlash",
            generating: "Savollar tayyorlanmoqda…",
            question: "Savol",
            of: "/",
            answerPh: "Javobingizni yozing…",
            evaluate: "Javobni baholash",
            evaluating: "Baholanmoqda…",
            score: "Ball",
            strengths: "Kuchli tomonlar",
            improvements: "Nimani yaxshilash kerak",
            model: "Namuna javob",
            next: "Keyingi savol",
            finish: "Yakunlash",
            summaryTitle: "Mashq yakunlandi!",
            avgScore: "O'rtacha ball",
            again: "Qaytadan mashq",
            backToDash: "Panelga qaytish",
            needRole: "Lavozimni kiriting",
            emptyAnswer: "Javob yozing",
            aiBusy: "AI band, qayta urinib ko'ring.",
            behavioral: "Xulq-atvor",
            technical: "Texnik",
            situational: "Vaziyatli",
          },
    [ru],
  );

  const [phase, setPhase] = useState<"setup" | "quiz" | "summary">("setup");
  const [role, setRole] = useState(params.get("role") || "");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("junior");
  const [loading, setLoading] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [scores, setScores] = useState<number[]>([]);

  const typeLabel = (tp: string) =>
    tp === "behavioral" ? t.behavioral : tp === "technical" ? t.technical : tp === "situational" ? t.situational : "";

  const start = async () => {
    if (!role.trim()) {
      toast.error(t.needRole);
      return;
    }
    setLoading(true);
    try {
      const res = await aiApi.interviewQuestions({
        role: role.trim(),
        level,
        locale: ru ? "ru" : "uz",
        count: 5,
      });
      const qs = (res.data?.data?.questions || []) as Question[];
      if (!qs.length) throw new Error("empty");
      setQuestions(qs);
      setIdx(0);
      setAnswer("");
      setFeedback(null);
      setScores([]);
      setPhase("quiz");
    } catch {
      toast.error(t.aiBusy);
    } finally {
      setLoading(false);
    }
  };

  const evaluate = async () => {
    if (!answer.trim()) {
      toast.error(t.emptyAnswer);
      return;
    }
    setLoading(true);
    try {
      const res = await aiApi.interviewEvaluate({
        role: role.trim(),
        question: questions[idx].q,
        answer: answer.trim(),
        locale: ru ? "ru" : "uz",
      });
      const fb = res.data?.data as Feedback;
      setFeedback(fb);
      setScores((s) => [...s, fb?.score ?? 0]);
    } catch {
      toast.error(t.aiBusy);
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      setPhase("summary");
      return;
    }
    setIdx((i) => i + 1);
    setAnswer("");
    setFeedback(null);
  };

  const reset = () => {
    setPhase("setup");
    setQuestions([]);
    setIdx(0);
    setAnswer("");
    setFeedback(null);
    setScores([]);
  };

  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const scoreColor = (s: number) =>
    s >= 75 ? "text-[#2f7a56]" : s >= 50 ? "text-[#9a5b28]" : "text-[#b4443a]";
  const scoreBg = (s: number) =>
    s >= 75 ? "bg-[#d9f1e4]" : s >= 50 ? "bg-[#ffe9d6]" : "bg-[#fbe0dd]";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[24px] border border-surface-200/70 bg-white p-6 dark:border-white/[0.06] dark:bg-surface-900 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#e3ddff]/60 blur-[80px] dark:bg-brand-500/15"
        />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e3ddff] text-[#5b4a9e]">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-surface-900 dark:text-white sm:text-2xl">
              {t.title}
            </h1>
            <p className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* SETUP */}
      {phase === "setup" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-surface-200/70 bg-white p-6 dark:border-white/[0.06] dark:bg-surface-900 sm:p-8"
        >
          <label className="block text-sm font-semibold text-surface-800 dark:text-white">
            {t.roleLabel}
          </label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={t.rolePh}
            className="mt-2 w-full rounded-xl border border-surface-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800"
          />

          <label className="mt-5 block text-sm font-semibold text-surface-800 dark:text-white">
            {t.levelLabel}
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  level === lv
                    ? "bg-brand-500 text-white"
                    : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300"
                }`}
              >
                {t.levels[lv]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={start}
            disabled={loading}
            className="btn-silver-primary group mt-7 w-full disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.generating}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t.start}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* QUIZ */}
      {phase === "quiz" && questions[idx] && (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* progress */}
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-100 dark:bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8ab4ff] to-[#b7a4ff] transition-all"
                style={{ width: `${((idx + (feedback ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-surface-500">
              {t.question} {idx + 1} {t.of} {questions.length}
            </span>
          </div>

          {/* question */}
          <div className="rounded-3xl border border-surface-200/70 bg-white p-6 dark:border-white/[0.06] dark:bg-surface-900">
            {typeLabel(questions[idx].type) && (
              <span className="inline-block rounded-full bg-[#e3ddff] px-2.5 py-0.5 text-[11px] font-semibold text-[#5b4a9e]">
                {typeLabel(questions[idx].type)}
              </span>
            )}
            <p className="mt-3 font-display text-lg font-semibold text-surface-900 dark:text-white">
              {questions[idx].q}
            </p>

            {!feedback && (
              <>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={t.answerPh}
                  rows={5}
                  className="mt-4 w-full resize-none rounded-xl border border-surface-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800"
                />
                <button
                  type="button"
                  onClick={evaluate}
                  disabled={loading}
                  className="btn-silver-primary mt-4 w-full disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.evaluating}
                    </>
                  ) : (
                    t.evaluate
                  )}
                </button>
              </>
            )}
          </div>

          {/* feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-surface-200/70 bg-white p-6 dark:border-white/[0.06] dark:bg-surface-900"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-display text-xl font-bold ${scoreBg(
                      feedback.score,
                    )} ${scoreColor(feedback.score)}`}
                  >
                    {feedback.score}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                      {t.score}
                    </p>
                    <p className="text-sm text-surface-600 dark:text-surface-300">/ 100</p>
                  </div>
                </div>

                {feedback.strengths.length > 0 && (
                  <div className="mt-5">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-surface-800 dark:text-white">
                      <CheckCircle2 className="h-4 w-4 text-[#2f7a56]" /> {t.strengths}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {feedback.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm text-surface-600 dark:text-surface-300">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7cc7a2]" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.improvements.length > 0 && (
                  <div className="mt-4">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-surface-800 dark:text-white">
                      <AlertCircle className="h-4 w-4 text-[#9a5b28]" /> {t.improvements}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {feedback.improvements.map((s, i) => (
                        <li key={i} className="flex gap-2 text-sm text-surface-600 dark:text-surface-300">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e2b184]" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.model_answer && (
                  <div className="mt-4 rounded-2xl bg-[#f6f6f4] p-4 dark:bg-white/[0.04]">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-surface-800 dark:text-white">
                      <Lightbulb className="h-4 w-4 text-[#8ab4ff]" /> {t.model}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-surface-600 dark:text-surface-300">
                      {feedback.model_answer}
                    </p>
                  </div>
                )}

                <button type="button" onClick={next} className="btn-silver-primary group mt-6 w-full">
                  {idx + 1 >= questions.length ? t.finish : t.next}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* SUMMARY */}
      {phase === "summary" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-surface-200/70 bg-white p-8 text-center dark:border-white/[0.06] dark:bg-surface-900"
        >
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#e3ddff] text-[#5b4a9e]">
            <Trophy className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-bold text-surface-900 dark:text-white">
            {t.summaryTitle}
          </h2>
          <p className="mt-1 text-sm text-surface-500">{role}</p>

          <div className="mt-6 inline-flex flex-col items-center">
            <span className={`font-display text-5xl font-bold ${scoreColor(avg)}`}>{avg}</span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-surface-400">
              {t.avgScore} / 100
            </span>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={reset} className="btn-silver-primary group">
              <RotateCcw className="h-4 w-4" />
              {t.again}
            </button>
            <Link href="/student" className="btn-silver-ghost !bg-[#f6f6f4]">
              <ArrowLeft className="h-4 w-4" />
              {t.backToDash}
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
