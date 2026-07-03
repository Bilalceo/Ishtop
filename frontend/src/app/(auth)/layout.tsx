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

      {/* Right side - Decorative (matches landing: dark + single emerald accent) */}
      <div className="relative hidden overflow-hidden bg-[#0a0a0b] lg:block lg:w-1/2">
        {/* One restrained emerald glow — no rainbow of orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[150px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 left-1/3 h-[380px] w-[520px] rounded-full bg-violet-500/10 blur-[140px]"
        />

        {/* Content */}
        <div className="relative flex h-full flex-col items-center justify-center px-12 text-white">
          <div className="max-w-md">
            <motion.span
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
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
              <span className="text-brand-400">
                {t("auth.sidebar.titleHighlight")}
              </span>
            </motion.h2>

            <motion.p
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-pretty text-base leading-relaxed text-white/60"
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
                <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
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
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-center"
                >
                  <div className="text-lg font-semibold text-white">{s.value}</div>
                  <div className="mt-0.5 text-xs text-white/50">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
