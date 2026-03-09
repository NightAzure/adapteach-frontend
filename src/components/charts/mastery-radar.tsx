"use client";

import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis } from "recharts";

export function MasteryRadar({
  data,
}: {
  data: Array<{ concept: string; mastery: number }>;
}) {
  const normalized = data.map((row) => ({ ...row, score: Math.round(row.mastery * 100) }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={normalized} outerRadius={90}>
          <PolarGrid stroke="var(--line)" />
          <PolarAngleAxis dataKey="concept" tick={{ fill: "var(--ink-600)", fontSize: 12 }} />
          <Radar dataKey="score" stroke="var(--brand-700)" fill="var(--brand-500)" fillOpacity={0.35} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
