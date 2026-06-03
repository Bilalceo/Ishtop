/**
 * Textarea Component - shadcn/ui style
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative">
        <textarea
          className={cn(
            "flex min-h-[100px] w-full rounded-lg border bg-white px-4 py-3 text-sm transition-colors",
            "placeholder:text-surface-400",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-surface-800 dark:text-white",
            error
              ? "border-error focus-visible:ring-error"
              : "border-surface-300 dark:border-surface-600",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
















