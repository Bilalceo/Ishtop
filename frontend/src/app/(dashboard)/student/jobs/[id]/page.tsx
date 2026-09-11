"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Wallet,
  Clock,
  Building2,
  Users,
  Eye,
  CheckCircle,
  Sparkles,
  Share2,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  BadgeCheck,
  ShieldCheck,
  MessageSquare,
  Target,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { jobApi } from "@/lib/api";
import {
  formatRelativeTime,
  formatSalaryRange,
  cn,
  sanitizeRichTextHtml,
  stripHtmlTags,
} from "@/lib/utils";
import { jobDisplayIdentity } from "@/lib/jobLabels";
import { jobApplyRoute } from "@/lib/jobApply";
import type { Job } from "@/types/api";
import { useTranslation } from "@/contexts/TranslationContext";

function getJobTypeLabels(isRu: boolean): Record<string, string> {
  return isRu
    ? {
        full_time: "Полная занятость",
        part_time: "Частичная занятость",
        remote: "Удалённо",
        hybrid: "Гибрид",
        contract: "Контракт",
        internship: "Стажировка",
      }
    : {
        full_time: "To'liq stavka",
        part_time: "Yarim stavka",
        remote: "Masofaviy",
        hybrid: "Gibrid",
        contract: "Shartnoma",
        internship: "Amaliyot",
      };
}

function getExperienceLevelLabels(isRu: boolean): Record<string, string> {
  return isRu
    ? {
        intern: "Стажёр (без опыта)",
        junior: "Начинающий (0-2 года)",
        mid: "Средний уровень (2-5 лет)",
        senior: "Старший уровень (5+ лет)",
        lead: "Руководитель (7+ лет)",
        executive: "Директор",
      }
    : {
        intern: "Amaliyotchi (tajribasiz)",
        junior: "Boshlovchi (0-2 yil)",
        mid: "O'rta daraja (2-5 yil)",
        senior: "Katta daraja (5+ yil)",
        lead: "Rahbar (7+ yil)",
        executive: "Direktor",
      };
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params!.id as string;
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const c = isRu
    ? {
        notFound: "Вакансия не найдена или произошла ошибка.",
        notFoundShort: "Вакансия не найдена",
        back: "Назад",
        backToJobs: "К списку вакансий",
        companyFallback: "Компания",
        verifiedCompany: "Проверенная компания",
        removeFromSaved: "Убрать из сохранённых",
        saveJob: "Сохранить вакансию",
        shareJob: "Поделиться вакансией",
        copied: "Скопировано!",
        match: "совпадение",
        notSpecified: "Не указано",
        views: "просмотров",
        applicationsCount: "заявок",
        deadline: "Срок",
        applyButton: "Откликнуться",
        companyWebsite: "Сайт компании",
        jobDescription: "Описание вакансии",
        noDescription: "Описание отсутствует.",
        requirements: "Требования",
        technicalSkills: "Технические навыки",
        experience: "Опыт",
        education: "Образование",
        certifications: "Сертификаты",
        fitCta: "Эта вакансия вам подходит?",
        fitCtaSub: "Откликнитесь прямо сейчас и попробуйте свои силы!",
        responsibilities: "Обязанности",
        tabOverview: "Обзор",
        tabAi: "AI-анализ",
        trust: "доверие",
        prepareInterview: "Подготовка к собеседованию (AI)",
        freeToApply: "Отклик полностью бесплатный",
        aboutCompany: "О компании",
        viewCompany: "Профиль компании",
        viewOnMap: "Посмотреть на карте",
        aiOpinion: "Мнение AI",
        aiMatchNote: "Рассчитано по вашему резюме и навыкам.",
        whyFits: "Почему подходит",
        whatsMissing: "Чего не хватает",
        moreInfo: "Дополнительно",
        jobTypeLabel: "Тип занятости",
        locationLabel: "Локация",
        posted: "Опубликовано",
        applyExternal: "Связаться (Telegram)",
        applyExternalNote: "Полная информация и контакты — в боте",
        matchTitle: "Соответствие вашему резюме",
        matchCoverage: "Требования покрыты",
        noResumeMatch:
          "Создайте резюме, чтобы увидеть, насколько эта вакансия вам подходит.",
        createResume: "Создать резюме",
      }
    : {
        notFound: "Ish topilmadi yoki xatolik yuz berdi.",
        notFoundShort: "Ish topilmadi",
        back: "Orqaga",
        backToJobs: "Ishlarga qaytish",
        companyFallback: "Kompaniya",
        verifiedCompany: "Tasdiqlangan kompaniya",
        removeFromSaved: "Saqlanganlardan olib tashlash",
        saveJob: "Ishni saqlash",
        shareJob: "Ishni ulashish",
        copied: "Nusxalandi!",
        match: "mos",
        notSpecified: "Aniqlanmagan",
        views: "ko'rishlar",
        applicationsCount: "ariza",
        deadline: "Muddat",
        applyButton: "Ariza berish",
        companyWebsite: "Kompaniya veb-sayti",
        jobDescription: "Ish tavsifi",
        noDescription: "Tavsif mavjud emas.",
        requirements: "Talablar",
        technicalSkills: "Texnik ko'nikmalar",
        experience: "Tajriba",
        education: "Ta'lim",
        certifications: "Sertifikatlar",
        fitCta: "Ushbu ish sizga mos keladi?",
        fitCtaSub: "Hoziroq ariza bering va imkoningizni sinab ko'ring!",
        responsibilities: "Asosiy vazifalar",
        tabOverview: "Umumiy",
        tabAi: "AI tahlili",
        trust: "ishonch",
        prepareInterview: "AI bilan suhbatga tayyorlanish",
        freeToApply: "Ariza berish mutlaqo bepul",
        aboutCompany: "Kompaniya haqida",
        viewCompany: "Kompaniya profili",
        viewOnMap: "Xaritada ko'rish",
        aiOpinion: "AI fikri",
        aiMatchNote: "Rezyume va ko'nikmalaringiz asosida hisoblangan.",
        whyFits: "Nega mos keladi",
        whatsMissing: "Nima yetishmayapti",
        moreInfo: "Qo'shimcha ma'lumotlar",
        jobTypeLabel: "Ish turi",
        locationLabel: "Joylashuv",
        posted: "E'lon qilingan",
        applyExternal: "Aloqaga chiqish (Telegram)",
        applyExternalNote: "To'liq ma'lumot va ish beruvchi aloqasi botda",
        applyClosed: "Bu e'lon uchun ariza vaqtincha qabul qilinmayapti",
        matchTitle: "Rezyumengizga mosligi",
        matchCoverage: "Talablar qamrovi",
        noResumeMatch:
          "Bu ish sizga qanchalik mos kelishini ko'rish uchun rezyume yarating.",
        createResume: "Rezyume yaratish",
      };
  const jobTypeLabels = getJobTypeLabels(isRu);
  const experienceLevelLabels = getExperienceLevelLabels(isRu);

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  // Resume↔job match, fetched separately so the job itself renders immediately.
  const [match, setMatch] = useState<{
    has_resume: boolean;
    score?: number;
    requirement_matches?: { text: string; matched: boolean }[];
    matched_count?: number;
    requirement_count?: number;
  } | null>(null);

  // Mobile sticky "Apply" bar — shown only while neither the top apply button
  // nor the bottom CTA is on screen, so the primary action is always reachable
  // as the user scrolls the description (HH.ru-style), without duplicating a
  // button that's already visible.
  const topApplyRef = useRef<HTMLDivElement>(null);
  const bottomCtaRef = useRef<HTMLDivElement>(null);
  const [showStickyApply, setShowStickyApply] = useState(false);

  useEffect(() => {
    if (isLoading || error || !job) return;
    const top = topApplyRef.current;
    const bottom = bottomCtaRef.current;
    if (!top && !bottom) return;
    const visible = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        const anyVisible =
          (top ? visible.has(top) : false) ||
          (bottom ? visible.has(bottom) : false);
        setShowStickyApply(!anyVisible);
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
    if (top) io.observe(top);
    if (bottom) io.observe(bottom);
    return () => io.disconnect();
  }, [isLoading, error, job]);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setIsLoading(true);
        const res = await jobApi.get(jobId);
        setJob(res.data?.data || res.data);
      } catch {
        setError(c.notFound);
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) fetchJob();
    // c is recomputed each render; only id should drive a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await jobApi.matchOne(jobId);
        const data = res.data?.data ?? res.data;
        if (!cancelled) setMatch(data);
      } catch {
        /* match is a bonus — a failure just hides the card */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-8 w-32" />
        <div className="rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-800">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-2 h-5 w-1/3" />
          <div className="mt-4 flex gap-3">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="mt-6 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-16 w-16 text-red-400" />
        <h2 className="mt-4 text-xl font-bold text-surface-900">
          {error || c.notFoundShort}
        </h2>
        <Button
          className="mt-6"
          onClick={() => router.back()}
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {c.back}
        </Button>
      </div>
    );
  }

  const {
    title: displayTitle,
    company: resolvedCompany,
    companyIsReal,
  } = jobDisplayIdentity(job.title, job.company?.name);
  const companyName = resolvedCompany || c.companyFallback;
  const companyLetter = (companyName || displayTitle)[0]?.toUpperCase() || "?";
  const safeDescriptionHtml = sanitizeRichTextHtml(job.description || "");
  const hasDescription = stripHtmlTags(job.description || "").length > 0;
  const requirements = job.requirements ?? [];
  const responsibilities = job.responsibilities ?? [];
  // Aggregated listings all sit under one approved import account, so its
  // "verified" flag says nothing about the actual employer. Only badge a
  // company that identifies itself rather than one parsed out of the title.
  const isVerified =
    companyIsReal &&
    (job.verification_state === "approved" || !!job.company?.is_verified);
  const matchScore =
    typeof job.matchScore === "number" ? Math.round(job.matchScore) : null;
  const salaryText =
    formatSalaryRange(
      job.salary_min,
      job.salary_max,
      isRu ? "ru" : "uz",
      job.salary_currency || "UZS",
    ) || c.notSpecified;
  const applyHref = `/student/jobs/${job.id}/apply`;
  // Aggregated listings live under an import account nobody reads, so applying
  // in-app would go nowhere; send the candidate to the source instead.
  const applyRoute = jobApplyRoute(job);
  const applyIsExternal = applyRoute.kind !== "internal";
  const applyUrl = applyRoute.kind === "bot" ? applyRoute.url : undefined;

  // Only offer tabs that actually have content — an empty "Talablar" tab is worse
  // than no tab at all (aggregated listings often carry no structured lists).
  const tabs: { id: string; label: string }[] = [
    { id: "overview", label: c.tabOverview },
    ...(requirements.length
      ? [{ id: "requirements", label: c.requirements }]
      : []),
    ...(responsibilities.length
      ? [{ id: "responsibilities", label: c.responsibilities }]
      : []),
  ];
  const tab = tabs.some((t) => t.id === activeTab) ? activeTab : "overview";

  const BulletList = ({ items }: { items: string[] }) => (
    <ul className="mt-3 space-y-2.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-2.5 text-[15px] leading-relaxed text-surface-600 dark:text-surface-300"
        >
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900 sm:p-6">
      <h2 className="text-lg font-bold text-surface-900 dark:text-white">
        {title}
      </h2>
      {children}
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-5 lg:px-6">
      {/* Back + secondary actions */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2 px-2 text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {c.backToJobs}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSaved(!isSaved)}
            className="gap-2"
            aria-label={isSaved ? c.removeFromSaved : c.saveJob}
          >
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4 text-brand-600" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{c.saveJob}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
            aria-label={c.shareJob}
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isCopied ? c.copied : c.shareJob}
            </span>
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* HEADER: identity + key facts, with the apply actions alongside     */}
      {/* ---------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900 sm:p-6"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-xl font-bold text-white shadow-sm">
                {companyLetter}
              </div>
              <div className="min-w-0">
                <h1 className="text-[22px] font-bold leading-tight text-surface-900 dark:text-white sm:text-2xl">
                  {displayTitle}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-surface-600 dark:text-surface-300">
                    {companyName}
                  </span>
                  {isVerified && (
                    <>
                      <BadgeCheck className="h-4 w-4 text-brand-500" />
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                        {c.verifiedCompany}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Signal chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {matchScore !== null && (
                <Badge
                  variant={
                    matchScore >= 80
                      ? "success"
                      : matchScore >= 60
                        ? "warning"
                        : "secondary"
                  }
                  className="gap-1"
                >
                  <Target className="h-3.5 w-3.5" />
                  {matchScore}% {c.match}
                </Badge>
              )}
              {typeof job.trust_score === "number" && (
                <Badge
                  variant={
                    job.trust_score >= 75
                      ? "success"
                      : job.trust_score >= 50
                        ? "warning"
                        : "secondary"
                  }
                  className="gap-1"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {Math.round(job.trust_score)} {c.trust}
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {jobTypeLabels[job.job_type] || job.job_type}
              </Badge>
            </div>

            {/* Key facts */}
            <div className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <MapPin className="h-4 w-4 shrink-0 text-surface-400" />
                <span className="truncate">
                  {job.location || c.notSpecified}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <Wallet className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="truncate">{salaryText}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <Sparkles className="h-4 w-4 shrink-0 text-surface-400" />
                <span className="truncate">
                  {experienceLevelLabels[job.experience_level] ||
                    job.experience_level}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <Clock className="h-4 w-4 shrink-0 text-surface-400" />
                <span>
                  {formatRelativeTime(job.created_at, isRu ? "ru" : "uz")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <Users className="h-4 w-4 shrink-0 text-surface-400" />
                <span>
                  {job.applications_count} {c.applicationsCount}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <Eye className="h-4 w-4 shrink-0 text-surface-400" />
                <span>
                  {job.views_count} {c.views}
                </span>
              </div>
            </div>
          </div>

          {/* Primary actions */}
          <div ref={topApplyRef} className="w-full shrink-0 lg:w-[300px]">
            {applyIsExternal ? (
              applyUrl ? (
                <a
                  href={applyUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block"
                >
                  <Button className="w-full bg-gradient-to-r from-brand-500 to-violet-600 py-6 text-base font-semibold shadow-lg shadow-brand-500/25">
                    <ExternalLink className="mr-2 h-5 w-5" />
                    {c.applyExternal}
                  </Button>
                </a>
              ) : (
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-center text-sm text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
                  {c.applyClosed}
                </div>
              )
            ) : (
              <Link href={applyHref} className="block">
                <Button className="w-full bg-gradient-to-r from-brand-500 to-violet-600 py-6 text-base font-semibold shadow-lg shadow-brand-500/25">
                  <Sparkles className="mr-2 h-5 w-5" />
                  {c.applyButton}
                </Button>
              </Link>
            )}
            <Link
              href={`/student/interview?job=${job.id}`}
              className="mt-3 block"
            >
              <Button
                variant="outline"
                className="w-full gap-2 py-6 text-sm font-semibold"
              >
                <MessageSquare className="h-4 w-4" />
                {c.prepareInterview}
              </Button>
            </Link>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-surface-500">
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              {applyIsExternal ? c.applyExternalNote : c.freeToApply}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="mt-5 flex gap-6 overflow-x-auto border-b border-surface-200 dark:border-surface-700">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-semibold transition-colors",
                t.id === tab
                  ? "border-brand-500 text-brand-600 dark:text-brand-300"
                  : "border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* BODY: content + sidebar                                           */}
      {/* ---------------------------------------------------------------- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-5">
          {(tab === "overview" || tab === "requirements") &&
            requirements.length > 0 && (
              <Section title={c.requirements}>
                <BulletList items={requirements} />
              </Section>
            )}

          {(tab === "overview" || tab === "responsibilities") &&
            responsibilities.length > 0 && (
              <Section title={c.responsibilities}>
                <BulletList items={responsibilities} />
              </Section>
            )}

          {tab === "overview" && (
            <Section title={c.jobDescription}>
              {hasDescription ? (
                <div
                  className="prose prose-sm mt-3 max-w-none text-surface-600 dark:prose-invert dark:text-surface-300"
                  dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }}
                />
              ) : (
                <p className="mt-3 text-sm text-surface-500">
                  {c.noDescription}
                </p>
              )}
            </Section>
          )}

          {tab === "overview" && (
            <Section title={c.moreInfo}>
              <dl className="mt-3 divide-y divide-surface-100 dark:divide-surface-700/60">
                {[
                  [c.jobTypeLabel, jobTypeLabels[job.job_type] || job.job_type],
                  [
                    c.experience,
                    experienceLevelLabels[job.experience_level] ||
                      job.experience_level,
                  ],
                  [c.locationLabel, job.location || c.notSpecified],
                  [
                    c.posted,
                    formatRelativeTime(job.created_at, isRu ? "ru" : "uz"),
                  ],
                  [c.views, String(job.views_count)],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-4 py-2.5 text-sm"
                  >
                    <dt className="text-surface-500">{k}</dt>
                    <dd className="text-right font-semibold text-surface-900 dark:text-white">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-5 lg:sticky lg:top-5">
          <div className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900">
            <h2 className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white">
              <Building2 className="h-4 w-4 text-brand-500" />
              {c.aboutCompany}
            </h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-base font-bold text-white">
                {companyLetter}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-surface-900 dark:text-white">
                  {companyName}
                </p>
                {isVerified && (
                  <p className="text-xs text-brand-600 dark:text-brand-300">
                    {c.verifiedCompany}
                  </p>
                )}
              </div>
            </div>
            {job.company_slug && (
              <Link
                href={`/jobs/company/${job.company_slug}`}
                className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-surface-200 py-2.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
              >
                {c.viewCompany}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {job.location && (
            <div className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900">
              <h2 className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white">
                <MapPin className="h-4 w-4 text-brand-500" />
                {c.locationLabel}
              </h2>
              <p className="mt-3 text-sm text-surface-600 dark:text-surface-300">
                {job.location}
              </p>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(job.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-surface-200 py-2.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
              >
                {c.viewOnMap}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {match && (
            <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-violet-50 p-5 dark:border-brand-500/20 dark:from-brand-500/10 dark:to-violet-500/10">
              <h2 className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white">
                <Target className="h-4 w-4 text-brand-500" />
                {c.matchTitle}
              </h2>

              {match.has_resume && typeof match.score === "number" ? (
                <>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="text-3xl font-extrabold text-brand-600 dark:text-brand-300">
                      {Math.round(match.score)}%
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/70 dark:bg-surface-900/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-600"
                        style={{
                          width: `${Math.min(100, Math.max(0, match.score))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Coverage per requirement line: the scorer's own tokens are
                      fragments of Uzbek sentences and unreadable as chips. */}
                  {match.requirement_matches &&
                    match.requirement_matches.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">
                          {c.matchCoverage}: {match.matched_count}/
                          {match.requirement_count}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {match.requirement_matches.map((r, i) => (
                            <li
                              key={i}
                              className="flex gap-2 text-xs leading-relaxed"
                            >
                              {r.matched ? (
                                <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              ) : (
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                              )}
                              <span
                                className={
                                  r.matched
                                    ? "text-surface-700 dark:text-surface-200"
                                    : "text-surface-500"
                                }
                              >
                                {r.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  <Link
                    href={`/student/interview?job=${job.id}`}
                    className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-semibold text-brand-600 shadow-sm transition-colors hover:bg-brand-50 dark:bg-surface-900 dark:hover:bg-surface-800"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {c.prepareInterview}
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm text-surface-600 dark:text-surface-300">
                    {c.noResumeMatch}
                  </p>
                  <Link
                    href="/student/resumes/create-ai"
                    className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-semibold text-brand-600 shadow-sm transition-colors hover:bg-brand-50 dark:bg-surface-900 dark:hover:bg-surface-800"
                  >
                    <Sparkles className="h-4 w-4" />
                    {c.createResume}
                  </Link>
                </>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Bottom CTA */}
      <div
        ref={bottomCtaRef}
        className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-violet-50 p-6 dark:border-brand-500/20 dark:from-brand-500/10 dark:to-violet-500/10 sm:flex-row"
      >
        <div>
          <h3 className="font-bold text-surface-900 dark:text-white">
            {c.fitCta}
          </h3>
          <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">
            {c.fitCtaSub}
          </p>
        </div>
        {applyIsExternal && applyUrl ? (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="w-full sm:w-auto"
          >
            <Button className="w-full bg-gradient-to-r from-brand-500 to-violet-600 px-8 font-semibold shadow-lg shadow-brand-500/25 sm:w-auto">
              <ExternalLink className="mr-2 h-4 w-4" />
              {c.applyExternal}
            </Button>
          </a>
        ) : applyIsExternal ? null : (
          <Link href={applyHref} className="w-full sm:w-auto">
            <Button className="w-full bg-gradient-to-r from-brand-500 to-violet-600 px-8 font-semibold shadow-lg shadow-brand-500/25 sm:w-auto">
              <Sparkles className="mr-2 h-4 w-4" />
              {c.applyButton}
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile sticky apply bar — only while the inline CTAs are off screen. */}
      <AnimatePresence>
        {showStickyApply && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-surface-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/95 lg:hidden"
          >
            {applyIsExternal && applyUrl ? (
              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block pr-16"
              >
                <Button className="w-full bg-gradient-to-r from-brand-500 to-violet-600 py-3 text-base font-semibold shadow-lg shadow-brand-500/25">
                  <ExternalLink className="mr-2 h-5 w-5" />
                  {c.applyExternal}
                </Button>
              </a>
            ) : (
              <Link href={applyHref} className="block pr-16">
                <Button className="w-full bg-gradient-to-r from-brand-500 to-violet-600 py-3 text-base font-semibold shadow-lg shadow-brand-500/25">
                  <Sparkles className="mr-2 h-5 w-5" />
                  {c.applyButton}
                </Button>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
