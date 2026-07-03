"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  FileText,
  Mail,
  MapPin,
  CheckSquare,
  Square,
  Send,
  Loader2,
  Tags,
} from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { applicationApi, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import type { Application, KnownApplicationStatus } from "@/types/api";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STATUS_KEYS: Array<KnownApplicationStatus> = [
  "pending",
  "reviewing",
  "shortlisted",
  "interview",
  "accepted",
  "hired",
  "rejected",
  "withdrawn",
];

function parseMatchScore(score?: string | null): number {
  if (!score) return -1;
  const digits = String(score).replace(/[^0-9.]/g, "");
  return digits ? Number.parseFloat(digits) : -1;
}

export default function CompanyApplicantsPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const { jobs, fetchMyJobs } = useJobs();

  const [isLoading, setIsLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);

  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<KnownApplicationStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"match" | "applied" | "name">("match");
  const [topOnly, setTopOnly] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");

  useEffect(() => {
    void fetchMyJobs();
  }, [fetchMyJobs]);

  useEffect(() => {
    const loadApplications = async () => {
      setIsLoading(true);
      try {
        const response = await applicationApi.companyList({
          job_id: selectedJob === "all" ? undefined : selectedJob,
          page: 1,
          page_size: 200,
        });
        const payload = response.data as {
          data?: { applications?: Application[] };
        };
        setApplications(payload.data?.applications || []);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadApplications();
  }, [selectedJob]);

  const statusLabels: Record<KnownApplicationStatus, string> = isRu
    ? {
        pending: "Ожидание",
        reviewing: "Проверка",
        shortlisted: "Шорт-лист",
        interview: "Интервью",
        accepted: "Оффер",
        hired: "Нанят",
        rejected: "Отклонен",
        withdrawn: "Отозвано",
      }
    : {
        pending: "Yangi ariza",
        reviewing: "Ko'rib chiqilmoqda",
        shortlisted: "Saralangan",
        interview: "Intervyu",
        accepted: "Taklif",
        hired: "Yollandi",
        rejected: "Rad etildi",
        withdrawn: "Qaytarib olindi",
      };

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
    return applications
      .filter((app) => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          app.applicant?.full_name?.toLowerCase().includes(q) ||
          app.applicant?.email?.toLowerCase().includes(q) ||
          app.job?.title?.toLowerCase().includes(q);

        const matchesStatus = statusFilter === "all" || app.status === statusFilter;
        const matchesTop = !topOnly || parseMatchScore(app.match_score) >= 70;
        const matchesTag =
          tagFilter === "all" ||
          (app.tags || []).some((tag) => tag.toLowerCase() === tagFilter.toLowerCase());

        return matchesSearch && matchesStatus && matchesTop && matchesTag;
      })
      .sort((a, b) => {
        if (sortBy === "match") {
          return parseMatchScore(b.match_score) - parseMatchScore(a.match_score);
        }
        if (sortBy === "name") {
          return (a.applicant?.full_name || "").localeCompare(b.applicant?.full_name || "");
        }
        return new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime();
      });
  }, [applications, searchQuery, statusFilter, tagFilter, topOnly, sortBy]);

  useEffect(() => {
    const validIds = new Set(applications.map((app) => app.id));
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [applications]);

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

  const refreshList = async () => {
    setIsLoading(true);
    try {
      const response = await applicationApi.companyList({
        job_id: selectedJob === "all" ? undefined : selectedJob,
        page: 1,
        page_size: 200,
      });
      const payload = response.data as {
        data?: { applications?: Application[] };
      };
      setApplications(payload.data?.applications || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (applicationId: string, newStatus: KnownApplicationStatus) => {
    try {
      const response = await applicationApi.updateStatus(applicationId, { status: newStatus });
      const updated = (response.data as { data?: Application }).data;
      setApplications((prev) =>
        prev.map((item) =>
          item.id === applicationId ? { ...item, ...(updated || {}), status: newStatus } : item
        )
      );
      toast.success(isRu ? "Статус обновлен" : "Holat yangilandi");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const runBulkStatus = async (status: KnownApplicationStatus) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);
    try {
      await applicationApi.bulkStatusUpdate({
        application_ids: selectedIds,
        status,
      });
      toast.success(isRu ? "Статусы обновлены" : "Holatlar yangilandi");
      setSelectedIds([]);
      await refreshList();
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
      await refreshList();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsBulkLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
          {isRu ? "Кандидаты" : "Nomzodlar"}
        </h1>
        <p className="mt-1 text-surface-500">
          {isRu
            ? "Просматривайте и управляйте кандидатами по вашим вакансиям"
            : "Vakansiyalaringiz bo'yicha nomzodlarni ko'ring va boshqaring"}
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-400" />
              <Input
                placeholder={isRu ? "Поиск по имени или email..." : "Ism yoki email bo'yicha qidirish..."}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger>
                <SelectValue placeholder={isRu ? "Все вакансии" : "Barcha ishlar"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRu ? "Все вакансии" : "Barcha ishlar"}</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as KnownApplicationStatus | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder={isRu ? "Все статусы" : "Barcha holatlar"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRu ? "Все статусы" : "Barcha holatlar"}</SelectItem>
                {STATUS_KEYS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
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

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "match" | "applied" | "name")}> 
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="match">{isRu ? "По совпадению" : "Moslik bo'yicha"}</SelectItem>
                <SelectItem value="applied">{isRu ? "По дате" : "Sana bo'yicha"}</SelectItem>
                <SelectItem value="name">{isRu ? "По имени" : "Ism bo'yicha"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={() => setTopOnly((v) => !v)}
            className={`mt-3 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              topOnly
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                : "border-surface-200 text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
            }`}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
            {isRu ? "Топ совпадения (70%+)" : "Top moslar (70%+)"}
          </button>
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
                  {STATUS_KEYS.filter((status) => status !== "interview").map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
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

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={5} />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
                <Users className="h-8 w-8 text-surface-400" />
              </div>
              <h3 className="font-display text-lg font-semibold text-surface-900 dark:text-white">
                {isRu ? "Кандидаты не найдены" : "Nomzodlar topilmadi"}
              </h3>
              <p className="mt-2 max-w-sm text-surface-500">
                {selectedJob === "all"
                  ? isRu
                    ? "Пока нет заявок на ваши вакансии."
                    : "Hali sizning vakansiyalaringizga ariza kelmagan."
                  : isRu
                    ? "По текущим фильтрам кандидатов нет."
                    : "Joriy filtrlarga mos nomzodlar yo'q."}
              </p>
              <Link href="/company/jobs/new">
                <Button className="mt-5" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  {isRu ? "Опубликовать новую вакансию" : "Yangi vakansiya e'lon qilish"}
                </Button>
              </Link>
            </div>
          ) : (
            <>
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
                      className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded border border-surface-300 text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800"
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
                          {application.applicant?.location && (
                            <p className="mt-0.5 flex items-center gap-1 text-sm text-surface-500">
                              <MapPin className="h-4 w-4" />
                              {application.applicant.location}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-sm text-surface-500">
                        {isRu ? "Вакансия:" : "Vakansiya:"} <strong>{application.job?.title}</strong> ·{" "}
                        {formatRelativeTime(application.applied_at, locale)}
                      </p>

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

                    <div className="space-y-2 md:min-w-[170px]">
                      {application.match_score && (
                        <p className="text-left text-xl font-bold text-brand-600 md:text-center">
                          {application.match_score}
                        </p>
                      )}
                      <Select
                        value={(application.status as KnownApplicationStatus) || "pending"}
                        onValueChange={(value) =>
                          void handleStatusChange(application.id, value as KnownApplicationStatus)
                        }
                      >
                        <SelectTrigger className="w-full md:w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_KEYS.map((status) => (
                            <SelectItem key={status} value={status}>
                              {statusLabels[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-start md:justify-end">
                      <Link href={`/company/applicants/${application.id}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="mr-2 h-4 w-4" />
                          {isRu ? "Открыть" : "Ko'rish"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
                placeholder={
                  isRu
                    ? "Здравствуйте, ..."
                    : "Assalomu alaykum, ..."
                }
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
