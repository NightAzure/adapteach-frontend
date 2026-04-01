"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { useStudentDashboard, useSurvey } from "@/lib/hooks/queries";
import { useTelemetry } from "@/lib/telemetry/useTelemetry";
import { useSessionStore } from "@/lib/auth/session-store";
import { apiClient } from "@/lib/api/client";
import { toast } from "@/lib/toast";

export default function SurveyPage() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const survey = useSurvey();
  const dashboard = useStudentDashboard(user?.id ?? "");
  const { track } = useTelemetry();
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    // Wait until we have fresh (non-loading) data before gating — avoids redirecting
    // on stale cache right after post-test submission invalidates the query.
    if (dashboard.isLoading || dashboard.isFetching) return;
    if (!dashboard.data) return;
    if (dashboard.data.studyPhase !== "survey") {
      toast.error("Survey not available yet", { description: "Please complete all required steps first." });
      router.replace("/student/dashboard");
    }
  }, [dashboard.data, dashboard.isLoading, dashboard.isFetching, router]);

  const alreadySubmitted = dashboard.data?.surveySubmitted ?? false;

  // Only block on initial load — background refetches (isFetching) must NOT
  // unmount the form or the user's in-progress answers will be wiped.
  if (survey.isLoading || dashboard.isLoading) return <PageLoadingState title="Loading survey…" />;
  if (survey.isError || dashboard.isError) return <PageErrorState title="Survey failed to load" backHref="/student/dashboard" />;
  if (!survey.data || survey.data.length === 0) return <PageEmptyState title="No survey available" />;

  if (alreadySubmitted || submitted) {
    return (
      <div className="space-y-6">
        <Card
          className="flex flex-col items-center gap-5 py-12 text-center animate-pop"
          style={{
            background: "linear-gradient(135deg, var(--brand-100), color-mix(in srgb, var(--brand-100) 60%, white))",
            borderColor: "color-mix(in srgb, var(--brand-500) 30%, var(--line))",
          }}
        >
          <div
            className="grid size-16 place-items-center rounded-2xl text-3xl"
            style={{ background: "var(--brand-600)", color: "white" }}
          >
            🎉
          </div>
          <div>
            <CardTitle className="text-2xl text-[var(--brand-800)]">All done!</CardTitle>
            <CardMeta className="mt-2 max-w-sm">
              Thank you for completing the survey. Your responses have been recorded and will help improve the platform.
            </CardMeta>
          </div>
          <Button onClick={() => router.push("/student/dashboard")} size="lg">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter((id) => {
    const v = answers[id];
    return typeof v === "number" || (typeof v === "string" && v.trim() !== "");
  }).length;
  const allAnswered = answeredCount === survey.data.length;

  async function handleSubmit() {
    if (!allAnswered) {
      toast.hint("Almost there!", { description: `${survey.data!.length - answeredCount} question(s) still need an answer.` });
      return;
    }
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const responses = Object.entries(answers).map(([questionId, value]) =>
        typeof value === "string"
          ? { questionId, textValue: value }
          : { questionId, value: value as number }
      );
      await apiClient.submitSurvey({ responses });
      track({
        event: "survey_submit",
        responseSummary: `Submitted usability survey with ${responses.length} responses.`,
        payload: { answers },
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        // Already submitted on the server — treat as success
        setSubmitted(true);
        return;
      }
      toast.error("Couldn't submit survey", { description: "Please try again in a moment." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Intro card */}
      <Card
        className="border-none text-white"
        style={{ background: "linear-gradient(135deg, #17332f 0%, #27554b 55%, #356f61 100%)" }}
      >
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15 text-2xl">
            <MessageSquareHeart className="size-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">Almost done!</p>
            <CardTitle className="mt-0.5 text-white">Share your experience</CardTitle>
            <p className="mt-1 text-sm text-emerald-50/85">
              Rate each statement to help us improve the platform. This takes about 2 minutes.
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-1 p-4">
        <div className="flex items-center justify-between">
          <CardTitle>Usability Survey</CardTitle>
          <span
            className="rounded-full border px-3 py-1 text-xs font-semibold"
            style={{
              background: allAnswered ? "var(--brand-100)" : "var(--surface-0)",
              borderColor: allAnswered ? "color-mix(in srgb, var(--brand-500) 35%, var(--line))" : "var(--line)",
              color: allAnswered ? "var(--brand-800)" : "var(--ink-600)",
            }}
          >
            {answeredCount}/{survey.data.length} answered
          </span>
        </div>
        <CardMeta>Answer each question. Likert scale: low = disagree, high = agree.</CardMeta>
      </Card>

      <div className="space-y-3">
        {survey.data.map((question, qIdx) => {
          const isText = question.questionType === "text";
          const rawAnswer = answers[question.id];
          const isAnswered = isText
            ? typeof rawAnswer === "string" && rawAnswer.trim() !== ""
            : rawAnswer !== undefined;
          const currentSection = question.section;
          const prevSection = qIdx > 0 ? survey.data[qIdx - 1].section : null;
          const showSectionHeader = currentSection && currentSection !== prevSection;

          return (
            <div key={question.id}>
              {showSectionHeader && (
                <div className="flex items-center gap-3 pb-1 pt-2">
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--brand-600)]">
                    {currentSection}
                  </span>
                  <div className="h-px flex-1" style={{ background: "var(--line)" }} />
                </div>
              )}
              <Card
                className="space-y-3 transition-all"
                style={{
                  borderColor: isAnswered
                    ? "color-mix(in srgb, var(--brand-500) 30%, var(--line))"
                    : "var(--line)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{
                      background: isAnswered ? "var(--brand-100)" : "var(--surface-3)",
                      color: isAnswered ? "var(--brand-800)" : "var(--ink-500)",
                    }}
                  >
                    {isAnswered ? <CheckCircle2 className="size-3.5" /> : qIdx + 1}
                  </span>
                  <p className="text-sm font-medium text-[var(--ink-800)]">{question.label}</p>
                </div>

                {isText ? (
                  <textarea
                    rows={3}
                    placeholder="Type your answer here…"
                    value={typeof rawAnswer === "string" ? rawAnswer : ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                    className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
                    style={{ background: "var(--surface-0)", borderColor: "var(--line)", color: "var(--ink-900)" }}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pl-9">
                    <span className="text-[11px] text-[var(--ink-400)]">{question.minLabel ?? "Disagree"}</span>
                    {Array.from({ length: question.max - question.min + 1 }).map((_, idx) => {
                      const value = question.min + idx;
                      const active = answers[question.id] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
                          aria-pressed={active}
                          aria-label={`${question.label}: ${value}`}
                          className={`grid size-10 place-items-center rounded-full border text-sm font-bold transition-all duration-150 ${
                            active
                              ? "scale-110 border-[var(--brand-600)] bg-[var(--brand-600)] text-white shadow-[var(--shadow-brand)]"
                              : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--ink-700)] hover:scale-105 hover:border-[var(--brand-500)] hover:bg-[var(--brand-100)]"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                    <span className="text-[11px] text-[var(--ink-400)]">{question.maxLabel ?? "Agree"}</span>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* Submit row */}
      <div className="flex items-center justify-between rounded-[var(--radius-lg)] border p-4"
        style={{ background: "var(--surface-1)", borderColor: "var(--line)" }}>
        <p className="text-sm text-[var(--ink-500)]">
          {allAnswered ? "All questions answered — ready to submit." : `${survey.data.length - answeredCount} question(s) remaining`}
        </p>
        {confirmOpen ? (
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-[var(--ink-700)]">Submit now?</p>
            <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button size="sm" loading={submitting} disabled={submitting} onClick={handleSubmit}>Yes, submit</Button>
          </div>
        ) : (
          <Button
            onClick={() => (allAnswered ? setConfirmOpen(true) : handleSubmit())}
            disabled={submitting}
            size="lg"
          >
            Submit Survey
          </Button>
        )}
      </div>
    </div>
  );
}
