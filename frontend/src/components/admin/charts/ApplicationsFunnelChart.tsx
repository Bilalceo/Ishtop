"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Props = { data: Record<string, number> };

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  reviewing: "#3b82f6",
  shortlisted: "#2DD4BF",
  interview: "#10B981",
  accepted: "#10b981",
  rejected: "#ef4444",
  withdrawn: "#6b7280",
};

export function ApplicationsFunnelChart({ data }: Props) {
  const chartData = Object.entries(data).map(([status, count]) => ({ status, count }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-surface-200 dark:stroke-surface-700" />
        <XAxis dataKey="status" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: "0.75rem", fontSize: 12 }} />
        <Bar dataKey="count" name="Applications" radius={[4, 4, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#6b7280"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
