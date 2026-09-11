"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Wallet,
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
  const botUrl = applyRoute.kind === "bot" ? applyRoute.url : undefined;

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
        {/* Logo */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 text-base font-bold text-brand-700 dark:from-brand-900/50 dark:to-violet-900/50 dark:text-brand-300">
          {(company || displayTitle)?.charAt(0)?.toUpperCase() || "?"}
        </div>

        {/* Title, company, meta and chips */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-semibold leading-tight text-surface-900 dark:text-white">
            {displayTitle}
          </h3>
          {company && (
            <p className="mt-0.5 truncate text-sm text-surface-500 dark:text-surface-400">
              {company}
            </p>
          )}

          {/* Meta row: location, salary, posted */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-surface-500">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              {formatSalaryRange(
                job.salary_min,
                job.salary_max,
                isRu ? "ru" : "uz",
                job.salary_currency || "UZS",
              ) || (isRu ? "Зарплата не указана" : "Maosh ko'rsatilmagan")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(job.created_at, isRu ? "ru" : "uz")}
            </span>
          </div>

          {/* Chips: match, trust, job type */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
                {job.trust_score >= 50 ? (
                  <ShieldCheck className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                {Math.round(job.trust_score)} {isRu ? "доверие" : "ishonch"}
              </Badge>
            ) : null}
            {job.job_type && (
              <Badge variant="secondary" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {jobTypeLabel(job.job_type, isRu)}
              </Badge>
            )}
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

          {botUrl ? (
            <a
              href={botUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="sm"
                className="rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 px-4 text-xs shadow-sm shadow-brand-500/30"
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                {isRu ? "Откликнуться" : "Ariza berish"}
              </Button>
            </a>
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
