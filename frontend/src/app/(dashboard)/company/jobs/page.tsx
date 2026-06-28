/**
 * Company Jobs Page
 * Manage job postings
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Briefcase,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Users,
  Globe,
  Archive,
  TrendingUp,
  Clock,
  PauseCircle,
  PlayCircle,
  Copy,
} from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRelativeTime, formatSalaryRange } from "@/lib/utils";
import type { Job } from "@/types/api";

export default function CompanyJobsPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isRu = locale === "ru";
  const statusLabel: Record<string, string> = isRu
    ? { active: "Активная", draft: "Черновик", paused: "Приостановлена", closed: "Закрыта" }
    : { active: "Faol", draft: "Qoralama", paused: "Pauza", closed: "Yopilgan" };
  const {
    jobs,
    isLoading,
    fetchMyJobs,
    publishJob,
    pauseJob,
    reopenJob,
    closeJob,
    cloneJob,
    deleteJob,
  } = useJobs();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [closeDialogJob, setCloseDialogJob] = useState<Job | null>(null);
  const [closeReasonCode, setCloseReasonCode] = useState<"hired" | "other">("hired");
  const [closeReasonNote, setCloseReasonNote] = useState("");
  const [actionJobId, setActionJobId] = useState<string | null>(null);

  useEffect(() => {
    void fetchMyJobs();
  }, [fetchMyJobs]);

  const handleAction = async (action: string, job: Job) => {
    setActiveMenu(null);
    setActionJobId(job.id);
    try {
      if (action === "publish") await publishJob(job.id);
      if (action === "pause") await pauseJob(job.id);
      if (action === "reopen") await reopenJob(job.id);
      if (action === "clone") {
        const cloned = await cloneJob(job.id);
        if (cloned?.id) {
          router.push(`/company/jobs/${cloned.id}/edit`);
        }
      }
      if (action === "close") {
        setCloseReasonCode("hired");
        setCloseReasonNote("");
        setCloseDialogJob(job);
      }
    } finally {
      setActionJobId(null);
    }
    if (action === "delete") {
      if (confirm(t("companyJobsPage.deleteConfirm", { title: job.title }))) {
        await deleteJob(job.id);
      }
    }
  };

  const handleConfirmClose = async () => {
    if (!closeDialogJob) return;
    setActionJobId(closeDialogJob.id);
    try {
      await closeJob(closeDialogJob.id, {
        reason_code: closeReasonCode,
        reason_note: closeReasonNote.trim() || undefined,
      });
      setCloseDialogJob(null);
      setCloseReasonCode("hired");
      setCloseReasonNote("");
    } finally {
      setActionJobId(null);
    }
  };

  const activeJobs = jobs.filter((j) => j.status === "active");
  const draftJobs = jobs.filter((j) => j.status === "draft");
  const totalApplications = jobs.reduce((sum, j) => sum + (j.applications_count ?? 0), 0);
  const totalViews = jobs.reduce((sum, j) => sum + (j.views_count ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
            {t("companyJobsPage.title")}
          </h1>
          <p className="mt-1 text-surface-500">
            {t("companyJobsPage.subtitle")}
          </p>
        </div>
        <Link href="/company/jobs/new">
          <Button variant="gradient">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("companyJobsPage.postNewJob")}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-500/20">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">
                  {activeJobs.length}
                </p>
                <p className="text-sm text-surface-500">{t("companyJobsPage.activeJobs")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/20">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">
                  {totalApplications}
                </p>
                <p className="text-sm text-surface-500">{t("companyJobsPage.totalApplications")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/20">
                <Eye className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">
                  {totalViews}
                </p>
                <p className="text-sm text-surface-500">{t("companyJobsPage.totalViews")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-500/20">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-white">
                  {draftJobs.length}
                </p>
                <p className="text-sm text-surface-500">{t("companyJobsPage.drafts")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
              <Briefcase className="h-8 w-8 text-surface-400" />
            </div>
            <h3 className="font-display text-lg font-semibold text-surface-900 dark:text-white">
              {t("companyJobsPage.noJobsTitle")}
            </h3>
            <p className="mt-2 max-w-sm text-surface-500">
              {t("companyJobsPage.noJobsDescription")}
            </p>
            <Link href="/company/jobs/new">
              <Button className="mt-6" variant="gradient">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("companyJobsPage.postFirstJob")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="p-5">
                {(() => {
                  const views = Number(job.views_count || 0);
                  const apps = Number(job.applications_count || 0);
                  const conversion = views > 0 ? ((apps / views) * 100).toFixed(1) : "0.0";
                  return (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display text-lg font-semibold text-surface-900 dark:text-white">
                        {job.title}
                      </h3>
                      <Badge
                        className={
                          job.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : job.status === "paused"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                            : job.status === "closed"
                            ? "bg-surface-200 text-surface-700 dark:bg-surface-700 dark:text-surface-300"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300"
                        }
                      >
                        {statusLabel[job.status] || job.status}
                      </Badge>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-surface-500">
                      <span>{job.location}</span>
                      <span>{job.job_type?.replace("_", " ")}</span>
                      <span>{job.experience_level}</span>
                      {job.salary_min !== undefined && job.salary_max !== undefined && (
                        <span>{formatSalaryRange(job.salary_min, job.salary_max, locale, job.salary_currency || "USD")}</span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="mt-3 flex items-center gap-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-surface-400" />
                        <span className="font-medium text-surface-900 dark:text-white">
                          {job.applications_count}
                        </span>
                        <span className="text-surface-500">{t("companyJobsPage.applicants")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Eye className="h-4 w-4 text-surface-400" />
                        <span className="font-medium text-surface-900 dark:text-white">
                          {job.views_count}
                        </span>
                        <span className="text-surface-500">{t("companyJobsPage.views")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-surface-400" />
                        <span className="font-medium text-surface-900 dark:text-white">
                          {conversion}%
                        </span>
                        <span className="text-surface-500">{isRu ? "Конверсия" : "Konversiya"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-surface-500">
                        <Clock className="h-4 w-4" />
                        {t("companyJobsPage.posted")} {formatRelativeTime(job.created_at, locale)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link href={`/company/jobs/${job.id}/applicants`}>
                      <Button variant="outline" size="sm">
                        <Users className="mr-2 h-4 w-4" />
                        {t("companyJobsPage.viewApplicants")}
                      </Button>
                    </Link>
                    <Link href={`/company/jobs/${job.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>

                    {/* More menu */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionJobId === job.id}
                        onClick={() => setActiveMenu(activeMenu === job.id ? null : job.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>

                      {activeMenu === job.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setActiveMenu(null)}
                          />
                          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-surface-200 bg-white p-1 shadow-lg dark:border-surface-700 dark:bg-surface-800">
                            {job.status === "draft" && (
                              <button
                                onClick={() => handleAction("publish", job)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                              >
                                <Globe className="h-4 w-4" />
                                {t("companyJobsPage.publish")}
                              </button>
                            )}
                            {job.status === "active" && (
                              <button
                                onClick={() => handleAction("pause", job)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                              >
                                <PauseCircle className="h-4 w-4" />
                                {isRu ? "Поставить на паузу" : "Pauza qilish"}
                              </button>
                            )}
                            {job.status === "active" && (
                              <button
                                onClick={() => handleAction("close", job)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                              >
                                <Archive className="h-4 w-4" />
                                {isRu ? "Закрыть вакансию" : "Vakansiyani yopish"}
                              </button>
                            )}
                            {(job.status === "paused" || job.status === "closed" || job.status === "filled") && (
                              <button
                                onClick={() => handleAction("reopen", job)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                              >
                                <PlayCircle className="h-4 w-4" />
                                {isRu ? "Переоткрыть вакансию" : "Qayta ochish"}
                              </button>
                            )}
                            {job.status === "paused" && (
                              <button
                                onClick={() => handleAction("close", job)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                              >
                                <Archive className="h-4 w-4" />
                                {isRu ? "Закрыть вакансию" : "Vakansiyani yopish"}
                              </button>
                            )}
                            <button
                              onClick={() => handleAction("clone", job)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                            >
                              <Copy className="h-4 w-4" />
                              {isRu ? "Клонировать" : "Nusxa ko'chirish"}
                            </button>
                            <button
                              onClick={() => handleAction("delete", job)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              {t("common.delete")}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!closeDialogJob} onOpenChange={(open) => !open && setCloseDialogJob(null)}>
        <DialogContent className="max-sm:h-[100dvh] max-sm:w-screen max-sm:max-w-none max-sm:rounded-none max-sm:border-0">
          <DialogHeader>
            <DialogTitle>{isRu ? "Закрыть вакансию" : "Vakansiyani yopish"}</DialogTitle>
            <DialogDescription>
              {isRu
                ? "Причину можно указать для внутренней аналитики."
                : "Sababni ixtiyoriy tarzda ko'rsatishingiz mumkin."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{isRu ? "Причина" : "Sabab"}</Label>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setCloseReasonCode("hired")}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${closeReasonCode === "hired" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-surface-300 text-surface-700"}`}
                >
                  {isRu ? "Кандидат найден" : "Yollanuvchi topildi"}
                </button>
                <button
                  type="button"
                  onClick={() => setCloseReasonCode("other")}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${closeReasonCode === "other" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-surface-300 text-surface-700"}`}
                >
                  {isRu ? "Другая причина" : "Boshqa sabab"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="close-reason-note">{isRu ? "Комментарий (необязательно)" : "Izoh (ixtiyoriy)"}</Label>
              <Textarea
                id="close-reason-note"
                value={closeReasonNote}
                onChange={(event) => setCloseReasonNote(event.target.value)}
                placeholder={isRu ? "Короткий комментарий..." : "Qisqa izoh..."}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogJob(null)}>
              {isRu ? "Отмена" : "Bekor qilish"}
            </Button>
            <Button onClick={handleConfirmClose} disabled={!closeDialogJob || actionJobId === closeDialogJob.id}>
              {actionJobId === closeDialogJob?.id ? (isRu ? "Закрывается..." : "Yopilmoqda...") : (isRu ? "Закрыть" : "Yopish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}















