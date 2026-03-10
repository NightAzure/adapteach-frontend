"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flame,
  BarChart3,
  ClipboardList,
  Lock,
  Unlock,
  CheckSquare,
} from "lucide-react";
import { MasteryRadar } from "@/components/charts/mastery-radar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { useSessionStore } from "@/lib/auth/session-store";
import { useStudentDashboard } from "@/lib/hooks/queries";

const PHASE_LABELS: Record<string, string> = {
  pretest: "Pre-test",
  intervention: "Learning",
  posttest: "Post-test",
  survey: "Survey",
};

export default function StudentDashboardPage() {
  const user = useSessionStore((state) => state.user);
  const dashboard = useStudentDashboard(user?.id ?? "");

  if (dashboard.isLoading) return <PageLoadingState title="Loading your dashboard…" />;
  if (dashboard.isError) return <PageErrorState title="Dashboard failed to load" backHref="/student/session" />;
  if (!dashboard.data) return <PageEmptyState title="No dashboard data" />;

  const data = dashboard.data;
  const firstName = data.user.name.split(" ")[0];
  const pretestCompleted = data.assessmentStatus?.pretestCompleted ?? false;
  const posttestCompleted = data.assessmentStatus?.posttestCompleted ?? false;
  const pretestWindowOpen = data.assessmentStatus?.pretestWindowOpen ?? false;
  const posttestWindowOpen = data.assessmentStatus?.posttestWindowOpen ?? false;
  const interventionComplete = data.completedArtifacts >= data.totalArtifacts;
  const phase = data.studyPhase ?? "pretest";
  const phaseLabel = PHASE_LABELS[phase] ?? phase;

  const pretestState = pretestCompleted ? "done" : pretestWindowOpen ? "open" : "locked";
  const posttestState = posttestCompleted
    ? "done"
    : pretestCompleted && interventionComplete && posttestWindowOpen
      ? "open"
      : "locked";
  const surveyState =
    data.studyPhase === "survey"
      ? "open"
      : data.studyPhase === "pretest" || data.studyPhase === "intervention" || data.studyPhase === "posttest" || !data.studyPhase
        ? "locked"
        : "done";

  const milestones = [
    {
      label: "Pre-test",
      state: pretestState,
      href: "/student/assessments/pretest",
    },
    {
      label: "Post-test",
      state: posttestState,
      href: "/student/assessments/posttest",
    },
    {
      label: "Survey",
      state: surveyState,
      href: "/student/survey",
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-xl)] p-6 text-white"
        style={{
          background: "linear-gradient(135deg, #17332f 0%, #27554b 55%, #356f61 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3cc5a8, transparent)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #de7a39, transparent)" }}
        />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">
              {phaseLabel} phase
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              Welcome back, {firstName}!
            </h1>
            <p className="mt-1 text-sm text-emerald-50/80">
              {phase === "pretest" && !pretestCompleted
                ? "Complete the pre-test to unlock your learning activities."
                : interventionComplete
                  ? "Intervention complete. Head to the post-test when ready."
                  : "Keep going to build mastery across all concepts."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge label={phaseLabel} tone="adaptive" />
              <Badge label={data.recommendationMode} tone={data.recommendationMode === "adaptive" ? "adaptive" : "static"} />
            </div>
          </div>
          {phase === "pretest" && !pretestCompleted ? (
            <Link href="/student/assessments/pretest">
              <Button className="shrink-0 bg-white text-white hover:bg-emerald-50 shadow-lg" size="lg">
                Take Pre-test <ArrowRight className="size-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/student/session">
              <Button className="shrink-0 bg-white text-white hover:bg-emerald-50 shadow-lg" size="lg">
                Continue Learning <ArrowRight className="size-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Stat pills ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            icon: <CheckCircle2 className="size-4 text-[var(--brand-500)]" />,
            label: "Activities done",
            value: String(data.completedArtifacts),
          },
          {
            icon: <Flame className="size-4 text-orange-500" />,
            label: "Day streak",
            value: `${data.streakDays} day${data.streakDays !== 1 ? "s" : ""}`,
          },
          {
            icon: <Clock3 className="size-4 text-[var(--ink-500)]" />,
            label: "Avg time",
            value: `${data.avgMinutes.toFixed(1)} min`,
          },
          {
            icon: <BarChart3 className="size-4 text-[var(--accent-500)]" />,
            label: "Mode",
            value: data.recommendationMode === "adaptive" ? "Adaptive" : "Static",
          },
        ].map((stat) => (
          <Card key={stat.label} hoverable className="flex flex-col gap-1 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink-500)]">
              {stat.icon}
              {stat.label}
            </div>
            <p className="text-xl font-bold text-[var(--ink-900)]">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* ── Pre-test required banner ──────────────────────────── */}
      {phase === "pretest" && !pretestCompleted && (
        <Card className="flex flex-col gap-4 border-amber-500/40 bg-amber-500/10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
              <ClipboardList className="size-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-amber-800 dark:text-amber-300">Pre-test required before activities</CardTitle>
              <CardMeta className="mt-0.5 text-amber-700 dark:text-amber-400">
                You need to complete the pre-test first. It measures your starting knowledge so we
                can track your progress through the study. Activities unlock once it is done.
              </CardMeta>
            </div>
          </div>
          <Link href="/student/assessments/pretest" className="shrink-0">
            <Button className="w-full bg-amber-600 text-white hover:bg-amber-700 md:w-auto">
              Go to Pre-test <ArrowRight className="size-4" />
            </Button>
          </Link>
        </Card>
      )}

      {/* ── Next activity CTA ────────────────────────────────── */}
      {data.nextArtifactId && phase !== "pretest" ? (
        <Card className="border-none bg-[linear-gradient(135deg,var(--brand-700),var(--brand-500))] text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardMeta className="text-emerald-100">Your next activity is ready</CardMeta>
              <CardTitle className="text-white">Continue where you left off</CardTitle>
              <p className="mt-1 text-sm text-emerald-50/85">
                Personalized for your current mastery level.
              </p>
            </div>
            <Link href={`/student/artifact/${data.nextArtifactId}`}>
              <Button size="lg" className="shrink-0 bg-white text-white hover:bg-emerald-50">
                Start Now <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {/* ── Daily trend ──────────────────────────────────────── */}
      <Card>
        <CardTitle>Daily Score Trend</CardTitle>
        <CardMeta className="mt-0.5">
          {data.dailyTrend.length > 0
            ? `Your per-session scores over the last ${data.dailyTrend.length} days.`
            : "Scores from your activity sessions will appear here."}
        </CardMeta>
        {data.dailyTrend.length > 0 ? (
          <div className="mt-4 flex items-end gap-1.5" style={{ height: "72px" }}>
            {data.dailyTrend.map((point) => {
              const pct = Math.min(100, Math.max(0, point.score));
              return (
                <div key={point.day} className="group flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-[var(--brand-500)] opacity-80 transition-opacity group-hover:opacity-100"
                    style={{ height: `${pct}%`, minHeight: "3px" }}
                    title={`${point.day}: ${Math.round(pct)}%`}
                  />
                  <span className="text-[9px] text-[var(--ink-500)]">{point.day}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-center rounded-xl py-7" style={{ background: "var(--surface-0)" }}>
            <div className="flex flex-col items-center gap-2 text-center">
              <BarChart3 className="size-7 text-[var(--ink-300)]" />
              <p className="text-sm font-medium text-[var(--ink-500)]">No activity data yet</p>
              <p className="max-w-[200px] text-xs text-[var(--ink-400)]">
                Complete activities to see your daily score trend.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ── Milestones (always visible) + Mastery/Radar (adaptive only) ── */}
      {data.recommendationMode === "static" ? (
        <Card>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="size-5 text-[var(--accent-500)]" /> Milestones
          </CardTitle>
          <div className="mt-3 space-y-2">
            {milestones.map(({ label, state, href }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-sm"
                style={{ background: "var(--surface-0)" }}
              >
                <span className="text-[var(--ink-700)]">{label}</span>
                {state === "open" ? (
                  <Link href={href} className="flex items-center gap-1 font-semibold text-[var(--brand-600)] hover:underline">
                    <Unlock className="size-3.5" /> Open
                  </Link>
                ) : state === "done" ? (
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    <CheckCircle2 className="size-3.5" /> Done
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[var(--ink-400)]">
                    <Lock className="size-3.5" /> Locked
                  </span>
                )}
              </div>
            ))}
          </div>
          <Link href="/student/history">
            <Button variant="secondary" className="mt-3 w-full">
              View full history
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardTitle>Skill Mastery</CardTitle>
            <CardMeta className="mt-0.5">How well you know each topic based on your attempts.</CardMeta>
            {data.conceptMastery.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center gap-3 py-6 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: "var(--surface-2)" }}
                >
                  <BarChart3 className="size-6 text-[var(--ink-500)]" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--ink-800)]">No mastery data yet</p>
                  <p className="mt-1 text-sm text-[var(--ink-500)]">
                    Complete your first activity to start tracking skill estimates.
                  </p>
                </div>
                <Link href="/student/session">
                  <Button size="sm" className="mt-1">
                    Start an Activity <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {data.conceptMastery.map((row) => {
                  const clamped = Math.min(1, Math.max(0, row.mastery));
                  return (
                    <div key={row.concept} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-[var(--ink-800)]">
                          <Badge label={row.concept} concept />
                        </span>
                        <span className="font-semibold text-[var(--ink-700)]">
                          {Math.round(clamped * 100)}%
                        </span>
                      </div>
                      <Meter value={clamped} variant="auto" />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            {data.conceptMastery.length > 0 && (
              <Card className="flex-1">
                <CardTitle>Mastery Radar</CardTitle>
                <MasteryRadar data={data.conceptMastery} />
              </Card>
            )}
            <Card className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="size-5 text-[var(--accent-500)]" /> Milestones
              </CardTitle>
              <div className="mt-3 space-y-2">
                {milestones.map(({ label, state, href }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-sm"
                    style={{ background: "var(--surface-0)" }}
                  >
                    <span className="text-[var(--ink-700)]">{label}</span>
                    {state === "open" ? (
                      <Link href={href} className="flex items-center gap-1 font-semibold text-[var(--brand-600)] hover:underline">
                        <Unlock className="size-3.5" /> Open
                      </Link>
                    ) : state === "done" ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-600">
                        <CheckCircle2 className="size-3.5" /> Done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[var(--ink-400)]">
                        <Lock className="size-3.5" /> Locked
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <Link href="/student/history">
                <Button variant="secondary" className="mt-3 w-full">
                  View full history
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
