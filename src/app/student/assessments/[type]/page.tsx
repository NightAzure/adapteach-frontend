"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { AssessmentRunner } from "@/components/assessments/assessment-runner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { SectionHeader } from "@/components/ui/section-header";
import { useSessionStore } from "@/lib/auth/session-store";
import {
  useActiveAssessmentAttempt,
  useAssessment,
  useAssessmentDraft,
  useClearAssessmentDraftMutation,
  useSaveAssessmentDraftMutation,
  useStartAssessmentAttemptMutation,
  useStudentDashboard,
  useSubmitAssessmentMutation,
} from "@/lib/hooks/queries";
import { useTelemetry } from "@/lib/telemetry/useTelemetry";
import type { AssessmentAttemptSession, AssessmentItemAttempt, AssessmentType } from "@/types/models";

function asAssessmentType(value: string | undefined): AssessmentType | null {
  if (value === "pretest" || value === "posttest") return value;
  return null;
}

export default function StudentAssessmentRunPage() {
  const user = useSessionStore((state) => state.user);
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const { track } = useTelemetry();
  const submitMutation = useSubmitAssessmentMutation();
  const startAttemptMutation = useStartAssessmentAttemptMutation();
  const saveDraftMutation = useSaveAssessmentDraftMutation();
  const clearDraftMutation = useClearAssessmentDraftMutation();

  const type = asAssessmentType(params.type);
  const [started, setStarted] = useState(false);
  const [attemptSession, setAttemptSession] = useState<AssessmentAttemptSession | null>(null);
  const [draftItems, setDraftItems] = useState<AssessmentItemAttempt[]>([]);
  const [honorAccepted, setHonorAccepted] = useState(false);
  const saveDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dashboard = useStudentDashboard(user?.id ?? "");
  const activeAttempt = useActiveAssessmentAttempt(type ?? "pretest", Boolean(type && user));
  const assessment = useAssessment(type ?? "pretest", Boolean(type && started));
  const resumableAttempt = activeAttempt.data && activeAttempt.data.status === "open" ? activeAttempt.data : null;
  const effectiveAttempt = attemptSession ?? resumableAttempt;
  const effectiveAttemptId = effectiveAttempt?.attemptId ?? null;
  const draftQuery = useAssessmentDraft(
    type ?? "pretest",
    effectiveAttemptId ?? "",
    Boolean(type && started && effectiveAttemptId),
  );
  const restoredDraftItems = draftQuery.data?.items ?? [];
  const draftReady = !started || !effectiveAttemptId || draftQuery.isSuccess || draftQuery.isError;

  const handleProgress = useCallback(
    (items: AssessmentItemAttempt[]) => {
      setDraftItems(items);
      if (!effectiveAttemptId || !type) return;
      if (saveDraftTimerRef.current) clearTimeout(saveDraftTimerRef.current);
      saveDraftTimerRef.current = setTimeout(() => {
        saveDraftMutation.mutate({
          assessmentType: type,
          attemptId: effectiveAttemptId,
          items,
        });
      }, 500);
    },
    [effectiveAttemptId, saveDraftMutation, type],
  );

  if (!type) return <PageErrorState title="Unknown assessment type" backHref="/student/assessments" />;
  if (!user) return <PageErrorState title="Authentication required" backHref="/login" />;
  if (dashboard.isLoading) return <PageLoadingState title="Loading assessment state..." />;
  if (dashboard.isError) return <PageErrorState title="Assessment state failed to load" backHref="/student/assessments" />;
  if (!dashboard.data) return <PageEmptyState title="No assessment state available" />;

  const data = dashboard.data;
  const pretestCompletedBase = data.assessmentStatus?.pretestCompleted ?? false;
  const posttestCompletedBase = data.assessmentStatus?.posttestCompleted ?? false;
  const pretestWindowOpenBase = data.assessmentStatus?.pretestWindowOpen ?? false;
  const posttestWindowOpenBase = data.assessmentStatus?.posttestWindowOpen ?? false;

  const pretestCompleted = pretestCompletedBase;
  const posttestCompleted = posttestCompletedBase;
  const pretestWindowOpen = pretestWindowOpenBase;
  const posttestWindowOpen = posttestWindowOpenBase;

  const interventionComplete = data.completedArtifacts >= data.totalArtifacts;
  const phase = data.studyPhase;

  const state =
    type === "pretest"
      ? {
          available: !pretestCompleted && (!phase || phase === "pretest") && pretestWindowOpen,
          reason: pretestCompleted
            ? "Pre-test already completed."
            : phase && phase !== "pretest"
              ? "Pre-test is not active for your current study phase."
              : !pretestWindowOpen
                ? "Pre-test window is closed."
                : "Pre-test is available.",
        }
      : {
          available:
            pretestCompleted &&
            interventionComplete &&
            !posttestCompleted &&
            (!phase || phase === "posttest") &&
            posttestWindowOpen,
          reason: posttestCompleted
            ? "Post-test already completed."
            : !pretestCompleted
              ? "Complete pre-test first."
              : !interventionComplete
                ? "Complete intervention artifacts first."
                : phase && phase !== "posttest"
                  ? "Post-test is not active for your current study phase."
                  : !posttestWindowOpen
                    ? "Post-test window is closed."
                    : "Post-test is available.",
        };

  const heading = type === "pretest" ? "Pre-test" : "Post-test";
  const nextRoute = type === "pretest" ? "/student/session" : "/student/survey";
  const effectiveAvailable = state.available || Boolean(resumableAttempt);

  if (started && assessment.isLoading) return <PageLoadingState title={`Preparing ${heading}...`} />;
  if (started && (assessment.isError || !assessment.data || assessment.data.questions.length === 0)) {
    return <PageErrorState title="Assessment failed to load" backHref="/student/assessments" />;
  }
  if (started && effectiveAttemptId && !draftReady) {
    return <PageLoadingState title="Restoring saved responses..." />;
  }

  if (started && assessment.data) {
    return (
      <div className="space-y-4">
        <AssessmentRunner
          title={assessment.data.title}
          questions={assessment.data.questions}
          attemptId={effectiveAttempt?.attemptId}
          timeLimitMinutes={(effectiveAttempt?.durationSeconds ?? 20 * 60) / 60}
          attemptStartedAt={effectiveAttempt?.startedAt}
          attemptExpiresAt={effectiveAttempt?.expiresAt}
          initialAttempts={draftItems.length > 0 ? draftItems : restoredDraftItems}
          onProgress={handleProgress}
          onComplete={(items, startedAt, completedAt) => {
            if (!effectiveAttempt) {
              toast.error("Assessment session is missing", {
                description: "Please restart this assessment run.",
              });
              return;
            }

            const payload = {
              userId: user.id,
              assessmentType: type,
              attemptId: effectiveAttempt.attemptId,
              startedAt,
              completedAt,
              items,
            } as const;

            submitMutation.mutate(payload, {
              onSuccess: (result) => {
                const questionById = new Map((assessment.data?.questions ?? []).map((question) => [question.id, question]));

                track({
                  event: "assessment_submit",
                  durationMs: result.data.totalDurationMs,
                  recommendationMode: data.recommendationMode,
                  responseSummary: `Submitted ${type} with ${result.data.answeredItems}/${result.data.totalItems} answers.`,
                  payload: {
                    assessmentType: type,
                    attemptId: effectiveAttempt.attemptId,
                    totalItems: result.data.totalItems,
                    answeredItems: result.data.answeredItems,
                    version: assessment.data?.version,
                  },
                });

                items.forEach((item) => {
                  const question = questionById.get(item.questionId);
                  const hasAnswerKey =
                    typeof question?.correctOptionId === "string" && question.correctOptionId.length > 0;
                  const correctness = hasAnswerKey
                    ? question?.correctOptionId === item.selectedOptionId
                      ? 1
                      : 0
                    : undefined;

                  track({
                    event: "assessment_item_answered",
                    durationMs: item.durationMs,
                    recommendationMode: data.recommendationMode,
                    concept: question?.concept,
                    difficulty: question?.difficulty,
                    correctness,
                    responseSummary: `Answered ${item.questionId} with option ${item.selectedOptionId}.`,
                    payload: {
                      assessmentType: type,
                      questionId: item.questionId,
                      order: item.order,
                      selectedOptionId: item.selectedOptionId,
                    },
                  });
                });

                toast.success(`${heading} submitted`, {
                  description: `Answered ${result.data.answeredItems}/${result.data.totalItems} items.`,
                });
                setDraftItems([]);
                clearDraftMutation.mutate({
                  assessmentType: type,
                  attemptId: effectiveAttempt.attemptId,
                });
                router.push(nextRoute);
              },
              onError: (error) => {
                const detail =
                  typeof error === "object" &&
                  error !== null &&
                  "response" in error &&
                  typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail === "string"
                    ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
                    : undefined;
                toast.error("Assessment submission failed", {
                  description: detail ?? "Please retry submission.",
                });
              },
            });
          }}
        />
        <div className="flex justify-end text-xs">
          {saveDraftMutation.isPending ? (
            <span className="text-[var(--ink-400)]">Saving…</span>
          ) : saveDraftMutation.isError ? (
            <span className="text-red-600">Draft save failed — answers may not persist on refresh.</span>
          ) : saveDraftMutation.isSuccess ? (
            <span className="text-[var(--ink-400)]">Draft saved.</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Assessment Run"
        title={heading}
        subtitle="Dedicated test-taking view."
        actions={
          <Link href="/student/assessments">
            <Button variant="secondary">Back to Assessments</Button>
          </Link>
        }
      />

      {!effectiveAvailable ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{heading} Locked</CardTitle>
            <Badge label="Locked" tone="hard" />
          </div>
          <CardMeta>{state.reason}</CardMeta>

        </Card>
      ) : !started ? (
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{heading} Ready</CardTitle>
              <CardMeta>20 items, one item per screen, 20-minute limit.</CardMeta>
            </div>
            <Badge label={type} tone="static" />
          </div>

          {activeAttempt.data?.status === "expired" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">Previous attempt expired</p>
              <p className="mt-1 text-xs">Your previous attempt ran out of time and was not submitted. You may start a new attempt below if the window is still open.</p>
            </div>
          ) : null}

          {resumableAttempt ? (
            <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-4">
              <p className="text-sm font-semibold text-[var(--ink-800)]">Existing attempt detected</p>
              <p className="text-xs text-[var(--ink-600)]">
                Started: {new Date(resumableAttempt.startedAt).toLocaleString()} | Expires:{" "}
                {new Date(resumableAttempt.expiresAt).toLocaleString()}
              </p>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    setDraftItems([]);
                    setAttemptSession(resumableAttempt);
                    setStarted(true);
                    track({
                      event: "assessment_resumed",
                      recommendationMode: data.recommendationMode,
                      responseSummary: `Resumed ${type} assessment.`,
                      payload: {
                        assessmentType: type,
                        attemptId: resumableAttempt.attemptId,
                        startedAt: resumableAttempt.startedAt,
                        expiresAt: resumableAttempt.expiresAt,
                        durationSeconds: resumableAttempt.durationSeconds,
                      },
                    });
                  }}
                >
                  Resume {heading}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-4 text-sm text-[var(--ink-700)]">
                <ShieldCheck className="mt-0.5 size-4 text-[var(--brand-600)]" />
                <span>
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={honorAccepted}
                    onChange={(e) => setHonorAccepted(e.target.checked)}
                  />
                  I confirm I will complete this assessment independently and without external aids.
                </span>
              </label>

              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={!honorAccepted || startAttemptMutation.isPending}
                  onClick={() => {
                    startAttemptMutation.mutate(type, {
                      onSuccess: (result) => {
                        setDraftItems([]);
                        setAttemptSession(result.data);
                        setStarted(true);
                        track({
                          event: "assessment_started",
                          recommendationMode: data.recommendationMode,
                          responseSummary: `Started ${type} assessment.`,
                          payload: {
                            assessmentType: type,
                            attemptId: result.data.attemptId,
                            startedAt: result.data.startedAt,
                            expiresAt: result.data.expiresAt,
                            durationSeconds: result.data.durationSeconds,
                          },
                        });
                      },
                      onError: (error) => {
                        const detail =
                          typeof error === "object" &&
                          error !== null &&
                          "response" in error &&
                          typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ===
                            "string"
                            ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
                            : undefined;
                        toast.error("Unable to start assessment", {
                          description: detail ?? "Please refresh and try again.",
                        });
                      },
                    });
                  }}
                >
                  {startAttemptMutation.isPending ? "Starting..." : `Start ${heading}`}
                </Button>
              </div>
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}
