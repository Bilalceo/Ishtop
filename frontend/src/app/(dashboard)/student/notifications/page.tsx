"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  Trash2,
  Filter,
  CheckCheck,
  Loader2,
  Briefcase,
  Calendar,
  FileText,
  AlertCircle,
  Info,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatRelativeTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import PushNotificationCard from "@/components/pwa/PushNotificationCard";
import { useTranslation } from "@/contexts/TranslationContext";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  success: { icon: Check, color: "text-green-600", bg: "bg-green-100" },
  warning: { icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-100" },
  error: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-100" },
  application: { icon: Briefcase, color: "text-purple-600", bg: "bg-purple-100" },
  interview: { icon: Calendar, color: "text-cyan-600", bg: "bg-cyan-100" },
  resume: { icon: FileText, color: "text-indigo-600", bg: "bg-indigo-100" },
  ai: { icon: Sparkles, color: "text-pink-600", bg: "bg-pink-100" },
};

const getTypeConfig = (type: string) =>
  typeConfig[type] || typeConfig.info;

export default function NotificationsPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const c = isRu
    ? {
        title: "Уведомления",
        countSuffix: "уведомлений",
        loadFail: "Не удалось загрузить уведомления.",
        genericErr: "Произошла ошибка.",
        deleted: "Удалено.",
        allMarkedRead: "Все отмечены как прочитанные.",
        markAllRead: "Прочитать все",
        all: "Все",
        unread: "Непрочитанные",
        emptyUnread: "Нет непрочитанных уведомлений",
        emptyAll: "Уведомлений пока нет",
        emptyUnreadSub: "Все уведомления прочитаны.",
        emptyAllSub: "Здесь появятся новые события.",
        showAll: "Показать все",
        view: "Открыть",
        markRead: "Отметить прочитанным",
        delete: "Удалить",
      }
    : {
        title: "Bildirishnomalar",
        countSuffix: "ta bildirishnoma",
        loadFail: "Bildirishnomalar yuklanmadi.",
        genericErr: "Xatolik yuz berdi.",
        deleted: "O'chirildi.",
        allMarkedRead: "Barchasi o'qildi deb belgilandi.",
        markAllRead: "Barchasini o'qildi",
        all: "Barchasi",
        unread: "O'qilmagan",
        emptyUnread: "O'qilmagan bildirishnoma yo'q",
        emptyAll: "Bildirishnomalar yo'q",
        emptyUnreadSub: "Barcha bildirishnomalar o'qilgan.",
        emptyAllSub: "Yangi faoliyat bo'lganda bu yerda ko'rinadi.",
        showAll: "Barchasini ko'rish",
        view: "Ko'rish",
        markRead: "O'qildi deb belgilash",
        delete: "O'chirish",
      };

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const params = filter === "unread" ? "?unread_only=true&limit=50" : "?limit=50";
      const res = await api.get(`/notifications${params}`);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      toast.error(c.loadFail);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const markAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      toast.error(c.genericErr);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      const was_unread = notifications.find((n) => n.id === id)?.is_read === false;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (was_unread) setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success(c.deleted);
    } catch {
      toast.error(c.genericErr);
    }
  };

  const markAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success(c.allMarkedRead);
    } catch {
      toast.error(c.genericErr);
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <PushNotificationCard />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-surface-900">
            <Bell className="h-6 w-6 text-purple-600" />
            {c.title}
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="mt-1 text-sm text-surface-500">
            {notifications.length} {c.countSuffix}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={markAllAsRead}
            disabled={isMarkingAll}
            className="gap-2"
          >
            {isMarkingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            {c.markAllRead}
          </Button>
        )}
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-2 rounded-xl border border-surface-200 bg-surface-50 p-1">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
            filter === "all"
              ? "bg-white text-surface-900 shadow-sm"
              : "text-surface-500 hover:text-surface-700"
          )}
        >
          {c.all}
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
            filter === "unread"
              ? "bg-white text-surface-900 shadow-sm"
              : "text-surface-500 hover:text-surface-700"
          )}
        >
          {c.unread}
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-surface-200 bg-white p-4">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-300 py-24 text-center"
        >
          <Bell className="h-16 w-16 text-surface-300" />
          <h3 className="mt-4 text-lg font-semibold text-surface-700">
            {filter === "unread" ? c.emptyUnread : c.emptyAll}
          </h3>
          <p className="mt-2 text-sm text-surface-500">
            {filter === "unread" ? c.emptyUnreadSub : c.emptyAllSub}
          </p>
          {filter === "unread" && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setFilter("all")}
            >
              {c.showAll}
            </Button>
          )}
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {notifications.map((n, i) => {
              const cfg = getTypeConfig(n.type);
              const Icon = cfg.icon;

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "group flex gap-4 rounded-2xl border p-4 transition-all hover:shadow-sm",
                    n.is_read
                      ? "border-surface-200 bg-white"
                      : "border-purple-100 bg-purple-50/40"
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                      cfg.bg
                    )}
                  >
                    <Icon className={cn("h-5 w-5", cfg.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("font-semibold text-sm", n.is_read ? "text-surface-700" : "text-surface-900")}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-purple-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-surface-500 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-xs text-surface-400">
                        {formatRelativeTime(n.created_at)}
                      </span>
                      {n.link && (
                        <Link
                          href={n.link}
                          className="flex items-center gap-1 text-xs text-purple-600 hover:underline"
                          onClick={() => !n.is_read && markAsRead(n.id)}
                        >
                          {c.view}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!n.is_read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        title={c.markRead}
                        className="rounded-lg p-1.5 text-surface-400 hover:bg-green-50 hover:text-green-600"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(n.id)}
                      title={c.delete}
                      className="rounded-lg p-1.5 text-surface-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
