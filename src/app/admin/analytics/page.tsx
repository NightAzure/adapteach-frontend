"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AdaptiveComparisonChart } from "@/components/charts/adaptive-comparison";
import { Badge } from "@/components/ui/badge";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { SectionHeader } from "@/components/ui/section-header";
import { useAdminOverview, useAssessmentGains, useOperationalAlertsSummary } from "@/lib/hooks/queries";

const MAX_GAIN_ROWS = 50;

function formatPercent(value?: number) {
  if (typeof value !== "number") return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

function formatGain(value?: number) {
  if (typeof value !== "number") return "N/A";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pts`;
}

function formatDuration(value?: number) {
  if (typeof value !== "number") return "N/A";
  return `${Math.round(value / 1000)}s`;
}

function formatTimestamp(iso: string) {
  const value = new Date(iso);
  return Number.isNaN(value.getTime()) ? iso : value.toLocaleString();
}

function severityTone(severity: "low" | "medium" | "high") {
  if (severity === "high") return "hard";
  if (severity === "medium") return "moderate";
  return "easy";
}

export default function AdminAnalyticsPage() {
  const overview = useAdminOverview();
  const gains = useAssessmentGains();
  const operationalAlerts = useOperationalAlertsSummary(24, 8);

  const rankedGainRows = useMemo(
    () => {
      const rows = gains.data?.rows ?? [];
      return rows
        .filter((row) => typeof row.gain === "number")
        .sort((a, b) => (b.gain ?? 0) - (a.gain ?? 0) || a.userId.localeCompare(b.userId))
        .slice(0, MAX_GAIN_ROWS);
    },
    [gains.data?.rows],
  );

  if (overview.isLoading || gains.isLoading) return <PageLoadingState title="Loading analytics..." />;
  if (overview.isError || gains.isError) return <PageErrorState title="Analytics failed to load" backHref="/admin" />;
  if (!overview.data || !gains.data) return <PageEmptyState title="No analytics data" />;

  const uplift = overview.data.outcomes.map((row) => ({
    week: row.week,
    delta: row.adaptive - row.static,
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Admin Analytics"
        title="Comparative Outcomes"
        subtitle="Track pre/post gain outcomes by group and review top learner-level gain records."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardTitle>Coverage</CardTitle>
          <CardMeta>
            {gains.data.summary.studentsWithBoth}/{gains.data.summary.totalStudents} learners have both pre/post submissions.
          </CardMeta>
        </Card>
        <Card>
          <CardTitle>Adaptive Mean Gain</CardTitle>
          <CardMeta>{formatGain(gains.data.summary.adaptiveMeanGain)}</CardMeta>
        </Card>
        <Card>
          <CardTitle>Static Mean Gain</CardTitle>
          <CardMeta>{formatGain(gains.data.summary.staticMeanGain)}</CardMeta>
        </Card>
        <Card>
          <CardTitle>Delta (Adaptive - Static)</CardTitle>
          <CardMeta>{formatGain(gains.data.summary.deltaMeanGain)}</CardMeta>
        </Card>
      </div>

      <Card>
        <CardTitle>Assessment Summary</CardTitle>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2 text-sm">
            <p className="text-[var(--ink-500)]">Adaptive Mean Pre/Post</p>
            <p className="font-semibold text-[var(--ink-800)]">
              {formatPercent(gains.data.summary.adaptiveMeanPretest)} to {formatPercent(gains.data.summary.adaptiveMeanPosttest)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2 text-sm">
            <p className="text-[var(--ink-500)]">Static Mean Pre/Post</p>
            <p className="font-semibold text-[var(--ink-800)]">
              {formatPercent(gains.data.summary.staticMeanPretest)} to {formatPercent(gains.data.summary.staticMeanPosttest)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2 text-sm">
            <p className="text-[var(--ink-500)]">Comparable Learners</p>
            <p className="font-semibold text-[var(--ink-800)]">
              Adaptive {gains.data.summary.adaptiveWithBoth} | Static {gains.data.summary.staticWithBoth}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Outcome Curve</CardTitle>
        <CardMeta>Weekly outcomes for adaptive and static conditions.</CardMeta>
        <AdaptiveComparisonChart data={overview.data.outcomes} />
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Operational Alerts</CardTitle>
            <CardMeta>Auto-refreshed every 30s from invite, queue, telemetry, and validator signals.</CardMeta>
          </div>
          <div className="flex items-center gap-2">
            <Badge label={`${operationalAlerts.data?.counts.total ?? 0} total`} tone="admin" />
            <Link href="/admin/logs" className="text-sm font-semibold text-[var(--brand-700)] hover:underline">
              Open Logs
            </Link>
          </div>
        </div>

        {operationalAlerts.isLoading ? (
          <p className="text-sm text-[var(--ink-500)]">Loading operational alerts...</p>
        ) : operationalAlerts.isError ? (
          <p className="text-sm text-[var(--ink-500)]">
            Operational alerts are temporarily unavailable. Check `/admin/logs` for direct telemetry and flag streams.
          </p>
        ) : !operationalAlerts.data || operationalAlerts.data.alerts.length === 0 ? (
          <p className="text-sm text-[var(--ink-500)]">No active operational alerts in the selected window.</p>
        ) : (
          <div className="space-y-2">
            {operationalAlerts.data.alerts.map((alert) => (
              <div
                key={`${alert.id}-${alert.observedAt}`}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge label={alert.severity} tone={severityTone(alert.severity)} />
                    <Badge label={alert.source.replace("_", " ")} tone="admin" />
                  </div>
                  <span className="text-xs text-[var(--ink-500)]">{formatTimestamp(alert.observedAt)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[var(--ink-800)]">{alert.title}</p>
                <p className="text-sm text-[var(--ink-600)]">{alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>Delta Trace</CardTitle>
          <div className="mt-3 space-y-2 text-sm">
            {uplift.map((row) => (
              <div key={row.week} className="flex items-center justify-between rounded-lg bg-[var(--surface-0)] px-3 py-2">
                <span className="text-[var(--ink-600)]">{row.week}</span>
                <span className="font-semibold text-[var(--brand-700)]">+{row.delta.toFixed(1)} pts</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Interpretation Notes</CardTitle>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--ink-600)]">
            <li>Adaptive trend diverges after week 2 with sustained positive slope.</li>
            <li>Inspect hint-use density for low-mastery students to avoid dependency.</li>
            <li>Run weekly sequence-entropy checks to verify condition separation.</li>
          </ul>
        </Card>
      </div>

      <Card className="space-y-3">
        <CardTitle>Top Learner Gains</CardTitle>
        <CardMeta>Shows top {MAX_GAIN_ROWS} learners by gain to keep rendering stable at scale.</CardMeta>

        {rankedGainRows.length === 0 ? (
          <p className="text-sm text-[var(--ink-500)]">No comparable pre/post submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-600)]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Pre-test</th>
                  <th className="px-4 py-3">Post-test</th>
                  <th className="px-4 py-3">Gain</th>
                  <th className="px-4 py-3">Pre Duration</th>
                  <th className="px-4 py-3">Post Duration</th>
                  <th className="px-4 py-3">Pre Submitted</th>
                  <th className="px-4 py-3">Post Submitted</th>
                </tr>
              </thead>
              <tbody>
                {rankedGainRows.map((row) => (
                  <tr key={row.userId} className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-1)_92%,white)]">
                    <td className="px-4 py-3 font-mono text-xs">{row.userId}</td>
                    <td className="px-4 py-3">{row.group ?? "N/A"}</td>
                    <td className="px-4 py-3">{formatPercent(row.pretestScore)}</td>
                    <td className="px-4 py-3">{formatPercent(row.posttestScore)}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--brand-700)]">{formatGain(row.gain)}</td>
                    <td className="px-4 py-3">{formatDuration(row.pretestDurationMs)}</td>
                    <td className="px-4 py-3">{formatDuration(row.posttestDurationMs)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--ink-500)]">
                      {row.pretestSubmittedAt ? formatTimestamp(row.pretestSubmittedAt) : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--ink-500)]">
                      {row.posttestSubmittedAt ? formatTimestamp(row.posttestSubmittedAt) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
