"use client";

/**
 * SwipeStack — Tinder-style stacked card swiper for mobile.
 *
 * - Drag horizontally to dismiss left/right
 * - Tap arrow buttons (a11y) to navigate
 * - Keyboard: ← → Enter to navigate, Space to swipe
 * - Reduce-motion: fades instead of swipes
 *
 * Use for testimonials, job recommendations, onboarding tips.
 */

import { useState, useEffect, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SwipeStackProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  ariaLabel?: string;
  onChange?: (index: number) => void;
}

export function SwipeStack<T>({
  items,
  renderItem,
  className,
  ariaLabel,
  onChange,
}: SwipeStackProps<T>) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const reduce = useReducedMotion();

  useEffect(() => {
    onChange?.(index);
  }, [index, onChange]);

  const total = items.length;
  if (total === 0) return null;

  const go = (dir: 1 | -1) => {
    setDirection(dir);
    setIndex((i) => (i + dir + total) % total);
  };

  const variants = {
    enter: (d: 1 | -1) =>
      reduce
        ? { opacity: 0, x: 0, scale: 1, rotate: 0 }
        : { opacity: 0, x: d * 280, scale: 0.94, rotate: d * 4 },
    center: { opacity: 1, x: 0, scale: 1, rotate: 0 },
    exit: (d: 1 | -1) =>
      reduce
        ? { opacity: 0, x: 0, scale: 1, rotate: 0 }
        : { opacity: 0, x: -d * 280, scale: 0.94, rotate: -d * 4 },
  } as const;

  return (
    <section
      className={className}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight" || e.key === " ") go(1);
      }}
      tabIndex={0}
    >
      <div className="perspective-1200 relative h-full min-h-[340px] sm:min-h-[400px]">
        {/* Stacked background cards (depth illusion) */}
        {!reduce &&
          [1, 2].map((depth) => {
            const itemIdx = (index + depth) % total;
            return (
              <div
                key={`bg-${depth}-${itemIdx}`}
                aria-hidden
                className="absolute inset-0"
                style={{
                  transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.04})`,
                  opacity: 0.4 - depth * 0.15,
                  filter: "blur(0.5px)",
                  pointerEvents: "none",
                }}
              >
                <div className="h-full w-full">{renderItem(items[itemIdx], itemIdx)}</div>
              </div>
            );
          })}

        {/* Active card */}
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              reduce
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 240, damping: 28 }
            }
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.35}
            onDragEnd={(_, info) => {
              if (info.offset.x < -100 || info.velocity.x < -500) go(1);
              else if (info.offset.x > 100 || info.velocity.x > 500) go(-1);
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} of ${total}`}
          >
            {renderItem(items[index], index)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls + dots */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous"
          className="focus-ring grid h-11 w-11 place-items-center rounded-full border border-surface-200 bg-white text-surface-700 transition hover:border-emerald-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/80"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>

        <ol className="flex items-center gap-1.5" role="tablist" aria-label="Slide indicators">
          {items.map((_, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  setDirection(i > index ? 1 : -1);
                  setIndex(i);
                }}
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1}`}
                className={`focus-ring h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-8 bg-gradient-to-r from-emerald-500 to-cyan-400"
                    : "w-1.5 bg-surface-300 hover:bg-surface-400 dark:bg-white/15"
                }`}
              />
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next"
          className="focus-ring grid h-11 w-11 place-items-center rounded-full border border-surface-200 bg-white text-surface-700 transition hover:border-emerald-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/80"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </section>
  );
}

export default SwipeStack;
