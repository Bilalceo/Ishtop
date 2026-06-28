"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Briefcase, CheckCircle2, Loader2, MapPin, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useApplications } from "@/hooks/useApplications";
import { useResume } from "@/hooks/useResume";
import { useTranslation } from "@/hooks/useTranslation";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { AutoApplyResponse, ExperienceLevel, JobType, Resume } from "@/types/api";

const jobTypeOptions: Array<{ value: JobType }> = [
  { value: "full_time" },
  { value: "part_time" },
  { value: "remote" },
  { value: "hybrid" },
  { value: "contract" },
];

const experienceOptions: Array<{ value: ExperienceLevel }> = [
  { value: "junior" },
  { value: "mid" },
  { value: "senior" },
  { value: "lead" },
  { value: "executive" },
];

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function formatQuotaValue(value: number | "unlimited", isRu: boolean) {
  return value === "unlimited" ? (isRu ? "Без лимита" : "Cheksiz") : value.toLocaleString();
}

function formatTierLabel(tier: string | null | undefined, isRu: boolean): string {
  const normalized = (tier || "free").toLowerCase();
  if (isRu) {
    return (
      {
        free: "Бесплатный",
        premium: "Премиум",
        enterprise: "Корпоративный",
      }[normalized] || normalized
    );
  }
  return (
    {
      free: "Bepul",
      premium: "Premium",
      enterprise: "Korporativ",
    }[normalized] || normalized
  );
}

function normalizeQuotaNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveQuotaSummary(result: AutoApplyResponse | null) {
  if (!result) {
    return null;
  }

  const quota = result.quota;
  const limitValue =
    quota?.monthly_limit ??
    quota?.limit ??
    result.monthly_limit ??
    result.quota_limit ??
    null;
  const unlimited = Boolean(
    quota?.is_unlimited ||
      quota?.unlimited ||
      result.quota_unlimited ||
      limitValue === "unlimited"
  );

  if (unlimited) {
    return {
      used:
        normalizeQuotaNumber(quota?.monthly_used) ??
        normalizeQuotaNumber(quota?.used) ??
        normalizeQuotaNumber(quota?.current) ??
        normalizeQuotaNumber(result.monthly_used) ??
        normalizeQuotaNumber(result.quota_used) ??
        normalizeQuotaNumber(result.quota_current) ??
        0,
      limit: "unlimited" as const,
      remaining: "unlimited" as const,
      percentUsed: 0,
      isUnlimited: true,
      tier: quota?.tier ?? result.quota_tier,
      feature: quota?.feature ?? result.quota_feature,
    };
  }

  const limit = normalizeQuotaNumber(limitValue);
  if (limit === null) {
    return null;
  }

  const used =
    normalizeQuotaNumber(quota?.monthly_used) ??
    normalizeQuotaNumber(quota?.used) ??
    normalizeQuotaNumber(quota?.current) ??
    normalizeQuotaNumber(result.monthly_used) ??
    normalizeQuotaNumber(result.quota_used) ??
    normalizeQuotaNumber(result.quota_current) ??
    Math.max(
      limit -
        (normalizeQuotaNumber(quota?.monthly_remaining) ??
          normalizeQuotaNumber(quota?.remaining) ??
          normalizeQuotaNumber(result.monthly_remaining) ??
          normalizeQuotaNumber(result.quota_remaining) ??
          0),
      0
    );

  const remaining =
    normalizeQuotaNumber(quota?.monthly_remaining) ??
    normalizeQuotaNumber(quota?.remaining) ??
    normalizeQuotaNumber(result.monthly_remaining) ??
    normalizeQuotaNumber(result.quota_remaining) ??
    Math.max(limit - used, 0);

  const percentUsed = limit > 0 ? Math.min((used / limit) * 100, 100) : 100;

  return {
    used,
    limit,
    remaining,
    percentUsed,
    isUnlimited: false,
    tier: quota?.tier ?? result.quota_tier,
    feature: quota?.feature ?? result.quota_feature,
  };
}

export default function AutoApplyPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const { user } = useAuth();
  const { resumes, fetchResumes, isLoading: resumesLoading } = useResume();
  const { autoApply, isAutoApplying } = useApplications();

  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobTypes, setJobTypes] = useState<JobType[]>(["full_time"]);
  const [experienceLevels, setExperienceLevels] = useState<ExperienceLevel[]>([]);
  const [locations, setLocations] = useState("");
  const [keywords, setKeywords] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxApplications, setMaxApplications] = useState(10);
  const [dryRun, setDryRun] = useState(true);
  const [includeCoverLetter, setIncludeCoverLetter] = useState(true);
  const [result, setResult] = useState<AutoApplyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const getJobTypeLabel = (value: JobType) => {
    if (isRu) {
      return {
        full_time: "Полная занятость",
        part_time: "Частичная занятость",
        remote: "Удаленно",
        hybrid: "Гибрид",
        contract: "Контракт",
      }[value];
    }
    return {
      full_time: "To'liq stavka",
      part_time: "Yarim stavka",
      remote: "Masofaviy",
      hybrid: "Gibrid",
      contract: "Shartnoma",
    }[value];
  };
  const getExperienceLabel = (value: ExperienceLevel) => {
    if (isRu) {
      return {
        junior: "Начинающий",
        mid: "Средний",
        senior: "Старший",
        lead: "Руководитель",
        executive: "Директор",
      }[value];
    }
    return {
      junior: "Boshlovchi",
      mid: "O'rta",
      senior: "Katta",
      lead: "Rahbar",
      executive: "Rahbar",
    }[value];
  };

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const publishedResumes = useMemo(
    () => resumes.filter((resume) => resume.status === "published"),
    [resumes]
  );

  useEffect(() => {
    if (!selectedResumeId && publishedResumes[0]) {
      setSelectedResumeId(publishedResumes[0].id);
    }
  }, [publishedResumes, selectedResumeId]);

  const selectedResume = useMemo(
    () => publishedResumes.find((resume) => resume.id === selectedResumeId) || null,
    [publishedResumes, selectedResumeId]
  );

  const quotaSummary = useMemo(() => resolveQuotaSummary(result), [result]);

  const handleStart = async () => {
    if (!selectedResumeId) {
      setError(isRu ? "Сначала выберите опубликованное резюме." : "Avval nashr qilingan rezyumeni tanlang.");
      return;
    }

    setError(null);
    setResult(null);

    try {
      const response = await autoApply({
        resume_id: selectedResumeId,
        dry_run: dryRun,
        criteria: {
          job_types: jobTypes,
          locations: locations
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          experience_levels: experienceLevels,
          min_salary: minSalary ? Number(minSalary) : undefined,
          keywords: keywords
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          max_applications: maxApplications,
          include_cover_letter: includeCoverLetter,
        },
      });

      setResult(response);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const isBusy = resumesLoading || isAutoApplying;
  const showUpgradeLink = !!error && /premium|enterprise|upgrade/i.test(error);

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/student/applications"
          className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {isRu ? "К заявкам" : "Arizalarga qaytish"}
        </Link>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3" />
          {isRu ? "Автоотклик" : "Avto-ariza"}
        </Badge>
      </div>

      <Card className="border-surface-200">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              {isRu ? "Автоотклик на подходящие вакансии" : "Mos ish joylariga avto-ariza"}
            </h1>
            <p className="mt-1 text-sm text-surface-500">
              {isRu
                ? "Опубликуйте резюме, настройте фильтры, и система отправит подходящие заявки."
                : "Nashr qilingan rezyumeni tanlang, filtrlarni sozlang va tizim mos arizalarni yuborsin."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/pricing">
              <Button variant="outline">{isRu ? "Улучшить тариф" : "Tarifni oshirish"}</Button>
            </Link>
            <Badge className="h-10 items-center rounded-md px-3">
              {formatTierLabel(user?.subscription_tier, isRu)} {isRu ? "тариф" : "tarif"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{isRu ? "Выберите резюме и правила подбора" : "Rezyume va moslash qoidalarini tanlang"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-2">
                    <p>{error}</p>
                    {showUpgradeLink && (
                      <Link href="/pricing">
                        <Button size="sm" variant="outline">
                          {isRu ? "Перейти на Premium" : "Premium tarifiga o'tish"}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700">{isRu ? "Опубликованное резюме" : "Nashr qilingan rezyume"}</label>
              <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                <SelectTrigger>
                  <SelectValue placeholder={isRu ? "Выберите опубликованное резюме" : "Nashr qilingan rezyumeni tanlang"} />
                </SelectTrigger>
                <SelectContent>
                  {publishedResumes.map((resume: Resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.title} - {formatDate(resume.updated_at)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {publishedResumes.length === 0 && !resumesLoading && (
                <p className="text-sm text-amber-700">
                  {isRu
                    ? "Для автоотклика нужно хотя бы одно опубликованное резюме."
                    : "Avto-ariza ishlatishdan oldin kamida bitta nashr qilingan rezyume kerak."}
                  <Link href="/student/resumes" className="ml-1 underline">
                    {isRu ? "Управлять резюме" : "Rezyumelarni boshqarish"}
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-surface-700">{isRu ? "Типы вакансий" : "Ish turlari"}</label>
                <span className="text-xs text-surface-500">{isRu ? "Выберите один или несколько" : "Bittasini yoki bir nechtasini tanlang"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {jobTypeOptions.map((option) => {
                  const active = jobTypes.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setJobTypes((prev) => toggleValue(prev, option.value))}
                      className={`rounded-full border px-3 py-2 text-sm transition ${
                        active
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-surface-200 bg-white text-surface-600 hover:border-surface-300"
                      }`}
                    >
                      {getJobTypeLabel(option.value)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-surface-700">{isRu ? "Уровни опыта" : "Tajriba darajalari"}</label>
                <span className="text-xs text-surface-500">{isRu ? "Необязательно" : "Ixtiyoriy"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {experienceOptions.map((option) => {
                  const active = experienceLevels.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setExperienceLevels((prev) => toggleValue(prev, option.value))
                      }
                      className={`rounded-full border px-3 py-2 text-sm transition ${
                        active
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-surface-200 bg-white text-surface-600 hover:border-surface-300"
                      }`}
                    >
                      {getExperienceLabel(option.value)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-700">{isRu ? "Локации" : "Joylashuvlar"}</label>
                <Input
                  value={locations}
                  onChange={(e) => setLocations(e.target.value)}
                  placeholder={isRu ? "Ташкент, Удаленно" : "Toshkent, Masofaviy"}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-700">{isRu ? "Ключевые слова" : "Kalit so'zlar"}</label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="python, backend, api"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-700">{isRu ? "Минимальная зарплата" : "Minimal maosh"}</label>
                <Input
                  type="number"
                  min="0"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="5000000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-700">{isRu ? "Макс. заявок" : "Maksimal arizalar"}</label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={maxApplications}
                  onChange={(e) => setMaxApplications(Number(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-700">{isRu ? "Режим" : "Rejim"}</label>
                <Button
                  type="button"
                  variant={dryRun ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setDryRun((prev) => !prev)}
                >
                  {dryRun ? (isRu ? "Предпросмотр" : "Oldindan ko'rish") : (isRu ? "Отправка" : "Ariza yuborish")}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-200 bg-surface-50 p-4">
              <div>
                <p className="text-sm font-medium text-surface-900">
                  {isRu ? "Сопроводительные письма" : "Cover letter qo'shish"}
                </p>
                <p className="text-xs text-surface-500">
                  {isRu ? "Система может автоматически добавить короткое сопроводительное письмо." : "Ariza yuborishda tizim qisqa cover letter qo'shishi mumkin."}
                </p>
              </div>
              <Button
                type="button"
                variant={includeCoverLetter ? "default" : "outline"}
                onClick={() => setIncludeCoverLetter((prev) => !prev)}
              >
                {includeCoverLetter ? (isRu ? "Включено" : "Yoqilgan") : (isRu ? "Отключено" : "O'chirilgan")}
              </Button>
            </div>

            <Button
              onClick={handleStart}
              disabled={isBusy || !selectedResumeId || publishedResumes.length === 0}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
            >
              {isAutoApplying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {dryRun ? (isRu ? "Подходящие вакансии (предпросмотр)" : "Mos ishlarni ko'rish") : (isRu ? "Запустить автоотклик" : "Avto-arizani boshlash")}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isRu ? "Текущие настройки" : "Joriy sozlamalar"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Briefcase className="mt-0.5 h-4 w-4 text-surface-400" />
                <div>
                  <p className="font-medium text-surface-900">{isRu ? "Резюме" : "Rezyume"}</p>
                  <p className="text-surface-500">
                    {selectedResume ? selectedResume.title : (isRu ? "Опубликованное резюме не выбрано" : "Nashr qilingan rezyume tanlanmagan")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-surface-400" />
                <div>
                  <p className="font-medium text-surface-900">{isRu ? "Локации" : "Joylashuvlar"}</p>
                  <p className="text-surface-500">{locations || (isRu ? "Любое местоположение" : "Istalgan joy")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-surface-400" />
                <div>
                  <p className="font-medium text-surface-900">{isRu ? "За один запуск" : "Bir ishga tushirishdagi arizalar"}</p>
                  <p className="text-surface-500">{maxApplications}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-surface-400" />
                <div>
                  <p className="font-medium text-surface-900">{isRu ? "Режим" : "Rejim"}</p>
                  <p className="text-surface-500">{dryRun ? (isRu ? "Только предпросмотр" : "Faqat oldindan ko'rish") : (isRu ? "Реальная отправка" : "Haqiqiy yuborish")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>{isRu ? "Сводка запуска" : "Ishga tushirish xulosasi"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quotaSummary && (
                  <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-surface-900">{isRu ? "Лимит" : "Limit holati"}</p>
                        <p className="text-xs text-surface-500">
                          {quotaSummary.feature || (isRu ? "Автоотклик" : "Avto-ariza")}{" "}
                          {result.dry_run ? (isRu ? "предпросмотр" : "oldindan ko'rish") : (isRu ? "использование" : "foydalanish")}{" "}
                          {isRu ? "для тарифа" : "uchun"} {quotaSummary.tier || user?.subscription_tier || (isRu ? "текущий" : "joriy")}
                        </p>
                      </div>
                      <Badge variant={quotaSummary.isUnlimited ? "info" : "secondary"}>
                        {quotaSummary.isUnlimited ? (isRu ? "Без лимита" : "Cheksiz") : (isRu ? "Месячный лимит" : "Oylik limit")}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3 text-sm">
                      <p className="font-medium text-surface-900">
                        {formatQuotaValue(quotaSummary.used, isRu)} / {formatQuotaValue(quotaSummary.limit, isRu)}
                      </p>
                      <p className="text-surface-500">
                        {quotaSummary.remaining === "unlimited"
                          ? (isRu ? "Месячного лимита нет" : "Oylik limit yo'q")
                          : `${formatQuotaValue(quotaSummary.remaining, isRu)} ${isRu ? "осталось" : "qoldi"}`}
                      </p>
                    </div>

                    {quotaSummary.isUnlimited ? (
                      <div className="mt-3 rounded-full border border-dashed border-surface-300 bg-white px-3 py-2 text-xs text-surface-500">
                        {isRu ? "В этом тарифе нет месячного лимита на автоотклик." : "Bu tarifda oylik auto-apply limiti yo'q."}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <Progress
                          value={quotaSummary.percentUsed}
                          size="sm"
                          variant={quotaSummary.percentUsed >= 100 ? "warning" : "default"}
                        />
                        {result.dry_run && (
                          <p className="text-xs text-surface-500">
                            {isRu ? "Режим предпросмотра не расходует лимит." : "Oldindan ko'rish rejimi limitni sarflamaydi."}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-surface-50 p-3">
                    <p className="text-2xl font-bold text-surface-900">
                      {result.total_jobs_matched}
                    </p>
                    <p className="text-xs text-surface-500">{isRu ? "Найдено" : "Mos keldi"}</p>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <p className="text-2xl font-bold text-green-700">
                      {result.applications_submitted}
                    </p>
                    <p className="text-xs text-green-600">{isRu ? "Отправлено" : "Yuborildi"}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="text-2xl font-bold text-amber-700">
                      {result.applications_skipped}
                    </p>
                    <p className="text-xs text-amber-600">{isRu ? "Пропущено" : "O'tkazib yuborildi"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {result.results.slice(0, 5).map((item) => (
                    <div
                      key={`${item.job_id}-${item.message}`}
                      className="rounded-xl border border-surface-200 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-surface-900">{item.job_title}</p>
                          <p className="text-sm text-surface-500">{item.company_name}</p>
                        </div>
                        <Badge variant={item.applied ? "default" : "secondary"}>
                          {item.applied ? (isRu ? "Отправлено" : "Yuborildi") : (isRu ? "Пропущено" : "O'tkazildi")}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-surface-600">{item.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-dashed">
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-medium text-surface-900">
                {isRu ? "Перед началом" : "Boshlashdan oldin"}
              </p>
              <p className="text-sm text-surface-500">
                {isRu
                  ? "Автоотклик лучше работает с опубликованным резюме и точными фильтрами. Сначала используйте предпросмотр, потом отправляйте."
                  : "Avto-ariza nashr qilingan rezyume va aniq filtrlar bilan yaxshi ishlaydi. Avval oldindan ko'rib, keyin yuboring."}
              </p>
              <Link href="/student/resumes">
                <Button variant="outline" className="w-full">
                  {isRu ? "Управлять резюме" : "Rezyumelarni boshqarish"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
