"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, RefreshCw, Search } from "lucide-react";
import { adminApi, getErrorMessage } from "@/lib/api";
import { AuditTimeline } from "@/components/admin/AuditTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";

type AuditEntry = {
  id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_label: string | null;
  notes: string | null;
  created_at: string;
};

export default function AuditLogPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminApi.auditLogs({ page: 1 });
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = search
    ? logs.filter(
        (l) =>
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          l.target_label?.toLowerCase().includes(search.toLowerCase()) ||
          l.admin_name.toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
              {isRu ? "Аудит" : "Audit"}
            </p>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-surface-900 dark:text-white">
            {isRu ? "Журнал действий" : "Harakatlar jurnali"}
          </h1>
          <p className="mt-1 text-sm text-surface-500">
            {isRu ? `${total} записей` : `${total} ta yozuv`}
          </p>
        </div>
        <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          {isRu ? "Обновить" : "Yangilash"}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" aria-hidden="true" />
        <Input
          placeholder={isRu ? "Поиск по действию или объекту..." : "Harakat yoki ob'ekt bo'yicha..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10">
          <CardContent className="p-4 text-sm text-red-700 dark:text-red-300">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isRu ? "История действий" : "Harakatlar tarixi"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AuditTimeline entries={filtered} locale={locale} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
