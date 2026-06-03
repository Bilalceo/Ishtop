/**
 * =============================================================================
 * PROGRESS COMPONENT
 * =============================================================================
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "danger";
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      showLabel = false,
      size = "md",
      variant = "default",
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
      sm: "h-1",
      md: "h-2",
      lg: "h-3",
    };

    const variantClasses = {
      default: "bg-gradient-to-r from-purple-500 to-indigo-600",
      success: "bg-gradient-to-r from-green-500 to-emerald-600",
      warning: "bg-gradient-to-r from-amber-500 to-orange-600",
      danger: "bg-gradient-to-r from-red-500 to-rose-600",
    };

    return (
      <div className={cn("w-full", className)} ref={ref} {...props}>
        <div
          className={cn(
            "w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700",
            sizeClasses[size]
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              variantClasses[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <span className="mt-1 text-xs text-surface-500">{Math.round(percentage)}%</span>
        )}
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
