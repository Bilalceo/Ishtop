"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

type AlertVariant = "error" | "success" | "warning" | "info";

const variantStyles: Record<AlertVariant, string> = {
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300",
  success:
    "border-green-200 bg-green-50 text-green-800 dark:border-green-800/60 dark:bg-green-950/40 dark:text-green-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300",
};

const icons: Record<AlertVariant, React.ElementType> = {
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

export function Alert({ variant = "info", children, className, showIcon = true }: AlertProps) {
  const Icon = icons[variant];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-sm",
        variantStyles[variant],
        className
      )}
    >
      {showIcon && <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />}
      <div>{children}</div>
    </div>
  );
}
