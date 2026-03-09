"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AdaptiveComparisonChart({
  data,
}: {
  data: Array<{ week: string; adaptive: number; static: number }>;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="week" stroke="var(--ink-500)" />
          <YAxis stroke="var(--ink-500)" />
          <Tooltip />
          <Legend />
          <Bar dataKey="adaptive" fill="var(--brand-600)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="static" fill="#64748b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
