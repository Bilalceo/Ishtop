"use client";

/**
 * The contact panel in a dialog, for entry points with no room to show it
 * inline — the sticky mobile bar and the job list. The job page renders
 * `ApplyPanel` directly instead, so the number is visible without a tap.
 */

import { ApplyPanel } from "@/components/jobs/ApplyPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { jobDisplayIdentity } from "@/lib/jobLabels";
import type { Job } from "@/types/api";

export function ApplyDialog({
  job,
  open,
  onOpenChange,
  isRu,
}: {
  job: Job;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isRu: boolean;
}) {
  // Match the page heading: aggregated titles carry the employer in brackets.
  const { title: displayTitle, company } = jobDisplayIdentity(
    job.title,
    job.company?.name,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isRu ? "Откликнуться" : "Ariza berish"}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-surface-500">
          {displayTitle}
          {company ? ` · ${company}` : ""}
        </p>

        <div className="mt-2">
          <ApplyPanel job={job} isRu={isRu} active={open} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
