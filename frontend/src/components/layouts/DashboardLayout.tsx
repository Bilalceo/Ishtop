/**
 * Dashboard Layout Component
 * Shared layout for student and company dashboards
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  FileText,
  Briefcase,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Users,
  PlusCircle,
  LayoutDashboard,
  BarChart3,
  Zap,
  AlertTriangle,
  Server,
  KeyRound,
  Building2,
  ScrollText,
  Send,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AiChatWidget } from "@/components/AiChatWidget";
import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/NotificationBell";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { CommandPalette } from "@/components/admin/CommandPalette";

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

function maskEmail(email?: string | null): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

const studentNavItems: NavItem[] = [
  {
    labelKey: "dashboard.sidebar.myResumes",
    href: "/student/resumes",
    icon: FileText,
  },
  {
    labelKey: "dashboard.sidebar.findJobs",
    href: "/student/jobs",
    icon: Briefcase,
  },
  {
    labelKey: "dashboard.sidebar.myApplications",
    href: "/student/applications",
    icon: ClipboardList,
  },
  {
    labelKey: "dashboard.sidebar.settings",
    href: "/student/settings",
    icon: Settings,
  },
];

const companyNavItems: NavItem[] = [
  {
    labelKey: "dashboard.sidebar.jobPostings",
    href: "/company/jobs",
    icon: Briefcase,
  },
  {
    labelKey: "dashboard.sidebar.applicants",
    href: "/company/applicants",
    icon: Users,
  },
  {
    labelKey: "dashboard.sidebar.analytics",
    href: "/company/analytics",
    icon: BarChart3,
  },
  {
    labelKey: "dashboard.sidebar.settings",
    href: "/company/settings",
    icon: Settings,
  },
];

const adminNavItems: NavItem[] = [
  {
    labelKey: "dashboard.sidebar.overview",
    href: "/admin",
    icon: LayoutDashboard,
  },
  { labelKey: "dashboard.sidebar.users", href: "/admin/users", icon: Users },
  {
    labelKey: "dashboard.sidebar.companies",
    href: "/admin/companies",
    icon: Building2,
  },
  { labelKey: "dashboard.sidebar.jobs", href: "/admin/jobs", icon: Briefcase },
  {
    labelKey: "dashboard.sidebar.applications",
    href: "/admin/applications",
    icon: ClipboardList,
  },
  {
    labelKey: "dashboard.sidebar.systemHealth",
    href: "/admin#health",
    icon: Server,
  },
  {
    labelKey: "dashboard.sidebar.errors",
    href: "/admin#errors",
    icon: AlertTriangle,
  },
  {
    labelKey: "dashboard.sidebar.access",
    href: "/admin/access",
    icon: KeyRound,
  },
  {
    labelKey: "dashboard.sidebar.auditLog",
    href: "/admin/audit",
    icon: ScrollText,
  },
  {
    labelKey: "dashboard.sidebar.landing",
    href: "/admin/landing",
    icon: Zap,
  },
];

function contextRoleLabel(params: {
  isAdmin: boolean;
  isCompany: boolean;
  locale: "uz" | "ru";
}) {
  const { isAdmin, isCompany, locale } = params;
  if (isAdmin)
    return locale === "ru" ? "Системный администратор" : "Tizim administratori";
  if (isCompany) return locale === "ru" ? "Работодатель" : "Ish beruvchi";
  return locale === "ru" ? "Соискатель" : "Talaba";
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()!;
  const { user, logout, isStudent, isCompany, isAdmin } = useAuth();
  const { t, locale } = useTranslation();
  const fallbackUserName = locale === "ru" ? "Пользователь" : "Foydalanuvchi";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateHash = () => setCurrentHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAdmin]);

  const navItems = isAdmin
    ? adminNavItems
    : isCompany
      ? companyNavItems
      : studentNavItems;
  const dashboardHome = isAdmin
    ? "/admin#overview"
    : isCompany
      ? "/company/jobs"
      : "/student/resumes";
  const effectiveHash =
    currentHash || (pathname === "/admin" ? "#overview" : "");

  const userMenuLink = isAdmin
    ? "/admin#overview"
    : isCompany
      ? "/company/settings"
      : "/student/settings";
  const userMenuLabel = isAdmin
    ? t("dashboard.sidebar.overview")
    : t("dashboard.sidebar.settings");
  const UserMenuIcon = isAdmin ? LayoutDashboard : Settings;
  const roleLabel = contextRoleLabel({ isAdmin, isCompany, locale });
  const visibleEmail = isAdmin ? maskEmail(user?.email) : user?.email;

  const activeNavName = useMemo(() => {
    const activeItem = navItems.find((item) => {
      const [itemPath, itemHash] = item.href.split("#");
      if (pathname !== itemPath) {
        return pathname.startsWith(itemPath) && !itemHash;
      }
      if (!itemHash) {
        return pathname.startsWith(itemPath);
      }
      return effectiveHash === `#${itemHash}`;
    });

    return activeItem ? t(activeItem.labelKey) : t("dashboard.title");
  }, [effectiveHash, navItems, pathname, t]);

  const isNavItemActive = (item: NavItem) => {
    const [itemPath, itemHash] = item.href.split("#");

    if (pathname !== itemPath) {
      return pathname.startsWith(itemPath) && !itemHash;
    }

    if (!itemHash) {
      return pathname.startsWith(itemPath);
    }

    return effectiveHash === `#${itemHash}`;
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white dark:bg-surface-900 transition-transform duration-200 lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col border-r border-surface-200 dark:border-surface-800">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-surface-200 dark:border-surface-800">
            <Link href={dashboardHome} className="flex items-center gap-2">
              <Image
                src="/logo-mark.png?v=3"
                alt="IshTop"
                width={36}
                height={36}
                priority
                className="h-9 w-9 rounded-xl"
              />
              <span className="font-display text-xl font-bold text-surface-900 dark:text-white">
                IshTop
              </span>
              {isAdmin && (
                <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)] motion-safe:animate-pulse" aria-hidden="true" />
              )}
            </Link>
            <button
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-surface-500" />
            </button>
          </div>

          {/* AI Feature CTA */}
          {isStudent && (
            <div className="mx-4 mt-4 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5" />
                <span className="font-semibold">
                  {t("dashboard.sidebar.createAIResume")}
                </span>
              </div>
              <p className="text-sm text-brand-100 mb-3">
                {t("dashboard.quickActions.createAIResumeDesc")}
              </p>
              <Link
                href="/student/resumes/create-ai"
                className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                {t("dashboard.resumes.createAI")}
              </Link>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive = isNavItemActive(item);
              const isHashRoute = item.href.includes("#");
              const navContent = (
                <>
                  <item.icon
                    className={cn("h-5 w-5", isActive ? "text-brand-500" : "")}
                  />
                  {t(item.labelKey)}
                  {item.badge && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-xs text-white">
                      {item.badge}
                    </span>
                  )}
                </>
              );
              return isHashRoute ? (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                      : "text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800",
                  )}
                >
                  {navContent}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                      : "text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800",
                  )}
                >
                  {navContent}
                </Link>
              );
            })}
          </nav>

          {/* Feedback — complaints & suggestions via Telegram */}
          <div className="px-4 pb-2">
            <a
              href="https://t.me/vioralab_admin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-surface-50 px-3 py-2.5 text-sm font-medium text-surface-600 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:bg-surface-800/60 dark:text-surface-400 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
            >
              <Send className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate">
                  {locale === "ru" ? "Жалобы и предложения" : "Shikoyat va takliflar"}
                </span>
                <span className="block truncate text-[11px] font-normal text-surface-400">
                  @vioralab_admin
                </span>
              </span>
            </a>
          </div>

          {/* User section */}
          <div className="border-t border-surface-200 dark:border-surface-800 p-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={user?.full_name || fallbackUserName}
                imageUrl={user?.avatar_url}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-surface-500 truncate">{roleLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-surface-200 bg-white/80 px-4 backdrop-blur-xl dark:border-surface-800 dark:bg-surface-900/80 sm:px-6">
          {/* Mobile menu button */}
          <button type="button" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-surface-600" />
          </button>

          {/* Page title - shown on mobile */}
          <div className="lg:hidden font-medium text-surface-900 dark:text-white">
            {activeNavName}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <LanguageSwitcher variant="minimal" />

            {/* Dark Mode Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            {isAdmin ? <AdminNotificationBell /> : <NotificationBell />}

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <UserAvatar
                  name={user?.full_name || fallbackUserName}
                  imageUrl={user?.avatar_url}
                  size="sm"
                />
                <ChevronDown className="h-4 w-4 text-surface-500" />
              </button>

              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-surface-200 bg-white p-1 shadow-lg dark:border-surface-700 dark:bg-surface-800">
                    <div className="border-b border-surface-200 px-3 py-2 dark:border-surface-700">
                      <p className="text-sm font-medium text-surface-900 dark:text-white">
                        {user?.full_name}
                      </p>
                      <p className="text-xs text-surface-500">{roleLabel}</p>
                      {visibleEmail && (
                        <p className="text-xs text-surface-400">
                          {visibleEmail}
                        </p>
                      )}
                    </div>
                    <div className="py-1">
                      <Link
                        href={userMenuLink}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <UserMenuIcon className="h-4 w-4" />
                        {userMenuLabel}
                      </Link>
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("nav.logout")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className={cn(
            "p-4 sm:p-6 lg:p-8",
            isCompany || isAdmin ? "pb-24 lg:pb-8" : "",
          )}
        >
          {children}
        </main>
      </div>

      {isAdmin && (
        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      )}

      {/* Floating AI assistant — scoped to the current role */}
      <AiChatWidget audience={isAdmin ? "admin" : "company"} />
    </div>
  );
}
