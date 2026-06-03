"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Building2,
  Briefcase,
  ShieldAlert,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

type Notification = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  company_pending_verification: Building2,
  critical_error_spike: AlertTriangle,
  job_flagged: Briefcase,
  new_admin: ShieldAlert,
};

export function AdminNotificationBell() {
  const { locale } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await adminApi.adminNotifications(true);
      setUnreadCount(res.data.unread_count);
    } catch {
      // silent — poll failures must not break the UI
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const res = await adminApi.adminNotifications();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unread_count);
    } catch {
      // silent
    }
  }, []);

  // Poll unread count every 60 seconds
  useEffect(() => {
    void fetchUnreadCount();
    const interval = setInterval(() => void fetchUnreadCount(), 60_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleToggle = () => {
    setOpen((prev) => {
      if (!prev) void fetchAll();
      return !prev;
    });
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await adminApi.markNotificationRead(n.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
        );
      } catch {
        // silent
      }
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await adminApi.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // silent
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
        aria-label={locale === "ru" ? "Уведомления администратора" : "Admin bildirishnomalari"}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-900">
          <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3 dark:border-surface-700">
            <p className="text-sm font-semibold text-surface-900 dark:text-white">
              {locale === "ru" ? "Уведомления" : "Bildirishnomalar"}
            </p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => void handleMarkAllRead()}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {locale === "ru" ? "Все прочитаны" : "Hammasini o'qi"}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-surface-400 hover:text-surface-600"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-surface-500">
                {locale === "ru" ? "Нет уведомлений" : "Bildirishnomalar yo'q"}
              </p>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => void handleNotificationClick(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-800",
                      !n.is_read && "bg-brand-50/50 dark:bg-brand-500/5",
                    )}
                  >
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
                      <Icon className="h-4 w-4 text-surface-500" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm text-surface-800 dark:text-surface-200">
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-xs text-surface-400">
                        {formatRelativeTime(n.created_at, locale)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
