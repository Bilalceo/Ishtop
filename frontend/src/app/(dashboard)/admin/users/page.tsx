"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { adminApi, getErrorMessage } from "@/lib/api";
import type { AdminManagedUser, UserRole } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRelativeTime } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";

type LoadState = "loading" | "ready" | "error";

const copy = {
  uz: {
    title: "Foydalanuvchilar boshqaruvi",
    subtitle: "Qidirish, filterlash va hisob holatini boshqarish",
    refresh: "Yangilash",
    role: "Rol",
    status: "Holat",
    search: "Qidirish",
    searchPlaceholder: "Email yoki ism bo'yicha qidiring...",
    allRoles: "Barcha rollar",
    allStatuses: "Barcha holatlar",
    active: "Faol",
    inactive: "Faol emas",
    student: "Talaba",
    company: "Kompaniya",
    admin: "Admin",
    users: "Foydalanuvchilar",
    loading: "Yuklanmoqda...",
    showing: (count: number, total: number) =>
      `${count} / ${total} ko'rsatilmoqda`,
    noUsers: "Foydalanuvchilar topilmadi",
    tryAnother: "Filter yoki qidiruvni o'zgartirib ko'ring.",
    createdAt: "Ro'yxatdan o'tgan",
    lastLogin: "Oxirgi kirish",
    never: "Hech qachon",
    verifyYes: "Tasdiqlangan",
    verifyNo: "Tasdiqlanmagan",
    deactivate: "Bloklash",
    activate: "Faollashtirish",
    saving: "Saqlanmoqda",
    loadMore: "Yana yuklash",
    updated: "Foydalanuvchi holati yangilandi",
    confirmBlockTitle: "Foydalanuvchini bloklash",
    confirmBlockBody:
      "Bu foydalanuvchi tizimga kira olmaydi va dashboardni ko'ra olmaydi. Davom etishni xohlaysizmi?",
    confirmActivateTitle: "Foydalanuvchini faollashtirish",
    confirmActivateBody:
      "Bu foydalanuvchi tizimga qayta kira oladi. Davom etishni xohlaysizmi?",
    cancel: "Bekor qilish",
    confirmBlock: "Bloklash",
    confirmActivate: "Faollashtirish",
    cannotBlockSelf: "O'zingizni bloklay olmaysiz",
  },
  ru: {
    title: "Управление пользователями",
    subtitle: "Поиск, фильтрация и управление статусом аккаунтов",
    refresh: "Обновить",
    role: "Роль",
    status: "Статус",
    search: "Поиск",
    searchPlaceholder: "Поиск по email или имени...",
    allRoles: "Все роли",
    allStatuses: "Все статусы",
    active: "Активен",
    inactive: "Неактивен",
    student: "Студент",
    company: "Компания",
    admin: "Админ",
    users: "Пользователи",
    loading: "Загрузка...",
    showing: (count: number, total: number) => `Показано ${count} из ${total}`,
    noUsers: "Пользователи не найдены",
    tryAnother: "Измените фильтры или строку поиска.",
    createdAt: "Дата регистрации",
    lastLogin: "Последний вход",
    never: "Никогда",
    verifyYes: "Подтверждён",
    verifyNo: "Не подтверждён",
    deactivate: "Заблокировать",
    activate: "Активировать",
    saving: "Сохраняем",
    loadMore: "Загрузить ещё",
    updated: "Статус пользователя обновлён",
    confirmBlockTitle: "Заблокировать пользователя",
    confirmBlockBody:
      "Пользователь не сможет войти в систему и открыть дашборд. Продолжить?",
    confirmActivateTitle: "Активировать пользователя",
    confirmActivateBody:
      "Пользователь сможет снова войти в систему. Продолжить?",
    cancel: "Отмена",
    confirmBlock: "Заблокировать",
    confirmActivate: "Активировать",
    cannotBlockSelf: "Нельзя заблокировать себя",
  },
} as const;

const PAGE_SIZE = 20;

function roleLabel(locale: "uz" | "ru", role: UserRole) {
  const c = copy[locale];
  if (role === "admin") return c.admin;
  if (role === "company") return c.company;
  return c.student;
}

export default function AdminUsersPage() {
  const { locale } = useTranslation();
  const c = copy[locale];
  const { user: currentAdmin } = useAuth();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | UserRole>("all");
  const [isActive, setIsActive] = useState<"all" | "true" | "false">("all");
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<AdminManagedUser | null>(
    null,
  );

  const hasMore = users.length < total;

  const fetchUsers = async (append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoadState("loading");
      setLoadError(null);
    }

    const nextOffset = append ? offset : 0;

    try {
      const response = await adminApi.listUsers({
        limit: PAGE_SIZE,
        offset: nextOffset,
        role: role === "all" ? undefined : role,
        is_active: isActive === "all" ? undefined : isActive === "true",
        search: search.trim() || undefined,
      });

      const payload = response.data;
      setTotal(payload.total || 0);
      setUsers((prev) =>
        append ? [...prev, ...payload.users] : payload.users,
      );
      setOffset(nextOffset + (payload.users?.length || 0));
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setLoadError(getErrorMessage(error));
    } finally {
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchUsers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, isActive, search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(new Set());
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const toggleAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
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
      await adminApi.bulkUsers(Array.from(selected), action);
      setSelected(new Set());
      await fetchUsers(false);
    } catch (err) {
      setLoadError(getErrorMessage(err));
    }
  };

  const handleSearchSubmit = () => {
    setOffset(0);
    setSearch(searchDraft.trim());
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers(false);
  };

  const handleToggleActive = async (user: AdminManagedUser) => {
    setSavingId(user.id);
    setLoadError(null);
    setStatusMessage(null);

    try {
      const nextActive = !user.is_active;
      await adminApi.updateUserStatus(user.id, { is_active: nextActive });
      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, is_active: nextActive } : item,
        ),
      );
      setStatusMessage(c.updated);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setSavingId(null);
      setConfirmTarget(null);
    }
  };

  const headerStats = useMemo(() => {
    const activeCount = users.filter((item) => item.is_active).length;
    const verifiedCount = users.filter((item) => item.is_verified).length;
    return { activeCount, verifiedCount };
  }, [users]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-transparent blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              <Users className="h-3.5 w-3.5" />
              {c.users}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
              {c.title}
            </h1>
            <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400">
              {c.subtitle}
            </p>
          </div>
          <Button variant="outline" onClick={() => void handleRefresh()}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {c.refresh}
          </Button>
        </div>

        <div className="relative mt-6 grid gap-3 lg:grid-cols-[1.4fr_0.7fr_0.7fr_auto]">
          <div className="flex gap-2">
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder={c.searchPlaceholder}
              icon={<Search className="h-4 w-4" />}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearchSubmit();
                }
              }}
            />
            <Button onClick={handleSearchSubmit}>{c.search}</Button>
          </div>

          <Select
            value={role}
            onValueChange={(value) => setRole(value as "all" | UserRole)}
          >
            <SelectTrigger>
              <SelectValue placeholder={c.role} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{c.allRoles}</SelectItem>
              <SelectItem value="student">{c.student}</SelectItem>
              <SelectItem value="company">{c.company}</SelectItem>
              <SelectItem value="admin">{c.admin}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={isActive}
            onValueChange={(value) =>
              setIsActive(value as "all" | "true" | "false")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={c.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{c.allStatuses}</SelectItem>
              <SelectItem value="true">{c.active}</SelectItem>
              <SelectItem value="false">{c.inactive}</SelectItem>
            </SelectContent>
          </Select>

          <div className="rounded-xl border border-surface-200 px-3 py-2 text-sm text-surface-600 dark:border-surface-700 dark:text-surface-300">
            {loadState === "loading"
              ? c.loading
              : c.showing(users.length, total)}
          </div>
        </div>
      </section>

      {statusMessage && (
        <Card className="border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10">
          <CardContent className="flex items-center gap-2 p-3 text-green-800 dark:text-green-100">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">{statusMessage}</span>
          </CardContent>
        </Card>
      )}

      {loadError && (
        <Card className="border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10">
          <CardContent className="flex items-center gap-2 p-3 text-red-800 dark:text-red-100">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-sm">{loadError}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-500" />
              {c.users}
            </span>
            <div className="flex gap-2 text-xs">
              <Badge variant="success">
                {c.active}: {headerStats.activeCount}
              </Badge>
              <Badge variant="secondary">
                {c.verifyYes}: {headerStats.verifiedCount}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadState === "ready" && users.length > 0 && (
            <div className="mb-2 flex items-center gap-2 pb-2 border-b border-surface-100 dark:border-surface-800">
              <input
                type="checkbox"
                title="Faqat yuklangan yozuvlarni tanlaydi"
                checked={selected.size === users.length && users.length > 0}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-surface-300 accent-brand-500"
              />
              <span className="text-xs text-surface-500">
                {selected.size > 0 ? `${selected.size} tanlandi` : "Hammasini tanlash"}
              </span>
            </div>
          )}
          {loadState === "loading" ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-200 py-14 text-center dark:border-surface-700">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-100 ring-8 ring-surface-50 dark:bg-surface-800 dark:ring-surface-900/40">
                <Search className="h-7 w-7 text-surface-400" />
              </div>
              <p className="mt-4 font-display text-lg font-semibold text-surface-900 dark:text-white">
                {c.noUsers}
              </p>
              <p className="mt-1 max-w-xs text-sm text-surface-500">
                {c.tryAnother}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {users.map((user) => {
                const isSaving = savingId === user.id;
                const isSelected = selected.has(user.id);
                return (
                  <div
                    key={user.id}
                    className={`grid gap-3 rounded-xl border p-4 transition-colors lg:grid-cols-[auto_1.6fr_0.8fr_0.9fr_auto] ${isSelected ? "border-brand-400 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10" : "border-surface-200 bg-white hover:border-brand-300 dark:border-surface-700 dark:bg-surface-800 dark:hover:border-brand-500/40"}`}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(user.id)}
                        className="h-4 w-4 rounded border-surface-300 accent-brand-500"
                      />
                    </div>
                    <div className="flex items-start gap-3 min-w-0">
                      <UserAvatar name={user.full_name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-surface-900 dark:text-white">
                          {user.full_name}
                        </p>
                        <p className="truncate text-sm text-surface-500">
                          {user.email}
                        </p>
                        <div className="mt-1 grid grid-cols-1 gap-x-3 text-xs text-surface-500 sm:grid-cols-2">
                          <p className="truncate">
                            {c.createdAt}:{" "}
                            <span className="font-medium text-surface-700 dark:text-surface-300">
                              {formatRelativeTime(user.created_at, locale)}
                            </span>
                          </p>
                          <p className="truncate">
                            {c.lastLogin}:{" "}
                            <span className="font-medium text-surface-700 dark:text-surface-300">
                              {user.last_login
                                ? formatRelativeTime(user.last_login, locale)
                                : c.never}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {roleLabel(locale, user.role)}
                      </Badge>
                      <Badge variant={user.is_verified ? "success" : "warning"}>
                        {user.is_verified ? c.verifyYes : c.verifyNo}
                      </Badge>
                    </div>

                    <div className="flex items-center">
                      <Badge variant={user.is_active ? "success" : "secondary"}>
                        {user.is_active ? c.active : c.inactive}
                      </Badge>
                    </div>

                    <div className="flex justify-end">
                      {(() => {
                        const isSelf = currentAdmin?.id === user.id;
                        return (
                          <Button
                            variant={user.is_active ? "destructive" : "default"}
                            onClick={() => setConfirmTarget(user)}
                            disabled={isSaving || isSelf}
                            title={isSelf ? c.cannotBlockSelf : undefined}
                            aria-label={
                              user.is_active ? c.deactivate : c.activate
                            }
                          >
                            {isSaving ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                {c.saving}
                              </>
                            ) : user.is_active ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                {c.deactivate}
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                {c.activate}
                              </>
                            )}
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {loadState === "ready" && hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={() => void fetchUsers(true)}
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {c.loadMore}
                  </>
                ) : (
                  c.loadMore
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <BulkActionBar
        selectedCount={selected.size}
        onAction={handleBulkAction}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: "Faollashtirish", action: "activate", variant: "default" },
          { label: "Bloklash", action: "deactivate", variant: "destructive", requireConfirm: true },
        ]}
      />

      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmTarget?.is_active
                ? c.confirmBlockTitle
                : c.confirmActivateTitle}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.is_active
                ? c.confirmBlockBody
                : c.confirmActivateBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmTarget(null)}
              disabled={savingId !== null}
            >
              {c.cancel}
            </Button>
            <Button
              variant={confirmTarget?.is_active ? "destructive" : "default"}
              onClick={() => {
                if (confirmTarget) void handleToggleActive(confirmTarget);
              }}
              disabled={savingId !== null}
            >
              {savingId !== null ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {c.saving}
                </>
              ) : confirmTarget?.is_active ? (
                c.confirmBlock
              ) : (
                c.confirmActivate
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
