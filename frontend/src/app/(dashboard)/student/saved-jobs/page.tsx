"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookmarkCheck,
  MapPin,
  Wallet,
  Clock,
  Building2,
  Briefcase,
  Trash2,
  Loader2,
  Search,
  Globe,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/ui/skeleton";
import { jobApi } from "@/lib/api";
import { formatRelativeTime, formatSalaryRange, cn, stripHtmlTags } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

const getJobTypeLabels = (isRu: boolean): Record<string, string> => ({
  full_time: isRu ? "Полная занятость" : "To'liq stavka",
  part_time: isRu ? "Частичная занятость" : "Yarim stavka",
  remote: isRu ? "Удалённо" : "Masofaviy",
  hybrid: isRu ? "Гибрид" : "Gibrid",
  contract: isRu ? "Контракт" : "Shartnoma",
  internship: isRu ? "Стажировка" : "Amaliyot",
});

const jobTypeColors: Record<string, string> = {
  full_time: "bg-green-100 text-green-700",
  part_time: "bg-blue-100 text-blue-700",
  remote: "bg-emerald-100 text-emerald-700",
  hybrid: "bg-cyan-100 text-cyan-700",
  contract: "bg-orange-100 text-orange-700",
  internship: "bg-pink-100 text-pink-700",
};

interface SavedJobItem {
  id: string;
  title: string;
  description: string;
  location: string;
  job_type: string;
  experience_level: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  status: string;
  applications_count: number;
  created_at: string;
  saved_at: string;
  company?: { name: string; logo_url?: string };
}

export default function SavedJobsPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const jobTypeLabels = getJobTypeLabels(isRu);
  const [jobs, setJobs] = useState<SavedJobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedJobs = async () => {
      try {
        setIsLoading(true);
        const res = await jobApi.savedJobs();
        const data = res.data?.data || res.data;
        setJobs(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Saqlangan ishlarni yuklashda xatolik.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSavedJobs();
  }, []);

  const handleRemove = async (jobId: string) => {
    setRemovingId(jobId);
    try {
      await jobApi.unsaveJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success(isRu ? "Вакансия удалена из сохранённых." : "Ish saqlanganlar ro'yxatidan o'chirildi.");
    } catch {
      toast.error("O'chirishda xatolik yuz berdi.");
    } finally {
      setRemovingId(null);
    }
  };

  const filtered = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.company?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.location || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-surface-900">
            <BookmarkCheck className="h-6 w-6 text-emerald-600" />
            Saqlangan ishlar
          </h1>
          <p className="mt-1 text-sm text-surface-500">
            {jobs.length} {isRu ? "сохранённых вакансий" : "ta saqlangan ish"}
          </p>
        </div>
        <Link href="/student/jobs">
          <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
            <Search className="mr-2 h-4 w-4" />
            Ishlarni ko'rish
          </Button>
        </Link>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ish yoki kompaniya qidirish..."
          className="pl-10"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-300 py-24 text-center"
        >
          <BookmarkCheck className="h-16 w-16 text-surface-300" />
          <h3 className="mt-4 text-lg font-semibold text-surface-700">
            {searchQuery
              ? (isRu ? "По вашему запросу ничего не найдено" : "Qidiruv bo'yicha natija topilmadi")
              : (isRu ? "Пока нет сохранённых вакансий" : "Hali saqlangan ish yo'q")}
          </h3>
          <p className="mt-2 text-sm text-surface-500">
            {searchQuery
              ? "Boshqa kalit so'z kiriting."
              : "Ishlarni ko'rib, yoqqanlarini saqlang."}
          </p>
          {!searchQuery && (
            <Link href="/student/jobs" className="mt-4">
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600">
                <Search className="mr-2 h-4 w-4" />
                Ishlarni ko'rish
              </Button>
            </Link>
          )}
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((job, i) => {
              const companyName = job.company?.name || "Kompaniya";
              const companyLetter = companyName[0]?.toUpperCase() || "K";

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative flex flex-col rounded-2xl border border-surface-200 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md dark:border-surface-700 dark:bg-surface-800 dark:hover:border-emerald-700"
                >
                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(job.id)}
                    disabled={removingId === job.id}
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-surface-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  >
                    {removingId === job.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>

                  {/* Company */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                      {companyLetter}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-surface-900">{companyName}</p>
                      <p className="flex items-center gap-1 text-xs text-surface-500">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(job.saved_at, locale)} {isRu ? "сохранено" : "saqlangan"}
                      </p>
                    </div>
                  </div>

                  {/* Title */}
                  <Link href={`/student/jobs/${job.id}`}>
                    <h3 className="mt-3 text-base font-bold text-surface-900 hover:text-emerald-600 transition-colors">
                      {job.title}
                    </h3>
                  </Link>

                  {/* Description */}
                  <p className="mt-1 line-clamp-2 text-sm text-surface-500">
                    {stripHtmlTags(job.description)}
                  </p>

                  {/* Info */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-surface-500">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                    )}
                    {(job.salary_min || job.salary_max) && (
                      <span className="flex items-center gap-1 font-medium text-green-600">
                        <Wallet className="h-3 w-3" />
                        {formatSalaryRange(job.salary_min, job.salary_max, "uz", job.salary_currency || "USD")}
                      </span>
                    )}
                  </div>

                  {/* Tags + Apply */}
                  <div className="mt-4 flex items-center justify-between">
                    <Badge
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs",
                        jobTypeColors[job.job_type] || "bg-surface-100 text-surface-600"
                      )}
                    >
                      {jobTypeLabels[job.job_type] || job.job_type}
                    </Badge>
                    <Link href={`/student/jobs/${job.id}/apply`}>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-xs"
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        Ariza
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
