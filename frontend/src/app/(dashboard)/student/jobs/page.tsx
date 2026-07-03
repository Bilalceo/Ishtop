/**
 * =============================================================================
 * STUDENT DASHBOARD - Job Search Page
 * =============================================================================
 * Layout: horizontal FilterPillBar + 2-column (list | detail)
 * Components extracted to /components/jobs/
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Briefcase,
  Clock,
  Wallet,
  Target,
  Loader2,
  RotateCcw,
  Filter,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { jobApi, resumeApi } from "@/lib/api";
import { toast } from "sonner";
import type { Job } from "@/types/api";
import { useTranslation } from "@/hooks/useTranslation";
import { JobCard } from "@/components/jobs/JobCard";
import { JobDetailPanel } from "@/components/jobs/JobDetailPanel";
import { FilterPillBar } from "@/components/jobs/FilterPillBar";
import { SalarySlider, SALARY_MAX } from "@/components/jobs/SalarySlider";

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
// EMPTY STATE (right panel when no job selected)
// =============================================================================

function EmptyDetailState({ isRu }: { isRu: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-col items-center justify-center p-8 text-center"
    >
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-700">
        <Briefcase className="h-10 w-10 text-surface-400" />
      </div>
      <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
        {isRu ? "Выберите вакансию" : "Ishni tanlang"}
      </h3>
      <p className="mt-2 text-sm text-surface-500">
        {isRu ? "Подробности появятся здесь" : "Tafsilotlar bu yerda ko'rinadi"}
      </p>
    </motion.div>
  );
}

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
  } = useJobs();

  const [localJobs, setLocalJobs] = useState<(Job & { matchScore?: number })[]>(
    [],
  );
  const [selectedJob, setSelectedJob] = useState<
    (Job & { matchScore?: number }) | null
  >(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [feedMode, setFeedMode] = useState<"matched" | "all">("all");
  const [hasPublishedResume, setHasPublishedResume] = useState(false);
  const [hasCheckedResume, setHasCheckedResume] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSplitView, setShowSplitView] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const explainabilityViewedRef = useRef<Set<string>>(new Set());

  // Filters
  const [filters, setFilters] = useState({
    locations: [] as string[],
    jobTypes: [] as string[],
    experienceLevels: [] as string[],
    salaryRange: [0, SALARY_MAX] as [number, number],
    companies: [] as string[],
    datePosted: "all",
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    void loadJobsForFeedMode("all");
    jobApi
      .savedJobs({ limit: 100 })
      .then((res) => {
        const data = res.data?.data || res.data;
        if (Array.isArray(data)) {
          setSavedJobs(new Set(data.map((j: any) => j.id)));
        }
      })
      .catch(() => {});
  }, [loadJobsForFeedMode]);

  useEffect(() => {
    const updateViewport = () => setShowSplitView(window.innerWidth >= 1500);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    setLocalJobs(jobs as (Job & { matchScore?: number })[]);
  }, [jobs]);

  useEffect(() => {
    if (!isLoading) {
      setLoadTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setLoadTimedOut(true), 7000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  // -------------------------------------------------------------------------
  // Feed mode switching
  // -------------------------------------------------------------------------

  const switchToAllJobs = useCallback(async () => {
    setFeedMode("all");
    await loadJobsForFeedMode("all");
  }, [loadJobsForFeedMode]);

  const switchToMatchedJobs = useCallback(async () => {
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
    });
  };

  const activeFiltersCount =
    filters.locations.length +
    filters.jobTypes.length +
    filters.experienceLevels.length +
    filters.companies.length +
    (filters.salaryRange[0] > 0 || filters.salaryRange[1] < SALARY_MAX ? 1 : 0) +
    (filters.datePosted !== "all" ? 1 : 0);

  const filteredJobs = localJobs.filter((job) => {
    const matchesSearch =
      !searchQuery ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.requirements?.skills?.some((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesLocation =
      filters.locations.length === 0 ||
      filters.locations.some((loc) =>
        (job.location || "").toLowerCase().includes(loc.toLowerCase()),
      );

    const matchesJobType =
      filters.jobTypes.length === 0 || filters.jobTypes.includes(job.job_type);

    const matchesExperience =
      filters.experienceLevels.length === 0 ||
      filters.experienceLevels.includes(job.experience_level);

    const matchesSalary =
      (job.salary_max || 0) >= filters.salaryRange[0] &&
      (job.salary_min || 0) <= filters.salaryRange[1];

    const matchesCompany =
      filters.companies.length === 0 ||
      filters.companies.includes(job.company?.name || "");

    return (
      matchesSearch &&
      matchesLocation &&
      matchesJobType &&
      matchesExperience &&
      matchesSalary &&
      matchesCompany
    );
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case "salary":
        return (b.salary_max || 0) - (a.salary_max || 0);
      case "date":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "relevance":
      default:
        return (b.matchScore || 0) - (a.matchScore || 0);
    }
  });

  const isMatchedEmpty =
    feedMode === "matched" && !isLoading && sortedJobs.length === 0;

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
          job_id: typeof payload.job_id === "string" ? payload.job_id : undefined,
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
  // Infinite scroll
  // -------------------------------------------------------------------------

  // Load the next page of jobs (infinite scroll). Only paginates the "all
  // jobs" feed — the matched feed is fetched in full via matchJobs.
  const loadMore = useCallback(async () => {
    if (feedMode !== "all" || isLoading || isLoadingMore) return;
    if (currentPage >= totalPages) return;
    setIsLoadingMore(true);
    try {
      await fetchJobs(undefined, currentPage + 1, true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [feedMode, isLoading, isLoadingMore, currentPage, totalPages, fetchJobs]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { threshold: 0.1, rootMargin: "400px" },
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  // Auto-select first job on desktop
  useEffect(() => {
    if (sortedJobs.length > 0 && !selectedJob && showSplitView) {
      setSelectedJob(sortedJobs[0]);
    }
  }, [sortedJobs, showSplitView, selectedJob]);

  useEffect(() => {
    if (!selectedJob?.id || !selectedJob.explainability) return;
    if (explainabilityViewedRef.current.has(selectedJob.id)) return;
    explainabilityViewedRef.current.add(selectedJob.id);
    void trackFunnelEvent("view_explainability", {
      job_id: selectedJob.id,
      confidence: selectedJob.explainability.confidence,
      missing_count: selectedJob.explainability.missing_items.length,
    });
  }, [selectedJob, trackFunnelEvent]);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="flex h-[calc(100vh-64px)] min-w-0 flex-col bg-surface-50/60 dark:bg-surface-950">
      {/* Accessible page title — keeps a single H1 for SEO + screen readers without altering the visible search-led layout. */}
      <h1 className="sr-only">{isRu ? "Поиск вакансий" : "Ish o'rinlari"}</h1>
      {/* ------------------------------------------------------------------ */}
      {/* TOP HEADER: search + sort + filter pills                            */}
      {/* ------------------------------------------------------------------ */}
      <header className="shrink-0 border-b border-surface-200/80 bg-white/95 px-4 py-3 backdrop-blur dark:border-surface-700 dark:bg-surface-900/95 lg:px-6">
        {/* Row 1: search + feed tabs + sort */}
        <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap">
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

          {/* Mobile filter button */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowMobileFilters(true)}
          >
            <Filter className="mr-1 h-4 w-4" />
            {isRu ? "Фильтры" : "Filtrlar"}
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

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

        {/* Row 2: filter pills (hidden on mobile — they use the Dialog) */}
        <div className="mt-3 hidden lg:block">
          <FilterPillBar filters={filters} onChange={setFilters} isRu={isRu} />
        </div>

        {/* Row 3: results count + badges */}
        <div className="mt-2 flex items-center gap-3 text-xs text-surface-500">
          <span>
            {isRu ? "Найдено" : "Ko'rsatilmoqda"}:{" "}
            <span className="font-medium text-surface-900 dark:text-white">
              {sortedJobs.length}
            </span>{" "}
            {isRu ? "вакансий" : "ta ish"}
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
        <div className="mx-3 mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-100 lg:mx-4">
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

      {/* ------------------------------------------------------------------ */}
      {/* BODY: 2-column                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex min-w-0 flex-1 gap-4 overflow-hidden p-3 lg:p-4">
        {/* LEFT: job list */}
        <div
          className={cn(
            "w-full overflow-y-auto rounded-2xl border border-surface-200 bg-white shadow-sm dark:border-surface-700 dark:bg-surface-900",
            showSplitView && "lg:w-[420px] lg:shrink-0 xl:w-[460px]",
          )}
        >
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800"
                >
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                      <div className="flex gap-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sortedJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
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
                  {isRu
                    ? "Показать все вакансии"
                    : "Barcha ishlarni ko'rsatish"}
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
            <div className="space-y-3 p-3">
              <AnimatePresence>
                {sortedJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isSelected={selectedJob?.id === job.id}
                    isSaved={savedJobs.has(job.id)}
                    onSelect={() => setSelectedJob(job)}
                    onToggleSave={() => toggleSaveJob(job.id)}
                    onQuickApply={() => handleApply(job)}
                  />
                ))}
              </AnimatePresence>

              {/* Infinite scroll trigger + explicit "load more" fallback.
                  The observer auto-loads when the sentinel nears view; the
                  button guarantees pagination works regardless of the inner
                  scroll-container layout. */}
              <div ref={loadMoreRef} className="py-4 text-center">
                {isLoadingMore ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-surface-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isRu ? "Загружаем..." : "Yuklanmoqda..."}
                  </div>
                ) : feedMode === "all" && currentPage < totalPages ? (
                  <Button variant="outline" onClick={() => void loadMore()}>
                    {isRu ? "Показать ещё" : "Yana ko'rsatish"}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: detail panel — hidden below lg */}
        <div
          className={cn(
            "hidden min-w-0 flex-1 overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm dark:border-surface-700 dark:bg-surface-900",
            showSplitView && "block",
          )}
        >
          <AnimatePresence mode="wait">
            {selectedJob ? (
              <JobDetailPanel
                key={selectedJob.id}
                job={selectedJob}
                isSaved={savedJobs.has(selectedJob.id)}
                onClose={() => setSelectedJob(null)}
                onToggleSave={() => toggleSaveJob(selectedJob.id)}
                onApply={() => handleApply(selectedJob)}
                onShare={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/jobs/${selectedJob.id}`,
                  );
                  toast.success(
                    isRu
                      ? "Ссылка на вакансию скопирована."
                      : "Vakansiya havolasi nusxalandi.",
                  );
                }}
              />
            ) : (
              <EmptyDetailState key="empty" isRu={isRu} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE: job detail dialog (< lg)                                   */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={!!selectedJob && !showSplitView}
        onOpenChange={(open) => !open && setSelectedJob(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-hidden p-0">
          {selectedJob && (
            <JobDetailPanel
              job={selectedJob}
              isSaved={savedJobs.has(selectedJob.id)}
              onClose={() => setSelectedJob(null)}
              onToggleSave={() => toggleSaveJob(selectedJob.id)}
              onApply={() => handleApply(selectedJob)}
              onShare={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/jobs/${selectedJob.id}`,
                );
                toast.success(
                  isRu
                    ? "Ссылка на вакансию скопирована."
                    : "Vakansiya havolasi nusxalandi.",
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* MOBILE: filters dialog                                              */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isRu ? "Фильтры" : "Filtrlar"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Location */}
            <div>
              <p className="mb-2 text-sm font-medium">
                {isRu ? "Локация" : "Joylashuv"}
              </p>
              {[
                { value: "tashkent", label: isRu ? "Ташкент" : "Toshkent" },
                { value: "samarkand", label: isRu ? "Самарканд" : "Samarqand" },
                { value: "bukhara", label: isRu ? "Бухара" : "Buxoro" },
                { value: "remote", label: isRu ? "Удалённо" : "Masofaviy" },
                { value: "hybrid", label: isRu ? "Гибрид" : "Aralash" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 py-1"
                >
                  <input
                    type="checkbox"
                    checked={filters.locations.includes(opt.value)}
                    onChange={() => {
                      const next = filters.locations.includes(opt.value)
                        ? filters.locations.filter((v) => v !== opt.value)
                        : [...filters.locations, opt.value];
                      setFilters((prev) => ({ ...prev, locations: next }));
                    }}
                    className="h-4 w-4 rounded border-surface-300 text-brand-600"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>

            {/* Job Type */}
            <div>
              <p className="mb-2 text-sm font-medium">
                {isRu ? "Тип работы" : "Ish turi"}
              </p>
              {[
                {
                  value: "full_time",
                  label: isRu ? "Полная занятость" : "To'liq ish kuni",
                },
                {
                  value: "part_time",
                  label: isRu ? "Частичная занятость" : "Yarim kunlik",
                },
                { value: "internship", label: isRu ? "Стажировка" : "Amaliyot" },
                { value: "remote", label: isRu ? "Удалённо" : "Masofaviy" },
                { value: "hybrid", label: isRu ? "Гибрид" : "Aralash" },
                { value: "contract", label: isRu ? "Контракт" : "Shartnoma" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 py-1"
                >
                  <input
                    type="checkbox"
                    checked={filters.jobTypes.includes(opt.value)}
                    onChange={() => {
                      const next = filters.jobTypes.includes(opt.value)
                        ? filters.jobTypes.filter((v) => v !== opt.value)
                        : [...filters.jobTypes, opt.value];
                      setFilters((prev) => ({ ...prev, jobTypes: next }));
                    }}
                    className="h-4 w-4 rounded border-surface-300 text-brand-600"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>

            {/* Experience */}
            <div>
              <p className="mb-2 text-sm font-medium">
                {isRu ? "Опыт" : "Tajriba"}
              </p>
              {[
                { value: "intern", label: isRu ? "Стажёр" : "Amaliyotchi" },
                { value: "junior", label: isRu ? "Начинающий" : "Boshlovchi" },
                { value: "mid", label: isRu ? "Средний" : "O'rta" },
                { value: "senior", label: isRu ? "Старший" : "Katta" },
                { value: "lead", label: isRu ? "Руководитель" : "Rahbar" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 py-1"
                >
                  <input
                    type="checkbox"
                    checked={filters.experienceLevels.includes(opt.value)}
                    onChange={() => {
                      const next = filters.experienceLevels.includes(opt.value)
                        ? filters.experienceLevels.filter(
                            (v) => v !== opt.value,
                          )
                        : [...filters.experienceLevels, opt.value];
                      setFilters((prev) => ({
                        ...prev,
                        experienceLevels: next,
                      }));
                    }}
                    className="h-4 w-4 rounded border-surface-300 text-brand-600"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>

            {/* Salary */}
            <div>
              <p className="mb-2 text-sm font-medium">
                {isRu ? "Диапазон зарплаты" : "Maosh oralig'i"}
              </p>
              <SalarySlider
                value={filters.salaryRange}
                onChange={(val) =>
                  setFilters((prev) => ({ ...prev, salaryRange: val }))
                }
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={resetFilters} className="flex-1">
              {isRu ? "Сброс" : "Tozalash"}
            </Button>
            <Button
              onClick={() => setShowMobileFilters(false)}
              className="flex-1 bg-gradient-to-r from-brand-500 to-violet-600"
            >
              {isRu ? "Применить" : "Qo'llash"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
