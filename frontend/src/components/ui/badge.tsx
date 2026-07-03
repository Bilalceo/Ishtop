/**
 * Badge Component - shadcn/ui style
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-300",
        secondary: "bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-300",
        success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        outline: "border border-surface-300 text-surface-700 dark:border-surface-600 dark:text-surface-300",
        // Status badges
        pending: "bg-yellow-100 text-yellow-800",
        reviewing: "bg-blue-100 text-blue-800",
        shortlisted: "bg-brand-100 text-brand-800",
        interview: "bg-violet-100 text-violet-800",
        accepted: "bg-green-100 text-green-800",
        rejected: "bg-red-100 text-red-800",
        withdrawn: "bg-gray-100 text-gray-800",
        // Job type badges
        full_time: "bg-brand-100 text-brand-800",
        part_time: "bg-amber-100 text-amber-800",
        contract: "bg-orange-100 text-orange-800",
        remote: "bg-cyan-100 text-cyan-800",
        hybrid: "bg-brand-100 text-brand-800",
        internship: "bg-pink-100 text-pink-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
















