/**
 * =============================================================================
 * STUDENT DASHBOARD LAYOUT
 * =============================================================================
 *
 * Features:
 * - Sidebar navigation (Dashboard, Resumes, Jobs, Applications, Settings)
 * - Top navbar with search, notifications, user avatar
 * - Responsive with mobile drawer
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Send,
  Settings,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Menu,
  X,
  Sparkles,
  HelpCircle,
  ChevronRight,
  BookmarkCheck,
  Loader2,
} from "lucide-react";
import { useAuth, useRequireAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { aiApi, api, getErrorMessage, userApi } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import MobileBottomNav from "@/components/pwa/MobileBottomNav";
import { cn } from "@/lib/utils";

// =============================================================================
// NAVIGATION CONFIG (will be translated in component)
// =============================================================================

const getNavigation = (t: (key: string) => string) => [
  {
    name: t("dashboard.sidebar.dashboard"),
    href: "/student",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: t("dashboard.sidebar.myResumes"),
    href: "/student/resumes",
    icon: FileText,
    badge: undefined as string | undefined,
  },
  {
    name: t("dashboard.sidebar.findJobs"),
    href: "/student/jobs",
    icon: Briefcase,
    badge: undefined as string | undefined,
    badgeColor: "success",
  },
  {
    name: t("dashboard.sidebar.myApplications"),
    href: "/student/applications",
    icon: Send,
    badge: undefined as string | undefined,
    badgeColor: "warning",
  },
  {
    name: t("dashboard.sidebar.savedJobs"),
    href: "/student/saved-jobs",
    icon: BookmarkCheck,
  },
  {
    name: t("dashboard.sidebar.notifications"),
    href: "/student/notifications",
    icon: Bell,
  },
  {
    name: t("dashboard.settings.title"),
    href: "/student/settings",
    icon: Settings,
  },
];

const getQuickActions = (t: (key: string) => string) => [
  {
    name: t("dashboard.sidebar.createAIResume"),
    href: "/student/resumes/create-ai",
    icon: Sparkles,
    color: "from-emerald-500 to-teal-600",
  },
];

// =============================================================================
// MAIN LAYOUT
// =============================================================================

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname()!;
  const { t, locale } = useTranslation();
  const { isAuthorized } = useRequireAuth("student");
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [resumeCount, setResumeCount] = useState<number>(0);
  const [applicationCount, setApplicationCount] = useState<number>(0);
  const [showJobsNewBadge, setShowJobsNewBadge] = useState(false);
  const [shortcutHint, setShortcutHint] = useState("Ctrl+K");
  const [helpQuestion, setHelpQuestion] = useState("");
  const [helpAnswer, setHelpAnswer] = useState("");
  const [helpLoading, setHelpLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isApple = /Mac|iPhone|iPad|iPod/i.test(window.navigator.platform);
    setShortcutHint(isApple ? "⌘K" : "Ctrl+K");
    const jobsBadgeSeen = window.localStorage.getItem("student_jobs_badge_seen");
    setShowJobsNewBadge(!jobsBadgeSeen);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    if (pathname.startsWith("/student/jobs") && typeof window !== "undefined") {
      window.localStorage.setItem("student_jobs_badge_seen", "1");
      setShowJobsNewBadge(false);
    }
  }, [pathname]);

  useEffect(() => {
    const loadSidebarCounts = async () => {
      try {
        const profileRes = await userApi.getProfile();
        const payload = profileRes.data?.data ?? profileRes.data ?? {};
        const nextResumeCount =
          typeof payload.resume_count === "number" ? payload.resume_count : 0;
        const nextApplicationCount =
          typeof payload.application_count === "number"
            ? payload.application_count
            : 0;

        setResumeCount(nextResumeCount);
        setApplicationCount(nextApplicationCount);
      } catch {
        // Keep badges hidden on API failure
      }
    };

    if (!user?.id) return;
    loadSidebarCounts();
  }, [user?.id]);

  // Fetch notifications on mount and when dropdown opens
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await api.get("/notifications?limit=10");
        const data = res.data;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      } catch {
        // Silently fail if notifications not available
      }
    };
    loadNotifications();
    // Refresh every 60 seconds
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  // Get translated navigation items
  const navigation = getNavigation(t).map((item) => {
    if (item.href === "/student/resumes") {
      return {
        ...item,
        badge: resumeCount > 0 ? String(resumeCount) : undefined,
      };
    }
    if (item.href === "/student/applications") {
      return {
        ...item,
        badge: applicationCount > 0 ? String(applicationCount) : undefined,
      };
    }
    if (item.href === "/student/jobs") {
      return {
        ...item,
        badge: showJobsNewBadge ? t("dashboard.sidebar.new") : undefined,
      };
    }
    return item;
  });
  const quickActions = getQuickActions(t);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const askHelpAssistant = async () => {
    const question = helpQuestion.trim();
    if (!question) return;

    setHelpLoading(true);
    try {
      const res = await aiApi.projectHelp({
        question,
        locale: locale === "ru" ? "ru" : "uz",
        context_page: pathname,
      });
      const answer =
        (res.data as { data?: { answer?: string } })?.data?.answer ||
        (locale === "ru"
          ? "Помощник пока не ответил. Попробуйте снова."
          : "Yordamchi hozircha javob bermadi. Qayta urinib ko'ring.");
      setHelpAnswer(answer);
    } catch (error) {
      setHelpAnswer(getErrorMessage(error));
    } finally {
      setHelpLoading(false);
    }
  };

  if (!isAuthorized) return null;

  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-900">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl transition-transform duration-300 dark:bg-surface-800 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-surface-200 px-4 dark:border-surface-700">
          <Link href="/student" className="flex items-center gap-2">
            <Image
              src="/logo-mark.png?v=2"
              alt="IshTop"
              width={36}
              height={36}
              priority
              className="h-9 w-9 rounded-xl"
            />
            <span className="font-display text-lg font-bold text-surface-900 dark:text-white">
              IshTop
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-surface-500 hover:bg-surface-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {/* Quick Action */}
          <Link href="/student/resumes/create-ai" className="block mb-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 p-3 text-white shadow-lg shadow-emerald-500/25"
            >
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">
                {t("dashboard.sidebar.createAIResume")}
              </span>
            </motion.div>
          </Link>

          {/* Main Navigation */}
          {navigation.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors",
                    active
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.badge && (
                    <Badge
                      variant={
                        item.badgeColor === "success"
                          ? "success"
                          : item.badgeColor === "warning"
                            ? "warning"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-surface-200 p-4 dark:border-surface-700">
          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:from-emerald-900/20 dark:to-teal-900/20">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <HelpCircle className="h-5 w-5" />
              <span className="font-medium">
                {t("dashboard.sidebar.needHelp")}
              </span>
            </div>
            <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
              {t("dashboard.sidebar.helpText")}
            </p>
            <div className="mt-3 space-y-2">
              <Input
                value={helpQuestion}
                onChange={(e) => setHelpQuestion(e.target.value)}
                placeholder={
                  locale === "ru"
                    ? "Спросите, например: как быстро откликнуться?"
                    : "Masalan: tezkor ariza qanday yuboriladi?"
                }
                className="h-9 border-emerald-200 bg-white/80 text-xs dark:border-emerald-700 dark:bg-surface-800/70"
              />
              <Button
                size="sm"
                onClick={() => void askHelpAssistant()}
                disabled={helpLoading || !helpQuestion.trim()}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-xs"
              >
                {helpLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    {locale === "ru" ? "Отвечаем..." : "Javob tayyorlanmoqda..."}
                  </>
                ) : locale === "ru" ? (
                  "Спросить AI-помощника"
                ) : (
                  "AI yordamchidan so'rash"
                )}
              </Button>
              {helpAnswer && (
                <>
                  <div className="relative rounded-lg border border-emerald-200 bg-white/90 p-2 pr-9 text-xs leading-relaxed text-surface-700 dark:border-emerald-700 dark:bg-surface-800/80 dark:text-surface-300">
                    <button
                      type="button"
                      onClick={() => setHelpAnswer("")}
                      className="absolute right-1.5 top-1.5 rounded p-1 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
                      aria-label={locale === "ru" ? "Закрыть ответ" : "Javobni yopish"}
                      title={locale === "ru" ? "Закрыть" : "Yopish"}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {helpAnswer}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
                    onClick={() => setHelpAnswer("")}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    {locale === "ru" ? "Закрыть ответ" : "Javobni yopish"}
                  </Button>
                </>
              )}
            </div>
            <Link href="/student/help" className="block">
              <Button variant="outline" size="sm" className="mt-3 w-full">
                {t("dashboard.sidebar.viewDocs")}
              </Button>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-surface-200 bg-white px-4 dark:border-surface-700 dark:bg-surface-800 lg:px-8">
          {/* Left: Mobile menu + Search */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder={`${t("common.search")} ${t("dashboard.jobs.title").toLowerCase()}, ${t("dashboard.resumes.title").toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-xl border border-surface-200 bg-surface-50 py-2 pl-10 pr-4 text-sm placeholder-surface-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 lg:w-80"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-surface-200 px-1.5 py-0.5 text-xs text-surface-500">
                {shortcutHint}
              </kbd>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <LanguageSwitcher variant="minimal" />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-lg p-2 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-800"
                    >
                      <div className="flex items-center justify-between border-b border-surface-200 p-4 dark:border-surface-700">
                        <h3 className="font-semibold text-surface-900 dark:text-white">
                          {t("dashboard.sidebar.notifications")}
                        </h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-sm text-emerald-600 hover:underline"
                          >
                            {t("notificationsPage.markAllRead")}
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Bell className="h-8 w-8 text-surface-300" />
                            <p className="mt-2 text-sm text-surface-500">
                              {t("notificationsPage.empty")}
                            </p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={cn(
                                "flex gap-3 border-b border-surface-100 p-4 last:border-0 dark:border-surface-700",
                                !n.is_read &&
                                  "bg-emerald-50/50 dark:bg-emerald-900/10",
                              )}
                            >
                              <div className="flex-1">
                                <p className="font-medium text-surface-900 dark:text-white">
                                  {n.title}
                                </p>
                                <p className="mt-0.5 text-sm text-surface-500">
                                  {n.message}
                                </p>
                                <p className="mt-1 text-xs text-surface-400">
                                  {formatRelativeTime(
                                    n.created_at,
                                    locale === "ru" ? "ru" : "uz",
                                  )}
                                </p>
                              </div>
                              {!n.is_read && (
                                <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      <div className="border-t border-surface-200 p-2 dark:border-surface-700">
                        <Link
                          href="/student/notifications"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          <Button variant="ghost" size="sm" className="w-full">
                            {t("notificationsPage.allNotifications")}
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-surface-100 dark:hover:bg-surface-700"
              >
                <Avatar
                  src={user?.avatar_url}
                  alt={user?.full_name || "User"}
                  fallback={user?.full_name?.charAt(0) || "U"}
                  className="h-8 w-8"
                />
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    {user?.full_name || "User"}
                  </p>
                  <p className="text-xs text-surface-500">
                    {t("common.student")}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-surface-500" />
              </button>

              {/* User Dropdown */}
              <AnimatePresence>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-surface-200 bg-white p-2 shadow-xl dark:border-surface-700 dark:bg-surface-800"
                    >
                      <div className="border-b border-surface-200 p-3 dark:border-surface-700">
                        <p className="font-medium text-surface-900 dark:text-white">
                          {user?.full_name || "User"}
                        </p>
                        <p className="text-sm text-surface-500">
                          {user?.email}
                        </p>
                      </div>
                      <div className="py-2">
                        <Link
                          href="/student/settings#profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                        >
                          <User className="h-4 w-4" />
                          {t("dashboard.sidebar.profileSettings")}
                        </Link>
                        <Link
                          href="/student/settings#security"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                        >
                          <Settings className="h-4 w-4" />
                          {t("dashboard.sidebar.accountSettings")}
                        </Link>
                      </div>
                      <div className="border-t border-surface-200 pt-2 dark:border-surface-700">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <LogOut className="h-4 w-4" />
                          {t("nav.logout")}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 lg:p-8 lg:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav (PWA native feel) */}
      <MobileBottomNav />
    </div>
  );
}
