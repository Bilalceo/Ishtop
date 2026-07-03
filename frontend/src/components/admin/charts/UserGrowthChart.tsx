"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Props = { data: { date: string; value: number }[] };

export function UserGrowthChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)}
          className="text-surface-500"
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="text-surface-500" />
        <Tooltip
          contentStyle={{ borderRadius: "0.75rem", fontSize: 12 }}
          labelFormatter={(label: string) => label}
        />
        <Line type="monotone" dataKey="value" name="New users" stroke="#6F9BF0" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
