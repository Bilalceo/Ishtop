"use client";

/**
 * Aurora greeting hero for /student dashboard.
 *
 * Brings the landing/demo's "premium signature" canvas to the dashboard:
 *   - Aurora mesh + grain background contained to the hero
 *   - Mouse-tracked spotlight
 *   - Animated aurora-text on the user's name
 *   - Profile-completion ring as an organic accent
 *
 * Intentionally bounded to the top of the page so the rest of the
 * dashboard stays calm and data-focused.
 */

import { useEffect, useRef, type ReactNode } from "react";
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
  const ref = useRef<HTMLDivElement>(null);

  // Mouse spotlight
  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [reduce]);

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, profileCompletion));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      ref={ref}
      className="spotlight aurora-bg grain relative overflow-hidden rounded-[28px] border border-white/[0.06]"
    >
      {/* Ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-0 h-[280px] w-[280px] rounded-full bg-emerald-500/35 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-0 h-[300px] w-[300px] rounded-full bg-cyan-400/30 blur-[110px]"
      />

      <div className="relative p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55"
            >
              {eyebrow}
            </motion.p>

            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="mt-2 font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-4xl lg:text-[44px]"
            >
              <span className="aurora-text">{name}</span>
              <span className="text-white/85">, {question}</span>
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-3 max-w-xl text-pretty text-white/65"
            >
              {subtitle}
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-6 flex flex-wrap items-center gap-3"
            >
              <Link href={ctaHref} className="btn-aurora focus-ring">
                <Sparkles className="h-4 w-4" aria-hidden />
                {ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {secondaryAction}
            </motion.div>
          </div>

          {/* Profile completion ring — organic visual accent */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative grid h-[140px] w-[140px] shrink-0 place-items-center"
            aria-label={`Profile ${clamped}% complete`}
          >
            <svg width="140" height="140" viewBox="0 0 64 64" className="-rotate-90">
              <defs>
                <linearGradient id="grg" x1="0" x2="1">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="60%" stopColor="#22D3EE" />
                  <stop offset="100%" stopColor="#3CCB7F" />
                </linearGradient>
              </defs>
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-white/[0.08]"
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Profil
              </p>
              <p className="font-display text-3xl font-semibold text-white">{clamped}%</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AuroraGreeting;
