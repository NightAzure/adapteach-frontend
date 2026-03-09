"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Users, BarChart3, TrendingUp, Activity } from "lucide-react";
import { AdaptiveComparisonChart } from "@/components/charts/adaptive-comparison";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { useAdminOverview } from "@/lib/hooks/queries";

const SEVERITY_TONE = {
  high: "hard",
  medium: "moderate",
  low: "easy",
} as const;

export default function AdminOverviewPage() {
  const overview = useAdminOverview();

  if (overview.isLoading) return <PageLoadingState title="Loading overview…" />;
  if (overview.isError) return <PageErrorState title="Overview failed to load" backHref="/admin/analytics" />;
  if (!overview.data) return <PageEmptyState title="No admin data" />;

  const data = overview.data;

  const stats = [
    {
      icon: <Users className="size-4" />,
      label: "Active students",
      value: String(data.activeStudents),
      color: "text-[var(--brand-600)]",
    },
    {
      icon: <Activity className="size-4" />,
      label: "Completion rate",
      value: `${Math.round(data.completionRate * 100)}%`,
      color: "text-[var(--brand-600)]",
      meter: data.completionRate,
    },
    {
      icon: <TrendingUp className="size-4" />,
      label: "Average gain",
      value: data.avgGain.toFixed(2),
      color: "text-[var(--brand-600)]",
    },
    {
      icon: <BarChart3 className="size-4" />,
      label: "Adaptive delta",
      value: `+${(data.adaptiveVsStaticDelta * 100).toFixed(1)} pts`,
      color: "text-[var(--accent-500)]",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-500)]">Admin Observatory</p>
          <h1 className="text-2xl font-semibold text-[var(--ink-900)]">Experiment Overview</h1>
          <p className="mt-1 text-sm text-[var(--ink-500)]">Live health, performance deltas, and risk signals.</p>
        </div>
        <Link href="/admin/analytics">
          <Button>
            Open Analytics <ArrowRight className="size-4" />
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} hoverable className="p-4 space-y-2">
            <div className={`flex items-center gap-2 text-xs font-medium ${stat.color}`}>
              {stat.icon}
              <span className="text-[var(--ink-500)]">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--ink-900)]">{stat.value}</p>
            {stat.meter !== undefined && (
              <Meter value={stat.meter} variant="auto" />
            )}
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <div className="mb-3 border-b pb-3" style={{ borderColor: "var(--line)" }}>
          <CardTitle>Adaptive vs Static Weekly Outcomes</CardTitle>
          <CardMeta className="mt-0.5">Outcome divergence after week 2 indicates policy effect.</CardMeta>
        </div>
        <AdaptiveComparisonChart data={data.outcomes} />
      </Card>

      {/* Risk alerts */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-[var(--accent-500)]" />
          <CardTitle>Risk Alerts</CardTitle>
          <span
            className="ml-auto rounded-full border px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: "var(--surface-0)", borderColor: "var(--line)", color: "var(--ink-500)" }}
          >
            {data.riskAlerts.length}
          </span>
        </div>

        {data.riskAlerts.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--ink-500)]">No active risk alerts.</p>
        ) : (
          <div className="space-y-2">
            {data.riskAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-[var(--radius-md)] border p-3 text-sm"
                style={{ background: "var(--surface-0)", borderColor: "var(--line)" }}
              >
                <Badge
                  label={alert.severity}
                  tone={SEVERITY_TONE[alert.severity as keyof typeof SEVERITY_TONE] ?? "static"}
                />
                <p className="flex-1 text-[var(--ink-700)]">{alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
