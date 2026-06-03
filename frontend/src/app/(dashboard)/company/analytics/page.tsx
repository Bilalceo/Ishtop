"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  RefreshCw,
  BarChart3,
  Activity,
} from "lucide-react";
import { applicationApi, getErrorMessage } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

type DashboardAnalytics = {
  window: { days: number; start_date: string; end_date: string };
  overview: {
    total_active_jobs: number;
    applications_this_month: number;
    avg_time_to_hire_hours: number;
    response_rate_pct: number;
    avg_first_response_hours: number;
  };
  funnel: {
    views: number;
    applications: number;
    screened: number;
    interview: number;
    hired: number;
  };
  top_vacancies: Array<{
    id: string;
    title: string;
    status: string;
    views: number;
    applications: number;
    conversion_pct: number;
    interview_count: number;
    hired_count: number;
  }>;
  pipeline_summary: Record<string, number>;
  response_time_tracker: { avg_hours: number; sample_size: number };
  source_breakdown: Array<{ source: string; count: number; share_pct: number }>;
  daily_views: Array<{ date: string; count: number }>;
  daily_applications: Array<{ date: string; count: number }>;
};

type RangePreset = "7d" | "30d" | "90d" | "custom";

export default function CompanyAnalyticsPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardAnalytics | null>(null);

  const [rangePreset, setRangePreset] = useState<RangePreset>("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const statusLabels: Record<string, string> = isRu
    ? {
        pending: "Новая заявка",
        reviewing: "На проверке",
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

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const params: { days?: number; start_date?: string; end_date?: string } = {};
      if (rangePreset === "custom") {
        if (!customStartDate || !customEndDate) {
          throw new Error(isRu ? "Укажите начальную и конечную даты" : "Boshlanish va tugash sanasini kiriting");
        }
        params.start_date = customStartDate;
        params.end_date = customEndDate;
      } else {
        params.days = rangePreset === "7d" ? 7 : rangePreset === "90d" ? 90 : 30;
      }

      const response = await applicationApi.companyDashboardAnalytics(params);
      const payload = response.data as { data?: DashboardAnalytics };
      setData(payload.data || null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (rangePreset === "custom") return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePreset]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dailyChart = useMemo(() => {
    if (!data) return [];
    const appMap = new Map(data.daily_applications.map((item) => [item.date, item.count]));
    return data.daily_views.map((item) => ({
      date: item.date.slice(5),
      views: item.count,
      applications: appMap.get(item.date) || 0,
    }));
  }, [data]);

  const funnelRows = data
    ? [
        { name: isRu ? "Просмотры" : "Ko'rishlar", value: data.funnel.views },
        { name: isRu ? "Отклики" : "Arizalar", value: data.funnel.applications },
        { name: isRu ? "Скрининг" : "Screened", value: data.funnel.screened },
        { name: isRu ? "Интервью" : "Intervyu", value: data.funnel.interview },
        { name: isRu ? "Найм" : "Yollash", value: data.funnel.hired },
      ]
    : [];

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-900">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
              {isRu ? "Аналитика компании" : "Kompaniya analitikasi"}
            </h1>
            <p className="mt-1 text-sm text-surface-500">
              {isRu
                ? "Вакансии, воронка и скорость найма в одном месте"
                : "Vakansiyalar, funnel va yollash tezligi bitta joyda"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["7d", "30d", "90d", "custom"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setRangePreset(preset)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  rangePreset === preset
                    ? "bg-brand-600 text-white"
                    : "border border-surface-200 text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
                }`}
              >
                {preset === "7d"
                  ? isRu
                    ? "7 дней"
                    : "7 kun"
                  : preset === "30d"
                    ? isRu
                      ? "30 дней"
                      : "30 kun"
                    : preset === "90d"
                      ? isRu
                        ? "90 дней"
                        : "90 kun"
                      : isRu
                        ? "Кастом"
                        : "Custom"}
              </button>
            ))}
            <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {isRu ? "Обновить" : "Yangilash"}
            </Button>
          </div>
        </div>

        {rangePreset === "custom" && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-surface-500">{isRu ? "С" : "Dan"}</label>
              <Input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-surface-500">{isRu ? "По" : "Gacha"}</label>
              <Input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
            </div>
            <Button onClick={() => void load()}>{isRu ? "Применить" : "Qo'llash"}</Button>
          </div>
        )}
      </section>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-28 rounded-xl" />)
          : (
            <>
              <MetricCard icon={Briefcase} label={isRu ? "Активные вакансии" : "Faol vakansiyalar"} value={data?.overview.total_active_jobs ?? 0} />
              <MetricCard icon={Users} label={isRu ? "Заявки за месяц" : "Bu oydagi arizalar"} value={data?.overview.applications_this_month ?? 0} />
              <MetricCard icon={Clock} label={isRu ? "Среднее время найма (ч)" : "O'rtacha yollash vaqti (soat)"} value={data?.overview.avg_time_to_hire_hours ?? 0} />
              <MetricCard icon={TrendingUp} label={isRu ? "Response rate %" : "Javob berish ulushi %"} value={data?.overview.response_rate_pct ?? 0} />
            </>
          )}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-brand-500" />
              {isRu ? "Funnel: просмотры → отклики → скрининг → интервью → найм" : "Funnel: ko'rish → ariza → screened → intervyu → yollash"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelRows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isRu ? "Response time tracker" : "Response time tracker"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </>
            ) : (
              <>
                <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                  <p className="text-xs text-surface-500">{isRu ? "Среднее до первого действия (ч)" : "Birinchi harakatgacha o'rtacha (soat)"}</p>
                  <p className="mt-1 text-2xl font-bold">{data?.response_time_tracker.avg_hours ?? 0}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
                  <p className="text-xs text-surface-500">{isRu ? "Размер выборки" : "Sample size"}</p>
                  <p className="mt-1 text-2xl font-bold">{data?.response_time_tracker.sample_size ?? 0}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-brand-500" />
            {isRu ? "Динамика по дням" : "Kunlik dinamika"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isRu ? "Топ вакансий" : "Top vakansiyalar"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => <Skeleton key={idx} className="h-14 rounded-lg" />)
            ) : data?.top_vacancies?.length ? (
              data.top_vacancies.slice(0, 8).map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border border-surface-200 px-3 py-2 dark:border-surface-700">
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">{job.title}</p>
                    <p className="text-xs text-surface-500">
                      {job.applications} {isRu ? "заявок" : "ariza"} • {job.views} {isRu ? "просмотров" : "ko'rish"} • {job.conversion_pct}%
                    </p>
                  </div>
                  <span className="text-xs text-surface-500">{job.hired_count} {isRu ? "найм" : "yollash"}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-surface-500">{isRu ? "Данных пока нет" : "Hozircha ma'lumot yo'q"}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{isRu ? "Pipeline summary" : "Pipeline summary"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => <Skeleton key={idx} className="h-12 rounded-lg" />)
            ) : (
              Object.entries(data?.pipeline_summary || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-lg border border-surface-200 px-3 py-2 dark:border-surface-700">
                  <span className="text-sm text-surface-700 dark:text-surface-200">
                    {statusLabels[status] || status}
                  </span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{isRu ? "Source breakdown" : "Source breakdown"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-12 rounded-lg" />)
          ) : data?.source_breakdown?.length ? (
            data.source_breakdown.map((item) => (
              <div key={item.source} className="flex items-center justify-between rounded-lg border border-surface-200 px-3 py-2 dark:border-surface-700">
                <span className="text-sm">{item.source}</span>
                <span className="text-sm font-semibold">{item.count} ({item.share_pct}%)</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-surface-500">{isRu ? "Источник не отслеживался в этом периоде" : "Bu davrda source tracking ma'lumoti yo'q"}</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 p-2 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-surface-500">{label}</p>
            <p className="text-xl font-bold text-surface-900 dark:text-white">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
