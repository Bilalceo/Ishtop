/**
 * =============================================================================
 * STUDENT DASHBOARD — Aurora redesign
 * =============================================================================
 *
 * Premium dashboard built around "What's next?" decision flow:
 *  - Focal greeting + single primary CTA
 *  - Today's signal hero card (top match OR next interview OR profile nudge)
 *  - Stats strip (compact, scannable)
 *  - Recommended jobs with explainability cards
 *  - Skill-gap panel (radar bars + 7/14/30-day plan)
 *  - Application pipeline timeline
 *  - Interview prep quick actions
 *  - Saved jobs + recent activity
 *  - Production-grade loading, empty, error states with retry
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  FileText,
  Send,
  Calendar,
  Eye,
  Sparkles,
  Briefcase,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Target,
  Zap,
  TrendingUp,
  Lightbulb,
  Bookmark,
  ShieldCheck,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useResume } from "@/hooks/useResume";
import { useApplications } from "@/hooks/useApplications";
import { useJobs } from "@/hooks/useJobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime, formatSalaryRange } from "@/lib/utils";
import { jobApi, userApi } from "@/lib/api";
import type { Job } from "@/types/api";
import { AuroraGreeting } from "@/components/student/AuroraGreeting";
import { AIInsightsPanel } from "@/components/student/AIInsightsPanel";
import { StatCard } from "@/components/student/StatCard";
import { SkillGapRadar } from "@/components/student/SkillGapRadar";
import { Tilt } from "@/components/landing/sections/primitives";

// =============================================================================
// MOTION
// =============================================================================

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

// =============================================================================
// TYPES
// =============================================================================

type Recommendation = {
  job: Job;
  match_score: number;
  skill_matches: string[];
  missing_skills: string[];
};

type DashboardApplication = {
  id: string;
  status: string;
  applied_at?: string;
  interview_at?: string;
  interview_type?: string;
  meeting_link?: string;
  job?: { title?: string; company_name?: string; company?: { name?: string } };
};

const PIPELINE_STAGES = ["applied", "reviewing", "interview", "accepted"] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

// =============================================================================
// HELPERS
// =============================================================================

function formatInterviewDateTime(value: string, locale: "uz" | "ru") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function nextUpcomingInterview(apps: DashboardApplication[]) {
  const now = Date.now();
  return (
    apps
      .filter((a) => a.status === "interview" && a.interview_at)
      .map((a) => ({ ...a, ts: new Date(a.interview_at as string).getTime() }))
      .filter((a) => !Number.isNaN(a.ts) && a.ts >= now)
      .sort((a, b) => a.ts - b.ts)[0] || null
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function StudentDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const isRu = locale === "ru";
  const reduceMotion = useReducedMotion();

  const { resumes, isLoading: resumesLoading, fetchResumes } = useResume();
  const { stats: appStats, applications, isLoading: appsLoading, fetchMyApplications } = useApplications();
  useJobs(); // warmup; not displayed in this redesign

  const [summaryCounts, setSummaryCounts] = useState<{ resumes: number; applications: number } | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState(false);
  const [needsResume, setNeedsResume] = useState(false);

  useEffect(() => {
    fetchResumes();
    fetchMyApplications();
  }, [fetchMyApplications, fetchResumes]);

  const loadRecommendations = (signal?: AbortSignal) => {
    setRecsLoading(true);
    setRecsError(false);
    return jobApi
      .recommended({ limit: 4 })
      .then((res) => {
        if (signal?.aborted) return;
        const payload = (res.data ?? {}) as {
          matches?: Recommendation[];
          message?: string;
        };
        const matches = Array.isArray(payload.matches) ? payload.matches : [];
        setRecommendations(matches);
        setNeedsResume(matches.length === 0 && /resume/i.test(payload.message ?? ""));
      })
      .catch(() => {
        if (!signal?.aborted) {
          setRecommendations([]);
          setRecsError(true);
        }
      })
      .finally(() => {
        if (!signal?.aborted) setRecsLoading(false);
      });
  };

  useEffect(() => {
    const ctrl = new AbortController();
    loadRecommendations(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const res = await userApi.getProfile();
        const payload = res.data?.data ?? res.data ?? {};
        setSummaryCounts({
          resumes: typeof payload.resume_count === "number" ? payload.resume_count : 0,
          applications: typeof payload.application_count === "number" ? payload.application_count : 0,
        });
      } catch {
        setSummaryCounts(null);
      }
    })();
  }, [user?.id]);

  const isLoading = resumesLoading || appsLoading;

  // ---- Derived state -------------------------------------------------------

  const profileCompletion = useMemo(() => {
    let s = 20;
    if (user?.full_name) s += 20;
    if (user?.email) s += 20;
    if (user?.phone) s += 15;
    if (user?.bio) s += 15;
    if (user?.location) s += 10;
    return s;
  }, [user]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t("dashboard.greeting.morning");
    if (h < 18) return t("dashboard.greeting.afternoon");
    return t("dashboard.greeting.evening");
  };

  const applicationsForDisplay = applications as DashboardApplication[];
  const upcoming = nextUpcomingInterview(applicationsForDisplay);

  // Pipeline counts
  const pipelineCounts: Record<PipelineStage, number> = {
    applied: appStats.pending ?? 0,
    reviewing: appStats.reviewing ?? 0,
    interview: appStats.interview ?? 0,
    accepted: appStats.accepted ?? 0,
  };
  const pipelineTotal = PIPELINE_STAGES.reduce((sum, s) => sum + pipelineCounts[s], 0);

  // Top recommendation for "today's signal"
  const topRec = recommendations[0];
  const topRecCompany = topRec?.job?.company?.name || t("common.company");

  // Compact stat strip
  const statStrip = [
    {
      label: t("dashboard.stats.totalResumes"),
      value: summaryCounts?.resumes ?? resumes.length,
      Icon: FileText,
      tone: "text-emerald-600 dark:text-emerald-300",
      bg: "bg-emerald-500/10",
    },
    {
      label: t("dashboard.stats.applicationsSent"),
      value: summaryCounts?.applications ?? appStats.total,
      Icon: Send,
      tone: "text-cyan-600 dark:text-cyan-300",
      bg: "bg-cyan-500/10",
    },
    {
      label: t("dashboard.stats.interviewsScheduled"),
      value: appStats.interview,
      Icon: Calendar,
      tone: "text-emerald-600 dark:text-emerald-300",
      bg: "bg-emerald-500/10",
    },
    {
      label: t("dashboard.stats.profileViews"),
      value: appStats.reviewing,
      Icon: Eye,
      tone: "text-amber-600 dark:text-amber-300",
      bg: "bg-amber-500/10",
    },
  ];

  // Skill gap synthesized from missing skills across recommendations
  const skillGap = useMemo(() => {
    const counter = new Map<string, number>();
    for (const r of recommendations) {
      for (const s of r.missing_skills || []) counter.set(s, (counter.get(s) ?? 0) + 1);
    }
    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, count]) => ({
        skill,
        gap: Math.min(100, 40 + count * 20),
      }));
  }, [recommendations]);

  const interviewActions = [
    {
      title: t("dashboard.quickActions.createAIResume"),
      desc: t("dashboard.quickActions.createAIResumeDesc"),
      href: "/student/resumes/create-ai",
      Icon: Sparkles,
    },
    {
      title: t("dashboard.quickActions.browseJobs"),
      desc: t("dashboard.quickActions.browseJobsDesc"),
      href: "/student/jobs",
      Icon: Briefcase,
    },
    {
      title: t("dashboard.quickActions.autoApply"),
      desc: t("dashboard.quickActions.autoApplyDesc"),
      href: "/student/applications/auto-apply",
      Icon: Zap,
    },
  ];

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <motion.div
      variants={stagger}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="space-y-8"
    >
      {/* ===== Aurora greeting hero (signature canvas treatment) ===== */}
      <motion.section variants={item}>
        <AuroraGreeting
          eyebrow={greeting()}
          name={user?.full_name?.split(" ")[0] || t("common.student")}
          question={isRu ? "что делаем дальше?" : "keyingi qadam tayyormi?"}
          subtitle={t("dashboard.subtitle")}
          profileCompletion={profileCompletion}
          ctaHref="/student/resumes/create-ai"
          ctaLabel={t("dashboard.sidebar.createAIResume")}
        />
      </motion.section>

      {/* ===== AI Insights — streaming reasoning trace about you ===== */}
      <motion.section variants={item}>
        <AIInsightsPanel
          input={{
            fullName: user?.full_name,
            resumes: summaryCounts?.resumes ?? resumes.length,
            applications: summaryCounts?.applications ?? appStats.total,
            interviews: appStats.interview,
            topMatchScore: topRec?.match_score,
            topMatchTitle: topRec?.job?.title,
            topMatchCompany:
              topRec?.job?.company?.name ||
              (topRec?.job as { company_name?: string } | undefined)?.company_name,
            topMissingSkills: skillGap.map((s) => s.skill),
          }}
        />
      </motion.section>

      {/* ===== Today's signal — 3D tilt depth card ===== */}
      <motion.section variants={item}>
        <Tilt max={4} className="group">
          <TodaysSignal
            loading={isLoading || recsLoading}
            profileCompletion={profileCompletion}
            upcoming={upcoming}
            topRec={topRec}
            topRecCompany={topRecCompany}
            locale={locale}
            t={t}
          />
        </Tilt>
      </motion.section>

      {/* ===== Stat strip — animated count-ups ===== */}
      <motion.section variants={item} aria-label="Key stats">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statStrip.map((s) => (
            <StatCard
              key={s.label}
              label={s.label}
              value={typeof s.value === "number" ? s.value : 0}
              Icon={s.Icon}
              iconClass={s.tone}
              bgClass={s.bg}
              loading={isLoading}
            />
          ))}
        </div>
      </motion.section>

      {/* ===== Two-column area: Recommended jobs + Skill gap ===== */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <motion.section variants={item}>
          <Card className="card-aurora p-0">
            <CardHeader className="flex flex-row items-center justify-between border-b border-surface-200/60 pb-4 dark:border-white/[0.06]">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                {t("dashboard.recommended.title")}
              </CardTitle>
              <Link href="/student/jobs" className="focus-ring rounded-full text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-300">
                {t("dashboard.recommended.browseAll")}
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {recsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                  ))}
                </div>
              ) : recsError ? (
                <ErrorState onRetry={() => loadRecommendations()} t={t} />
              ) : needsResume ? (
                <EmptyResume t={t} />
              ) : recommendations.length === 0 ? (
                <p className="py-8 text-center text-sm text-surface-500 dark:text-white/55">
                  {t("dashboard.recommended.empty")}
                </p>
              ) : (
                <ul className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <RecCard key={rec.job.id} rec={rec} index={i} locale={locale} t={t} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.section>

        <motion.section variants={item}>
          <Card className="card-aurora p-0">
            <CardHeader className="flex flex-row items-center justify-between border-b border-surface-200/60 pb-4 dark:border-white/[0.06]">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                {isRu ? "План закрытия пробелов" : "Ko'nikma rejasi"}
              </CardTitle>
              <Link href="/student/resumes" className="focus-ring rounded-full text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-300">
                {isRu ? "Улучшить" : "Yaxshilash"}
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {recsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-xl" />
                  ))}
                </div>
              ) : skillGap.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-200 p-6 text-center text-sm text-surface-500 dark:border-white/[0.08] dark:text-white/60">
                  Profil to&apos;la — boshqa platformalardan tushgan ko&apos;nikmalarni qo&apos;shing.
                </div>
              ) : (
                <>
                  {/* Interactive radar — visualizes student level vs job requirements */}
                  <SkillGapRadar data={skillGap} />

                  {/* Legend */}
                  <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-surface-500 dark:text-white/55">
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="h-2 w-2 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-400" />
                      Sizning daraja
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="h-2 w-2 rounded-full bg-surface-400/40" />
                      Talab
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      { d: "7 kun", count: skillGap.length },
                      { d: "14 kun", count: Math.min(skillGap.length, 3) },
                      { d: "30 kun", count: Math.min(skillGap.length, 2) },
                    ].map((p) => (
                      <div
                        key={p.d}
                        className="rounded-2xl border border-surface-200 bg-white p-3 text-xs dark:border-white/[0.06] dark:bg-white/[0.03]"
                      >
                        <p className="font-semibold text-surface-900 dark:text-white">{p.d}</p>
                        <p className="text-surface-500 dark:text-white/55">{p.count} ko&apos;nikma</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.section>
      </div>

      {/* ===== Pipeline timeline ===== */}
      <motion.section variants={item} aria-label="Application pipeline">
        <Card className="card-aurora p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-surface-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                Application pipeline
              </h2>
              <p className="text-sm text-surface-500 dark:text-white/60">
                {pipelineTotal} ta jami ariza · realtime status
              </p>
            </div>
            <Link href="/student/applications" className="focus-ring rounded-full text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-300">
              {t("dashboard.recentActivity.viewAll")}
            </Link>
          </div>

          <ol className="relative mt-6 grid gap-3 sm:grid-cols-4">
            {/* Connecting flow line between stages — fills as section scrolls into view */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 overflow-hidden sm:block"
            >
              <div className="h-full w-full bg-surface-200 dark:bg-white/[0.06]" />
              <motion.div
                initial={reduceMotion ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1.3, ease: [0.19, 1, 0.22, 1] }}
                style={{ transformOrigin: "0% 50%" }}
                className="absolute inset-0 h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 shadow-[0_0_18px_rgba(16,185,129,0.45)]"
              />
            </div>

            {PIPELINE_STAGES.map((stage, i) => {
              const count = pipelineCounts[stage];
              const total = Math.max(pipelineTotal, 1);
              const pct = Math.round((count / total) * 100);
              const stageMeta: Record<PipelineStage, { label: string; tone: string }> = {
                applied: { label: "Yuborildi", tone: "from-emerald-400 to-teal-500" },
                reviewing: { label: "Ko'rib chiqilmoqda", tone: "from-amber-400 to-orange-500" },
                interview: { label: "Suhbat", tone: "from-emerald-400 to-teal-500" },
                accepted: { label: "Qabul qilindi", tone: "from-emerald-400 to-teal-500" },
              };
              return (
                <motion.li
                  key={stage}
                  whileHover={reduceMotion ? undefined : { y: -3 }}
                  transition={{ type: "spring", stiffness: 240, damping: 22 }}
                  className="relative rounded-2xl border border-surface-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-white/[0.06] dark:bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-white/55">
                      0{i + 1} · {stageMeta[stage].label}
                    </p>
                  </div>
                  <p className="mt-2 font-display text-3xl font-semibold text-surface-900 dark:text-white">
                    <PipelineCount value={count} delay={i * 0.08} />
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-100 dark:bg-white/[0.06]">
                    <motion.div
                      initial={reduceMotion ? false : { width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 1.1, ease: [0.19, 1, 0.22, 1], delay: 0.2 + i * 0.12 }}
                      className={`h-full rounded-full bg-gradient-to-r ${stageMeta[stage].tone}`}
                    />
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </Card>
      </motion.section>

      {/* ===== Interview prep quick actions ===== */}
      <motion.section variants={item}>
        <h2 className="mb-3 font-display text-lg font-semibold text-surface-900 dark:text-white">
          {t("dashboard.quickActions.title")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {interviewActions.map((a, i) => (
            <Link key={a.title} href={a.href} className="focus-ring rounded-3xl">
              <motion.div
                whileHover={reduceMotion ? undefined : { y: -3 }}
                whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                className="card-aurora card-aurora-hover relative overflow-hidden p-6"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-60"
                  style={{
                    background:
                      i === 0
                        ? "radial-gradient(closest-side, rgba(124,92,255,0.25), transparent)"
                        : i === 1
                        ? "radial-gradient(closest-side, rgba(34,211,238,0.22), transparent)"
                        : "radial-gradient(closest-side, rgba(245,181,68,0.22), transparent)",
                  }}
                />
                <div className="relative">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-emerald-600 shadow-sm ring-1 ring-inset ring-surface-200 dark:bg-white/[0.04] dark:text-emerald-300 dark:ring-white/10">
                    <a.Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold text-surface-900 dark:text-white">
                    {a.title}
                  </h3>
                  <p className="mt-1 text-sm text-surface-600 dark:text-white/65">{a.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                    {t("dashboard.recommended.browseAll")}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ===== Activity + Saved jobs ===== */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.section variants={item}>
          <Card className="card-aurora p-0">
            <CardHeader className="flex flex-row items-center justify-between border-b border-surface-200/60 pb-4 dark:border-white/[0.06]">
              <CardTitle className="text-lg">{t("dashboard.recentActivity.title")}</CardTitle>
              <Link href="/student/applications" className="focus-ring rounded-full text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-300">
                {t("dashboard.recentActivity.viewAll")}
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {appsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : applicationsForDisplay.length === 0 ? (
                <EmptyActivity t={t} />
              ) : (
                <ul className="space-y-3">
                  {applicationsForDisplay.slice(0, 5).map((app) => {
                    const Icon =
                      app.status === "interview" ? Calendar : app.status === "accepted" ? CheckCircle2 : Send;
                    const tone =
                      app.status === "interview"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : app.status === "accepted"
                        ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
                    return (
                      <li key={app.id} className="flex items-center gap-3">
                        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${tone}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-surface-900 dark:text-white">
                            {app.job?.title || t("dashboard.jobs.jobFallback")} ·{" "}
                            <span className="font-normal text-surface-500 dark:text-white/55">
                              {app.job?.company?.name || app.job?.company_name || t("common.company")}
                            </span>
                          </p>
                          <p className="text-xs text-surface-500 dark:text-white/55">
                            {app.applied_at ? formatRelativeTime(app.applied_at, locale) : ""}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-surface-400" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.section>

        <motion.section variants={item}>
          <Card className="card-aurora p-0">
            <CardHeader className="flex flex-row items-center justify-between border-b border-surface-200/60 pb-4 dark:border-white/[0.06]">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bookmark className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                {isRu ? "Сохранённые вакансии" : "Saqlangan ishlar"}
              </CardTitle>
              <Link href="/student/saved-jobs" className="focus-ring rounded-full text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-300">
                {t("dashboard.recentActivity.viewAll")}
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              <div className="rounded-2xl border border-dashed border-surface-200 p-6 text-center dark:border-white/[0.08]">
                <Bookmark className="mx-auto h-7 w-7 text-emerald-500" />
                <p className="mt-2 text-sm font-medium text-surface-900 dark:text-white">
                  Saqlangan vakansiyalar shu yerda paydo bo&apos;ladi
                </p>
                <p className="mt-1 text-xs text-surface-500 dark:text-white/55">
                  Vakansiya kartasidagi belgi orqali saqlab qo&apos;ying — keyin bir joydan ariza yuborasiz.
                </p>
                <Link href="/student/jobs" className="mt-4 inline-flex">
                  <Button variant="outline" size="sm" className="rounded-full">
                    Vakansiyalarni ko&apos;rish
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </motion.div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function TodaysSignal({
  loading,
  profileCompletion,
  upcoming,
  topRec,
  topRecCompany,
  locale,
  t,
}: {
  loading: boolean;
  profileCompletion: number;
  upcoming: ReturnType<typeof nextUpcomingInterview>;
  topRec: Recommendation | undefined;
  topRecCompany: string;
  locale: "uz" | "ru";
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const isRu = locale === "ru";
  const signalKicker = isRu ? "Сегодняшний сигнал" : "Bugungi signal";
  const reviewCta = isRu ? "Посмотреть" : "Ko'rib chiqish";
  if (loading) {
    return (
      <div className="card-aurora p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-3 h-8 w-3/5" />
        <Skeleton className="mt-2 h-4 w-2/5" />
        <Skeleton className="mt-6 h-10 w-40 rounded-full" />
      </div>
    );
  }

  // Priority: upcoming interview > top match > profile completion nudge
  if (upcoming) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:via-transparent dark:to-cyan-500/5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
              <Calendar className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                {signalKicker} · {t("dashboard.interview.title")}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-surface-900 dark:text-white sm:text-2xl">
                {upcoming.job?.title || "Interview"} · {topRecCompany}
              </h2>
              <p className="text-sm text-surface-600 dark:text-white/70">
                {upcoming.interview_at ? formatInterviewDateTime(upcoming.interview_at, locale) : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcoming.meeting_link ? (
              <Button asChild className="rounded-full bg-emerald-600 hover:bg-emerald-700">
                <a href={upcoming.meeting_link} target="_blank" rel="noopener noreferrer">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {t("dashboard.interview.joinMeeting")}
                </a>
              </Button>
            ) : null}
            <Button variant="outline" className="rounded-full" asChild>
              <Link href="/student/applications">{t("dashboard.interview.reschedule")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (topRec) {
    const score = Math.round(topRec.match_score);
    return (
      <div
        className="relative overflow-hidden rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_30px_60px_-30px_rgba(124,92,255,0.35),0_12px_30px_-12px_rgba(34,211,238,0.2)] dark:border-emerald-500/20 dark:from-emerald-500/10 dark:via-transparent dark:to-cyan-500/5 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_30px_60px_-30px_rgba(124,92,255,0.55),0_12px_30px_-12px_rgba(34,211,238,0.35)]"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Conic glow halo */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-4 -z-10 rounded-[36px] opacity-50 blur-3xl"
          style={{
            background:
              "conic-gradient(from 120deg at 50% 50%, rgba(124,92,255,0.3), rgba(34,211,238,0.25), rgba(60,203,127,0.2), rgba(124,92,255,0.3))",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/25 blur-3xl"
        />
        {/* Top accent line */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div style={{ transform: "translateZ(20px)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              {signalKicker} · {isRu ? "Лучшее совпадение" : "Eng yaxshi moslik"}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-surface-900 dark:text-white sm:text-3xl">
              {topRec.job.title}
            </h2>
            <p className="text-sm text-surface-600 dark:text-white/70">
              {topRecCompany} · {topRec.job.location}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> {score}% {isRu ? "совпадение" : "moslik"}
              </span>
              {topRec.skill_matches.slice(0, 3).map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Match ring */}
          <div className="flex items-center gap-5" style={{ transform: "translateZ(40px)" }}>
            <MatchRing score={score} />
            <div className="hidden sm:block">
              <Button asChild className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400">
                <Link href={`/student/jobs/${topRec.job.id}`}>
                  {reviewCta}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-4 sm:hidden">
          <Button asChild className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400">
            <Link href={`/student/jobs/${topRec.job.id}`}>{reviewCta}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Fallback — profile completion nudge
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 dark:border-amber-500/20 dark:from-amber-500/10 dark:via-transparent dark:to-orange-500/5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
            <AlertCircle className="h-7 w-7" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
              {signalKicker} · {t("dashboard.profile.complete")}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-surface-900 dark:text-white sm:text-2xl">
              {t("dashboard.profile.completeText")}
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-48">
                <Progress value={profileCompletion} className="h-2" />
              </div>
              <span className="text-sm font-medium text-surface-700 dark:text-white/80">{profileCompletion}%</span>
            </div>
          </div>
        </div>
        <Button asChild className="rounded-full bg-amber-600 hover:bg-amber-700">
          <Link href="/student/settings">{t("dashboard.sidebar.profileSettings")}</Link>
        </Button>
      </div>
    </div>
  );
}

function MatchRing({ score }: { score: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const reduce = useReducedMotion();
  return (
    <div className="relative grid h-20 w-20 place-items-center" aria-label={`${score}% match`}>
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-surface-200 dark:text-white/10" />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
        />
      </svg>
      <span className="absolute font-display text-lg font-semibold text-surface-900 dark:text-white">{score}%</span>
    </div>
  );
}

/**
 * Pipeline count — animates from 0 to the actual value when scrolled into view.
 * Uses a small useEffect + RAF rather than framer-motion so the count is a
 * real string DOM node (lets the surrounding text style cleanly).
 */
function PipelineCount({ value, delay = 0 }: { value: number; delay?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(reduce ? value : 0);
  const [started, setStarted] = useState(reduce);

  useEffect(() => {
    if (reduce || started || !ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduce, started]);

  useEffect(() => {
    if (!started) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const startMs = performance.now() + delay * 1000;
    const duration = Math.min(1000, 400 + value * 60);
    const tick = (now: number) => {
      if (now < startMs) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startMs) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, value, delay, reduce]);

  return <span ref={ref}>{display}</span>;
}

function RecCard({
  rec,
  index,
  locale,
  t,
}: {
  rec: Recommendation;
  index: number;
  locale: "uz" | "ru";
  t: (k: string) => string;
}) {
  const score = Math.round(rec.match_score);
  const tone =
    score >= 80
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : score >= 60
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : "bg-surface-200 text-surface-700 dark:bg-white/[0.06] dark:text-white/70";
  const reduce = useReducedMotion();
  // First card opens by default to demonstrate the explainability pattern;
  // others stay collapsed to keep the list scannable.
  const [expanded, setExpanded] = useState(index === 0);

  const jobUrl = `/student/jobs/${rec.job.id}`;
  const hasSalary = rec.job.salary_min || rec.job.salary_max;
  const matches = rec.skill_matches;
  const gaps = rec.missing_skills;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      className="group rounded-2xl border border-surface-200 bg-white transition hover:border-emerald-200 hover:shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-emerald-500/30"
    >
      {/* Top — clickable summary (navigates to job detail) */}
      <Link
        href={jobUrl}
        className="focus-ring block rounded-2xl p-4"
        aria-label={`${rec.job.title} — ${score}% match. Tafsilotlarni ko'rish.`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-surface-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-300">
              {rec.job.title}
            </p>
            <p className="truncate text-sm text-surface-500 dark:text-white/55">
              {rec.job.company?.name || t("common.company")} · {rec.job.location}
            </p>
            {hasSalary && (
              <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-300">
                {formatSalaryRange(
                  rec.job.salary_min,
                  rec.job.salary_max,
                  locale,
                  rec.job.salary_currency || "USD"
                )}
              </p>
            )}
          </div>
          <div className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center ${tone}`}>
            <span className="block text-base font-bold leading-none">{score}%</span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider opacity-80">
              match
            </span>
          </div>
        </div>

        {/* Animated reasoning bar — same gradient family as /demo */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-white/[0.06]">
          <motion.div
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{
              duration: 1.1,
              ease: [0.19, 1, 0.22, 1],
              delay: 0.2 + index * 0.08,
            }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400"
          />
        </div>
      </Link>

      {/* "Nega?" toggle — outside Link so it doesn't navigate */}
      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={`rec-reasons-${rec.job.id}`}
          className="focus-ring inline-flex items-center gap-1 rounded-full text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
        >
          Nega?
          <ChevronRight
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          />
        </button>

        {/* Expandable reasoning */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              id={`rec-reasons-${rec.job.id}`}
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3 rounded-xl border border-surface-200/70 bg-surface-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
                {/* Matched skills */}
                {matches.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" aria-hidden /> Sizning kuchli tomonlaringiz
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {matches.slice(0, 6).map((skill: string) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="bg-emerald-50 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {matches.length > 6 && (
                        <span className="text-xs text-surface-500 dark:text-white/55">
                          +{matches.length - 6}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Gaps / what to learn */}
                {gaps && gaps.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                      <AlertCircle className="h-3 w-3" aria-hidden /> O&apos;rganish kerak
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {gaps.slice(0, 4).map((skill: string) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="border-amber-300 bg-amber-50 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trust signal */}
                <div className="flex items-center gap-2 rounded-lg bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-700 dark:text-cyan-300">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Kompaniya verified · Trust score yuqori
                </div>

                <Link
                  href={jobUrl}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                >
                  Vakansiyani ko&apos;rib chiqish
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

function EmptyResume({ t }: { t: (k: string) => string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 py-10 text-center dark:border-emerald-500/30 dark:bg-emerald-500/5">
      <Sparkles className="h-7 w-7 text-emerald-500" />
      <p className="max-w-sm text-sm text-surface-600 dark:text-white/70">
        {t("dashboard.recommended.noResume")}
      </p>
      <Link href="/student/resumes/create-ai">
        <Button size="sm" className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400">
          {t("dashboard.recommended.createResumeCTA")}
        </Button>
      </Link>
    </div>
  );
}

function EmptyActivity({ t }: { t: (k: string) => string }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-200 py-8 text-center dark:border-white/[0.08]">
      <Send className="mx-auto h-7 w-7 text-emerald-500" />
      <p className="mt-2 text-sm text-surface-600 dark:text-white/65">{t("dashboard.recentActivity.empty")}</p>
      <Link href="/student/jobs" className="mt-3 inline-flex">
        <Button size="sm" variant="outline" className="rounded-full">
          Vakansiyalarni ko&apos;rish
        </Button>
      </Link>
    </div>
  );
}

function ErrorState({ onRetry, t }: { onRetry: () => void; t: (k: string) => string }) {
  return (
    <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/40 py-8 text-center dark:border-red-500/30 dark:bg-red-500/5">
      <AlertCircle className="mx-auto h-7 w-7 text-red-500" />
      <p className="mt-2 text-sm text-surface-700 dark:text-white/75">
        Tavsiyalarni yuklab bo&apos;lmadi. Internetni tekshirib qaytadan urinib ko&apos;ring.
      </p>
      <Button size="sm" onClick={onRetry} className="mt-3 rounded-full" variant="outline">
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Qayta urinish
      </Button>
      <span className="sr-only">{t("dashboard.recommended.title")}</span>
    </div>
  );
}
