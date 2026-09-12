"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  Bookmark,
  BookmarkCheck,
  Zap,
  Target,
  ShieldCheck,
  AlertTriangle,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { jobDisplayIdentity, jobTypeLabel } from "@/lib/jobLabels";
import { categoryLabel, categoryStyle } from "@/lib/jobCategories";
import { jobApplyRoute } from "@/lib/jobApply";
import { formatRelativeTime, formatSalaryRange, cn } from "@/lib/utils";
import type { Job } from "@/types/api";

export function JobCard({
  job,
  isSelected,
  isSaved,
  onSelect,
  onToggleSave,
  onQuickApply,
}: {
  job: Job & { matchScore?: number };
  isSelected: boolean;
  isSaved: boolean;
  onSelect: () => void;
  onToggleSave: () => void;
  onQuickApply: () => void;
}) {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  // Aggregated listings hide the real employer inside the title; surface it.
  const { title: displayTitle, company } = jobDisplayIdentity(
    job.title,
    job.company?.name,
  );
  // Aggregated listings are applied to at the source, so the card must not
  // promise a one-click in-app application it cannot deliver.
  const applyRoute = jobApplyRoute(job);
  // Applying needs the contact panel on the job page, so the card sends them
  // there rather than trying to reproduce it in a list row.
  const isExternal = applyRoute.kind !== "internal";
  const cat = categoryStyle(job.category);
  const CatIcon = cat.Icon;
  const salary = formatSalaryRange(
    job.salary_min,
    job.salary_max,
    isRu ? "ru" : "uz",
    job.salary_currency || "UZS",
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-2xl border p-4 transition-all",
        "hover:-translate-y-0.5 hover:bg-surface-50 dark:hover:bg-surface-800/90",
        isSelected
          ? "border-brand-400 bg-brand-50/70 shadow-lg ring-1 ring-brand-300 dark:bg-brand-900/20 dark:ring-brand-500/40"
          : "border-surface-200 bg-white hover:border-surface-300 hover:shadow-md dark:border-surface-700 dark:bg-surface-900 dark:hover:border-surface-600",
      )}
    >
      <div className="flex items-start gap-3">
        {/* The listing's field of work. An employer initial told the reader
            nothing — every row opened with the same grey glyph. */}
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            cat.tile,
          )}
          title={categoryLabel(job.category, isRu)}
        >
          <CatIcon className="h-5 w-5" />
        </div>

        {/* Title, company, meta and chips */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-semibold leading-tight text-surface-900 dark:text-white">
            {displayTitle}
          </h3>
          <p className="mt-0.5 truncate text-sm text-surface-500 dark:text-surface-400">
            {company || categoryLabel(job.category, isRu)}
          </p>

          {/* Pay is what the reader scans a list for, so it leads and the rest
              of the meta drops to one quiet line behind it. */}
          {salary ? (
            <p className="mt-1.5 text-[15px] font-semibold text-emerald-600 dark:text-emerald-400">
              {salary}
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] text-surface-400 dark:text-surface-500">
              {isRu ? "Зарплата не указана" : "Maosh ko'rsatilmagan"}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-500">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            )}
            {job.job_type && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {jobTypeLabel(job.job_type, isRu)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(job.created_at, isRu ? "ru" : "uz")}
            </span>
          </div>

          {/* Only the match score stays a badge. Trust and job type used to be
              the same weight, so three loud chips competed with the salary and
              the row had no focal point; job type moved into the meta line and
              trust is a quiet mark. */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {job.matchScore ? (
              <Badge
                variant={
                  job.matchScore >= 80
                    ? "success"
                    : job.matchScore >= 60
                      ? "warning"
                      : "secondary"
                }
                className="gap-1"
              >
                <Target className="h-3 w-3" />
                {job.matchScore}% {isRu ? "совпадение" : "mos"}
              </Badge>
            ) : null}
            {typeof job.trust_score === "number" ? (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  job.trust_score >= 50
                    ? "text-surface-500 dark:text-surface-400"
                    : "text-amber-600 dark:text-amber-400",
                )}
                title={isRu ? "Оценка доверия" : "Ishonch bahosi"}
              >
                {job.trust_score >= 50 ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {Math.round(job.trust_score)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions — bookmark + quick apply on the right (mockup layout) */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            title={
              isSaved
                ? isRu
                  ? "Снять из сохранённых"
                  : "Saqlanganlardan olib tashlash"
                : isRu
                  ? "Сохранить вакансию"
                  : "Ishni saqlash"
            }
            aria-label={
              isSaved
                ? isRu
                  ? "Снять из сохранённых"
                  : "Saqlanganlardan olib tashlash"
                : isRu
                  ? "Сохранить вакансию"
                  : "Ishni saqlash"
            }
            className={cn(
              "rounded-xl border p-2 transition-colors",
              isSaved
                ? "border-brand-200 bg-brand-100 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/15"
                : "border-surface-200 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:border-surface-700 dark:hover:bg-surface-800",
            )}
          >
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>

          {isExternal ? (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 px-4 text-xs shadow-sm shadow-brand-500/30"
            >
              <Zap className="mr-1 h-3 w-3" />
              {isRu ? "Откликнуться" : "Ariza berish"}
            </Button>
          ) : applyRoute.kind === "internal" ? (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onQuickApply();
              }}
              className="rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 px-4 text-xs shadow-sm shadow-brand-500/30"
            >
              <Zap className="mr-1 h-3 w-3" />
              {isRu ? "Быстрый отклик" : "Tezkor ariza"}
            </Button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
