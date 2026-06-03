"use client";

import { useState } from "react";
import { SlidersHorizontal, RotateCcw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SalarySlider, SALARY_MAX } from "@/components/jobs/SalarySlider";
import { cn } from "@/lib/utils";

type Filters = {
  locations: string[];
  jobTypes: string[];
  experienceLevels: string[];
  salaryRange: [number, number];
  companies: string[];
  datePosted: string;
};

type FilterPillBarProps = {
  filters: Filters;
  onChange: (next: Filters) => void;
  isRu: boolean;
};

const companyOptions = [
  "EPAM Systems",
  "Uzum Market",
  "Click.uz",
  "Payme",
  "MyTaxi",
  "Korzinka",
];

const pillActive =
  "bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-500/20 dark:border-purple-400 dark:text-purple-300";
const pillBase =
  "bg-white border-surface-200 text-surface-700 dark:bg-surface-800 dark:border-surface-600 dark:text-surface-300";

export function FilterPillBar({ filters, onChange, isRu }: FilterPillBarProps) {
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const salaryActive =
    filters.salaryRange[0] > 0 || filters.salaryRange[1] < SALARY_MAX;
  const locationActive = filters.locations.length > 0;
  const jobTypeActive = filters.jobTypes.length > 0;
  const expActive = filters.experienceLevels.length > 0;
  const dateActive = filters.datePosted !== "all";
  const companiesActive = filters.companies.length > 0;

  const anyActive =
    locationActive ||
    jobTypeActive ||
    expActive ||
    salaryActive ||
    dateActive ||
    companiesActive;

  const salaryUnit = isRu ? "сум" : "so'm";
  const salaryLabel = salaryActive
    ? `${filters.salaryRange[0].toLocaleString()} – ${filters.salaryRange[1].toLocaleString()} ${salaryUnit}`
    : isRu
    ? "Зарплата"
    : "Maosh";

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {/* Location */}
      <Select
        value={filters.locations[0] || "all"}
        onValueChange={(val) =>
          onChange({
            ...filters,
            locations: val === "all" ? [] : [val],
          })
        }
      >
        <SelectTrigger
          className={cn(
            "h-9 w-[150px] shrink-0 rounded-xl border px-3 text-xs font-medium transition-colors focus:ring-0",
            locationActive ? pillActive : pillBase
          )}
        >
          <SelectValue placeholder={isRu ? "Локация" : "Joylashuv"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{isRu ? "Все места" : "Barcha joylar"}</SelectItem>
          <SelectItem value="tashkent">{isRu ? "Ташкент" : "Toshkent"}</SelectItem>
          <SelectItem value="samarkand">{isRu ? "Самарканд" : "Samarqand"}</SelectItem>
          <SelectItem value="bukhara">{isRu ? "Бухара" : "Buxoro"}</SelectItem>
          <SelectItem value="remote">{isRu ? "Удалённо" : "Masofaviy"}</SelectItem>
          <SelectItem value="hybrid">{isRu ? "Гибрид" : "Aralash"}</SelectItem>
        </SelectContent>
      </Select>

      {/* Job type */}
      <Select
        value={filters.jobTypes[0] || "all"}
        onValueChange={(val) =>
          onChange({
            ...filters,
            jobTypes: val === "all" ? [] : [val],
          })
        }
      >
        <SelectTrigger
          className={cn(
            "h-9 w-[150px] shrink-0 rounded-xl border px-3 text-xs font-medium transition-colors focus:ring-0",
            jobTypeActive ? pillActive : pillBase
          )}
        >
          <SelectValue placeholder={isRu ? "Тип работы" : "Ish turi"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{isRu ? "Все типы" : "Barcha turlar"}</SelectItem>
          <SelectItem value="full_time">{isRu ? "Полная занятость" : "To'liq ish kuni"}</SelectItem>
          <SelectItem value="part_time">{isRu ? "Частичная занятость" : "Yarim kunlik"}</SelectItem>
          <SelectItem value="internship">{isRu ? "Стажировка" : "Amaliyot"}</SelectItem>
          <SelectItem value="contract">{isRu ? "Контракт" : "Shartnoma"}</SelectItem>
          <SelectItem value="remote">{isRu ? "Удалённо" : "Masofaviy"}</SelectItem>
          <SelectItem value="hybrid">{isRu ? "Гибрид" : "Aralash"}</SelectItem>
        </SelectContent>
      </Select>

      {/* Experience */}
      <Select
        value={filters.experienceLevels[0] || "all"}
        onValueChange={(val) =>
          onChange({
            ...filters,
            experienceLevels: val === "all" ? [] : [val],
          })
        }
      >
        <SelectTrigger
          className={cn(
            "h-9 w-[150px] shrink-0 rounded-xl border px-3 text-xs font-medium transition-colors focus:ring-0",
            expActive ? pillActive : pillBase
          )}
        >
          <SelectValue placeholder={isRu ? "Опыт" : "Tajriba"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{isRu ? "Любой уровень" : "Har qanday daraja"}</SelectItem>
          <SelectItem value="intern">{isRu ? "Стажёр" : "Amaliyotchi"}</SelectItem>
          <SelectItem value="junior">{isRu ? "Начинающий" : "Boshlovchi"}</SelectItem>
          <SelectItem value="mid">{isRu ? "Средний" : "O'rta"}</SelectItem>
          <SelectItem value="senior">{isRu ? "Старший" : "Katta"}</SelectItem>
          <SelectItem value="lead">{isRu ? "Руководитель" : "Rahbar"}</SelectItem>
        </SelectContent>
      </Select>

      {/* Salary — opens Dialog */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setSalaryOpen(true)}
        className={cn(
          "h-9 shrink-0 rounded-xl border px-3 text-xs font-medium transition-colors",
          salaryActive ? pillActive : pillBase
        )}
      >
        <Wallet className="mr-1 h-3 w-3" />
        {salaryLabel}
      </Button>

      {/* Date posted */}
      <Select
        value={filters.datePosted}
        onValueChange={(val) => onChange({ ...filters, datePosted: val })}
      >
        <SelectTrigger
          className={cn(
            "h-9 w-[150px] shrink-0 rounded-xl border px-3 text-xs font-medium transition-colors focus:ring-0",
            dateActive ? pillActive : pillBase
          )}
        >
          <SelectValue placeholder={isRu ? "Дата" : "Sana"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{isRu ? "Любое время" : "Istalgan vaqt"}</SelectItem>
          <SelectItem value="24h">{isRu ? "Последние 24 часа" : "Oxirgi 24 soat"}</SelectItem>
          <SelectItem value="7d">{isRu ? "Последние 7 дней" : "Oxirgi 7 kun"}</SelectItem>
          <SelectItem value="30d">{isRu ? "Последние 30 дней" : "Oxirgi 30 kun"}</SelectItem>
        </SelectContent>
      </Select>

      {/* More filters (companies) */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMoreOpen(true)}
        className={cn(
          "h-9 shrink-0 rounded-xl border px-3 text-xs font-medium transition-colors",
          companiesActive ? pillActive : pillBase
        )}
      >
        <SlidersHorizontal className="mr-1 h-3 w-3" />
        {isRu ? "Больше фильтров" : "Ko'proq filtrlar"}
        {companiesActive && (
          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] text-white">
            {filters.companies.length}
          </span>
        )}
      </Button>

      {/* Clear — only when active */}
      {anyActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              locations: [],
              jobTypes: [],
              experienceLevels: [],
              salaryRange: [0, SALARY_MAX],
              companies: [],
              datePosted: "all",
            })
          }
          className="h-9 shrink-0 rounded-xl px-3 text-xs text-surface-500 hover:text-surface-700 dark:text-surface-400"
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          {isRu ? "Очистить" : "Tozalash"}
        </Button>
      )}

      {/* Salary Dialog */}
      <Dialog open={salaryOpen} onOpenChange={setSalaryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRu ? "Диапазон зарплаты" : "Maosh oralig'i"}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <SalarySlider
              value={filters.salaryRange}
              onChange={(val) => onChange({ ...filters, salaryRange: val })}
            />
          </div>
          <Button
            className="mt-4 w-full bg-gradient-to-r from-purple-500 to-indigo-600"
            onClick={() => setSalaryOpen(false)}
          >
            {isRu ? "Применить" : "Qo'llash"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* More Filters Dialog (companies) */}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRu ? "Компании" : "Kompaniyalar"}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            {companyOptions.map((company) => (
              <label
                key={company}
                className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface-50 dark:hover:bg-surface-700"
              >
                <input
                  type="checkbox"
                  checked={filters.companies.includes(company)}
                  onChange={() => {
                    const current = filters.companies;
                    const next = current.includes(company)
                      ? current.filter((c) => c !== company)
                      : [...current, company];
                    onChange({ ...filters, companies: next });
                  }}
                  className="h-4 w-4 rounded border-surface-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-surface-700 dark:text-surface-300">
                  {company}
                </span>
              </label>
            ))}
          </div>
          <Button
            className="mt-4 w-full bg-gradient-to-r from-purple-500 to-indigo-600"
            onClick={() => setMoreOpen(false)}
          >
            {isRu ? "Готово" : "Tayyor"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
