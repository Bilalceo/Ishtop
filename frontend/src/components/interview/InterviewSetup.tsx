"use client";

/**
 * The interview coach's setup screen.
 *
 * Its whole job is to ask ONE question — "what are you preparing for?" — and
 * derive the rest. The previous version asked four (resume, role, level, then
 * start) before the student had seen any value, and the page had been used zero
 * times; role and level are both derivable from the aim, so they are shown as
 * facts to correct rather than fields to fill.
 *
 * Lives apart from the page because the page also holds the Q&A loop and the
 * summary, and because this screen is the part worth looking at on its own.
 */

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  FileText,
  Briefcase,
} from "lucide-react";

export const LEVELS = ["intern", "junior", "mid", "senior", "lead"] as const;
export type Level = (typeof LEVELS)[number];
export type Mode = "job" | "resume" | "manual";

export type SetupJob = { id: string; title: string; company?: string };
export type SetupResume = { id: string; title?: string };

/**
 * One choice of what the session is aimed at. Big enough to tap on a phone, and
 * it states the consequence ("your resume will be compared against this
 * vacancy") rather than leaving the student to infer it.
 */
function ModeCard({
  active,
  onClick,
  icon,
  title,
  sub,
  note,
  highlight = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub?: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
        active
          ? "border-brand-400 bg-brand-50/70 ring-1 ring-brand-300 dark:border-brand-500/40 dark:bg-brand-500/10 dark:ring-brand-500/30"
          : "border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:hover:border-surface-600"
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          active
            ? "bg-brand-500 text-white"
            : "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-surface-900 dark:text-white">
          {title}
        </span>
        {sub && (
          <span className="block truncate text-xs text-surface-500">{sub}</span>
        )}
        {note && (
          <span
            className={`mt-1 block text-xs ${
              highlight
                ? "font-medium text-brand-600 dark:text-brand-300"
                : "text-surface-500 dark:text-surface-400"
            }`}
          >
            {highlight ? "✦ " : ""}
            {note}
          </span>
        )}
      </span>
      {active && (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" />
      )}
    </button>
  );
}

export function InterviewSetup({
  t,
  mode,
  pickMode,
  job,
  resumes,
  resumeId,
  setResumeId,
  topRoles,
  role,
  setRole,
  roleOther,
  setRoleOther,
  level,
  setLevel,
  levelOpen,
  setLevelOpen,
  loading,
  onStart,
}: {
  /** The page's translation bundle; typed loosely so copy can grow freely. */
  t: Record<string, any>;
  mode: Mode;
  pickMode: (m: Mode) => void;
  job: SetupJob | null;
  resumes: SetupResume[];
  resumeId: string;
  setResumeId: (id: string) => void;
  topRoles: string[];
  role: string;
  setRole: (r: string) => void;
  roleOther: boolean;
  setRoleOther: (v: boolean) => void;
  level: Level;
  setLevel: (lv: Level) => void;
  levelOpen: boolean;
  setLevelOpen: (v: boolean) => void;
  loading: boolean;
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-surface-200/70 bg-white p-6 dark:border-white/[0.06] dark:bg-surface-900 sm:p-8"
    >
      <p className="text-sm font-semibold text-surface-800 dark:text-white">
        {t.aim}
      </p>

      <div className="mt-3 space-y-2.5">
        {/* The vacancy they came from — the most specific aim we can offer,
            and the only one that can compare a resume against requirements. */}
        {job && (
          <ModeCard
            active={mode === "job"}
            onClick={() => pickMode("job")}
            icon={<Briefcase className="h-5 w-5" />}
            title={job.title}
            sub={job.company}
            note={resumeId ? t.modeJobWithResume : t.modeJobOnly}
            highlight={Boolean(resumeId)}
          />
        )}

        {resumes.length > 0 && (
          <ModeCard
            active={mode === "resume"}
            onClick={() => pickMode("resume")}
            icon={<FileText className="h-5 w-5" />}
            title={t.modeResume}
            sub={resumes.find((r) => r.id === resumeId)?.title?.trim() || undefined}
            note={t.modeResumeHint}
          />
        )}

        <ModeCard
          active={mode === "manual"}
          onClick={() => pickMode("manual")}
          icon={<Sparkles className="h-5 w-5" />}
          title={t.modeManual}
          note={mode === "manual" ? undefined : t.modeManualHint}
        />
      </div>

      {/* Switch resumes only when there is something to switch between. */}
      {mode === "resume" && resumes.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-surface-500">{t.resumeLabel}:</span>
          {resumes.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setResumeId(r.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                r.id === resumeId
                  ? "bg-brand-500 text-white"
                  : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300"
              }`}
            >
              {r.title?.trim() || `${t.resumeLabel} ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Manual mode: offer the roles this market actually posts. Typing a
          job title on a phone is the worst input we could ask for. */}
      {mode === "manual" && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {topRoles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  setRoleOther(false);
                }}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  role === r && !roleOther
                    ? "bg-brand-500 text-white"
                    : "bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300"
                }`}
              >
                {r}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setRoleOther(true);
                setRole("");
              }}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                roleOther
                  ? "bg-brand-500 text-white"
                  : "bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300"
              }`}
            >
              {t.roleOther}
            </button>
          </div>

          {roleOther && (
            <input
              autoFocus
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={t.rolePh}
              className="mt-3 w-full rounded-xl border border-surface-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800"
            />
          )}

          {resumes.length === 0 && (
            <Link
              href="/student/resumes/create-ai"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-500"
            >
              <FileText className="h-3.5 w-3.5" />
              {t.resumeNudge}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Level is derived and almost always right, so it reads as a fact
          the student can correct rather than a question they must answer. */}
      <div className="mt-5">
        {levelOpen ? (
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => {
                  setLevel(lv);
                  setLevelOpen(false);
                }}
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
        ) : (
          <button
            type="button"
            onClick={() => setLevelOpen(true)}
            className="text-sm text-surface-500 hover:text-surface-800 dark:hover:text-surface-200"
          >
            {t.levelShort}:{" "}
            <span className="font-semibold text-surface-800 dark:text-white">
              {t.levels[level]}
            </span>
            <span className="ml-1.5 text-xs underline underline-offset-2">
              {t.change}
            </span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={loading || (mode === "manual" && !role.trim())}
        className="btn-silver-primary group mt-6 w-full disabled:opacity-60"
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

      {/* Say what is about to happen. Not knowing how long something takes
          is one of the commonest reasons for not starting it. */}
      <p className="mt-3 text-center text-xs text-surface-400">{t.meta}</p>
    </motion.div>
  );
}
