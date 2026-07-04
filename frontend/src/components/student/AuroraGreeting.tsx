"use client";

/**
 * Greeting hero for /student dashboard — Silver rebrand.
 *
 * Light, calm card matching the landing: soft pastel wash, ink text,
 * pastel-underlined name, periwinkle profile ring. No dark canvas.
 */

import { type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

interface AuroraGreetingProps {
  eyebrow: string;
  name: string;
  question: string;
  subtitle: string;
  profileCompletion: number;
  ctaHref: string;
  ctaLabel: string;
  /** Optional secondary action shown next to the CTA */
  secondaryAction?: ReactNode;
}

export function AuroraGreeting({
  eyebrow,
  name,
  question,
  subtitle,
  profileCompletion,
  ctaHref,
  ctaLabel,
  secondaryAction,
}: AuroraGreetingProps) {
  const reduce = useReducedMotion();

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, profileCompletion));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-surface-200/70 bg-white dark:border-white/[0.06] dark:bg-surface-900">
      {/* Soft pastel wash — same family as the landing hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-[300px] w-[300px] rounded-full bg-[#d7e7ff]/60 blur-[90px] dark:bg-brand-500/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -right-20 h-[320px] w-[320px] rounded-full bg-[#ffe9d6]/50 blur-[100px] dark:bg-violet-500/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 left-1/3 h-[240px] w-[240px] rounded-full bg-[#e3ddff]/50 blur-[90px] dark:bg-violet-500/10"
      />

      <div className="relative p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400 dark:text-white/55"
            >
              {eyebrow}
            </motion.p>

            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="mt-2 font-display text-3xl font-semibold leading-[1.12] tracking-[-0.02em] text-surface-900 dark:text-white sm:text-4xl lg:text-[40px]"
            >
              <span className="relative inline-block">
                <span className="relative z-10">{name}</span>
                <span
                  aria-hidden
                  className="absolute inset-x-[-3px] bottom-[0.08em] z-0 h-[0.34em] rounded-md bg-gradient-to-r from-[#d7e7ff] via-[#e3ddff] to-[#ffe9d6] dark:from-brand-500/30 dark:via-violet-500/30 dark:to-brand-500/30"
                />
              </span>
              <span>, {question}</span>
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-3 max-w-xl text-pretty text-surface-500 dark:text-white/65"
            >
              {subtitle}
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-6 flex flex-wrap items-center gap-3"
            >
              <Link href={ctaHref} className="btn-silver-primary focus-ring group">
                <Sparkles className="h-4 w-4" aria-hidden />
                {ctaLabel}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
              {secondaryAction}
            </motion.div>
          </div>

          {/* Profile completion ring — quiet periwinkle accent */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative grid h-[132px] w-[132px] shrink-0 place-items-center"
            aria-label={`Profile ${clamped}% complete`}
          >
            <svg width="132" height="132" viewBox="0 0 64 64" className="-rotate-90">
              <defs>
                <linearGradient id="grg" x1="0" x2="1">
                  <stop offset="0%" stopColor="#8AB4FF" />
                  <stop offset="55%" stopColor="#B7A4FF" />
                  <stop offset="100%" stopColor="#7CC7A2" />
                </linearGradient>
              </defs>
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-surface-100 dark:text-white/[0.08]"
              />
              <motion.circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="url(#grg)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.3, ease: [0.19, 1, 0.22, 1], delay: 0.3 }}
              />
            </svg>
            <div className="absolute text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-400 dark:text-white/55">
                Profil
              </p>
              <p className="font-display text-3xl font-semibold text-surface-900 dark:text-white">
                {clamped}%
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AuroraGreeting;
