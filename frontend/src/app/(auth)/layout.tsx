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
import { Star, CheckCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, translations } = useTranslation();
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
          <div className="hidden dark:block absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" />
        </div>

        {/* Logo */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/logo-mark.png"
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
          © {new Date().getFullYear()} SmartCareer. {t("landing.footer.rights")}
        </motion.div>
      </div>

      {/* Right side - Decorative */}
      <div className="relative hidden lg:block lg:w-1/2">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700">
          {/* Animated shapes */}
          <motion.div
            animate={{
              x: [0, 50, 0],
              y: [0, -30, 0],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -50, 0],
              y: [0, 30, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl"
          />

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative flex h-full flex-col items-center justify-center px-12 text-white">
          <div className="max-w-lg">
            {/* Headline */}
            <motion.h2
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-4xl font-bold leading-tight"
            >
              {t("auth.sidebar.title")}{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-amber-300 bg-clip-text text-transparent">
                {t("auth.sidebar.titleHighlight")}
              </span>
            </motion.h2>

            <motion.p
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-lg text-purple-100"
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
                <li key={i} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </motion.ul>

            {/* Stats */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-12 grid grid-cols-3 gap-8"
            >
              <div className="text-center">
                <div className="text-3xl font-bold">10K+</div>
                <div className="mt-1 text-sm text-purple-200">{t("auth.sidebar.stats.users")}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">50K+</div>
                <div className="mt-1 text-sm text-purple-200">{t("auth.sidebar.stats.resumes")}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">95%</div>
                <div className="mt-1 text-sm text-purple-200">{t("auth.sidebar.stats.success")}</div>
              </div>
            </motion.div>

            {/* Testimonial */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-12 rounded-2xl bg-white/10 p-6 backdrop-blur-sm"
            >
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-purple-100 italic">
                "{t("auth.sidebar.testimonial.quote")}"
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold">
                  AK
                </div>
                <div>
                  <p className="font-semibold">{t("auth.sidebar.testimonial.author")}</p>
                  <p className="text-sm text-purple-200">
                    {t("auth.sidebar.testimonial.role")}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
