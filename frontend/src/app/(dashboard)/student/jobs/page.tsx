/**
 * =============================================================================
 * STUDENT DASHBOARD - Job Search Page
 * =============================================================================
 * Layout: title + filter pills + one full-width, paginated job list.
 * Job details open on their own page (/student/jobs/[id]).
 * Components extracted to /components/jobs/
 */

"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Briefcase,
  Clock,
  Wallet,
  Target,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { jobApi, resumeApi } from "@/lib/api";
import { toast } from "sonner";
import type { Job } from "@/types/api";
import { useTranslation } from "@/hooks/useTranslation";
import { JobCard } from "@/components/jobs/JobCard";
import { FilterPillBar } from "@/components/jobs/FilterPillBar";
import { TelegramFollowBanner } from "@/components/TelegramFollowBanner";
import { SALARY_MAX } from "@/components/jobs/SalarySlider";

// =============================================================================
// SEARCH SUGGESTIONS
// =============================================================================

const getSearchSuggestions = (isRu: boolean): string[] =>
  isRu
    ? [
        "Менеджер по продажам",
        "Бухгалтер",
        "Маркетолог",
        "HR-специалист",
        "Логистика",
        "Учитель английского",
        "Переводчик",
        "Программист",
        "Дизайнер",
        "Оператор колл-центра",
      ]
    : [
        "Sotuv menejeri",
        "Buxgalter",
        "Marketolog",
        "HR mutaxassisi",
        "Logistika koordinatori",
        "Ingliz tili o'qituvchisi",
        "Tarjimon",
        "Dasturchi",
        "Dizayner",
        "Call-markaz operatori",
      ];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function JobsPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const router = useRouter();
  const {
    jobs,
    isLoading,
    fetchJobs,
    matchJobs,
    currentPage = 1,
    totalPages = 1,
    totalCount = 0,
  } = useJobs();

  const [localJobs, setLocalJobs] = useState<(Job & { matchScore?: number })[]>(
    [],
  );
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [feedMode, setFeedMode] = useState<"matched" | "all">("all");
  const [hasPublishedResume, setHasPublishedResume] = useState(false);
  const [hasCheckedResume, setHasCheckedResume] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  // True until the initial feed (matched-first, else all) has resolved — keeps
  // the skeleton up so we never flash an empty/all view before matches load.
  const [isInitializing, setIsInitializing] = useState(true);
  // Set once the user picks a tab, so the initial matched-first default never
  // overrides an explicit choice made while the first load was still running.
  const manualFeedChoiceRef = useRef(false);

  // Filters
  const [filters, setFilters] = useState({
    locations: [] as string[],
    jobTypes: [] as string[],
    experienceLevels: [] as string[],
    salaryRange: [0, SALARY_MAX] as [number, number],
    companies: [] as string[],
    datePosted: "all",
    isRemote: false,
  });

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const loadMatchedJobs = useCallback(async () => {
    setHasCheckedResume(true);

    const extractResumes = (response: any) => {
      const payload = response?.data?.data || response?.data;
      return Array.isArray(payload?.resumes)
        ? payload.resumes
        : Array.isArray(payload)
          ? payload
          : [];
    };

    // Prefer a published resume, but fall back to any resume (e.g. an AI-built
    // draft) so matching still works for users who haven't published yet.
    const publishedResp = await resumeApi.list({
      status: "published",
      page: 1,
      limit: 100,
    });
    let resumes = extractResumes(publishedResp);

    if (resumes.length === 0) {
      const anyResp = await resumeApi.list({ page: 1, limit: 100 });
      resumes = extractResumes(anyResp);
    }

    if (resumes.length === 0) {
      setHasPublishedResume(false);
      return false;
    }

    setHasPublishedResume(true);
    const bestResume = [...resumes].sort((a: any, b: any) => {
      const left = new Date(a?.updated_at || a?.created_at || 0).getTime();
      const right = new Date(b?.updated_at || b?.created_at || 0).getTime();
      return right - left;
    })[0];

    if (!bestResume?.id) return false;

    await matchJobs(bestResume.id);
    return true;
  }, [matchJobs]);

  const loadJobsForFeedMode = useCallback(
    async (mode: "matched" | "all") => {
      if (mode === "all") {
        await fetchJobs();
        return;
      }
      try {
        const ok = await loadMatchedJobs();
        if (!ok) {
          setFeedMode("all");
          await fetchJobs();
        }
      } catch {
        setFeedMode("all");
        await fetchJobs();
      }
    },
    [fetchJobs, loadMatchedJobs],
  );

  // Smart default on first load: show the student's matched jobs when they have
  // a resume, otherwise fall back to all jobs. Any failure (no resume, network,
  // API error) degrades gracefully to the all-jobs feed — the page is never
  // left empty. Respects an explicit tab choice made mid-load.
  const loadInitialFeed = useCallback(async () => {
    setIsInitializing(true);
    try {
      const ok = await loadMatchedJobs();
      if (manualFeedChoiceRef.current) return; // user already picked a tab
      if (ok) {
        setFeedMode("matched");
      } else {
        setFeedMode("all");
        await fetchJobs();
      }
    } catch {
      if (manualFeedChoiceRef.current) return;
      setFeedMode("all");
      await fetchJobs();
    } finally {
      setIsInitializing(false);
    }
  }, [fetchJobs, loadMatchedJobs]);

  useEffect(() => {
    void loadInitialFeed();
    jobApi
      .savedJobs({ limit: 100 })
      .then((res) => {
        const data = res.data?.data || res.data;
        if (Array.isArray(data)) {
          setSavedJobs(new Set(data.map((j: any) => j.id)));
        }
      })
      .catch(() => {});
  }, [loadInitialFeed]);

  useEffect(() => {
    setLocalJobs(jobs as (Job & { matchScore?: number })[]);
  }, [jobs]);

  useEffect(() => {
    if (!isLoading && !isInitializing) {
      setLoadTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setLoadTimedOut(true), 7000);
    return () => window.clearTimeout(timer);
  }, [isLoading, isInitializing]);

  // -------------------------------------------------------------------------
  // Feed mode switching
  // -------------------------------------------------------------------------

  const switchToAllJobs = useCallback(async () => {
    manualFeedChoiceRef.current = true;
    setFeedMode("all");
    await loadJobsForFeedMode("all");
  }, [loadJobsForFeedMode]);

  const switchToMatchedJobs = useCallback(async () => {
    manualFeedChoiceRef.current = true;
    try {
      const ok = await loadMatchedJobs();
      if (!ok) {
        toast.info(
          isRu
            ? "Опубликованное резюме не найдено. Сначала опубликуйте резюме."
            : "Nashr qilingan rezyume topilmadi. Avval rezyumeni nashr qiling.",
        );
        return;
      }
      setFeedMode("matched");
    } catch {
      toast.error(
        isRu
          ? "Не удалось загрузить подходящие вакансии."
          : "Mos ishlarni yuklashda xatolik yuz berdi.",
      );
    }
  }, [isRu, loadMatchedJobs]);

  // -------------------------------------------------------------------------
  // Filters / sort
  // -------------------------------------------------------------------------

  const resetFilters = () => {
    setFilters({
      locations: [],
      jobTypes: [],
      experienceLevels: [],
      salaryRange: [0, SALARY_MAX],
      companies: [],
      datePosted: "all",
      isRemote: false,
    });
  };

  // The "all" feed is filtered, searched and sorted by the server: it is paged,
  // so filtering the page in the browser would only ever search the 20 rows in
  // front of the user. The matched feed arrives complete, so it stays local.
  const isServerFiltered = feedMode === "all";

  const apiFilters = useMemo(
    () => ({
      search: searchQuery.trim(),
      location: filters.locations[0],
      job_type: filters.isRemote ? "remote" : filters.jobTypes[0],
      experience_level: filters.experienceLevels[0],
      salary_min:
        filters.salaryRange[0] > 0 ? filters.salaryRange[0] : undefined,
      salary_max:
        filters.salaryRange[1] < SALARY_MAX
          ? filters.salaryRange[1]
          : undefined,
      sort_by:
        sortBy === "date"
          ? ("created_at" as const)
          : sortBy === "salary"
            ? ("salary" as const)
            : ("relevance" as const),
    }),
    [searchQuery, filters, sortBy],
  );

  // Push filter changes to the server (debounced so typing doesn't spam it).
  useEffect(() => {
    if (!isServerFiltered || isInitializing) return;
    const t = window.setTimeout(() => {
      void fetchJobs(apiFilters, 1);
    }, 350);
    return () => window.clearTimeout(t);
    // fetchJobs is stable (useCallback with a ref); re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFilters, isServerFiltered, isInitializing]);

  const clientFiltered = isServerFiltered
    ? localJobs
    : localJobs.filter((job) => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          job.title.toLowerCase().includes(q) ||
          job.company?.name?.toLowerCase().includes(q) ||
          job.requirements?.some((skill) => skill.toLowerCase().includes(q));

        const matchesLocation =
          filters.locations.length === 0 ||
          filters.locations.some((loc) =>
            (job.location || "").toLowerCase().includes(loc.toLowerCase()),
          );

        const matchesJobType =
          filters.jobTypes.length === 0 ||
          filters.jobTypes.includes(job.job_type);

        const matchesRemote =
          !filters.isRemote ||
          job.job_type === "remote" ||
          job.job_type === "hybrid";

        const matchesExperience =
          filters.experienceLevels.length === 0 ||
          filters.experienceLevels.includes(job.experience_level);

        const matchesSalary =
          (job.salary_max || 0) >= filters.salaryRange[0] &&
          (job.salary_min || 0) <= filters.salaryRange[1];

        return (
          matchesSearch &&
          matchesLocation &&
          matchesJobType &&
          matchesRemote &&
          matchesExperience &&
          matchesSalary
        );
      });

  const sortedJobs = isServerFiltered
    ? clientFiltered
    : [...clientFiltered].sort((a, b) => {
        switch (sortBy) {
          case "salary":
            return (b.salary_max || 0) - (a.salary_max || 0);
          case "date":
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          case "relevance":
          default:
            return (b.matchScore || 0) - (a.matchScore || 0);
        }
      });

  const isMatchedEmpty =
    feedMode === "matched" &&
    !isLoading &&
    !isInitializing &&
    sortedJobs.length === 0;

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const toggleSaveJob = async (jobId: string) => {
    const isSaved = savedJobs.has(jobId);
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
    try {
      if (isSaved) {
        await jobApi.unsaveJob(jobId);
        toast.success(
          isRu
            ? "Вакансия удалена из сохранённых."
            : "Ish saqlanganlardan olib tashlandi.",
        );
      } else {
        await jobApi.saveJob(jobId);
        toast.success(
          isRu ? "Вакансия сохранена." : "Ish muvaffaqiyatli saqlandi.",
        );
      }
    } catch {
      setSavedJobs((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(jobId);
        else next.delete(jobId);
        return next;
      });
      toast.error(
        isRu
          ? "Не удалось обновить сохранённые вакансии."
          : "Saqlangan ishlar ro'yxatini yangilab bo'lmadi.",
      );
    }
  };

  const trackFunnelEvent = useCallback(
    async (eventName: string, payload: Record<string, unknown>) => {
      try {
        await jobApi.trackEvent({
          event_name: eventName,
          source: "student_jobs_page",
          metadata: payload,
          job_id:
            typeof payload.job_id === "string" ? payload.job_id : undefined,
        });
      } catch {
        // Intentionally non-blocking
      }
    },
    [],
  );

  const handleApply = (job: Job) => {
    if (job.explainability) {
      void trackFunnelEvent("apply_after_explainability", {
        job_id: job.id,
        confidence: job.explainability.confidence,
        missing_count: job.explainability.missing_items.length,
      });
    }
    router.push(`/student/jobs/${job.id}/apply`);
  };

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  // Paged navigation keeps only one page of cards mounted, so long searches
  // stay responsive (infinite scroll grew the DOM until the page stuttered).
  const goToPage = useCallback(
    async (page: number) => {
      if (feedMode !== "all" || isLoading || isLoadingPage) return;
      if (page < 1 || page > totalPages || page === currentPage) return;
      setIsLoadingPage(true);
      try {
        await fetchJobs(undefined, page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } finally {
        setIsLoadingPage(false);
      }
    },
    [feedMode, isLoading, isLoadingPage, totalPages, currentPage, fetchJobs],
  );

  // First, last and the pages around the current one; "gap" renders an ellipsis.
  const pageItems: (number | "gap")[] = (() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | "gap")[] = [1];
    const from = Math.max(2, currentPage - 1);
    const to = Math.min(totalPages - 1, currentPage + 1);
    if (from > 2) items.push("gap");
    for (let i = from; i <= to; i += 1) items.push(i);
    if (to < totalPages - 1) items.push("gap");
    items.push(totalPages);
    return items;
  })();

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="min-w-0 bg-surface-50/60 pb-10 dark:bg-surface-950">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER: title + search + sort + filter pills                        */}
      {/* ------------------------------------------------------------------ */}
      <header className="mx-auto w-full max-w-[1200px] px-4 pt-6 lg:px-6">
        <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white sm:text-3xl">
          {isRu ? "Найдите подходящую работу" : "O'zingizga mos ishni toping"}
        </h1>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
          {isRu
            ? "Сотни возможностей ждут вас. AI подберёт самые подходящие вакансии."
            : "Yuzlab imkoniyatlar sizni kutmoqda. AI sizga eng mos ishlarni tavsiya qiladi."}
        </p>

        {/* Row 1: search + feed tabs + sort */}
        <div className="mt-5 flex flex-wrap items-center gap-3 lg:flex-nowrap">
          {/* Search */}
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <Input
              type="text"
              placeholder={
                isRu
                  ? "Ищите вакансии, компании и навыки..."
                  : "Vakansiya, kompaniya, ko'nikmalarni qidiring..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="h-10 pl-9"
            />
            {/* Autocomplete */}
            <AnimatePresence>
              {showSuggestions && searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-surface-200 bg-white p-2 shadow-lg dark:border-surface-700 dark:bg-surface-800"
                >
                  {getSearchSuggestions(isRu)
                    .filter((s) =>
                      s.toLowerCase().includes(searchQuery.toLowerCase()),
                    )
                    .slice(0, 5)
                    .map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setSearchQuery(suggestion);
                          setShowSuggestions(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                      >
                        <Search className="h-4 w-4 text-surface-400" />
                        {suggestion}
                      </button>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Feed mode tabs */}
          <div className="hidden items-center gap-1 rounded-xl border border-surface-200 p-1 dark:border-surface-700 sm:flex">
            <Button
              type="button"
              size="sm"
              variant={feedMode === "matched" ? "default" : "ghost"}
              onClick={() => void switchToMatchedJobs()}
              className={cn(
                feedMode === "matched" &&
                  "bg-gradient-to-r from-brand-500 to-violet-600",
              )}
            >
              <Target className="mr-1 h-3.5 w-3.5" />
              {isRu ? "Подходящие" : "Mos ishlar"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={feedMode === "all" ? "default" : "ghost"}
              onClick={() => void switchToAllJobs()}
              className={cn(
                feedMode === "all" &&
                  "bg-gradient-to-r from-brand-500 to-violet-600",
              )}
            >
              <Briefcase className="mr-1 h-3.5 w-3.5" />
              {isRu ? "Все вакансии" : "Barcha ishlar"}
            </Button>
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44 shrink-0">
              <SelectValue placeholder={isRu ? "Сортировка" : "Saralash"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {isRu ? "По релевантности" : "Moslik bo'yicha"}
                </span>
              </SelectItem>
              <SelectItem value="date">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {isRu ? "Сначала новые" : "Eng yangi"}
                </span>
              </SelectItem>
              <SelectItem value="salary">
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  {isRu ? "Высокая зарплата" : "Yuqori maosh"}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 2: quick filter pills */}
        <div className="mt-3">
          <FilterPillBar filters={filters} onChange={setFilters} isRu={isRu} />
        </div>

        {/* Row 3: results count + badges */}
        <div className="mt-2 flex items-center gap-3 text-xs text-surface-500">
          <span>
            {isRu ? "Найдено вакансий" : "Topilgan ishlar"}:{" "}
            <span className="font-semibold text-surface-900 dark:text-white">
              {feedMode === "all" && totalPages > 1
                ? totalCount
                : sortedJobs.length}
            </span>{" "}
            {isRu ? "" : "ta"}
            {feedMode === "all" && totalPages > 1 && (
              <span className="text-surface-400">
                {" "}
                ({isRu ? "на странице" : "shu sahifada"}: {sortedJobs.length})
              </span>
            )}
          </span>
          {feedMode === "matched" && (
            <Badge variant="success" className="gap-1 text-xs">
              <Target className="h-3 w-3" />
              {isRu ? "По резюме" : "Rezyume asosida"}
            </Badge>
          )}
          {feedMode === "all" && hasCheckedResume && !hasPublishedResume && (
            <Badge variant="secondary" className="text-xs">
              {isRu ? "Резюме не найдено" : "Rezyume topilmadi"}
            </Badge>
          )}
        </div>
      </header>

      {loadTimedOut && (
        <div className="mx-auto mt-3 w-full max-w-[1200px] rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-100 lg:mx-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              {isRu
                ? "Загрузка занимает больше обычного. Проверьте соединение и попробуйте снова."
                : "Yuklash odatdagidan uzoq davom etmoqda. Aloqani tekshirib, qayta urinib ko'ring."}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadJobsForFeedMode(feedMode)}
              className="shrink-0"
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              {isRu ? "Повторить" : "Qayta urinish"}
            </Button>
          </div>
        </div>
      )}

      {/* Follow-on-Telegram nudge — job seekers get daily jobs in the channel */}
      <div className="mx-auto mt-4 w-full max-w-[1200px] px-4 lg:px-6">
        <TelegramFollowBanner storageKey="tg_follow_jobs" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* BODY: one full-width list (details open on their own page)          */}
      {/* ------------------------------------------------------------------ */}
      <div className="mx-auto mt-4 w-full max-w-[1200px] px-4 lg:px-6">
        {isLoading || isInitializing ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900"
              >
                <div className="flex gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-3 w-32" />
                    <div className="flex gap-3">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-surface-200 bg-white px-4 py-16 text-center dark:border-surface-700 dark:bg-surface-900">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-700">
              <Briefcase className="h-8 w-8 text-surface-400" />
            </div>
            <h3 className="font-semibold text-surface-900 dark:text-white">
              {isMatchedEmpty
                ? isRu
                  ? "Подходящие вакансии пока не найдены"
                  : "Mos ishlar hozircha topilmadi"
                : isRu
                  ? "Вакансии не найдены"
                  : "Ishlar topilmadi"}
            </h3>
            <p className="mt-2 text-sm text-surface-500">
              {isMatchedEmpty
                ? isRu
                  ? "Рекомендации зависят от вашего резюме. Посмотрите все вакансии или обновите резюме."
                  : "Tavsiyalar rezyumengizga bog'liq. Barcha ishlarni ko'ring yoki rezyumeni yangilang."
                : isRu
                  ? "Попробуйте изменить фильтры или поиск."
                  : "Filtrlar yoki qidiruvni o'zgartiring."}
            </p>
            {isMatchedEmpty ? (
              <Button
                variant="outline"
                onClick={() => void switchToAllJobs()}
                className="mt-4"
                size="sm"
              >
                <Briefcase className="mr-2 h-4 w-4" />
                {isRu ? "Показать все вакансии" : "Barcha ishlarni ko'rsatish"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="mt-4"
                size="sm"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {isRu ? "Сбросить фильтры" : "Filtrlarni tozalash"}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <AnimatePresence>
                {sortedJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isSelected={false}
                    isSaved={savedJobs.has(job.id)}
                    onSelect={() => router.push(`/student/jobs/${job.id}`)}
                    onToggleSave={() => toggleSaveJob(job.id)}
                    onQuickApply={() => handleApply(job)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Pagination — paged instead of infinite scroll so the DOM stays
              small and the page keeps scrolling smoothly on long searches.
              The matched feed arrives complete, so it needs no pages. */}
        {feedMode === "all" && totalPages > 1 && (
          <nav
            className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
            aria-label={isRu ? "Постраничная навигация" : "Sahifalar"}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              disabled={currentPage <= 1 || isLoadingPage}
              onClick={() => void goToPage(currentPage - 1)}
              aria-label={isRu ? "Предыдущая" : "Oldingi"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {pageItems.map((it, i) =>
              it === "gap" ? (
                <span key={`gap-${i}`} className="px-1 text-surface-400">
                  …
                </span>
              ) : (
                <Button
                  key={it}
                  variant={it === currentPage ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9 w-9 p-0",
                    it === currentPage &&
                      "bg-gradient-to-r from-brand-500 to-violet-600",
                  )}
                  disabled={isLoadingPage}
                  onClick={() => void goToPage(it)}
                  aria-current={it === currentPage ? "page" : undefined}
                >
                  {it}
                </Button>
              ),
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              disabled={currentPage >= totalPages || isLoadingPage}
              onClick={() => void goToPage(currentPage + 1)}
              aria-label={isRu ? "Следующая" : "Keyingi"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE: filters dialog                                              */}
    </div>
  );
}
