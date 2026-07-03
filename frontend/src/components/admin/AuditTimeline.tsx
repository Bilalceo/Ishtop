"use client";

import { ScrollText, User, Briefcase, Building2, AlertTriangle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type AuditEntry = {
  id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_label: string | null;
  notes: string | null;
  created_at: string;
};

const TARGET_ICONS: Record<string, React.ElementType> = {
  user: User,
  job: Briefcase,
  company: Building2,
  error: AlertTriangle,
};

const ACTION_TONE: Record<string, string> = {
  user_activate: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  user_deactivate: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  company_verify: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  company_unverify: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  error_resolve: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
};

function actionTone(action: string): string {
  return ACTION_TONE[action] ?? "bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-200";
}

type Props = { entries: AuditEntry[]; locale: "uz" | "ru" };

export function AuditTimeline({ entries, locale }: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-200 py-16 text-center dark:border-surface-700">
        <ScrollText className="h-10 w-10 text-surface-300 dark:text-surface-600" aria-hidden="true" />
        <p className="mt-4 text-sm text-surface-500">
          {locale === "ru" ? "Записей пока нет" : "Hozircha yozuvlar yo'q"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {entries.map((entry, i) => {
        const TargetIcon = TARGET_ICONS[entry.target_type] ?? Shield;
        return (
          <div
            key={entry.id}
            className={cn(
              "relative flex gap-4 pb-6",
              i < entries.length - 1 &&
                "before:absolute before:left-5 before:top-10 before:h-full before:w-px before:bg-surface-200 dark:before:bg-surface-700",
            )}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-100 ring-4 ring-white dark:bg-surface-800 dark:ring-surface-900">
              <TargetIcon className="h-4 w-4 text-surface-500" aria-hidden="true" />
            </div>
            <div className="flex-1 pt-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <UserAvatar name={entry.admin_name} size="xs" />
                <span className="text-sm font-medium text-surface-900 dark:text-white">
                  {entry.admin_name}
                </span>
                <Badge className={actionTone(entry.action)}>
                  {entry.action.replace(/_/g, " ")}
                </Badge>
                {entry.target_label && (
                  <span className="rounded-md bg-surface-50 px-2 py-0.5 text-xs font-mono text-surface-600 ring-1 ring-surface-200 dark:bg-surface-900 dark:text-surface-300 dark:ring-surface-700">
                    {entry.target_label}
                  </span>
                )}
              </div>
              {entry.notes && (
                <p className="mt-1 text-xs text-surface-500">{entry.notes}</p>
              )}
              <p className="mt-1 text-xs text-surface-400">
                {formatRelativeTime(entry.created_at, locale)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
