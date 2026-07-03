"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { Input } from "@/components/ui/input";

// Salary filter scale — UZS (Uzbekistan market). Covers entry-level part-time
// jobs up to senior roles with headroom. Previously this was a USD scale
// (max 10000), which silently filtered out every UZS-priced job.
export const SALARY_MIN = 0;
export const SALARY_MAX = 30_000_000;
export const SALARY_STEP = 250_000;

export function SalarySlider({
  value,
  onChange,
}: {
  value: [number, number];
  onChange: (value: [number, number]) => void;
}) {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const unit = isRu ? "сум" : "so'm";
  const fmt = (n: number) => `${n.toLocaleString()} ${unit}`;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-surface-500">{isRu ? "Мин" : "Min"}: {fmt(value[0])}</span>
        <span className="text-surface-500">{isRu ? "Макс" : "Maks"}: {fmt(value[1])}</span>
      </div>
      <div className="relative h-2 rounded-full bg-surface-200">
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-600"
          style={{
            left: `${(value[0] / SALARY_MAX) * 100}%`,
            right: `${100 - (value[1] / SALARY_MAX) * 100}%`,
          }}
        />
        <input
          type="range"
          min={SALARY_MIN}
          max={SALARY_MAX}
          step={SALARY_STEP}
          value={value[0]}
          onChange={(e) => onChange([parseInt(e.target.value), value[1]])}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <input
          type="range"
          min={SALARY_MIN}
          max={SALARY_MAX}
          step={SALARY_STEP}
          value={value[1]}
          onChange={(e) => onChange([value[0], parseInt(e.target.value)])}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          value={value[0]}
          onChange={(e) => onChange([parseInt(e.target.value) || 0, value[1]])}
          className="text-center text-sm"
          placeholder={isRu ? "Мин" : "Min"}
        />
        <span className="flex items-center text-surface-400">-</span>
        <Input
          type="number"
          value={value[1]}
          onChange={(e) => onChange([value[0], parseInt(e.target.value) || SALARY_MAX])}
          className="text-center text-sm"
          placeholder={isRu ? "Макс" : "Maks"}
        />
      </div>
    </div>
  );
}
