"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Search,
  LayoutList,
  LayoutGrid,
  Mail,
  Calendar,
  FileText,
  CheckSquare,
  Square,
  Send,
  Loader2,
  Tags,
} from "lucide-react";
import { applicationApi, getErrorMessage, jobApi } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Application, KnownApplicationStatus } from "@/types/api";
import { toast } from "sonner";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const STATUS_FLOW: Array<{
  key: KnownApplicationStatus;
  labelUz: string;
  labelRu: string;
  tone: string;
}> = [
  { key: "pending", labelUz: "Yangi ariza", labelRu: "Новая заявка", tone: "border-yellow-200 bg-yellow-50 dark:border-yellow-500/30 dark:bg-yellow-500/10" },
  { key: "reviewing", labelUz: "Ko'rib chiqilmoqda", labelRu: "На проверке", tone: "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10" },
  { key: "shortlisted", labelUz: "Saralangan", labelRu: "Шорт-лист", tone: "border-purple-200 bg-purple-50 dark:border-purple-500/30 dark:bg-purple-500/10" },
  { key: "interview", labelUz: "Intervyu", labelRu: "Интервью", tone: "border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10" },
  { key: "accepted", labelUz: "Taklif", labelRu: "Оффер", tone: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10" },
  { key: "hired", labelUz: "Yollandi", labelRu: "Нанят", tone: "border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10" },
  { key: "rejected", labelUz: "Rad etildi", labelRu: "Отклонен", tone: "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10" },
];

function parseMatchScore(score?: string | null): number {
  if (!score) return 0;
  const digits = String(score).replace(/[^0-9.]/g, "");
  return digits ? Number.parseFloat(digits) : 0;
}

export default function JobApplicantsPage() {
  const params = useParams();
  const jobId = params!.id as string;
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  const [jobTitle, setJobTitle] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<KnownApplicationStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draggedApplicationId, setDraggedApplicationId] = useState<string | null>(null);

  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");

  const refreshData = async () => {
    setLoading(true);
    try {
      const [jobRes, applicationsRes] = await Promise.all([
        jobApi.get(jobId),
        applicationApi.companyList({ job_id: jobId, page: 1, page_size: 200 }),
      ]);

      const jobPayload = jobRes.data as { data?: { title?: string } };
      const applicationsPayload = applicationsRes.data as {
        data?: { applications?: Application[] };
      };

      setJobTitle(jobPayload.data?.title || "");
      setApplications(applicationsPayload.data?.applications || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  useEffect(() => {
    const validIds = new Set(applications.map((application) => application.id));
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [applications]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const app of applications) {
      for (const tag of app.tags || []) {
        const normalized = tag.trim();
        if (normalized) set.add(normalized);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return applications
      .filter((application) => {
        const matchesSearch =
          !query ||
          application.applicant?.full_name?.toLowerCase().includes(query) ||
          application.applicant?.email?.toLowerCase().includes(query) ||
          application.resume?.title?.toLowerCase().includes(query);

        const matchesStatus = statusFilter === "all" || application.status === statusFilter;
        const matchesTag =
          tagFilter === "all" ||
          (application.tags || []).some((tag) => tag.toLowerCase() === tagFilter.toLowerCase());

        return matchesSearch && matchesStatus && matchesTag;
      })
      .sort((a, b) => new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime());
  }, [applications, searchQuery, statusFilter, tagFilter]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allFilteredSelected =
    filteredApplications.length > 0 &&
    filteredApplications.every((application) => selectedSet.has(application.id));

  const toggleRow = (applicationId: string) => {
    setSelectedIds((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredApplications.map((application) => application.id);
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of filteredIds) next.add(id);
      return Array.from(next);
    });
  };

  const moveApplicationToStatus = async (
    applicationId: string,
    nextStatus: KnownApplicationStatus
  ) => {
    setUpdatingId(applicationId);
    try {
      const response = await applicationApi.updateStatus(applicationId, { status: nextStatus });
      const updated = (response.data as { data?: Application }).data;
      setApplications((prev) =>
        prev.map((application) =>
          application.id === applicationId
            ? { ...application, ...(updated || {}), status: nextStatus }
            : application
        )
      );
      toast.success(isRu ? "Статус обновлен" : "Holat yangilandi");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUpdatingId(null);
    }
  };

  const onDropToColumn = async (status: KnownApplicationStatus) => {
    if (!draggedApplicationId) return;
    await moveApplicationToStatus(draggedApplicationId, status);
    setDraggedApplicationId(null);
  };

  const runBulkStatus = async (status: KnownApplicationStatus) => {
    if (selectedIds.length === 0) return;
    if (status === "interview") {
      toast.info(
        isRu
          ? "Интервью нельзя обновить массово."
          : "Intervyu holatini ommaviy o'zgartirib bo'lmaydi."
      );
      return;
    }

    setIsBulkLoading(true);
    try {
      await applicationApi.bulkStatusUpdate({ application_ids: selectedIds, status });
      toast.success(isRu ? "Статусы обновлены" : "Holatlar yangilandi");
      setSelectedIds([]);
      await refreshData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsBulkLoading(false);
    }
  };

  const runBulkEmail = async () => {
    const subject = bulkSubject.trim();
    const body = bulkBody.trim();

    if (!subject || !body || selectedIds.length === 0) {
      toast.error(isRu ? "Заполните тему и текст" : "Mavzu va matnni to'ldiring");
      return;
    }

    setIsBulkLoading(true);
    try {
      await applicationApi.bulkSendEmail({
        application_ids: selectedIds,
        subject,
        body,
        template_key: "bulk_manual",
      });
      toast.success(isRu ? "Письма отправлены" : "Xatlar yuborildi");
      setEmailDialogOpen(false);
      setBulkSubject("");
      setBulkBody("");
      setSelectedIds([]);
      await refreshData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsBulkLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<KnownApplicationStatus, Application[]>();
    for (const status of STATUS_FLOW.map((item) => item.key)) map.set(status, []);

    for (const app of filteredApplications) {
      if (map.has(app.status as KnownApplicationStatus)) {
        map.get(app.status as KnownApplicationStatus)!.push(app);
      }
    }

    return map;
  }, [filteredApplications]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/company/jobs"
          className="inline-flex items-center gap-1 text-sm text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {isRu ? "Назад к вакансиям" : "Vakansiyalarga qaytish"}
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-brand-500" />
            {jobTitle || (isRu ? "Кандидаты по вакансии" : "Vakansiya nomzodlari")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
                placeholder={isRu ? "Поиск кандидатов..." : "Nomzod qidirish..."}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as KnownApplicationStatus | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder={isRu ? "Все статусы" : "Barcha holatlar"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRu ? "Все статусы" : "Barcha holatlar"}</SelectItem>
                {STATUS_FLOW.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {isRu ? item.labelRu : item.labelUz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger>
                <SelectValue placeholder={isRu ? "Все теги" : "Barcha teglar"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRu ? "Все теги" : "Barcha teglar"}</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="inline-flex items-center rounded-lg border border-surface-200 p-1 dark:border-surface-700">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === "list"
                    ? "bg-brand-600 text-white"
                    : "text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                {isRu ? "Список" : "List view"}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === "kanban"
                    ? "bg-brand-600 text-white"
                    : "text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                {isRu ? "Канбан" : "Kanban view"}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedIds.length > 0 && (
        <Card className="border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium text-brand-900 dark:text-brand-200">
              {isRu ? `${selectedIds.length} кандидатов выбрано` : `${selectedIds.length} nomzod tanlandi`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value=""
                onValueChange={(value) => {
                  if (value) void runBulkStatus(value as KnownApplicationStatus);
                }}
                disabled={isBulkLoading}
              >
                <SelectTrigger className="w-48 bg-white dark:bg-surface-900">
                  <SelectValue placeholder={isRu ? "Изменить статус" : "Holat o'zgartirish"} />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FLOW.filter((status) => status.key !== "interview").map((status) => (
                    <SelectItem key={status.key} value={status.key}>
                      {isRu ? status.labelRu : status.labelUz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setEmailDialogOpen(true)}
                disabled={isBulkLoading}
              >
                <Send className="mr-2 h-4 w-4" />
                {isRu ? "Отправить письмо" : "Xat yuborish"}
              </Button>

              <Button
                variant="destructive"
                onClick={() => void runBulkStatus("rejected")}
                disabled={isBulkLoading}
              >
                {isBulkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isRu ? "Отклонить" : "Rad etish"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </CardContent>
        </Card>
      ) : filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-10 w-10 text-surface-400" />
            <h3 className="mt-3 text-lg font-semibold text-surface-900 dark:text-white">
              {isRu ? "Кандидаты не найдены" : "Nomzodlar topilmadi"}
            </h3>
            <p className="mt-2 text-sm text-surface-500">
              {isRu
                ? "По этой вакансии пока нет заявок."
                : "Ushbu vakansiya uchun hozircha arizalar yo'q."}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-500 md:hidden dark:border-surface-700">
              <span>{isRu ? "Кандидаты" : "Nomzodlar"}</span>
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                className="inline-flex items-center gap-1 rounded border border-surface-300 px-2 py-1 text-[11px] text-surface-700 dark:border-surface-600 dark:text-surface-200"
              >
                {allFilteredSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {isRu ? "Выбрать все" : "Hammasini tanlash"}
              </button>
            </div>
            <div className="hidden md:grid md:grid-cols-[44px_1fr_auto_auto] items-center border-b border-surface-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:border-surface-700">
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-surface-300 text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800"
                aria-label={isRu ? "Выбрать все" : "Hammasini tanlash"}
              >
                {allFilteredSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </button>
              <span>{isRu ? "Кандидат" : "Nomzod"}</span>
              <span>{isRu ? "Статус" : "Holat"}</span>
              <span>{isRu ? "Действия" : "Amallar"}</span>
            </div>

            <div className="divide-y divide-surface-200 dark:divide-surface-700">
              {filteredApplications.map((application) => (
                <div key={application.id} className="grid grid-cols-1 items-start gap-3 p-4 md:grid-cols-[44px_1fr_auto_auto]">
                  <button
                    type="button"
                    onClick={() => toggleRow(application.id)}
                    className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded border border-surface-300 text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800 md:justify-self-start"
                    aria-label={isRu ? "Выбрать кандидата" : "Nomzodni tanlash"}
                  >
                    {selectedSet.has(application.id) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={application.applicant?.full_name || (isRu ? "Кандидат" : "Nomzod")}
                        imageUrl={application.applicant?.avatar_url}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <h3 className="truncate font-medium text-surface-900 dark:text-white">
                          {application.applicant?.full_name || (isRu ? "Неизвестно" : "Noma'lum")}
                        </h3>
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-surface-500">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{application.applicant?.email || "—"}</span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-surface-500">
                          <Calendar className="h-4 w-4" />
                          {formatRelativeTime(application.applied_at, locale)}
                        </p>
                      </div>
                    </div>

                    {(application.tags || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(application.tags || []).map((tag) => (
                          <span
                            key={`${application.id}-${tag}`}
                            className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-200"
                          >
                            <Tags className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 md:min-w-[150px]">
                    <p className="text-left text-lg font-bold text-brand-600 md:text-center">{parseMatchScore(application.match_score).toFixed(0)}%</p>
                    <Select
                      value={(application.status as KnownApplicationStatus) || "pending"}
                      onValueChange={(value) =>
                        void moveApplicationToStatus(application.id, value as KnownApplicationStatus)
                      }
                    >
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_FLOW.map((status) => (
                          <SelectItem key={status.key} value={status.key}>
                            {isRu ? status.labelRu : status.labelUz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <Link href={`/company/applicants/${application.id}`}>
                      <Button variant="outline" size="sm">
                        <FileText className="mr-1 h-3.5 w-3.5" />
                        {isRu ? "Открыть" : "Ko'rish"}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STATUS_FLOW.map((column) => {
            const items = grouped.get(column.key) || [];
            return (
              <div
                key={column.key}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void onDropToColumn(column.key)}
                className={`min-h-[320px] min-w-[260px] flex-1 rounded-2xl border p-3 sm:min-w-[280px] ${column.tone}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-surface-700 dark:text-surface-200">
                    {isRu ? column.labelRu : column.labelUz}
                  </p>
                  <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-surface-700 dark:bg-surface-900 dark:text-surface-200">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((application) => (
                    <div
                      key={application.id}
                      draggable
                      onDragStart={() => setDraggedApplicationId(application.id)}
                      className="cursor-grab rounded-xl border border-surface-200 bg-white p-3 shadow-sm transition-colors hover:border-brand-300 dark:border-surface-700 dark:bg-surface-900"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <UserAvatar
                          name={application.applicant?.full_name || (isRu ? "Кандидат" : "Nomzod")}
                          imageUrl={application.applicant?.avatar_url}
                          size="sm"
                        />
                        <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">
                          {application.applicant?.full_name || (isRu ? "Неизвестно" : "Noma'lum")}
                        </p>
                      </div>

                      <p className="text-xs text-surface-500">{application.resume?.title || (isRu ? "Без должности" : "Lavozim ko'rsatilmagan")}</p>
                      <p className="mt-1 text-xs text-surface-500">{formatDate(application.applied_at)}</p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-brand-600">{parseMatchScore(application.match_score).toFixed(0)}%</span>
                        <Link href={`/company/applicants/${application.id}`}>
                          <button type="button" className="text-xs font-semibold text-brand-600 hover:underline">
                            {isRu ? "Открыть" : "Ko'rish"}
                          </button>
                        </Link>
                      </div>

                      {(application.tags || []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(application.tags || []).slice(0, 3).map((tag) => (
                            <span
                              key={`${application.id}-kanban-${tag}`}
                              className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {updatingId === application.id && (
                        <div className="mt-2 inline-flex items-center gap-1 text-xs text-surface-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {isRu ? "Обновление..." : "Yangilanmoqda..."}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-sm:h-[100dvh] max-sm:w-screen max-sm:max-w-none max-sm:rounded-none max-sm:border-0">
          <DialogHeader>
            <DialogTitle>{isRu ? "Массовая отправка писем" : "Ommaviy xat yuborish"}</DialogTitle>
            <DialogDescription>
              {isRu
                ? "Выбранным кандидатам будет отправлено одинаковое сообщение."
                : "Tanlangan nomzodlarga bir xil xabar yuboriladi."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bulk-subject">{isRu ? "Тема" : "Mavzu"}</Label>
              <Input
                id="bulk-subject"
                value={bulkSubject}
                onChange={(event) => setBulkSubject(event.target.value)}
                placeholder={isRu ? "Например: Следующий этап" : "Masalan: Keyingi bosqich"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-body">{isRu ? "Текст" : "Matn"}</Label>
              <Textarea
                id="bulk-body"
                rows={7}
                value={bulkBody}
                onChange={(event) => setBulkBody(event.target.value)}
                placeholder={isRu ? "Здравствуйте, ..." : "Assalomu alaykum, ..."}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              {isRu ? "Отмена" : "Bekor qilish"}
            </Button>
            <Button onClick={() => void runBulkEmail()} disabled={isBulkLoading}>
              {isBulkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isRu ? "Отправить" : "Yuborish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
