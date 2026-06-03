"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Wallet,
  Briefcase,
  Users,
  Globe,
  Clock,
  GraduationCap,
  Bookmark,
  BookmarkCheck,
  Share2,
  Send,
  Target,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSalaryRange, sanitizeRichTextHtml, stripHtmlTags } from "@/lib/utils";
import { jobTypeLabel as jobTypeLabelFor, experienceLabel as experienceLabelFor } from "@/lib/jobLabels";
import type { Job } from "@/types/api";

export function JobDetailPanel({
  job,
  isSaved,
  onClose,
  onToggleSave,
  onApply,
  onShare,
}: {
  job: Job & { matchScore?: number };
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: () => void;
  onApply: () => void;
  onShare: () => void;
}) {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const safeDescriptionHtml = sanitizeRichTextHtml(job.description || "");
  const hasDescription = stripHtmlTags(job.description || "").length > 0;

  // Localized labels for backend-supplied enums / codes. Keep keys aligned
  // with the values the backend returns; unknown values fall back to the
  // raw value humanised (Title Case).
  const jobTypeLabel = jobTypeLabelFor(job.job_type, isRu);
  const experienceLabel = experienceLabelFor(job.experience_level, isRu);

  const trustBadgeLabel = (code: string): string => {
    const map: Record<string, [string, string]> = {
      verified_employer:  ["tasdiqlangan ish beruvchi", "проверенный работодатель"],
      transparent_salary: ["aniq maosh",                 "прозрачная зарплата"],
      fresh_listing:      ["yangi e'lon",                "свежая вакансия"],
      fast_responder:     ["tez javob beradi",           "быстро отвечает"],
      high_trust:         ["yuqori ishonch",             "высокое доверие"],
    };
    const pair = map[code];
    return pair ? (isRu ? pair[1] : pair[0]) : code.replace(/_/g, " ");
  };

  const trustFactorLabel = (code: string, fallback: string): string => {
    const map: Record<string, [string, string]> = {
      verification:        ["Ish beruvchi tasdig'i",     "Проверка работодателя"],
      salary_transparency: ["Maosh ochiqligi",            "Прозрачность зарплаты"],
      freshness:           ["E'lon yangiligi",            "Свежесть вакансии"],
      responsiveness:      ["Ish beruvchi javobi",        "Отзывчивость работодателя"],
      risk:                ["Firibgarlik xavfi",          "Риск мошенничества"],
    };
    const pair = map[code];
    return pair ? (isRu ? pair[1] : pair[0]) : fallback;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex h-full flex-col bg-white dark:bg-surface-900"
    >
      {/* Hero section */}
      <div className="border-b border-surface-200 px-6 py-6 dark:border-surface-700">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 text-2xl font-bold text-purple-700 dark:from-purple-900/50 dark:to-indigo-900/50 dark:text-purple-300">
            {job.company?.name?.charAt(0) || "C"}
          </div>
          {/* Title block */}
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-tight text-surface-900 dark:text-white">
              {job.title}
            </h2>
            <p className="mt-0.5 text-surface-600 dark:text-surface-400">
              {job.company?.name}
            </p>
            {job.verification_state === "approved" && (
              <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                {isRu ? "Проверенная компания" : "Tasdiqlangan kompaniya"}
              </span>
            )}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-surface-500">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              <Badge variant={job.job_type as any} className="rounded-full">
                {jobTypeLabel}
              </Badge>
              {job.matchScore ? (
                <Badge
                  variant={job.matchScore >= 80 ? "success" : "warning"}
                  className="gap-1 rounded-full"
                >
                  <Target className="h-3 w-3" />
                  {job.matchScore}% {isRu ? "совпадение" : "moslik"}
                </Badge>
              ) : null}
              {typeof job.trust_score === "number" ? (
                <Badge
                  variant={job.trust_score >= 75 ? "success" : job.trust_score >= 50 ? "warning" : "secondary"}
                  className="gap-1 rounded-full"
                >
                  {job.trust_score >= 50 ? <ShieldCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {Math.round(job.trust_score)} {isRu ? "доверие" : "ishonch"}
                </Badge>
              ) : null}
            </div>
          </div>
          {/* Close button (mobile only) */}
          <button
            onClick={onClose}
            aria-label={
              isRu ? "Закрыть детали вакансии" : "Ish tafsilotlarini yopish"
            }
            title={isRu ? "Закрыть" : "Yopish"}
            className="rounded-lg p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Big CTA buttons */}
        <div className="mt-5 flex gap-3">
          <Button
            className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25"
            onClick={onApply}
          >
            <Send className="mr-2 h-4 w-4" />
            {isRu ? "Откликнуться" : "Hozir ariza yuborish"}
          </Button>
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onToggleSave}>
            {isSaved ? (
              <>
                <BookmarkCheck className="mr-2 h-4 w-4" />
                {isRu ? "Сохранено" : "Saqlandi"}
              </>
            ) : (
              <>
                <Bookmark className="mr-2 h-4 w-4" />
                {isRu ? "Сохранить" : "Saqlash"}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            aria-label={isRu ? "Поделиться вакансией" : "Ishni ulashish"}
            title={isRu ? "Поделиться" : "Ulashish"}
            className="rounded-xl"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto px-6 py-6"
        aria-label={isRu ? "Детали вакансии" : "Ish tafsilotlari"}
      >
        {/* Quick info grid */}
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">
                {isRu ? "Локация" : "Joylashuv"}
              </p>
                <p className="font-medium leading-tight text-surface-900 dark:text-white">
                  {job.location}
                </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50">
              <Wallet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">
                {isRu ? "Зарплата" : "Maosh"}
              </p>
              <p className="font-medium leading-tight text-surface-900 dark:text-white">
                {formatSalaryRange(
                  job.salary_min,
                  job.salary_max,
                  isRu ? "ru" : "uz",
                  job.salary_currency || "UZS",
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">
                {isRu ? "Опыт" : "Tajriba"}
              </p>
              <p className="font-medium text-surface-900 dark:text-white">
                {experienceLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-surface-500">
                {isRu ? "Кандидаты" : "Nomzodlar"}
              </p>
              <p className="font-medium text-surface-900 dark:text-white">
                {job.applications_count} {isRu ? "подали" : "ariza"}
              </p>
            </div>
          </div>
        </div>

        {(job.trust_badges?.length || job.trust_factors?.length) && (
          <div className="mt-6 rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900/70">
            <h3 className="mb-3 text-lg font-semibold text-surface-900 dark:text-white">
              {isRu ? "Показатели доверия" : "Ishonch ko'rsatkichlari"}
            </h3>
            {job.trust_badges && job.trust_badges.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {job.trust_badges.map((badge) => (
                  <Badge key={badge} variant="secondary" className="rounded-full">
                    {trustBadgeLabel(badge)}
                  </Badge>
                ))}
              </div>
            )}
            {job.trust_factors && job.trust_factors.length > 0 && (
              <div className="space-y-2">
                {job.trust_factors.slice(0, 5).map((factor) => (
                  <div key={factor.code} className="flex items-center justify-between text-sm">
                    <span className="text-surface-600 dark:text-surface-300">{trustFactorLabel(factor.code, factor.label)}</span>
                    <span className="font-medium text-surface-900 dark:text-white">{Math.round((factor.score || 0) * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {job.explainability && (
          <div className="mt-6 rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900/70">
            <h3 className="mb-3 text-lg font-semibold text-surface-900 dark:text-white">
              {isRu ? "Почему эта вакансия вам подходит" : "Nima uchun bu ish sizga mos"}
            </h3>
            <div className="space-y-2">
              {job.explainability.fit_reasons.slice(0, 3).map((reason, idx) => (
                <div key={`${reason}-${idx}`} className="flex items-start gap-2 text-sm text-surface-700 dark:text-surface-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
            {job.explainability.missing_items.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">
                  {isRu ? "Что улучшить" : "Nimani yaxshilash kerak"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {job.explainability.missing_items.map((item) => (
                    <Badge key={item} variant="warning" className="rounded-full">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section: Description */}
        <div className="mt-6">
          <h3 className="mb-3 text-lg font-semibold text-surface-900 dark:text-white">
            {isRu ? "Описание вакансии" : "Lavozim haqida"}
          </h3>
          {hasDescription ? (
            <div
              className="prose prose-sm max-w-none text-surface-600 dark:prose-invert dark:text-surface-300"
              dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }}
            />
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {isRu ? "Описание не указано" : "Tavsif ko'rsatilmagan"}
            </p>
          )}
        </div>

        {/* Section: Requirements */}
        <div className="mt-6">
          <h3 className="mb-3 text-lg font-semibold text-surface-900 dark:text-white">
            {isRu ? "Требования" : "Talablar"}
          </h3>
          <div className="space-y-4">
            {/* Skills */}
            {job.requirements.skills && job.requirements.skills.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">
                  {isRu ? "Требуемые навыки" : "Kerakli ko'nikmalar"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {job.requirements.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="rounded-full">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {/* Experience */}
            {job.requirements.experience && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-700">
                  <Clock className="h-4 w-4 text-surface-500" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">
                    {isRu ? "Опыт" : "Tajriba"}
                  </p>
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    {job.requirements.experience}
                  </p>
                </div>
              </div>
            )}
            {/* Education */}
            {job.requirements.education && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-700">
                  <GraduationCap className="h-4 w-4 text-surface-500" />
                </div>
                <div>
                  <p className="text-xs text-surface-500">
                    {isRu ? "Образование" : "Ta'lim"}
                  </p>
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    {job.requirements.education}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section: Company */}
        <div className="mt-6">
          <h3 className="mb-3 text-lg font-semibold text-surface-900 dark:text-white">
            {isRu ? "Компания" : "Kompaniya"}
          </h3>
          <div className="rounded-2xl border border-surface-200 p-4 dark:border-surface-700">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 text-xl font-bold text-purple-600 dark:from-purple-900/50 dark:to-indigo-900/50">
                {job.company?.name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-surface-900 dark:text-white">
                  {job.company?.name}
                </p>
                <p className="text-sm text-surface-500">
                  {isRu ? "Технологическая компания" : "Texnologik kompaniya"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-surface-600 dark:text-surface-400">
              {isRu
                ? "Ведущая технологическая компания Узбекистана, создающая инновационные решения для миллионов пользователей Центральной Азии."
                : "O'zbekistondagi yetakchi texnologik kompaniya bo'lib, Markaziy Osiyodagi millionlab foydalanuvchilar uchun innovatsion yechimlar yaratadi."}
            </p>
            <div className="mt-3 flex items-center gap-4 text-sm text-surface-500">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {isRu ? "500+ сотрудников" : "500+ xodim"}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                epam.com
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
