/**
 * =============================================================================
 * AUTH LAYOUT
 * =============================================================================
 *
 * Shared layout for authentication pages (login, register, forgot-password, reset-password)
 * Features split-screen design with animated background
 */

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, locale, translations } = useTranslation();
  const sidebarFeatures = Array.isArray(translations?.auth?.sidebar?.features)
    ? (translations.auth.sidebar.features as string[])
    : [
        t("auth.sidebar.features.0"),
        t("auth.sidebar.features.1"),
        t("auth.sidebar.features.2"),
        t("auth.sidebar.features.3"),
        t("auth.sidebar.features.4"),
      ].filter((item) => item && !item.includes("features."));
  
  return (
    <div className="flex min-h-screen bg-white text-surface-900 dark:bg-surface-950 dark:text-surface-100">
      {/* Left side - Form */}
      <div className="relative flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-12 xl:px-20">
        {/* Theme + Language - top right */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher variant="minimal" />
        </div>

        {/* Background pattern */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 dark:hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
          </div>
          <div className="hidden dark:block absolute inset-0 bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900" />
        </div>

        {/* Logo */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/logo-mark.png?v=3"
              alt="IshTop"
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-xl"
            />
            <span className="font-display text-2xl font-bold text-surface-900 dark:text-white">IshTop</span>
          </Link>
        </motion.div>

        {/* Content */}
        <div className="flex-1 flex items-center">
          {children}
        </div>

        {/* Footer */}
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-sm text-surface-400 dark:text-surface-500"
        >
          © {new Date().getFullYear()} IshTop. {t("landing.footer.rights")}
        </motion.div>
      </div>

      {/* Right side - Decorative (silver: pastel washes on the E5E5E5 ground) */}
      <div className="relative hidden overflow-hidden bg-[#e5e5e5] lg:block lg:w-1/2">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-[#d7e7ff]/70 blur-[130px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 left-1/3 h-[380px] w-[520px] rounded-full bg-[#e3ddff]/70 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-[-80px] h-[300px] w-[300px] rounded-full bg-[#ffe9d6]/60 blur-[110px]"
        />

        {/* Content */}
        <div className="relative flex h-full flex-col items-center justify-center px-12 text-[#18181b]">
          <div className="max-w-md">
            <motion.span
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="chip-silver"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#8ab4ff] to-[#b7a4ff]" />
              IshTop · AI-karyera
            </motion.span>

            {/* Headline */}
            <motion.h2
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-balance text-4xl font-bold leading-[1.12] tracking-tight"
            >
              {t("auth.sidebar.title")}{" "}
              <span className="bg-gradient-to-r from-[#6f9bf0] to-[#a08de0] bg-clip-text text-transparent">
                {t("auth.sidebar.titleHighlight")}
              </span>
            </motion.h2>

            <motion.p
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-pretty text-base leading-relaxed text-[#63636b]"
            >
              {t("auth.sidebar.subtitle")}
            </motion.p>

            {/* Features list */}
            <motion.ul
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 space-y-3"
            >
              {sidebarFeatures.map((feature: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[#3f3f46]">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#7cc7a2]" />
                  <span>{feature}</span>
                </li>
              ))}
            </motion.ul>

            {/* Honest product highlights — same ethos as the landing TrustLayer */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-10 grid grid-cols-3 gap-3"
            >
              {[
                {
                  value: locale === "ru" ? "2 мин" : "2 daq.",
                  label: locale === "ru" ? "AI-резюме" : "AI rezyume",
                },
                {
                  value: "UZ · RU",
                  label: locale === "ru" ? "Два языка" : "Ikki tilda",
                },
                {
                  value: locale === "ru" ? "Бесплатно" : "Bepul",
                  label: locale === "ru" ? "Старт" : "Boshlash",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white p-3 text-center shadow-[0_10px_24px_-16px_rgba(24,24,27,0.25)]"
                >
                  <div className="text-lg font-semibold text-[#18181b]">{s.value}</div>
                  <div className="mt-0.5 text-xs text-[#8e8e96]">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
