"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Wallet,
  Clock,
  Building2,
  Users,
  Eye,
  Calendar,
  CheckCircle,
  Sparkles,
  Share2,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Globe,
  Target,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { jobApi } from "@/lib/api";
import { formatRelativeTime, formatSalaryRange, cn, sanitizeRichTextHtml, stripHtmlTags } from "@/lib/utils";
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

const jobTypeColors: Record<string, string> = {
  full_time: "bg-green-100 text-green-700",
  part_time: "bg-blue-100 text-blue-700",
  remote: "bg-brand-100 text-brand-700",
  hybrid: "bg-cyan-100 text-cyan-700",
  contract: "bg-orange-100 text-orange-700",
  internship: "bg-pink-100 text-pink-700",
};

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
      };
  const jobTypeLabels = getJobTypeLabels(isRu);
  const experienceLevelLabels = getExperienceLevelLabels(isRu);

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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

  const companyName = job.company?.name || c.companyFallback;
  const companyLetter = companyName[0]?.toUpperCase() || "K";
  const safeDescriptionHtml = sanitizeRichTextHtml(job.description || "");
  const hasDescription = stripHtmlTags(job.description || "").length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2 text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {c.backToJobs}
        </Button>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-800 shadow-sm dark:border-surface-700 dark:bg-surface-800"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Company Logo */}
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-2xl font-bold text-white shadow-lg">
              {companyLetter}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900">
                {job.title}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-surface-600">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">{companyName}</span>
                {job.verification_state === "approved" && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    {c.verifiedCompany}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSaved(!isSaved)}
              className={isSaved ? "text-brand-600" : "text-surface-400"}
              title={isSaved ? c.removeFromSaved : c.saveJob}
              aria-label={isSaved ? c.removeFromSaved : c.saveJob}
            >
              {isSaved ? (
                <BookmarkCheck className="h-5 w-5" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-surface-400"
              title={c.shareJob}
              aria-label={c.shareJob}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            {isCopied && (
              <span className="self-center text-xs text-green-600">
                {c.copied}
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium",
              jobTypeColors[job.job_type] || "bg-surface-100 text-surface-700",
            )}
          >
            {jobTypeLabels[job.job_type] || job.job_type}
          </Badge>
          <Badge className="rounded-full bg-surface-100 px-3 py-1 text-sm font-medium text-surface-700">
            {experienceLevelLabels[job.experience_level] ||
              job.experience_level}
          </Badge>
          {job.matchScore && (
            <Badge className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              <Target className="mr-1 h-3 w-3" />
              {job.matchScore}% {c.match}
            </Badge>
          )}
        </div>

        {/* Info Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-2 text-surface-600">
            <MapPin className="h-4 w-4 text-surface-400" />
            <span className="text-sm">{job.location || c.notSpecified}</span>
          </div>
          {(job.salary_min || job.salary_max) && (
            <div className="flex items-center gap-2 text-surface-600">
              <Wallet className="h-4 w-4 text-surface-400" />
              <span className="text-sm font-medium text-green-600">
                {formatSalaryRange(job.salary_min, job.salary_max, locale, job.salary_currency || "USD")}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-surface-600">
            <Eye className="h-4 w-4 text-surface-400" />
            <span className="text-sm">{job.views_count || 0} {c.views}</span>
          </div>
          <div className="flex items-center gap-2 text-surface-600">
            <Users className="h-4 w-4 text-surface-400" />
            <span className="text-sm">{job.applications_count || 0} {c.applicationsCount}</span>
          </div>
          <div className="flex items-center gap-2 text-surface-600">
            <Clock className="h-4 w-4 text-surface-400" />
            <span className="text-sm">
              {formatRelativeTime(job.created_at, locale)}
            </span>
          </div>
          {job.expires_at && (
            <div className="flex items-center gap-2 text-surface-600">
              <Calendar className="h-4 w-4 text-surface-400" />
              <span className="text-sm">
                {c.deadline}: {new Date(job.expires_at).toLocaleDateString(isRu ? "ru-RU" : "uz-UZ")}
              </span>
            </div>
          )}
        </div>

        {/* Apply Button */}
        <div className="mt-6 flex gap-3">
          <Link href={`/student/jobs/${job.id}/apply`} className="flex-1">
            <Button className="w-full bg-gradient-to-r from-brand-500 to-violet-600 py-3 text-base font-semibold shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40">
              <Sparkles className="mr-2 h-5 w-5" />
              {c.applyButton}
            </Button>
          </Link>
          {job.company?.logo_url && (
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              title={c.companyWebsite}
              aria-label={c.companyWebsite}
            >
              <Globe className="h-5 w-5" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-800 shadow-sm dark:border-surface-700 dark:bg-surface-800"
      >
        <h2 className="mb-4 text-lg font-bold text-surface-900">{c.jobDescription}</h2>
        {hasDescription ? (
          <div
            className="prose prose-sm max-w-none text-surface-600 dark:prose-invert dark:text-surface-300"
            dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }}
          />
        ) : (
          <p className="text-surface-600 dark:text-surface-300">{c.noDescription}</p>
        )}
      </motion.div>

      {/* Requirements */}
      {job.requirements && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-surface-200 bg-white p-6 dark:border-surface-700 dark:bg-surface-800 shadow-sm dark:border-surface-700 dark:bg-surface-800"
        >
          <h2 className="mb-4 text-lg font-bold text-surface-900">{c.requirements}</h2>
          <div className="space-y-4">
            {job.requirements.skills && job.requirements.skills.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-surface-700">
                  {c.technicalSkills}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.requirements.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {job.requirements.experience && (
              <div className="flex items-start gap-3">
                <Briefcase className="mt-0.5 h-5 w-5 flex-shrink-0 text-surface-400" />
                <div>
                  <p className="text-sm font-semibold text-surface-700">
                    {c.experience}
                  </p>
                  <p className="text-sm text-surface-600">
                    {job.requirements.experience}
                  </p>
                </div>
              </div>
            )}
            {job.requirements.education && (
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-surface-400" />
                <div>
                  <p className="text-sm font-semibold text-surface-700">
                    {c.education}
                  </p>
                  <p className="text-sm text-surface-600">
                    {job.requirements.education}
                  </p>
                </div>
              </div>
            )}
            {job.requirements.certifications &&
              job.requirements.certifications.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-surface-700">
                    {c.certifications}
                  </h3>
                  <ul className="space-y-1">
                    {job.requirements.certifications.map((cert) => (
                      <li
                        key={cert}
                        className="flex items-center gap-2 text-sm text-surface-600"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {cert}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </motion.div>
      )}

      {/* Bottom Apply CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-violet-50 p-6"
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div>
            <h3 className="font-bold text-surface-900">
              {c.fitCta}
            </h3>
            <p className="mt-1 text-sm text-surface-500">
              {c.fitCtaSub}
            </p>
          </div>
          <Link href={`/student/jobs/${job.id}/apply`}>
            <Button className="whitespace-nowrap bg-gradient-to-r from-brand-500 to-violet-600 shadow-lg shadow-brand-500/25">
              <Sparkles className="mr-2 h-4 w-4" />
              {c.applyButton}
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
