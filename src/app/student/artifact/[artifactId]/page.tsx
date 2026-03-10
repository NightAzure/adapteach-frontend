"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { ArrowLeft, BookOpen, CheckCircle2, ChevronDown, Lightbulb, Flag, Clock3 } from "lucide-react";
import { ArtifactRenderer } from "@/components/artifacts/artifact-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta } from "@/components/ui/card";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { triggerConfetti } from "@/components/ui/confetti";
import { useSessionStore } from "@/lib/auth/session-store";
import {
  useArtifact,
  useCompleteArtifactMutation,
  useMyArtifactReports,
  useReportArtifactIssueMutation,
  useStudentDashboard,
  useStudentHistory,
} from "@/lib/hooks/queries";
import { useTelemetry } from "@/lib/telemetry/useTelemetry";
import { nextStaticArtifactId } from "@/lib/utils/progression";
import { toast } from "@/lib/toast";
import type { Artifact, DashboardStudent } from "@/types/models";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConceptExplanationPanel({ explanation }: { explanation: string }) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="border-blue-500/30 bg-blue-500/10 space-y-2">
      <button
        className="flex w-full items-center justify-between text-sm font-semibold text-blue-700 dark:text-blue-300"
        onClick={() => setOpen(v => !v)}
      >
        <span className="flex items-center gap-2">
          <BookOpen className="size-4 text-blue-600 dark:text-blue-400" /> What are we learning?
        </span>
        <ChevronDown className={`size-4 text-blue-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">{explanation}</p>
      )}
    </Card>
  );
}

function SolutionPanel({ artifact }: { artifact: Artifact }) {
  return (
    <Card className="space-y-3 border-emerald-500/40 bg-emerald-500/10">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Solution</h3>
      </div>

      {/* Correct answer per type */}
      {artifact.type === "parsons" && artifact.solutionOrder && artifact.solutionOrder.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Correct order</p>
          {artifact.solutionOrder.map((lineIdx, pos) => (
            <div key={pos} className="flex gap-2 rounded-lg border border-emerald-500/30 bg-[var(--surface-0)] px-3 py-2">
              <code className="flex-1 font-mono text-xs text-[var(--ink-800)] whitespace-pre">{artifact.lines?.[lineIdx]}</code>
              {artifact.lineAnnotations?.[lineIdx] && (
                <span className="text-xs text-emerald-700 dark:text-emerald-400 italic border-l border-emerald-500/30 pl-2 max-w-[200px]">{artifact.lineAnnotations[lineIdx]}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {artifact.type === "mutation" && artifact.bugLineNo != null && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">The bug was on line {artifact.bugLineNo}</p>
          {artifact.bugLineFixExample && (
            <code className="block rounded-lg border border-emerald-500/30 bg-[var(--surface-0)] px-3 py-2 font-mono text-xs text-[var(--ink-800)]">
              {artifact.bugLineFixExample}
            </code>
          )}
        </div>
      )}

      {artifact.type === "tracing" && artifact.traceTable && artifact.traceTable.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Expected values</p>
          <div className="overflow-x-auto rounded-lg border border-emerald-500/30 bg-[var(--surface-0)]">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-emerald-500/20"><th className="px-3 py-1.5 text-left font-medium text-emerald-700 dark:text-emerald-400">Step</th><th className="px-3 py-1.5 text-left font-medium text-emerald-700 dark:text-emerald-400">Expression</th><th className="px-3 py-1.5 text-left font-medium text-emerald-700 dark:text-emerald-400">Value</th></tr></thead>
              <tbody>{artifact.traceTable.map((row, i) => <tr key={i} className="border-b border-emerald-500/10 last:border-0"><td className="px-3 py-1.5 text-[var(--ink-600)]">{String(row.step)}</td><td className="px-3 py-1.5 font-mono text-[var(--ink-800)]">{String(row.expression)}</td><td className="px-3 py-1.5 font-mono font-medium text-emerald-700 dark:text-emerald-400">{String(row.expected)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {artifact.type === "flashcard" && artifact.answerOptionId && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Correct answer</p>
          {artifact.options?.filter(o => o.id === artifact.answerOptionId).map(o => (
            <div key={o.id} className="rounded-lg border border-emerald-500/30 bg-[var(--surface-0)] px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">{o.label}</div>
          ))}
        </div>
      )}

      {/* Explanation */}
      {artifact.solutionExplanation && (
        <div className="border-t border-emerald-500/30 pt-2">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">Why?</p>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">{artifact.solutionExplanation}</p>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ArtifactDetailPage() {
  const params = useParams<{ artifactId: string }>();
  const artifactId = params?.artifactId;
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const artifact = useArtifact(artifactId ?? "");
  const dashboard = useStudentDashboard(user?.id ?? "");
  const history = useStudentHistory(user?.id ?? "");
  const reportMutation = useReportArtifactIssueMutation();
  const myReports = useMyArtifactReports(artifactId ?? "", Boolean(artifactId));
  const completeArtifactMutation = useCompleteArtifactMutation();
  const queryClient = useQueryClient();
  const { track } = useTelemetry();
  const [attemptByArtifact, setAttemptByArtifact] = useState<Record<string, number>>({});
  const [revealedHintsByArtifact, setRevealedHintsByArtifact] = useState<Record<string, string[]>>({});
  const [lastScoreByArtifact, setLastScoreByArtifact] = useState<Record<string, number>>({});
  const [submittedByArtifact, setSubmittedByArtifact] = useState<Record<string, boolean>>({});
  const [solutionVisibleByArtifact, setSolutionVisibleByArtifact] = useState<Record<string, boolean>>({});
  const [reportReason, setReportReason] = useState<"incorrect_feedback" | "broken_logic" | "unclear_instruction" | "other">("incorrect_feedback");
  const [reportNote, setReportNote] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const startedAtRef = useRef(0);
  const openedArtifactRef = useRef("");

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [artifactId]);

  const dashboardData = dashboard.data;
  const historyRows = history.data ?? [];
  const item = artifact.data;
  const assignedArtifactId =
    dashboardData?.recommendationMode === "adaptive"
      ? dashboardData?.nextArtifactId
      : nextStaticArtifactId(historyRows);
  const sequencePosition = (dashboardData?.completedArtifacts ?? historyRows.length) + 1;

  useEffect(() => {
    if (!user || !item || !dashboardData || !history.data) return;
    if (!assignedArtifactId || artifactId !== assignedArtifactId) return;
    if (openedArtifactRef.current === item.id) return;
    openedArtifactRef.current = item.id;
    track({
      event: "artifact_open",
      artifactId: item.id,
      artifactType: item.type,
      concept: item.concept,
      subskillTags: item.tags,
      difficulty: item.difficulty,
      recommendationMode: dashboardData.recommendationMode,
      sequencePosition,
      responseSummary: "Opened assigned artifact workspace.",
    });
  }, [artifactId, assignedArtifactId, dashboardData, history.data, item, sequencePosition, track, user]);

  if (artifact.isLoading || dashboard.isLoading || history.isLoading) {
    return <PageLoadingState title="Loading activity…" />;
  }
  if (artifact.isError || dashboard.isError || history.isError) {
    return <PageErrorState title="Activity failed to load" backHref="/student/session" />;
  }
  if (!item || !dashboardData || !history.data) {
    return <PageEmptyState title="Activity not available" message="Return to your session to load the assigned activity." />;
  }
  if (!assignedArtifactId) {
    return <PageErrorState title="No pending activity" message="Your sequence has no pending activity right now." backHref="/student/session" />;
  }
  if (artifactId !== assignedArtifactId) {
    return (
      <PageErrorState
        title="Activity locked"
        message="You can only open the currently assigned activity to preserve the study protocol."
        backHref="/student/session"
      />
    );
  }

  const MAX_ATTEMPTS = 3;
  const attempt = attemptByArtifact[item.id] ?? 0;
  const lastScore = lastScoreByArtifact[item.id] ?? 0;
  const isCorrect = lastScore >= 0.5;
  const isLocked = attempt >= MAX_ATTEMPTS || (attempt > 0 && isCorrect);
  const submitted = submittedByArtifact[item.id] ?? false;
  const solutionVisible = solutionVisibleByArtifact[item.id] ?? false;
  const revealedHints = revealedHintsByArtifact[item.id] ?? [];
  const availableHints = item.hints ?? [];
  const hintsUsed = revealedHints.length;
  const nextHint = availableHints[hintsUsed];

  return (
    <div className="space-y-4">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Link href="/student/session">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" /> Session
          </Button>
        </Link>
      </div>

      {/* Activity header */}
      <Card
        className="border-none text-white"
        style={{ background: "linear-gradient(135deg, #1b3f35 0%, #25584b 55%, #327462 100%)" }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={item.type} tone="static" />
              <Badge label={item.difficulty} tone={item.difficulty as "easy" | "moderate" | "hard"} />
              <Badge label={item.concept} concept />
            </div>
            <h1 className="mt-2 text-xl font-semibold text-white">{item.title}</h1>
            <p className="mt-1 text-sm text-emerald-50/85">{item.prompt}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {item.estimatedMinutes && (
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
                <Clock3 className="size-3.5" /> ~{item.estimatedMinutes} min
              </div>
            )}
            {attempt > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
                Attempt {attempt} of {MAX_ATTEMPTS}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Concept explanation panel */}
      {item.conceptExplanation && (
        <ConceptExplanationPanel explanation={item.conceptExplanation} />
      )}

      {/* Artifact renderer */}
      <ArtifactRenderer
        artifact={item}
        locked={isLocked}
        onSubmit={(result) => {
          const nextAttempt = attempt + 1;
          setAttemptByArtifact((prev) => ({ ...prev, [item.id]: nextAttempt }));
          setLastScoreByArtifact((prev) => ({ ...prev, [item.id]: result.score }));
          track({
            event: "artifact_submit",
            artifactId: item.id,
            artifactType: item.type,
            concept: item.concept,
            subskillTags: item.tags,
            difficulty: item.difficulty,
            recommendationMode: dashboardData.recommendationMode,
            sequencePosition,
            attempt: nextAttempt,
            hintsUsed,
            durationMs: Date.now() - startedAtRef.current,
            correctness: result.score,
            responseSummary: result.responseSummary,
            payload: { score: result.score, responseData: result.responseData },
          });
          if (result.score >= 0.5) {
            triggerConfetti();
            setSolutionVisibleByArtifact((prev) => ({ ...prev, [item.id]: true }));
          } else if (nextAttempt >= MAX_ATTEMPTS) {
            setSolutionVisibleByArtifact((prev) => ({ ...prev, [item.id]: true }));
          }
        }}
      />

      {/* Solution panel */}
      {solutionVisible && (
        <SolutionPanel artifact={item} />
      )}

      {/* Hints section */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-[var(--ink-900)]">
              Need a hint?
            </h3>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!nextHint}
            onClick={() => {
              if (!nextHint) return;
              const nextCount = hintsUsed + 1;
              setRevealedHintsByArtifact((prev) => ({
                ...prev,
                [item.id]: [...(prev[item.id] ?? []), nextHint],
              }));
              track({
                event: "artifact_hint_used",
                artifactId: item.id,
                artifactType: item.type,
                concept: item.concept,
                subskillTags: item.tags,
                difficulty: item.difficulty,
                recommendationMode: dashboardData.recommendationMode,
                sequencePosition,
                hintsUsed: nextCount,
                responseSummary: `Hint ${nextCount} requested.`,
                payload: { hintIndex: nextCount - 1 },
              });
            }}
          >
            {nextHint
              ? `Show hint (${availableHints.length - hintsUsed} left)`
              : "No more hints"}
          </Button>
        </div>

        {revealedHints.length > 0 ? (
          <ul className="space-y-2" aria-live="polite">
            {revealedHints.map((hint, idx) => (
              <li
                key={`${idx}-${hint}`}
                className="animate-slide-in rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                <span className="mr-2 font-bold">Hint {idx + 1}:</span>
                {hint}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[var(--ink-400)]">
            Hints use is recorded for research analytics.
          </p>
        )}
      </Card>

      {/* Flag / report section */}
      <Card className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)]"
          onClick={() => setReportOpen((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <Flag className="size-3.5 text-rose-500" /> Report an issue with this activity
          </span>
          <span className="text-xs text-[var(--ink-400)]">{reportOpen ? "▲" : "▼"}</span>
        </button>

        {reportOpen && (
          <div className="animate-slide-in space-y-3 border-t pt-3" style={{ borderColor: "var(--line)" }}>
            {(myReports.data?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-500)]">Your reports</p>
                {myReports.data!.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-[var(--radius-md)] border px-3 py-2 text-sm space-y-1"
                    style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Badge label={report.status} tone={report.status === "resolved" ? "easy" : "moderate"} />
                      <span className="text-[var(--ink-400)] capitalize">{report.reason.replace(/_/g, " ")}</span>
                    </div>
                    {report.statusNote && (
                      <p className="text-xs text-[var(--ink-600)]">
                        <span className="font-medium">Admin note: </span>
                        {report.statusNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-[200px_1fr]">
              <label className="space-y-1">
                <span className="text-sm font-medium">Reason</span>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as typeof reportReason)}
                  className="w-full rounded-[var(--radius-md)] border bg-[var(--surface-0)] px-3 py-2 text-sm"
                  style={{ borderColor: "var(--line)", color: "var(--ink-900)" }}
                >
                  <option value="incorrect_feedback">Incorrect feedback</option>
                  <option value="broken_logic">Broken logic</option>
                  <option value="unclear_instruction">Unclear instruction</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Details (optional)</span>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-[var(--radius-md)] border bg-[var(--surface-0)] px-3 py-2 text-sm"
                  style={{ borderColor: "var(--line)", color: "var(--ink-900)" }}
                  placeholder="Describe the issue…"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={reportMutation.isPending}
                onClick={() => {
                  if (!user) return;
                  reportMutation.mutate(
                    {
                      userId: user.id,
                      role: user.role,
                      artifactId: item.id,
                      artifactType: item.type,
                      reason: reportReason,
                      note: reportNote.trim() || undefined,
                      hintsUsed,
                      attempt,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Report submitted", { description: "Thanks — an admin will review this." });
                        track({
                          event: "artifact_flagged",
                          artifactId: item.id,
                          artifactType: item.type,
                          concept: item.concept,
                          subskillTags: item.tags,
                          difficulty: item.difficulty,
                          recommendationMode: dashboardData.recommendationMode,
                          sequencePosition,
                          hintsUsed,
                          attempt,
                          responseSummary: "Learner flagged artifact feedback.",
                          payload: { reason: reportReason, note: reportNote.trim() || undefined },
                        });
                        setReportNote("");
                        setReportReason("incorrect_feedback");
                        setReportOpen(false);
                      },
                      onError: () => {
                        toast.error("Report failed", { description: "Please try again in a moment." });
                      },
                    },
                  );
                }}
              >
                Submit report
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Complete CTA */}
      <div
        className="flex items-center justify-between rounded-[var(--radius-lg)] border p-4"
        style={{ background: "var(--surface-1)", borderColor: "var(--line)" }}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--ink-900)]">
            {isLocked && !isCorrect ? "Activity complete" : "Done with this activity?"}
          </p>
          <CardMeta className="text-xs">Recording completion will update your mastery estimates.</CardMeta>
        </div>
        <Button
          disabled={!attempt}
          loading={completeArtifactMutation.isPending}
          onClick={async () => {
            if (!user) return;
            const durationMs = Date.now() - startedAtRef.current;
            try {
              await completeArtifactMutation.mutateAsync({
                artifactId: item.id,
                userId: user.id,
                attempts: attempt || 1,
                hintsUsed,
                durationMs,
                correctness: lastScore,
              });
            } catch {
              toast.error("Couldn't save progress", { description: "Continuing to next activity anyway." });
            }
            track({
              event: "artifact_complete",
              artifactId: item.id,
              artifactType: item.type,
              concept: item.concept,
              subskillTags: item.tags,
              difficulty: item.difficulty,
              recommendationMode: dashboardData.recommendationMode,
              sequencePosition,
              attempt,
              hintsUsed,
              durationMs,
              correctness: lastScore,
              responseSummary: "Learner finished artifact workspace.",
            });
            // Refetch dashboard to get the newly assigned next artifact
            const fresh = await queryClient.fetchQuery<DashboardStudent>({
              queryKey: queryKeys.studentDashboard(user.id),
              staleTime: 0,
            });
            const nextId =
              fresh?.recommendationMode === "adaptive"
                ? fresh?.nextArtifactId
                : nextStaticArtifactId(
                    history.data
                      ? [...history.data, { artifactId: item.id } as never]
                      : [{ artifactId: item.id } as never],
                  );
            if (nextId && nextId !== item.id) {
              router.push(`/student/artifact/${nextId}`);
            } else {
              router.push("/student/session");
            }
          }}
        >
          <CheckCircle2 className="size-4" />
          {completeArtifactMutation.isPending
            ? "Saving…"
            : isLocked && !isCorrect
              ? "Move to Next Activity"
              : "Finish Activity"}
        </Button>
      </div>
    </div>
  );
}
