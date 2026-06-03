"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  RefreshCw,
  Search,
  Trash2,
  Eye,
  Users,
  Pause,
  Play,
  XCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { adminApi, getErrorMessage } from "@/lib/api";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRelativeTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AdminJob = {
  id: string;
  title: string;
  status: string;
  job_type: string;
  experience_level: string;
  location: string;
  is_remote_allowed: boolean;
  salary_min: number | null;
  salary_max: number | null;
  views_count: number;
  applications_count: number;
  created_at: string | null;
  expires_at: string | null;
  company: {
    id: string | null;
    name: string | null;
    email: string | null;
    is_verified: boolean;
  };
};

const STATUS_TONE: Record<string, string> = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  draft:
    "bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-200",
  paused:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  closed: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
};

export default function AdminJobsPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const statusLabel: Record<string, string> = isRu
    ? {
        active: "Активные",
        draft: "Черновики",
        paused: "Приостановленные",
        closed: "Закрытые",
      }
    : {
        active: "Faol",
        draft: "Qoralama",
        paused: "To'xtatilgan",
        closed: "Yopilgan",
      };

  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminJob | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const t = useMemo(
    () =>
      isRu
        ? {
            title: "Модерация вакансий",
            subtitle: "Платформенный список вакансий со всеми компаниями.",
            refresh: "Обновить",
            search: "Поиск",
            searchPlaceholder: "Название или компания",
            loading: "Загрузка...",
            allStatuses: "Все статусы",
            active: "Активные",
            draft: "Черновики",
            paused: "Приостановленные",
            closed: "Закрытые",
            empty: "Вакансии не найдены",
            company: "Компания",
            stats: "Метрики",
            actions: "Действия",
            apps: "откликов",
            views: "просмотров",
            verified: "Подтверждена",
            unverified: "Не подтверждена",
            publish: "Опубликовать",
            pause: "Приостановить",
            close: "Закрыть",
            del: "Удалить",
            delConfirmTitle: "Удалить вакансию?",
            delConfirmBody:
              "Эта вакансия будет помечена как удалённая и исчезнет из публичного списка.",
            cancel: "Отмена",
            confirm: "Удалить",
            showing: (a: number, b: number) => `Показано ${a} из ${b}`,
          }
        : {
            title: "Vakansiyalar moderatsiyasi",
            subtitle: "Barcha kompaniyalarning vakansiyalari ro'yxati.",
            refresh: "Yangilash",
            search: "Qidirish",
            searchPlaceholder: "Vakansiya yoki kompaniya",
            loading: "Yuklanmoqda...",
            allStatuses: "Barcha holatlar",
            active: "Faol",
            draft: "Qoralama",
            paused: "To'xtatilgan",
            closed: "Yopilgan",
            empty: "Vakansiyalar topilmadi",
            company: "Kompaniya",
            stats: "Ko'rsatkichlar",
            actions: "Harakatlar",
            apps: "ariza",
            views: "ko'rish",
            verified: "Tasdiqlangan",
            unverified: "Tasdiqlanmagan",
            publish: "Faollashtirish",
            pause: "To'xtatish",
            close: "Yopish",
            del: "O'chirish",
            delConfirmTitle: "Vakansiyani o'chirishni tasdiqlang",
            delConfirmBody:
              "Vakansiya o'chirilgan deb belgilanadi va ochiq ro'yxatdan chiqariladi.",
            cancel: "Bekor qilish",
            confirm: "O'chirish",
            showing: (a: number, b: number) => `${a} / ${b} ko'rsatilmoqda`,
          },
    [isRu],
  );

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listJobs({
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 30,
      });
      const data = (res.data as { data: { jobs: AdminJob[]; total: number } })
        .data;
      setJobs(data.jobs);
      setTotal(data.total);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(new Set());
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const toggleAll = () => {
    if (selected.size === jobs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(jobs.map((j) => j.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: string) => {
    try {
      await adminApi.bulkJobs(Array.from(selected), action);
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const changeStatus = async (job: AdminJob, next: string) => {
    setBusyId(job.id);
    try {
      await adminApi.updateJobStatus(job.id, next);
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: next } : j)),
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const deleteJob = async (job: AdminJob) => {
    setBusyId(job.id);
    try {
      await adminApi.deleteJob(job.id);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      setTotal((n) => Math.max(0, n - 1));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-transparent blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              <Briefcase className="h-3.5 w-3.5" />
              {t.title}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
              {t.title}
            </h1>
            <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
              {t.subtitle}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {t.refresh}
          </Button>
        </div>
      </section>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.searchPlaceholder}
              icon={<Search className="h-4 w-4" />}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearch(draft.trim());
              }}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allStatuses}</SelectItem>
              <SelectItem value="active">{t.active}</SelectItem>
              <SelectItem value="draft">{t.draft}</SelectItem>
              <SelectItem value="paused">{t.paused}</SelectItem>
              <SelectItem value="closed">{t.closed}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setSearch(draft.trim())}>{t.search}</Button>
          <div className="ml-auto rounded-xl border border-surface-200 px-3 py-2 text-sm text-surface-600 dark:border-surface-700 dark:text-surface-300">
            {loading ? t.loading : t.showing(jobs.length, total)}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10">
          <CardContent className="flex items-center gap-2 p-3 text-red-800 dark:text-red-100">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Jobs list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-brand-500" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && jobs.length > 0 && (
            <div className="mb-2 flex items-center gap-2 pb-2 border-b border-surface-100 dark:border-surface-800">
              <input
                type="checkbox"
                title="Faqat yuklangan yozuvlarni tanlaydi"
                checked={selected.size === jobs.length && jobs.length > 0}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-surface-300 accent-brand-500"
              />
              <span className="text-xs text-surface-500">
                {selected.size > 0 ? `${selected.size} tanlandi` : "Hammasini tanlash"}
              </span>
            </div>
          )}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-200 py-12 text-center dark:border-surface-700">
              <p className="font-medium text-surface-900 dark:text-white">
                {t.empty}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const tone = STATUS_TONE[job.status] || STATUS_TONE.draft;
                const isSelected = selected.has(job.id);
                return (
                  <div
                    key={job.id}
                    className={`grid gap-3 rounded-xl border p-4 lg:grid-cols-[auto_1.4fr_1fr_auto_auto] ${isSelected ? "border-brand-400 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10" : "border-surface-200 dark:border-surface-700"}`}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(job.id)}
                        className="h-4 w-4 rounded border-surface-300 accent-brand-500"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-surface-900 dark:text-white">
                        {job.title}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-surface-500">
                        {job.location} · {job.job_type} · {job.experience_level}
                        {job.is_remote_allowed ? " · remote-friendly" : ""}
                      </p>
                      {job.created_at && (
                        <p className="mt-1 text-xs text-surface-500">
                          {formatRelativeTime(job.created_at, locale)}
                        </p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium text-surface-900 dark:text-white">
                        {job.company.name || "—"}
                        {job.company.is_verified ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-surface-500">
                        {job.company.email}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-surface-600 dark:text-surface-300">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {job.applications_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {job.views_count}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
                      >
                        {statusLabel[job.status] || job.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {job.status !== "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === job.id}
                          onClick={() => void changeStatus(job, "active")}
                        >
                          <Play className="mr-1 h-3.5 w-3.5" />
                          {t.publish}
                        </Button>
                      )}
                      {job.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === job.id}
                          onClick={() => void changeStatus(job, "paused")}
                        >
                          <Pause className="mr-1 h-3.5 w-3.5" />
                          {t.pause}
                        </Button>
                      )}
                      {job.status !== "closed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === job.id}
                          onClick={() => void changeStatus(job, "closed")}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          {t.close}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busyId === job.id}
                        onClick={() => setConfirmDelete(job)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        {t.del}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <BulkActionBar
        selectedCount={selected.size}
        onAction={handleBulkAction}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: "Tasdiqlash", action: "approve", variant: "default" },
          { label: "To'xtatish", action: "pause", variant: "outline" },
          { label: "Yopish", action: "close", variant: "outline" },
          { label: "O'chirish", action: "delete", variant: "destructive", requireConfirm: true },
        ]}
      />

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.delConfirmTitle}</DialogTitle>
            <DialogDescription>
              {confirmDelete?.title}
              <br />
              <span className="mt-2 block text-sm">{t.delConfirmBody}</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && void deleteJob(confirmDelete)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
