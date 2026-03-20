"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, ClipboardList, Clock3, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { useSessionStore } from "@/lib/auth/session-store";
import { useArtifact, useStudentDashboard, useStudentHistory } from "@/lib/hooks/queries";
import { useTelemetry } from "@/lib/telemetry/useTelemetry";

export default function StudentSessionPage() {
  const user = useSessionStore((state) => state.user);
  const { track } = useTelemetry();
  const sequenceLoggedRef = useRef("");
  const dashboard = useStudentDashboard(user?.id ?? "");
  const history = useStudentHistory(user?.id ?? "");
  const data = dashboard.data;
  const historyRows = history.data ?? [];
  const completedIds = new Set(historyRows.map((row) => row.artifactId));
  const mode = data?.recommendationMode ?? "adaptive";
  const studyPhase = data?.studyPhase ?? "pretest";
  const pretestCompleted = data?.assessmentStatus?.pretestCompleted ?? false;
  // Both adaptive and static use the backend-assigned nextArtifactId.
  // The backend selects adaptively for adaptive students and in fixed ID order for static.
  const currentArtifactId = data?.nextArtifactId ?? null;

  const currentArtifact = useArtifact(currentArtifactId ?? "");
  const totalCompleted = completedIds.size;

  useEffect(() => {
    if (!user || !dashboard.data || currentArtifact.isLoading) return;
    const artifact = currentArtifact.data;
    const signature = `${mode}|${currentArtifactId ?? "none"}`;
    if (sequenceLoggedRef.current === signature) return;
    sequenceLoggedRef.current = signature;
    track({
      event: "session_sequence_assigned",
      recommendationMode: mode,
      sequencePosition: totalCompleted + 1,
      artifactId: currentArtifactId ?? undefined,
      artifactType: artifact?.type,
      concept: artifact?.concept,
      difficulty: artifact?.difficulty,
      subskillTags: artifact?.tags,
      responseSummary: `Assigned ${mode} sequence. Current: ${currentArtifactId ?? "none"}.`,
      payload: { currentArtifactId, completedArtifacts: totalCompleted },
    });
  }, [
    currentArtifact.data,
    currentArtifact.isLoading,
    currentArtifactId,
    dashboard.data,
    mode,
    totalCompleted,
    track,
    user,
  ]);

  if (dashboard.isLoading || history.isLoading) return <PageLoadingState title="Loading your session…" />;
  if (dashboard.isError || history.isError)
    return <PageErrorState title="Session failed to load" backHref="/student/dashboard" />;
  if (!dashboard.data || !history.data) return <PageEmptyState title="No session data available" />;

  const artifact = currentArtifact.data;

  return (
    <div className="space-y-5">
      {/* Session banner */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-xl)] p-6 text-white"
        style={{ background: "linear-gradient(130deg, #1b3f35 0%, #25584b 55%, #327462 100%)" }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3cc5a8, transparent)" }} />

        <div className="relative grid gap-4 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/70">Learning Session</p>
            <CardTitle className="mt-2 text-white text-xl">
              {mode === "static"
                ? "Fixed sequence in progress"
                : "Adaptive sequence in progress"}
            </CardTitle>
            <p className="mt-1 text-sm text-emerald-50/85">
              {mode === "static"
                ? "Activities are ordered to build skills progressively."
                : "Your next activity is selected based on your learning trajectory."}
            </p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-emerald-100">Condition</span>
              <span className="font-semibold capitalize">{mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-100">Completed</span>
              <span className="font-semibold">{totalCompleted}</span>
            </div>
          </div>
        </div>
      </div>

      {studyPhase === "pretest" && !pretestCompleted ? (
        <Card className="flex flex-col gap-4 border-amber-400 bg-amber-100 dark:border-amber-500/60 dark:bg-amber-500/10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-200 dark:bg-amber-500/20">
              <ClipboardList className="size-5 text-amber-800 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-amber-950 dark:text-amber-300">Activities are locked until you complete the pre-test</CardTitle>
              <CardMeta className="mt-0.5 text-amber-800 dark:text-amber-400">
                The pre-test measures your starting knowledge so your progress can be tracked
                throughout the study. Complete it first to unlock your learning activities.
              </CardMeta>
            </div>
          </div>
          <Link href="/student/assessments/pretest" className="shrink-0">
            <Button className="w-full bg-amber-600 text-white hover:bg-amber-700 md:w-auto">
              Go to Pre-test <ArrowRight className="size-4" />
            </Button>
          </Link>
        </Card>
      ) : !currentArtifactId ? (
        <PageEmptyState
          title="Session complete"
          message="All activities are done. Head back to your dashboard for next steps."
        />
      ) : null}

      {/* ── Current activity card (adaptive + static) ────────── */}
      {currentArtifactId && !(studyPhase === "pretest" && !pretestCompleted) ? (
        <div className="space-y-4">
          <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--ink-500)]">
                <Sparkles className="size-3.5 text-[var(--brand-500)]" /> Current Activity
              </div>
              {currentArtifact.isLoading ? (
                <CardTitle>Loading…</CardTitle>
              ) : artifact ? (
                <>
                  <CardTitle>{artifact.title}</CardTitle>
                  <CardMeta className="flex items-center gap-2">
                    <Clock3 className="size-3.5" />
                    {artifact.concept} · {artifact.estimatedMinutes} min
                  </CardMeta>
                  <div className="flex flex-wrap gap-2">
                    <Badge label={artifact.type} tone="static" />
                    <Badge label={artifact.difficulty} tone={artifact.difficulty as "easy" | "moderate" | "hard"} />
                    <Badge label={artifact.concept} concept />
                  </div>
                </>
              ) : (
                <CardTitle>{currentArtifactId}</CardTitle>
              )}
            </div>
            <Link href={`/student/artifact/${currentArtifactId}`}>
              <Button size="lg" className="shrink-0">
                Open Activity <ArrowRight className="size-4" />
              </Button>
            </Link>
          </Card>

          <Card className="border-dashed py-6 text-center text-sm text-[var(--ink-500)]">
            {mode === "static"
              ? "Activities are assigned in a fixed sequence."
              : "Future activities are selected automatically based on your performance."}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
