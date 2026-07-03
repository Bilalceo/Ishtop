"use client";

/**
 * SkillGapRadar — animated radar chart visualizing the student's skill gaps.
 *
 * Two layers per axis:
 *   - "Talab" (job requirements baseline — always 100)
 *   - "Sizning daraja" (where the student currently sits = 100 - gap)
 *
 * Using recharts (already in deps). The chart renders only on the client
 * (recharts uses ResizeObserver) — guarded by a mounted flag for SSR safety.
 */

import { useEffect, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface SkillGapRow {
  skill: string;
  /** Gap percentage 0-100 (higher = bigger gap to close) */
  gap: number;
}

import { useTranslation } from "@/contexts/TranslationContext";

export function SkillGapRadar({ data }: { data: SkillGapRow[] }) {
  const [mounted, setMounted] = useState(false);
  const { locale } = useTranslation();
  const yourLevelLabel = locale === "ru" ? "Ваш уровень" : "Sizning daraja";
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // SSR placeholder — matches final height to avoid CLS
    return <div className="h-[260px] w-full" aria-hidden />;
  }

  const chartData = data.slice(0, 6).map((d) => ({
    skill: d.skill,
    level: Math.max(0, 100 - d.gap),
    target: 100,
  }));

  return (
    <div className="h-[260px] w-full" aria-label="Skill gap radar chart">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <defs>
            <linearGradient id="radarFillBrand" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#6F9BF0" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="radarStrokeBrand" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#6F9BF0" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>

          <PolarGrid
            stroke="currentColor"
            strokeOpacity={0.12}
            radialLines
          />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />

          {/* Target ring — what jobs require */}
          <Radar
            name="Talab"
            dataKey="target"
            stroke="currentColor"
            strokeOpacity={0.25}
            fill="currentColor"
            fillOpacity={0.04}
            isAnimationActive={false}
          />

          {/* Current level — gradient brand fill */}
          <Radar
            name={yourLevelLabel}
            dataKey="level"
            stroke="url(#radarStrokeBrand)"
            strokeWidth={2}
            fill="url(#radarFillBrand)"
            fillOpacity={1}
            animationBegin={120}
            animationDuration={1100}
          />

          <Tooltip
            cursor={{ stroke: "rgba(124,92,255,0.35)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(124,92,255,0.3)",
              background: "rgba(11,16,32,0.92)",
              color: "#fff",
              fontSize: 12,
              boxShadow: "0 12px 30px -12px rgba(124,92,255,0.4)",
            }}
            labelStyle={{ color: "#fff", fontWeight: 600 }}
            formatter={(v: number, name: string) => [`${v}%`, name]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SkillGapRadar;
