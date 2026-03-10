"use client";

import { useState } from "react";
import { format } from "date-fns";
import { BarChart3, Clock3, Target, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { useSessionStore } from "@/lib/auth/session-store";
import { useStudentHistory } from "@/lib/hooks/queries";

export default function StudentHistoryPage() {
  const user = useSessionStore((state) => state.user);
  const history = useStudentHistory(user?.id ?? "");
  const [conceptFilter, setConceptFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  if (history.isLoading) return <PageLoadingState title="Loading your history…" />;
  if (history.isError) return <PageErrorState title="History failed to load" backHref="/student/dashboard" />;
  if (!history.data || history.data.length === 0) {
    return <PageEmptyState title="No attempts yet" message="Complete at least one activity to see your history here." />;
  }

  const rows = history.data;
  const avgCorrectness = rows.reduce((sum, r) => sum + r.correctness, 0) / rows.length;
  const totalHints = rows.reduce((sum, r) => sum + r.hintsUsed, 0);
  const totalMins = rows.reduce((sum, r) => sum + r.durationMin, 0);

  const concepts = [...new Set(rows.map((r) => r.concept))].sort();
  const types = [...new Set(rows.map((r) => r.type))].sort();

  const filtered = rows.filter((r) => {
    if (conceptFilter && r.concept !== conceptFilter) return false;
    if (typeFilter && r.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--ink-900)]">Progress History</h1>
        <p className="mt-1 text-sm text-[var(--ink-500)]">Your complete activity record.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            icon: <Target className="size-4 text-[var(--brand-500)]" />,
            label: "Activities done",
            value: String(rows.length),
          },
          {
            icon: <BarChart3 className="size-4 text-[var(--accent-500)]" />,
            label: "Avg score",
            value: `${Math.round(avgCorrectness * 100)}%`,
          },
          {
            icon: <Clock3 className="size-4 text-[var(--ink-500)]" />,
            label: "Total time",
            value: `${totalMins.toFixed(0)} min`,
          },
          {
            icon: <Lightbulb className="size-4 text-amber-500" />,
            label: "Hints used",
            value: String(totalHints),
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink-500)]">
              {stat.icon} {stat.label}
            </div>
            <p className="mt-1 text-2xl font-bold text-[var(--ink-900)]">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Filter chips */}
      {(concepts.length > 1 || types.length > 1) && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-500)] self-center">Filter:</span>
          {concepts.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setConceptFilter(conceptFilter === c ? null : c)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                conceptFilter === c
                  ? "border-[var(--brand-500)] bg-[var(--brand-100)] text-[var(--brand-800)]"
                  : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--ink-600)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {c}
            </button>
          ))}
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] transition-all ${
                typeFilter === t
                  ? "border-[var(--accent-500)] bg-orange-500/15 text-orange-700 dark:text-orange-300"
                  : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--ink-600)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {t}
            </button>
          ))}
          {(conceptFilter || typeFilter) && (
            <button
              type="button"
              onClick={() => { setConceptFilter(null); setTypeFilter(null); }}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Timeline cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="py-8 text-center text-sm text-[var(--ink-500)]">
            No activities match the current filters.
          </Card>
        ) : (
          filtered.map((row) => {
            const score = Math.round(row.correctness * 100);
            return (
              <Card
                key={`${row.artifactId}-${row.completedAt}`}
                hoverable
                className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-5"
              >
                {/* Score ring */}
                <div
                  className="grid size-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{
                    background:
                      score >= 70
                        ? "var(--brand-600)"
                        : score >= 40
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                >
                  {score}%
                </div>

                {/* Main info */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--ink-900)]">{row.artifactTitle}</span>
                    <Badge label={row.type} tone="static" />
                    <Badge label={row.concept} concept />
                  </div>

                  <Meter value={row.correctness} variant="auto" className="max-w-xs" />

                  <div className="flex flex-wrap gap-4 text-xs text-[var(--ink-500)]">
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3" /> {row.durationMin.toFixed(1)} min
                    </span>
                    <span>{row.attempts} attempt{row.attempts !== 1 ? "s" : ""}</span>
                    {row.hintsUsed > 0 && (
                      <span className="flex items-center gap-1">
                        <Lightbulb className="size-3 text-amber-500" /> {row.hintsUsed} hint{row.hintsUsed !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date */}
                <span className="shrink-0 text-xs text-[var(--ink-400)]">
                  {format(new Date(row.completedAt), "MMM d, yyyy")}
                </span>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
