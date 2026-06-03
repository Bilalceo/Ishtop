"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Search,
  RefreshCw,
  Target,
  Mail,
  Briefcase,
  Building2,
  ShieldAlert,
} from "lucide-react";
import { adminApi, getErrorMessage } from "@/lib/api";
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

type AdminApplication = {
  id: string;
  status: string;
  match_score: string | null;
  applied_at: string | null;
  applicant: {
    id: string | null;
    email: string | null;
    full_name: string | null;
  };
  job: {
    id: string | null;
    title: string | null;
    company: string | null;
  };
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
  reviewing: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  shortlisted: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  interview: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  withdrawn: "bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300",
};

export default function AdminApplicationsPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const statusLabel: Record<string, string> = isRu
    ? {
        pending: "Ожидание",
        reviewing: "Проверка",
        shortlisted: "Шорт-лист",
        interview: "Интервью",
        accepted: "Принят",
        rejected: "Отклонен",
        withdrawn: "Отозвано",
      }
    : {
        pending: "Kutilmoqda",
        reviewing: "Ko'rib chiqilmoqda",
        shortlisted: "Saralangan",
        interview: "Intervyu",
        accepted: "Qabul qilindi",
        rejected: "Rad etildi",
        withdrawn: "Qaytarib olindi",
      };

  const [apps, setApps] = useState<AdminApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const t = useMemo(
    () =>
      isRu
        ? {
            title: "Заявки на платформе",
            subtitle: "Все заявки кандидатов на платформе.",
            refresh: "Обновить",
            search: "Поиск по email кандидата или вакансии",
            allStatuses: "Все статусы",
            empty: "Заявки не найдены",
            match: "Совпадение",
            applied: "Подано",
            showing: (a: number, b: number) => `Показано ${a} из ${b}`,
          }
        : {
            title: "Platforma arizalari",
            subtitle: "Platformadagi barcha nomzod arizalari.",
            refresh: "Yangilash",
            search: "Nomzod email yoki vakansiya bo'yicha qidirish",
            allStatuses: "Barcha holatlar",
            empty: "Arizalar topilmadi",
            match: "Moslik",
            applied: "Yuborilgan",
            showing: (a: number, b: number) => `${a} / ${b} ko'rsatilmoqda`,
          },
    [isRu]
  );

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listApplications({
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      });
      const data = (
        res.data as { data: { applications: AdminApplication[]; total: number } }
      ).data;
      setApps(data.applications);
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

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-transparent blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
              <ClipboardList className="h-3.5 w-3.5" />
              {t.title}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
              {t.title}
            </h1>
            <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">{t.subtitle}</p>
          </div>
          <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {t.refresh}
          </Button>
        </div>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.search}
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
              <SelectItem value="pending">{statusLabel.pending}</SelectItem>
              <SelectItem value="reviewing">{statusLabel.reviewing}</SelectItem>
              <SelectItem value="shortlisted">{statusLabel.shortlisted}</SelectItem>
              <SelectItem value="interview">{statusLabel.interview}</SelectItem>
              <SelectItem value="accepted">{statusLabel.accepted}</SelectItem>
              <SelectItem value="rejected">{statusLabel.rejected}</SelectItem>
              <SelectItem value="withdrawn">{statusLabel.withdrawn}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setSearch(draft.trim())}>{t.refresh}</Button>
          <div className="ml-auto rounded-xl border border-surface-200 px-3 py-2 text-sm text-surface-600 dark:border-surface-700 dark:text-surface-300">
            {t.showing(apps.length, total)}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-brand-500" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : apps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-200 py-12 text-center dark:border-surface-700">
              <p className="font-medium text-surface-900 dark:text-white">{t.empty}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700">
              <div className="grid grid-cols-[1.2fr_1.4fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-surface-200 bg-surface-50/80 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:border-surface-700 dark:bg-surface-900/60 dark:text-surface-400">
                <span>Applicant</span>
                <span>Job / Company</span>
                <span>Status</span>
                <span>{t.match}</span>
                <span>{t.applied}</span>
              </div>
              <div className="divide-y divide-surface-200 dark:divide-surface-700">
                {apps.map((a) => {
                  const tone = STATUS_TONE[a.status] || STATUS_TONE.pending;
                  return (
                    <div
                      key={a.id}
                      className="grid grid-cols-[1.2fr_1.4fr_0.8fr_0.8fr_0.8fr] items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-50 dark:hover:bg-surface-900/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-surface-900 dark:text-white">
                          {a.applicant.full_name || "—"}
                        </p>
                        <p className="flex items-center gap-1 truncate text-xs text-surface-500">
                          <Mail className="h-3 w-3" /> {a.applicant.email || "—"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate font-medium text-surface-900 dark:text-white">
                          <Briefcase className="h-3 w-3 flex-shrink-0 text-brand-500" />
                          {a.job.title || "—"}
                        </p>
                        <p className="flex items-center gap-1 truncate text-xs text-surface-500">
                          <Building2 className="h-3 w-3" /> {a.job.company || "—"}
                        </p>
                      </div>
                      <div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
                          {statusLabel[a.status] || a.status}
                        </span>
                      </div>
                      <div>
                        {a.match_score && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <Target className="h-3 w-3" /> {a.match_score}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-surface-500">
                        {a.applied_at ? formatRelativeTime(a.applied_at, locale) : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
