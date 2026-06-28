/**
 * Admin Dashboard
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { adminApi, getErrorMessage } from "@/lib/api";
import type {
  AdminDashboardData,
  AdminErrorLog,
  AdminErrorStats,
  AdminSystemHealthResponse,
  AdminUserStats,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { UserGrowthChart } from "@/components/admin/charts/UserGrowthChart";
import { ApplicationsFunnelChart } from "@/components/admin/charts/ApplicationsFunnelChart";
import { JobsActivityChart } from "@/components/admin/charts/JobsActivityChart";

type LoadState = "loading" | "ready" | "error";

type LoadedData = {
  dashboard: AdminDashboardData | null;
  health: AdminSystemHealthResponse | null;
  userStats: AdminUserStats | null;
  errorStats: AdminErrorStats | null;
  errors: AdminErrorLog[];
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } };

const sectionIds = { overview: "overview", health: "health", users: "users", errors: "errors" } as const;

const adminCopy = {
  uz: {
    partialEndpointWarning: "Ba'zi admin endpointlari javob bermadi, lekin qolgan ma'lumotlar yuklandi.",
    totalUsers: "Jami foydalanuvchilar",
    totalUsersSubtitle: "Platformadagi jami foydalanuvchilar",
    activeTrend: (count: number) => `${count} faol / 7 kun`,
    newUsersToday: "Bugungi yangi foydalanuvchilar",
    newUsersTodaySubtitle: "Bugun ro'yxatdan o'tganlar",
    contentTotalsMetric: "Ishlar / rezyumelar / arizalar",
    contentVolume: "Kontent hajmi",
    errorsLast24h: "Oxirgi 24 soatdagi xatolar",
    monitoringSignal: "Monitoring signali",
    heroBadge: "Admin nazorat markazi",
    heroTitle: "Platformani kuzating, xatolarni tez bartaraf qiling va foydalanuvchi faolligini boshqaring",
    heroDescription: "Bu panel backend admin endpointlariga ulanadi va real vaqtda platformaning holati, foydalanuvchilar soni hamda xatolar statistikasi haqida ma'lumot beradi.",
    refreshData: "Ma'lumotlarni yangilash",
    jumpToErrors: "Xatolarga o'tish",
    overview: "Umumiy",
    overviewTitle: "Asosiy ko'rsatkichlar",
    overviewDescription: "Eng muhim KPI'lar bitta ekranda. Bu yerda siz platforma umumiy holatini tez baholaysiz.",
    health: "Holat",
    healthTitle: "Tizim holati",
    healthDescription: "Backend sog'ligi, AI va email servislarining konfiguratsiyasi, hamda error rate holati.",
    users: "Foydalanuvchilar",
    usersTitle: "Foydalanuvchi statistikasi",
    usersDescription: "Ro'l bo'yicha taqsimot, aktivlik va yangi ro'yxatdan o'tganlar ko'rsatkichlari.",
    userBreakdown: "Foydalanuvchilar taqsimoti",
    active7d: "7 kun faol",
    verified: "Tasdiqlangan",
    contentTotals: "Kontent jamlanmasi",
    resumes: "Rezyumelar",
    jobs: "Vakansiyalar",
    applications: "Arizalar",
    errors: "Xatolar",
    errorsTitle: "Xatolar monitoringi va hal qilish",
    errorsDescription: "So'nggi xatolar, severity taqsimoti va resolve action bilan ishlash.",
    recentUnresolvedErrors: "So'nggi yopilmagan xatolar",
    resolveHelp: "Resolve tugmasi orqali muammoni yopishingiz mumkin.",
    noErrors: "Hech qanday yopilmagan xato topilmadi",
    noErrorsDescription: "Hozircha monitoring paneli toza.",
    time: "Vaqt",
    error: "Xato",
    severity: "Daraja",
    endpoint: "Endpoint",
    action: "Harakat",
    unknown: "Noma'lum",
    resolve: "Yopish",
    resolved: "Yopilgan",
    open: "Ochiq",
    severityBreakdown: "Darajalar taqsimoti",
    noSeverityStats: "Severity statistikasi hozircha yo'q.",
    topCategories: "Top kategoriyalar",
    noCategoryStats: "Category statistikasi mavjud emas.",
    errorResolve: "Xatoni yopish",
    selectedError: "Tanlangan xato",
    message: "Xabar",
    resolutionNotes: "Yechim izohi",
    notesPlaceholder: "Nima tuzatildi? Jamoa uchun kontekst yozing.",
    cancel: "Bekor qilish",
    resolving: "Yopilmoqda",
    markResolved: "Yopilgan deb belgilash",
    trendsEyebrow: "Trendlar",
    trendsTitle: "Platforma dinamikasi",
    trendsDescription: "So'nggi 30 kundagi yangi ro'yxatlar, vakansiyalar va arizalar.",
    trendsUsers: "Foydalanuvchi o'sishi",
    trendsJobs: "Yangi vakansiyalar",
    trendsFunnel: "Arizalar funnel",
    noData: "Ma'lumot yo'q",
    status: { healthy: "Sog'lom", unhealthy: "Nosoz", warning: "Ogohlantirish" },
    healthComponents: {
      database: "Ma'lumotlar bazasi",
      ai_service: "AI servisi",
      email_service: "Email servisi",
      error_rate: "Xato darajasi",
      memory: "Xotira",
    } as Record<string, string>,
  },
  ru: {
    partialEndpointWarning: "Некоторые admin endpoint'ы не ответили, но остальные данные загружены.",
    totalUsers: "Всего пользователей",
    totalUsersSubtitle: "Все пользователи платформы",
    activeTrend: (count: number) => `${count} активны / 7 дней`,
    newUsersToday: "Новые пользователи сегодня",
    newUsersTodaySubtitle: "Зарегистрировались сегодня",
    contentTotalsMetric: "Вакансии / резюме / отклики",
    contentVolume: "Объём контента",
    errorsLast24h: "Ошибки за 24 часа",
    monitoringSignal: "Сигнал мониторинга",
    heroBadge: "Центр администрирования",
    heroTitle: "Следите за платформой, быстро устраняйте ошибки и управляйте активностью пользователей",
    heroDescription: "Эта панель подключена к backend admin endpoint'ам и показывает состояние платформы, количество пользователей и статистику ошибок в реальном времени.",
    refreshData: "Обновить данные",
    jumpToErrors: "Перейти к ошибкам",
    overview: "Обзор",
    overviewTitle: "Ключевые показатели",
    overviewDescription: "Главные KPI на одном экране, чтобы быстро оценить состояние платформы.",
    health: "Состояние",
    healthTitle: "Состояние системы",
    healthDescription: "Состояние backend, конфигурация AI и email сервисов, а также уровень ошибок.",
    users: "Пользователи",
    usersTitle: "Статистика пользователей",
    usersDescription: "Распределение по ролям, активность и новые регистрации.",
    userBreakdown: "Распределение пользователей",
    active7d: "Активны 7 дней",
    verified: "Подтверждены",
    contentTotals: "Итоги контента",
    resumes: "Резюме",
    jobs: "Вакансии",
    applications: "Отклики",
    errors: "Ошибки",
    errorsTitle: "Мониторинг и обработка ошибок",
    errorsDescription: "Последние ошибки, распределение по severity и закрытие инцидентов.",
    recentUnresolvedErrors: "Последние открытые ошибки",
    resolveHelp: "Нажмите Resolve, чтобы закрыть проблему.",
    noErrors: "Открытых ошибок не найдено",
    noErrorsDescription: "Панель мониторинга сейчас чистая.",
    time: "Время",
    error: "Ошибка",
    severity: "Уровень",
    endpoint: "Endpoint",
    action: "Действие",
    unknown: "Неизвестно",
    resolve: "Закрыть",
    resolved: "Закрыта",
    open: "Открыта",
    severityBreakdown: "Распределение по уровню",
    noSeverityStats: "Статистики по severity пока нет.",
    topCategories: "Топ категорий",
    noCategoryStats: "Статистика категорий недоступна.",
    errorResolve: "Закрыть ошибку",
    selectedError: "Выбранная ошибка",
    message: "Сообщение",
    resolutionNotes: "Комментарий к решению",
    notesPlaceholder: "Что исправлено? Добавьте контекст для команды.",
    cancel: "Отмена",
    resolving: "Закрываем",
    markResolved: "Отметить как закрытую",
    trendsEyebrow: "Тренды",
    trendsTitle: "Динамика платформы",
    trendsDescription: "Новые регистрации, вакансии и отклики за последние 30 дней.",
    trendsUsers: "Рост пользователей",
    trendsJobs: "Новые вакансии",
    trendsFunnel: "Воронка откликов",
    noData: "Нет данных",
    status: { healthy: "Исправно", unhealthy: "Неисправно", warning: "Предупреждение" },
    healthComponents: {
      database: "База данных",
      ai_service: "AI сервис",
      email_service: "Email сервис",
      error_rate: "Уровень ошибок",
      memory: "Память",
    } as Record<string, string>,
  },
} as const;

const healthIconMap: Record<string, React.ElementType> = {
  database: Database,
  ai_service: Sparkles,
  email_service: Server,
  error_rate: AlertTriangle,
  memory: Shield,
};

function healthClass(status?: string) {
  const s = (status || "warning").toLowerCase();
  if (s === "healthy") return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300";
  if (s === "unhealthy") return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
  return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
}

function healthBorderClass(status?: string) {
  const s = (status || "warning").toLowerCase();
  if (s === "healthy") return "before:bg-emerald-500";
  if (s === "unhealthy") return "before:bg-red-500";
  return "before:bg-amber-500";
}

function healthIcon(status?: string) {
  const s = (status || "warning").toLowerCase();
  if (s === "healthy") return CheckCircle2;
  if (s === "unhealthy") return XCircle;
  return AlertTriangle;
}

type MetricColor = "blue" | "emerald" | "violet" | "amber";

const METRIC_PALETTE: Record<MetricColor, { bar: string; iconBg: string; iconText: string }> = {
  blue: {
    bar: "bg-gradient-to-r from-blue-500 to-cyan-500",
    iconBg: "bg-blue-100 dark:bg-blue-500/20",
    iconText: "text-blue-700 dark:text-blue-300",
  },
  emerald: {
    bar: "bg-gradient-to-r from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    iconText: "text-emerald-700 dark:text-emerald-300",
  },
  violet: {
    bar: "bg-gradient-to-r from-emerald-500 to-emerald-500",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    iconText: "text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    bar: "bg-gradient-to-r from-amber-500 to-orange-500",
    iconBg: "bg-amber-100 dark:bg-amber-500/20",
    iconText: "text-amber-700 dark:text-amber-300",
  },
};

function MetricCard({ title, value, subtitle, icon: Icon, color, trend }: { title: string; value: string | number; subtitle: string; icon: React.ElementType; color: MetricColor; trend?: string; }) {
  const palette = METRIC_PALETTE[color];
  return (
    <Card className="group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className={cn("absolute inset-x-0 top-0 h-1", palette.bar)} />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">{title}</p>
            <p className="mt-3 font-display text-3xl font-bold text-surface-900 dark:text-white">{value}</p>
            <p className="mt-1 text-xs text-surface-500">{subtitle}</p>
            {trend && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-50 px-2.5 py-1 text-xs font-medium text-surface-700 ring-1 ring-inset ring-surface-200 dark:bg-surface-900/50 dark:text-surface-200 dark:ring-surface-700">
                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                {trend}
              </div>
            )}
          </div>
          <div className={cn("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-surface-200 dark:ring-surface-700", palette.iconBg)}>
            <Icon className={cn("h-5 w-5", palette.iconText)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ eyebrow, title, description, icon: Icon }: { eyebrow: string; title: string; description: string; icon?: React.ElementType; }) {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">{eyebrow}</p>
      </div>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-surface-900 dark:text-white">{title}</h2>
      <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">{description}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { locale } = useTranslation();
  const copy = adminCopy[locale];
  const [data, setData] = useState<LoadedData>({ dashboard: null, health: null, userStats: null, errorStats: null, errors: [] });
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<AdminErrorLog | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);
  const [userSeries, setUserSeries] = useState<{ date: string; value: number }[]>([]);
  const [jobSeries, setJobSeries] = useState<{ date: string; value: number }[]>([]);

  const loadAdminData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoadState("loading");
    setLoadError(null);

    try {
      const [dashboardResult, healthResult, usersResult, statsResult, errorsResult, userSeriesResult, jobSeriesResult] = await Promise.allSettled([
        adminApi.dashboard(),
        adminApi.systemHealth(),
        adminApi.userStats(),
        adminApi.errorStats(24),
        adminApi.errors({ limit: 10, resolved: false }),
        adminApi.timeseries("users", 30),
        adminApi.timeseries("jobs", 30),
      ]);

      const nextData: LoadedData = { dashboard: null, health: null, userStats: null, errorStats: null, errors: [] };
      if (dashboardResult.status === "fulfilled") nextData.dashboard = dashboardResult.value.data.dashboard;
      if (healthResult.status === "fulfilled") nextData.health = healthResult.value.data;
      if (usersResult.status === "fulfilled") nextData.userStats = usersResult.value.data.stats;
      if (statsResult.status === "fulfilled") nextData.errorStats = statsResult.value.data.stats;
      if (errorsResult.status === "fulfilled") nextData.errors = errorsResult.value.data.errors;
      if (!nextData.errors.length && nextData.dashboard?.errors.recent?.length) nextData.errors = nextData.dashboard.errors.recent;
      setData(nextData);

      if (userSeriesResult.status === "fulfilled") setUserSeries(userSeriesResult.value.data.data);
      if (jobSeriesResult.status === "fulfilled") setJobSeries(jobSeriesResult.value.data.data);

      const failedCount = [dashboardResult, healthResult, usersResult, statsResult, errorsResult].filter((r) => r.status === "rejected").length;
      if (failedCount > 0) setLoadError(copy.partialEndpointWarning);
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setLoadError(getErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }, [copy.partialEndpointWarning]);

  useEffect(() => { void loadAdminData(); }, [loadAdminData]);

  const overviewCards = useMemo(() => [
    {
      title: copy.totalUsers,
      value: data.dashboard?.overview.total_users ?? 0,
      subtitle: copy.totalUsersSubtitle,
      icon: Users,
      color: "blue" as MetricColor,
      trend: data.userStats ? copy.activeTrend(data.userStats.users.active_last_7_days) : undefined,
    },
    {
      title: copy.newUsersToday,
      value: data.dashboard?.overview.new_users_today ?? 0,
      subtitle: copy.newUsersTodaySubtitle,
      icon: UserCheck,
      color: "emerald" as MetricColor,
    },
    {
      title: copy.contentTotalsMetric,
      value: data.dashboard ? `${data.dashboard.overview.total_jobs} / ${data.dashboard.overview.total_resumes} / ${data.dashboard.overview.total_applications}` : "0 / 0 / 0",
      subtitle: copy.contentVolume,
      icon: BarChart3,
      color: "violet" as MetricColor,
    },
    {
      title: copy.errorsLast24h,
      value: data.dashboard?.errors.total_24h ?? data.errorStats?.total_errors ?? 0,
      subtitle: copy.monitoringSignal,
      icon: AlertTriangle,
      color: "amber" as MetricColor,
    },
  ], [copy, data.dashboard, data.errorStats, data.userStats]);

  const healthItems = useMemo(() => {
    if (!data.health?.components) return [];
    return Object.entries(data.health.components).map(([key, details]) => ({
      key,
      label: copy.healthComponents[key] || key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      details,
      icon: healthIconMap[key] || Shield,
    }));
  }, [copy, data.health]);

  const severityEntries = useMemo(() => Object.entries(data.errorStats?.errors_by_severity || {}).sort((a, b) => b[1] - a[1]), [data.errorStats]);
  const categoryEntries = useMemo(() => Object.entries(data.errorStats?.errors_by_category || {}).sort((a, b) => b[1] - a[1]), [data.errorStats]);

  const openResolveDialog = (errorItem: AdminErrorLog) => {
    setSelectedError(errorItem);
    setResolutionNotes(errorItem.resolution_notes || "");
  };

  const handleResolve = async () => {
    if (!selectedError) return;
    setResolving(true);
    try {
      await adminApi.resolveError(selectedError.id, { resolution_notes: resolutionNotes.trim() || undefined });
      setSelectedError(null);
      setResolutionNotes("");
      await loadAdminData(true);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setResolving(false);
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      <motion.section variants={itemVariants} className="relative overflow-hidden rounded-3xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900 sm:p-8">
        {/* Decorative accent blob */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gradient-to-br from-brand-500/15 via-cyan-500/10 to-transparent blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
              <Shield className="h-3.5 w-3.5" />
              {copy.heroBadge}
              <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)] motion-safe:animate-pulse" aria-hidden />
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-4xl">{copy.heroTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm text-surface-600 dark:text-surface-400 sm:text-base">{copy.heroDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadAdminData(true)}>
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              {copy.refreshData}
            </Button>
            <Link href="#errors"><Button>{copy.jumpToErrors}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link href="/admin/users"><Button variant="outline"><Users className="mr-2 h-4 w-4" />{copy.users}</Button></Link>
          </div>
        </div>
      </motion.section>

      {loadError && <motion.div variants={itemVariants}><Card className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"><CardContent className="flex items-center gap-3 p-4 text-amber-900 dark:text-amber-100"><AlertTriangle className="h-5 w-5 flex-shrink-0" /><p className="text-sm">{loadError}</p></CardContent></Card></motion.div>}

      <motion.section variants={itemVariants} id={sectionIds.overview} className="space-y-4 scroll-mt-24">
          <SectionTitle eyebrow={copy.overview} title={copy.overviewTitle} description={copy.overviewDescription} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loadState === "loading" ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-2xl" />) : overviewCards.map((card) => <MetricCard key={card.title} title={card.title} value={card.value} subtitle={card.subtitle} icon={card.icon} color={card.color} trend={card.trend} />)}
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="space-y-4">
        <SectionTitle
          eyebrow={copy.trendsEyebrow}
          title={copy.trendsTitle}
          description={copy.trendsDescription}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">{copy.trendsUsers}</CardTitle></CardHeader>
            <CardContent>
              {loadState === "loading" ? <Skeleton className="h-[200px] rounded-xl" /> : <UserGrowthChart data={userSeries} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">{copy.trendsJobs}</CardTitle></CardHeader>
            <CardContent>
              {loadState === "loading" ? <Skeleton className="h-[200px] rounded-xl" /> : <JobsActivityChart data={jobSeries} />}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">{copy.trendsFunnel}</CardTitle></CardHeader>
            <CardContent>
              {loadState === "loading" ? <Skeleton className="h-[200px] rounded-xl" /> : (
                data.dashboard
                  ? <ApplicationsFunnelChart data={data.dashboard.applications_by_status ?? {}} />
                  : <p className="text-sm text-surface-500 py-8 text-center">{copy.noData}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <motion.section variants={itemVariants} id={sectionIds.health} className="space-y-4 scroll-mt-24">
          <SectionTitle eyebrow={copy.health} title={copy.healthTitle} description={copy.healthDescription} />
          <div className="grid gap-4 md:grid-cols-2">
            {loadState === "loading" ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl" />
              ))
            ) : (
              healthItems.map((item) => {
                const CategoryIcon = item.icon;
                const StatusIcon = healthIcon(item.details.status);
                const badge = healthClass(item.details.status);

                return (
                  <Card key={item.key} className={cn("relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1", healthBorderClass(item.details.status))}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4 text-surface-500 dark:text-surface-400" />
                            <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">{item.label}</p>
                          </div>
                          <p className="mt-2 font-display text-lg font-semibold text-surface-900 dark:text-white">
                            {copy.status[String(item.details.status || "warning").toLowerCase() as keyof typeof copy.status] || String(item.details.status)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                            {Object.entries(item.details)
                              .filter(([key]) => key !== "status")
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1 rounded-md bg-surface-50 px-2 py-1 font-medium text-surface-600 ring-1 ring-inset ring-surface-200 dark:bg-surface-900/60 dark:text-surface-300 dark:ring-surface-700"
                                >
                                  <span className="text-surface-400 dark:text-surface-500">{key.replace(/_/g, " ")}:</span>
                                  <span className="text-surface-900 dark:text-white">{String(value)}</span>
                                </span>
                              ))}
                          </div>
                        </div>
                        <div className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl", badge)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </motion.section>

        <motion.section variants={itemVariants} id={sectionIds.users} className="space-y-4 scroll-mt-24">
          <SectionTitle eyebrow={copy.users} title={copy.usersTitle} description={copy.usersDescription} />
          <Card>
            <CardHeader><CardTitle className="text-lg">{copy.userBreakdown}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {loadState === "loading" ? <div className="space-y-3"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></div> : (<>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900/60"><p className="text-xs uppercase tracking-wide text-surface-500">{copy.active7d}</p><p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">{data.userStats?.users.active_last_7_days ?? 0}</p></div>
                  <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-900/60"><p className="text-xs uppercase tracking-wide text-surface-500">{copy.verified}</p><p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">{data.userStats?.users.verified ?? 0}</p></div>
                </div>
                <div className="space-y-3">
                  {Object.entries(data.userStats?.users.by_role || {}).map(([role, value]) => {
                    const total = data.userStats?.users.total || 1;
                    const percent = Math.max(6, Math.round((value / total) * 100));
                    return (
                      <div key={role} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm"><span className="font-medium text-surface-700 dark:text-surface-200">{role}</span><span className="text-surface-500">{value}</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500" style={{ width: `${percent}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-2xl border border-dashed border-surface-200 p-4 dark:border-surface-700">
                  <p className="text-sm font-medium text-surface-900 dark:text-white">{copy.contentTotals}</p>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div><p className="text-surface-500">{copy.resumes}</p><p className="font-semibold text-surface-900 dark:text-white">{data.userStats?.content.total_resumes ?? 0}</p></div>
                    <div><p className="text-surface-500">{copy.jobs}</p><p className="font-semibold text-surface-900 dark:text-white">{data.userStats?.content.total_jobs ?? 0}</p></div>
                    <div><p className="text-surface-500">{copy.applications}</p><p className="font-semibold text-surface-900 dark:text-white">{data.userStats?.content.total_applications ?? 0}</p></div>
                  </div>
                </div>
              </>)}
            </CardContent>
          </Card>
        </motion.section>
      </div>

      <motion.section variants={itemVariants} id={sectionIds.errors} className="space-y-4 scroll-mt-24">
        <SectionTitle eyebrow={copy.errors} title={copy.errorsTitle} description={copy.errorsDescription} />
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div><CardTitle className="text-lg">{copy.recentUnresolvedErrors}</CardTitle><p className="text-sm text-surface-500">{copy.resolveHelp}</p></div>
              <Badge variant="warning">{data.dashboard?.errors.total_24h ?? data.errorStats?.total_errors ?? 0} / 24h</Badge>
            </CardHeader>
            <CardContent>
              {loadState === "loading" ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-xl" />)}</div> : data.errors.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-200 py-14 text-center dark:border-surface-700">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 dark:bg-emerald-500/20 dark:ring-emerald-500/5">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="mt-4 font-display text-lg font-semibold text-surface-900 dark:text-white">{copy.noErrors}</p>
                  <p className="mt-1 max-w-xs text-sm text-surface-500">{copy.noErrorsDescription}</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700">
                  <div className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-surface-200 bg-surface-50/80 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:border-surface-700 dark:bg-surface-900/60 dark:text-surface-400">
                    <span>{copy.time}</span><span>{copy.error}</span><span>{copy.severity}</span><span>{copy.endpoint}</span><span>{copy.action}</span>
                  </div>
                  <div className="divide-y divide-surface-200 dark:divide-surface-700">
                    {data.errors.map((errorItem) => {
                      const dot = errorItem.severity === "critical" ? "bg-red-500" : errorItem.severity === "warning" ? "bg-amber-500" : "bg-surface-400";
                      return (
                        <div key={errorItem.id} className="grid grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.8fr] items-start gap-3 px-4 py-4 text-sm transition-colors hover:bg-surface-50 dark:hover:bg-surface-900/40">
                          <div>
                            <p className="font-medium text-surface-900 dark:text-white">{formatRelativeTime(errorItem.timestamp, locale)}</p>
                            <p className="mt-1 text-xs text-surface-500">{errorItem.category}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-surface-900 dark:text-white">{errorItem.error_type}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-surface-500">{errorItem.error_message}</p>
                          </div>
                          <div>
                            <Badge variant={errorItem.severity === "critical" ? "error" : errorItem.severity === "warning" ? "warning" : "secondary"} className="gap-1.5">
                              <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dot)} />
                              {errorItem.severity}
                            </Badge>
                          </div>
                          <div className="min-w-0 text-surface-500">
                            <p className="truncate font-mono text-xs">{errorItem.endpoint || errorItem.path || copy.unknown}</p>
                            <p className="mt-1 text-xs">{errorItem.method || "-"}</p>
                          </div>
                          <div className="flex flex-col items-start gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => openResolveDialog(errorItem)}>{copy.resolve}</Button>
                            <Badge variant={errorItem.resolved ? "success" : "warning"}>{errorItem.resolved ? copy.resolved : copy.open}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">{copy.severityBreakdown}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {loadState === "loading" ? <div className="space-y-3"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /></div> : severityEntries.length > 0 ? severityEntries.map(([severity, value]) => { const max = severityEntries[0]?.[1] || 1; const percent = Math.round((value / max) * 100); return <div key={severity} className="space-y-2"><div className="flex items-center justify-between text-sm"><span className="font-medium text-surface-700 dark:text-surface-200">{severity}</span><span className="text-surface-500">{value}</span></div><div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700"><div className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${percent}%` }} /></div></div>; }) : <p className="text-sm text-surface-500">{copy.noSeverityStats}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">{copy.topCategories}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {loadState === "loading" ? <div className="space-y-3"><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /></div> : categoryEntries.length > 0 ? categoryEntries.slice(0, 5).map(([category, value]) => <div key={category} className="flex items-center justify-between rounded-xl bg-surface-50 px-4 py-3 dark:bg-surface-900/60"><span className="font-medium text-surface-700 dark:text-surface-200">{category}</span><Badge variant="secondary">{value}</Badge></div>) : <p className="text-sm text-surface-500">{copy.noCategoryStats}</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.section>

      <Dialog open={!!selectedError} onOpenChange={(open) => !open && setSelectedError(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{copy.errorResolve}</DialogTitle>
            <DialogDescription>{selectedError ? `${selectedError.error_type} - ${selectedError.category}` : copy.selectedError}</DialogDescription>
          </DialogHeader>
          {selectedError && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-surface-50 p-3 dark:bg-surface-900/60"><p className="text-xs uppercase tracking-wide text-surface-500">{copy.message}</p><p className="mt-1 text-sm text-surface-900 dark:text-white">{selectedError.error_message}</p></div><div className="rounded-xl bg-surface-50 p-3 dark:bg-surface-900/60"><p className="text-xs uppercase tracking-wide text-surface-500">{copy.endpoint}</p><p className="mt-1 text-sm text-surface-900 dark:text-white">{selectedError.endpoint || selectedError.path || "-"}</p></div></div><div className="space-y-2"><p className="text-sm font-medium text-surface-900 dark:text-white">{copy.resolutionNotes}</p><Textarea value={resolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} placeholder={copy.notesPlaceholder} rows={5} /></div></div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedError(null)} disabled={resolving}>{copy.cancel}</Button>
            <Button onClick={() => void handleResolve()} disabled={resolving}>{resolving ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />{copy.resolving}</> : copy.markResolved}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
