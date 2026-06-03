"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  ExternalLink,
  ShieldAlert,
  Globe,
  Mail,
  Phone,
  Briefcase,
  Users,
} from "lucide-react";
import { adminApi, getErrorMessage } from "@/lib/api";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRelativeTime } from "@/lib/utils";

type AdminCompany = {
  id: string;
  email: string;
  company_name: string;
  company_website: string | null;
  contact_name: string;
  phone: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string | null;
  last_login: string | null;
  jobs_count: number;
  applications_count: number;
};

export default function AdminCompaniesPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [verifyFilter, setVerifyFilter] = useState<
    "all" | "verified" | "unverified"
  >("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const t = useMemo(
    () =>
      isRu
        ? {
            title: "Компании",
            subtitle: "Все работодатели на платформе.",
            refresh: "Обновить",
            search: "Поиск",
            searchPlaceholder: "Компания или email",
            loading: "Загрузка...",
            all: "Все",
            verified: "Подтверждены",
            unverified: "Не подтверждены",
            empty: "Компании не найдены",
            verify: "Подтвердить",
            unverify: "Снять подтверждение",
            registered: "Регистрация",
            lastLogin: "Последний вход",
            never: "Никогда",
            jobs: "Вакансий",
            apps: "Откликов",
            showing: (a: number, b: number) => `Показано ${a} из ${b}`,
          }
        : {
            title: "Kompaniyalar",
            subtitle: "Platformadagi barcha ish beruvchilar.",
            refresh: "Yangilash",
            search: "Qidirish",
            searchPlaceholder: "Kompaniya yoki email",
            loading: "Yuklanmoqda...",
            all: "Hammasi",
            verified: "Tasdiqlangan",
            unverified: "Tasdiqlanmagan",
            empty: "Kompaniyalar topilmadi",
            verify: "Tasdiqlash",
            unverify: "Tasdiqdan olib tashlash",
            registered: "Ro'yxatdan o'tdi",
            lastLogin: "Oxirgi kirish",
            never: "Hech qachon",
            jobs: "Vakansiyalar",
            apps: "Arizalar",
            showing: (a: number, b: number) => `${a} / ${b} ko'rsatilmoqda`,
          },
    [isRu],
  );

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const params: { search?: string; is_verified?: boolean; limit?: number } =
        {
          limit: 50,
        };
      if (search) params.search = search;
      if (verifyFilter === "verified") params.is_verified = true;
      if (verifyFilter === "unverified") params.is_verified = false;
      const res = await adminApi.listCompanies(params);
      const data = (
        res.data as { data: { companies: AdminCompany[]; total: number } }
      ).data;
      setCompanies(data.companies);
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
  }, [search, verifyFilter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(new Set());
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const toggleAll = () => {
    if (selected.size === companies.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(companies.map((c) => c.id)));
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
      await adminApi.bulkCompanies(Array.from(selected), action);
      setSelected(new Set());
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const toggleVerify = async (company: AdminCompany) => {
    setBusyId(company.id);
    try {
      await adminApi.verifyCompany(company.id, !company.is_verified);
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === company.id ? { ...c, is_verified: !c.is_verified } : c,
        ),
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Building2 className="h-3.5 w-3.5" />
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
          <Select
            value={verifyFilter}
            onValueChange={(v) =>
              setVerifyFilter(v as "all" | "verified" | "unverified")
            }
          >
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.all}</SelectItem>
              <SelectItem value="verified">{t.verified}</SelectItem>
              <SelectItem value="unverified">{t.unverified}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setSearch(draft.trim())}>{t.search}</Button>
          <div className="ml-auto rounded-xl border border-surface-200 px-3 py-2 text-sm text-surface-600 dark:border-surface-700 dark:text-surface-300">
            {loading ? t.loading : t.showing(companies.length, total)}
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
            <Building2 className="h-5 w-5 text-brand-500" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && companies.length > 0 && (
            <div className="mb-3 flex items-center gap-2 pb-2 border-b border-surface-100 dark:border-surface-800">
              <input
                type="checkbox"
                title="Faqat yuklangan yozuvlarni tanlaydi"
                checked={selected.size === companies.length && companies.length > 0}
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
          ) : companies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-200 py-12 text-center dark:border-surface-700">
              <p className="font-medium text-surface-900 dark:text-white">
                {t.empty}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {companies.map((company) => {
                const isSelected = selected.has(company.id);
                return (
                <div
                  key={company.id}
                  className={`rounded-2xl border p-4 transition-colors ${isSelected ? "border-brand-400 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10" : "border-surface-200 hover:border-brand-200 dark:border-surface-700 dark:hover:border-brand-500/40"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(company.id)}
                      className="mt-1 h-4 w-4 flex-shrink-0 rounded border-surface-300 accent-brand-500"
                    />
                    <div className="flex min-w-0 items-start gap-3">
                      <UserAvatar name={company.company_name} size="md" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-semibold text-surface-900 dark:text-white">
                          {company.company_name}
                          {company.is_verified && (
                            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                          )}
                        </p>
                        <p className="truncate text-xs text-surface-500">
                          {company.contact_name}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={company.is_verified ? "outline" : "default"}
                      size="sm"
                      disabled={busyId === company.id}
                      onClick={() => void toggleVerify(company)}
                    >
                      {company.is_verified ? (
                        <>
                          <ShieldOff className="mr-1 h-3.5 w-3.5" />
                          {t.unverify}
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                          {t.verify}
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-surface-600 dark:text-surface-300">
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{company.email}</span>
                    </p>
                    {company.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        {company.phone}
                      </p>
                    )}
                    {company.company_website && (
                      <p className="flex items-center gap-1.5">
                        <Globe className="h-3 w-3" />
                        <Link
                          href={company.company_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                        >
                          {company.company_website.replace(/^https?:\/\//, "")}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </p>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-surface-200 pt-3 text-xs dark:border-surface-700">
                    <div className="rounded-lg bg-surface-50 p-2 dark:bg-surface-900/50">
                      <p className="flex items-center gap-1 text-surface-500">
                        <Briefcase className="h-3 w-3" /> {t.jobs}
                      </p>
                      <p className="mt-0.5 font-semibold text-surface-900 dark:text-white">
                        {company.jobs_count}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-50 p-2 dark:bg-surface-900/50">
                      <p className="flex items-center gap-1 text-surface-500">
                        <Users className="h-3 w-3" /> {t.apps}
                      </p>
                      <p className="mt-0.5 font-semibold text-surface-900 dark:text-white">
                        {company.applications_count}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-surface-500">
                    <span>
                      {t.registered}:{" "}
                      {company.created_at
                        ? formatRelativeTime(company.created_at, locale)
                        : "—"}
                    </span>
                    <span>
                      {t.lastLogin}:{" "}
                      {company.last_login
                        ? formatRelativeTime(company.last_login, locale)
                        : t.never}
                    </span>
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
          { label: "Tasdiqlash", action: "verify", variant: "default" },
          { label: "Bloklash", action: "deactivate", variant: "destructive", requireConfirm: true },
        ]}
      />
    </div>
  );
}
