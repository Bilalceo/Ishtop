"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Props = { data: { date: string; value: number }[] };

export function JobsActivityChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="jobsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6f9bf0" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6f9bf0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: "0.75rem", fontSize: 12 }} />
        <Area type="monotone" dataKey="value" name="New jobs" stroke="#6f9bf0" fill="url(#jobsGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
