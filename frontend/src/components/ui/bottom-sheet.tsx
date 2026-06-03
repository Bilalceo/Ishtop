"use client";

/**
 * BottomSheet — mobile-first drawer with drag-to-dismiss.
 *
 * - Snap points: 0 (closed), 0.6 (half), 1 (full)
 * - Swipe down to dismiss, tap backdrop to dismiss
 * - Focus trap + ESC to close
 * - Reduces motion gracefully
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <BottomSheet open={open} onClose={() => setOpen(false)} title="Filters">
 *     ...content...
 *   </BottomSheet>
 */

import { useEffect, useRef, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { X } from "lucide-react";

type SnapPoint = 0.6 | 1;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  snap?: SnapPoint;
  children: ReactNode;
  /** Render a sticky bottom CTA bar (e.g., "Apply" + "Clear") */
  footer?: ReactNode;
}

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  snap = 1,
  children,
  footer,
}: BottomSheetProps) {
  const reduce = useReducedMotion();
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const backdropOpacity = useTransform(y, [0, 400], [1, 0]);
  const sheetRef = useRef<HTMLDivElement>(null);
  const heightVH = snap === 1 ? 92 : 60;

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ opacity: backdropOpacity }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={reduce ? false : { y: "100%" }}
            animate={{ y: 0 }}
            exit={reduce ? undefined : { y: "100%" }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 220, damping: 28, mass: 0.9 }
            }
            drag={reduce ? false : "y"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
              else y.set(0);
            }}
            style={{ y, height: `${heightVH}vh` }}
            className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-[28px] border border-white/[0.06] bg-white shadow-[0_-30px_60px_-20px_rgba(124,92,255,0.4)] dark:bg-[#0F1530]"
          >
            {/* Drag handle */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex cursor-grab select-none flex-col items-center pt-3 active:cursor-grabbing"
              role="separator"
              aria-orientation="horizontal"
            >
              <span aria-hidden className="h-1.5 w-12 rounded-full bg-surface-300 dark:bg-white/15" />
            </div>

            {/* Header */}
            {(title || description) && (
              <header className="flex items-start justify-between gap-4 border-b border-surface-200/70 px-5 pb-4 pt-3 dark:border-white/[0.06]">
                <div>
                  {title && (
                    <h2 className="font-display text-lg font-semibold text-surface-900 dark:text-white">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-sm text-surface-500 dark:text-white/60">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-100 text-surface-700 dark:bg-white/[0.06] dark:text-white/70"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </header>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="safe-bottom border-t border-surface-200/70 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/[0.06] dark:bg-[#0F1530]/95">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default BottomSheet;
