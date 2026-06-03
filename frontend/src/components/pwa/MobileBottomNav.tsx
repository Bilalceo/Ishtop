"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Home, Send, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/student", icon: Home, label: "Asosiy", exact: true },
  { href: "/student/jobs", icon: Briefcase, label: "Ishlar" },
  { href: "/student/resumes/create-ai", icon: Sparkles, label: "AI", primary: true },
  { href: "/student/applications", icon: Send, label: "Arizalar" },
  { href: "/student/settings", icon: User, label: "Profil" },
];

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-surface-700 dark:bg-surface-900/90 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ href, icon: Icon, label, exact, primary }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-surface-500 dark:text-surface-400",
                )}
              >
                {primary ? (
                  <span className="-mt-5 grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
                    <Icon className="h-5 w-5" />
                  </span>
                ) : (
                  <Icon className="h-5 w-5" aria-hidden />
                )}
                <span className={primary ? "-mt-0.5" : undefined}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
