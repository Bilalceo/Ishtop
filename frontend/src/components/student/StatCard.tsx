"use client";

/**
 * StatCard — premium stat tile with count-up animation and depth treatment.
 *
 * Drop-in replacement for the dashboard's basic stat boxes. The count
 * animates from 0 to the target value via requestAnimationFrame + out-expo
 * easing — same family as the demo's score counter, for visual consistency.
 */

import { useEffect, useRef, useState, type ElementType } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: number;
  /** Any icon component (typed as ElementType to accept lucide-react icons) */
  Icon: ElementType;
  /** Tailwind text color for the icon (e.g. "text-brand-300") */
  iconClass?: string;
  /** Tailwind bg color for the icon halo */
  bgClass?: string;
  /** Optional sub-line (e.g. "+3 this week") */
  hint?: string;
  /** Skip animation if true (loading or no data) */
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  Icon,
  iconClass = "text-brand-300",
  bgClass = "bg-brand-500/10",
  hint,
  loading = false,
}: StatCardProps) {
  const reduce = useReducedMotion();
  // Seeded with the real number, not 0. The count-up is decoration, and
  // decoration must never be what decides which figure the user reads.
  const [display, setDisplay] = useState(value);
  const startTs = useRef<number | null>(null);

  useEffect(() => {
    if (reduce || loading) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    startTs.current = null;
    const duration = Math.min(1100, Math.max(500, 400 + value * 30));
    // requestAnimationFrame does not run in a hidden tab, so a dashboard
    // opened in a background tab used to animate from 0 and never arrive:
    // real counts of 1 were displayed as 0. This timer lands on the true
    // value whether or not a single frame was ever painted.
    const settle = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      setDisplay(value);
    }, duration + 80);
    const tick = (now: number) => {
      if (startTs.current === null) startTs.current = now;
      const t = Math.min(1, (now - startTs.current) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setDisplay(0);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
    };
  }, [value, loading, reduce]);

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="card-aurora card-aurora-hover relative overflow-hidden p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 break-words text-xs font-medium leading-tight text-surface-500 dark:text-white/55">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-surface-900 dark:text-white">
            {loading ? <span className="text-surface-300 dark:text-white/20">—</span> : display}
          </p>
          {hint && (
            <p className="mt-1 truncate text-[11px] text-surface-500 dark:text-white/55">{hint}</p>
          )}
        </div>
        <span
          aria-hidden
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 ring-inset ring-white/[0.05] ${bgClass} ${iconClass}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>

      {/* Decorative glow corner */}
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-60 blur-2xl ${bgClass}`}
      />
    </motion.div>
  );
}

export default StatCard;
