"use client";

/**
 * One-line quick filters for the job search, mirroring the agreed mockup:
 * a row of toggle pills plus a "Ko'proq" dialog for the long tail
 * (salary range and experience level).
 *
 * Every pill maps to a parameter GET /jobs already understands, so the list is
 * filtered by the server across the whole dataset rather than inside the page
 * the user happens to be on.
 */

import { useState } from "react";
import {
  Briefcase,
  MapPin,
  GraduationCap,
  Signal,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SalarySlider, SALARY_MAX } from "@/components/jobs/SalarySlider";
import { experienceOptions } from "@/lib/jobLabels";
import { cn } from "@/lib/utils";

export type Filters = {
  locations: string[];
  jobTypes: string[];
  experienceLevels: string[];
  salaryRange: [number, number];
  companies: string[];
  datePosted: string;
  isRemote: boolean;
};

type FilterPillBarProps = {
  filters: Filters;
  onChange: (next: Filters) => void;
  isRu: boolean;
};

const PILL_BASE =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors";
const PILL_OFF =
  "border-surface-200 bg-white text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800";
const PILL_ON =
  "border-transparent bg-gradient-to-r from-brand-500 to-violet-600 text-white shadow-sm shadow-brand-500/25";

export function FilterPillBar({ filters, onChange, isRu }: FilterPillBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const hasQuickFilter =
    filters.isRemote ||
    filters.jobTypes.length > 0 ||
    filters.locations.length > 0;
  const moreCount =
    filters.experienceLevels.length +
    (filters.salaryRange[0] > 0 || filters.salaryRange[1] < SALARY_MAX ? 1 : 0);

  const toggleJobType = (value: string) =>
    set({
      jobTypes: filters.jobTypes.includes(value) ? [] : [value],
      isRemote: false,
    });

  const toggleLocation = (value: string) =>
    set({ locations: filters.locations.includes(value) ? [] : [value] });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* All jobs — clears the quick filters */}
      <button
        type="button"
        onClick={() => set({ isRemote: false, jobTypes: [], locations: [] })}
        className={cn(PILL_BASE, hasQuickFilter ? PILL_OFF : PILL_ON)}
      >
        <Briefcase className="h-4 w-4" />
        {isRu ? "Все вакансии" : "Barcha ishlar"}
      </button>

      <button
        type="button"
        onClick={() => set({ isRemote: !filters.isRemote, jobTypes: [] })}
        className={cn(PILL_BASE, filters.isRemote ? PILL_ON : PILL_OFF)}
      >
        <Signal className="h-4 w-4" />
        {isRu ? "Удалённо" : "Masofadan"}
      </button>

      <button
        type="button"
        onClick={() => toggleLocation("Toshkent")}
        className={cn(
          PILL_BASE,
          filters.locations.includes("Toshkent") ? PILL_ON : PILL_OFF,
        )}
      >
        <MapPin className="h-4 w-4" />
        Toshkent
      </button>

      <button
        type="button"
        onClick={() => toggleJobType("full_time")}
        className={cn(
          PILL_BASE,
          filters.jobTypes.includes("full_time") ? PILL_ON : PILL_OFF,
        )}
      >
        {isRu ? "Полная занятость" : "To'liq stavka"}
      </button>

      <button
        type="button"
        onClick={() => toggleJobType("internship")}
        className={cn(
          PILL_BASE,
          filters.jobTypes.includes("internship") ? PILL_ON : PILL_OFF,
        )}
      >
        <GraduationCap className="h-4 w-4" />
        {isRu ? "Стажировка" : "Amaliyot"}
      </button>

      <button
        type="button"
        onClick={() => setMoreOpen(true)}
        className={cn(PILL_BASE, moreCount > 0 ? PILL_ON : PILL_OFF)}
      >
        <SlidersHorizontal className="h-4 w-4" />
        {isRu ? "Ещё" : "Ko'proq"}
        {moreCount > 0 && (
          <Badge variant="secondary" className="ml-0.5 bg-white/20 text-white">
            {moreCount}
          </Badge>
        )}
      </button>

      {(hasQuickFilter || moreCount > 0) && (
        <button
          type="button"
          onClick={() =>
            onChange({
              locations: [],
              jobTypes: [],
              experienceLevels: [],
              salaryRange: [0, SALARY_MAX],
              companies: [],
              datePosted: "all",
              isRemote: false,
            })
          }
          className="inline-flex items-center gap-1 px-2 text-sm font-medium text-surface-500 hover:text-surface-800 dark:hover:text-surface-200"
        >
          <X className="h-3.5 w-3.5" />
          {isRu ? "Сбросить" : "Tozalash"}
        </button>
      )}

      {/* Long-tail filters */}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isRu ? "Больше фильтров" : "Ko'proq filtrlar"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            <div>
              <p className="mb-3 text-sm font-semibold text-surface-800 dark:text-surface-200">
                {isRu ? "Опыт" : "Tajriba"}
              </p>
              <div className="flex flex-wrap gap-2">
                {experienceOptions(isRu).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      set({
                        experienceLevels: filters.experienceLevels.includes(
                          opt.value,
                        )
                          ? []
                          : [opt.value],
                      })
                    }
                    className={cn(
                      PILL_BASE,
                      "px-3 py-1.5 text-xs",
                      filters.experienceLevels.includes(opt.value)
                        ? PILL_ON
                        : PILL_OFF,
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-surface-800 dark:text-surface-200">
                {isRu ? "Зарплата" : "Maosh"}
              </p>
              <SalarySlider
                value={filters.salaryRange}
                onChange={(salaryRange) => set({ salaryRange })}
              />
            </div>

            <Button className="w-full" onClick={() => setMoreOpen(false)}>
              {isRu ? "Показать результаты" : "Natijalarni ko'rsatish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
