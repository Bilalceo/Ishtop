"use client";

/**
 * AI Interview Coach — Gemini-powered mock interview for students.
 * Flow: setup (role + level) -> Q&A loop (question, answer, AI feedback)
 * -> summary (average score). Silver design, UZ/RU. Text-based MVP.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  FileText,
  Briefcase,
} from "lucide-react";
import { aiApi, jobApi, resumeApi } from "@/lib/api";
import { InterviewSetup } from "@/components/interview/InterviewSetup";
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

const LEVELS = ["intern", "junior", "mid", "senior", "lead"] as const;

/** How the setup screen is aimed. Derived on load, switchable by the user. */
type Mode = "job" | "resume" | "manual";

/** Fallback role chips if the catalogue can't be read (see `topRoles`). */
const FALLBACK_ROLES = [
  "Sotuv menejeri",
  "Call-markaz operatori",
  "Sotuvchi",
  "Administrator",
  "Buxgalter",
  "Dasturchi",
];

export default function InterviewCoachPage() {
  // useSearchParams() requires a Suspense boundary in the Next.js app router;
  // without it the route 404s when opened with no query string.
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl py-10 text-center text-sm text-surface-400">…</div>}>
      <InterviewCoach />
    </Suspense>
  );
}

function InterviewCoach() {
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
            levels: { intern: "Стажёр", junior: "Junior", mid: "Middle", senior: "Senior", lead: "Lead" },
            aim: "К чему готовитесь?",
            modeJob: "Эта вакансия",
            modeResume: "Моё резюме",
            modeManual: "Другая профессия",
            modeManualHint: "Выберите профессию или напишите свою",
            modeJobWithResume: "Резюме сравним с требованиями вакансии",
            modeJobOnly: "Вопросы по требованиям этой вакансии",
            modeResumeHint: "Вопросы по вашему опыту и навыкам",
            otherResume: "Другое резюме",
            levelShort: "Уровень",
            change: "изменить",
            meta: "5 вопросов · ~10 минут · можно остановиться в любой момент",
            roleOther: "Другое…",
            resumeNudge: "Создайте резюме — и вопросы подстроятся под ваш опыт",
            applyToJob: "Откликнуться на эту вакансию",
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
            resumeLabel: "На основе резюме",
            resumeNone: "Без резюме (по роли)",
            resumeBadge: "✨ Вопросы персонализированы по вашему резюме",
            noResumeTitle: "У вас пока нет резюме",
            noResumeText: "Создайте резюме — и AI подготовит вопросы по вашему опыту, навыкам и проектам.",
            noResumeCta: "Создать резюме",
            roleOptional: "Не обязательно, если выбрано резюме",
            jobLabel: "Вакансия",
            jobBadge: "🎯 Вопросы по требованиям этой вакансии",
            jobResumeBadge: "✨ По вашему резюме + требованиям вакансии",
            jobClear: "Убрать вакансию",
          }
        : {
            title: "AI Suhbat murabbiyi",
            subtitle:
              "Haqiqiy suhbatdan oldin mashq qiling. AI kasbingiz bo'yicha savol beradi va javobingizni baholaydi.",
            roleLabel: "Lavozim / rol",
            rolePh: "Masalan: Junior Frontend Developer",
            levelLabel: "Daraja",
            levels: { intern: "Amaliyotchi", junior: "Junior", mid: "Middle", senior: "Senior", lead: "Lead" },
            aim: "Nimaga tayyorlanasiz?",
            modeJob: "Shu vakansiya",
            modeResume: "Rezyumem",
            modeManual: "Boshqa kasb",
            modeManualHint: "Kasbni tanlang yoki o'zingiz yozing",
            modeJobWithResume: "Rezyumengiz vakansiya talablariga solishtiriladi",
            modeJobOnly: "Savollar shu vakansiya talablari bo'yicha",
            modeResumeHint: "Savollar tajribangiz va ko'nikmalaringiz bo'yicha",
            otherResume: "Boshqa rezyume",
            levelShort: "Daraja",
            change: "o'zgartirish",
            meta: "5 savol · ~10 daqiqa · istalgan payt to'xtatasiz",
            roleOther: "Boshqa…",
            resumeNudge: "Rezyume yaratsangiz — savollar tajribangizga moslashadi",
            applyToJob: "Shu vakansiyaga ariza berish",
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
            resumeLabel: "Rezyume asosida",
            resumeNone: "Rezyumesiz (rol bo'yicha)",
            resumeBadge: "✨ Savollar rezyumengiz asosida shaxsiylashtirildi",
            noResumeTitle: "Hozircha rezyumengiz yo'q",
            noResumeText: "Rezyume yarating — AI sizning tajribangiz, ko'nikmalaringiz va loyihalaringiz bo'yicha savol tayyorlaydi.",
            noResumeCta: "Rezyume yaratish",
            roleOptional: "Rezyume tanlansa, shart emas",
            jobLabel: "Vakansiya",
            jobBadge: "🎯 Savollar shu vakansiya talablari bo'yicha",
            jobResumeBadge: "✨ Rezyumengiz + vakansiya talablari bo'yicha",
            jobClear: "Vakansiyani olib tashlash",
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

  // Resume-based personalization.
  type ResumeItem = { id: string; title?: string };
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [resumeId, setResumeId] = useState<string>("");
  const [resolvedRole, setResolvedRole] = useState<string>("");

  // Job-based targeting (?job=<id>): questions test this vacancy's requirements.
  type JobItem = { id: string; title: string; company?: string; experience_level?: string };
  const [job, setJob] = useState<JobItem | null>(null);
  // Once the user picks a level themselves, a late job fetch must not override it.
  const levelTouched = useRef(false);

  // What the session is aimed at. Everything else on this screen follows from
  // it, so the student makes one decision instead of filling four fields.
  const [mode, setMode] = useState<Mode>("manual");
  // The mode is chosen for them on arrival — but only until they touch it, or a
  // late resume/job fetch would silently move the selection under their finger.
  const modeTouched = useRef(false);
  const [levelOpen, setLevelOpen] = useState(false);

  // Role suggestions come from the live catalogue rather than a guessed list:
  // typing a job title on a phone is the worst input we could ask for, and we
  // already know which roles this market actually posts.
  const [topRoles, setTopRoles] = useState<string[]>(FALLBACK_ROLES);
  const [roleOther, setRoleOther] = useState(false);

  // Load the user's resumes once; default the selection to the ?resume= deep
  // link if valid, otherwise the most recently updated resume.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await resumeApi.list({ page: 1, limit: 100 });
        const payload = (resp as any)?.data?.data || (resp as any)?.data;
        const list: ResumeItem[] = Array.isArray(payload?.resumes)
          ? payload.resumes
          : Array.isArray(payload)
            ? payload
            : [];
        if (cancelled) return;
        setResumes(list);
        const wanted = params.get("resume");
        if (wanted && list.some((r) => r.id === wanted)) {
          setResumeId(wanted);
        } else if (list.length > 0) {
          setResumeId(list[0].id);
        }
      } catch {
        /* resumes are optional — silently fall back to manual mode */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Job-based targeting: ?job=<id> (from a vacancy's "prepare for interview"
  // link). Loading it lets the AI test that vacancy's actual requirements.
  useEffect(() => {
    const wanted = params.get("job");
    if (!wanted) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await jobApi.get(wanted);
        const j = (resp as any)?.data?.data || (resp as any)?.data;
        if (cancelled || !j?.id) return;
        setJob({
          id: j.id,
          // JobResponse nests CompanyInfo with a `name` field.
          title: j.title || "",
          company: j.company?.name || "",
          experience_level: j.experience_level || "",
        });
        // The vacancy title is the interview role unless the user typed one.
        setRole((cur) => cur || j.title || "");
        // Don't clobber a level the user already picked while this was loading.
        if (!levelTouched.current) {
          const lvl = String(j.experience_level || "").toLowerCase();
          const mapped =
            lvl === "executive" ? "lead" : lvl === "middle" ? "mid" : lvl;
          if ((LEVELS as readonly string[]).includes(mapped)) {
            setLevel(mapped as (typeof LEVELS)[number]);
          }
        }
      } catch {
        /* job is optional — silently fall back to role/resume mode */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Most-posted titles, counted client-side off one page of the feed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await jobApi.list({ page: 1, limit: 100 });
        const payload = (resp as any)?.data?.data || (resp as any)?.data;
        const list: { title?: string }[] = payload?.jobs || [];
        const counts = new Map<string, number>();
        for (const j of list) {
          // Titles carry the employer in a trailing bracket; the role is what
          // is left, and that is what a student recognises.
          const role = (j.title || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
          if (role.length >= 4 && role.length <= 34) {
            counts.set(role, (counts.get(role) || 0) + 1);
          }
        }
        const top = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([r]) => r);
        if (!cancelled && top.length >= 3) setTopRoles(top);
      } catch {
        /* the fallback list is already in state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Aim at the most specific thing available, until the student says otherwise.
  useEffect(() => {
    if (modeTouched.current) return;
    if (job) setMode("job");
    else if (resumes.length > 0) setMode("resume");
    else setMode("manual");
  }, [job, resumes.length]);

  const pickMode = (m: Mode) => {
    modeTouched.current = true;
    setMode(m);
  };

  const typeLabel = (tp: string) =>
    tp === "behavioral" ? t.behavioral : tp === "technical" ? t.technical : tp === "situational" ? t.situational : "";

  // What the chosen mode actually sends. "job" keeps the resume too — that is
  // the gap-analysis mode the card promises, and the strongest one we have.
  const payloadFor = (m: Mode) => ({
    job_id: m === "job" ? job?.id : undefined,
    resume_id: m === "job" || m === "resume" ? resumeId || undefined : undefined,
    role: m === "manual" ? role.trim() || undefined : role.trim() || undefined,
  });

  const start = async () => {
    const aim = payloadFor(mode);
    // Only manual mode needs a typed role; the other two derive it server-side
    // (the vacancy title wins over the resume's).
    if (!aim.job_id && !aim.resume_id && !aim.role) {
      toast.error(t.needRole);
      return;
    }
    setLoading(true);
    try {
      const res = await aiApi.interviewQuestions({
        ...aim,
        level,
        locale: ru ? "ru" : "uz",
        count: 5,
      });
      const qs = (res.data?.data?.questions || []) as Question[];
      if (!qs.length) throw new Error("empty");
      // Remember the role the backend actually used (possibly derived from the
      // resume) so answer evaluation stays consistent.
      setResolvedRole((res.data?.data?.role as string) || role.trim());
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
      const aim = payloadFor(mode);
      const res = await aiApi.interviewEvaluate({
        // Empty is fine — the backend tolerates it (resume-only sessions) and
        // fills a neutral role. Never send a sub-2-char placeholder.
        role: resolvedRole || role.trim() || "",
        question: questions[idx].q,
        answer: answer.trim(),
        locale: ru ? "ru" : "uz",
        // Evaluation must judge against the same thing the questions came from.
        resume_id: aim.resume_id,
        job_id: aim.job_id,
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

      {phase === "setup" && (
        <InterviewSetup
          t={t}
          mode={mode}
          pickMode={pickMode}
          job={job}
          resumes={resumes}
          resumeId={resumeId}
          setResumeId={setResumeId}
          topRoles={topRoles}
          role={role}
          setRole={setRole}
          roleOther={roleOther}
          setRoleOther={setRoleOther}
          level={level}
          setLevel={(lv) => {
            levelTouched.current = true;
            setLevel(lv);
          }}
          levelOpen={levelOpen}
          setLevelOpen={setLevelOpen}
          loading={loading}
          onStart={start}
        />
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
          <p className="mt-1 text-sm text-surface-500">
            {mode === "job" && job ? job.title : resolvedRole || role}
          </p>

          <div className="mt-6 inline-flex flex-col items-center">
            <span className={`font-display text-5xl font-bold ${scoreColor(avg)}`}>{avg}</span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-surface-400">
              {t.avgScore} / 100
            </span>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {/* Practising was never the goal — applying is. When the session was
                aimed at a real vacancy, close the loop back to its contact
                panel instead of dropping the student on the dashboard. */}
            {mode === "job" && job ? (
              <Link
                href={`/student/jobs/${job.id}`}
                className="btn-silver-primary group"
              >
                <Briefcase className="h-4 w-4" />
                {t.applyToJob}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <button type="button" onClick={reset} className="btn-silver-primary group">
                <RotateCcw className="h-4 w-4" />
                {t.again}
              </button>
            )}
            {mode === "job" && job && (
              <button type="button" onClick={reset} className="btn-silver-ghost !bg-[#f6f6f4]">
                <RotateCcw className="h-4 w-4" />
                {t.again}
              </button>
            )}
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
