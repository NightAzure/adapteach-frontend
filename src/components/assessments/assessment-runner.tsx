"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { TimerRing } from "@/components/assessment/timer-ring";
import type { AssessmentItemAttempt, AssessmentQuestion } from "@/types/models";

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(input: T[], seedText: string) {
  const seed = hashString(seedText);
  const rand = mulberry32(seed);
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function optionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

export function AssessmentRunner({
  title,
  questions,
  attemptId,
  timeLimitMinutes = 20,
  attemptStartedAt,
  attemptExpiresAt,
  initialAttempts,
  onProgress,
  onComplete,
}: {
  title: string;
  questions: AssessmentQuestion[];
  attemptId?: string;
  timeLimitMinutes?: number;
  attemptStartedAt?: string;
  attemptExpiresAt?: string;
  initialAttempts?: AssessmentItemAttempt[];
  onProgress?: (items: AssessmentItemAttempt[]) => void;
  onComplete: (items: AssessmentItemAttempt[], startedAt: string, completedAt: string) => void;
}) {
  const [order] = useState<string[]>(() =>
    deterministicShuffle(
      questions.map((q) => q.id),
      `${attemptId ?? "no-attempt"}::${questions
        .map((q) => q.id)
        .sort()
        .join("|")}`,
    ),
  );
  const [attempts, setAttempts] = useState<AssessmentItemAttempt[]>(() => {
    const validIds = new Set(questions.map((q) => q.id));
    const deduped = new Map<string, AssessmentItemAttempt>();
    for (const item of initialAttempts ?? []) {
      if (!validIds.has(item.questionId)) continue;
      deduped.set(item.questionId, item);
    }
    return [...deduped.values()].sort((a, b) => a.order - b.order);
  });
  const [selectedByQuestion, setSelectedByQuestion] = useState<Record<string, string>>(() => {
    const validIds = new Set(questions.map((q) => q.id));
    const selected: Record<string, string> = {};
    for (const item of initialAttempts ?? []) {
      if (!validIds.has(item.questionId)) continue;
      selected[item.questionId] = item.selectedOptionId;
    }
    return selected;
  });
  const [index, setIndex] = useState(() => {
    const answered = new Set((initialAttempts ?? []).map((item) => item.questionId));
    const nextUnanswered = order.findIndex((questionId) => !answered.has(questionId));
    if (nextUnanswered >= 0) return nextUnanswered;
    return Math.max(0, order.length - 1);
  });
  const [finished, setFinished] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [mountedAtMs] = useState<number>(() => Date.now());
  const finishedRef = useRef(false);
  const itemStartedAtRef = useRef<number>(Date.now());
  const startedAtMs = useMemo(() => {
    const parsed = attemptStartedAt ? Date.parse(attemptStartedAt) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : mountedAtMs;
  }, [attemptStartedAt, mountedAtMs]);
  const deadlineMs = useMemo(() => {
    const parsed = attemptExpiresAt ? Date.parse(attemptExpiresAt) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : startedAtMs + timeLimitMinutes * 60 * 1000;
  }, [attemptExpiresAt, startedAtMs, timeLimitMinutes]);
  const startedAtIso = useMemo(() => new Date(startedAtMs).toISOString(), [startedAtMs]);

  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const currentQuestionId = order[index];
  const currentQuestion = currentQuestionId ? byId.get(currentQuestionId) : undefined;
  const total = order.length;
  const last = index === total - 1;
  const selected = currentQuestionId ? selectedByQuestion[currentQuestionId] : undefined;

  useEffect(() => {
    itemStartedAtRef.current = Date.now();
  }, [index]);

  useEffect(() => {
    if (!onProgress) return;
    onProgress(attempts);
  }, [attempts, onProgress]);

  const remainingMs = Number.isFinite(deadlineMs) ? Math.max(0, deadlineMs - (startedAtMs + elapsedMs)) : null;
  const minutes = remainingMs !== null ? Math.floor(remainingMs / 60000) : null;
  const seconds = remainingMs !== null ? Math.floor((remainingMs % 60000) / 1000) : null;
  const isUrgent = remainingMs !== null && remainingMs <= 5 * 60 * 1000;

  const savedAttempts = attempts.length;
  const progress = total > 0 ? (index + 1) / total : 0;

  const upsertAttempt = (questionId: string, optionId: string, orderIndex: number, durationMs: number) => {
    setAttempts((prev) => {
      const next = prev.filter((item) => item.questionId !== questionId);
      next.push({ questionId, selectedOptionId: optionId, order: orderIndex, durationMs });
      next.sort((a, b) => a.order - b.order);
      return next;
    });
  };

  const completeAssessment = useCallback(
    (items: AssessmentItemAttempt[]) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFinished(true);
      onComplete(items, startedAtIso, new Date().toISOString());
    },
    [onComplete, startedAtIso],
  );

  useEffect(() => {
      const id = setInterval(() => {
      const nextElapsed = Date.now() - startedAtMs;
      setElapsedMs(nextElapsed);

      if (!Number.isFinite(deadlineMs) || Date.now() < deadlineMs || finishedRef.current) return;

      let finalItems = attempts;
      if (currentQuestionId && selectedByQuestion[currentQuestionId]) {
        const durationMs = Date.now() - itemStartedAtRef.current;
        finalItems = [
          ...attempts.filter((item) => item.questionId !== currentQuestionId),
          {
            questionId: currentQuestionId,
            selectedOptionId: selectedByQuestion[currentQuestionId],
            order: index,
            durationMs,
          },
        ];
      }
      completeAssessment(finalItems);
    }, 1000);

    return () => clearInterval(id);
  }, [attempts, completeAssessment, currentQuestionId, deadlineMs, index, selectedByQuestion, startedAtMs]);

  const moveNext = () => {
    if (!currentQuestionId || !selected || finished) return;

    const durationMs = Date.now() - itemStartedAtRef.current;
    upsertAttempt(currentQuestionId, selected, index, durationMs);
    const finalItems = [
      ...attempts.filter((item) => item.questionId !== currentQuestionId),
      { questionId: currentQuestionId, selectedOptionId: selected, order: index, durationMs },
    ];

    if (last) {
      completeAssessment(finalItems);
      return;
    }

    setIndex((prev) => prev + 1);
  };

  if (!currentQuestion) {
    return (
      <Card>
        <CardTitle>No assessment items</CardTitle>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">{title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex rounded-full px-3 py-1 text-xs font-bold text-white"
              style={{ background: "var(--brand-600)" }}
            >
              Q {index + 1} of {total}
            </span>
            <Badge label={`${savedAttempts} answered`} tone="static" />
          </div>
          {/* Progress bar below question counter */}
          <div className="pt-1">
            <Meter value={progress} />
          </div>
        </div>

        {/* Timer ring */}
        {attemptExpiresAt && attemptStartedAt ? (
          <TimerRing
            durationSeconds={timeLimitMinutes * 60}
            startedAt={attemptStartedAt}
            expiresAt={attemptExpiresAt}
            onExpired={() => {
              if (finishedRef.current) return;
              let finalItems = attempts;
              if (currentQuestionId && selectedByQuestion[currentQuestionId]) {
                const durationMs = Date.now() - itemStartedAtRef.current;
                finalItems = [
                  ...attempts.filter((item) => item.questionId !== currentQuestionId),
                  { questionId: currentQuestionId, selectedOptionId: selectedByQuestion[currentQuestionId], order: index, durationMs },
                ];
              }
              completeAssessment(finalItems);
            }}
            size={80}
          />
        ) : (
          <div className="rounded-[var(--radius-md)] border px-3 py-2 text-sm font-semibold text-[var(--ink-500)]"
            style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}>
            No time limit
          </div>
        )}
      </div>

      {/* Question card */}
      <div
        className="rounded-[var(--radius-lg)] border p-5"
        style={{ background: "var(--surface-0)", borderColor: "var(--line)" }}
      >
        <p className="mb-3 whitespace-pre-wrap text-base font-semibold leading-relaxed text-[var(--ink-900)]">
          {currentQuestion.question}
        </p>

        <div className="mt-4 space-y-2">
          {currentQuestion.options.map((option, optionIndex) => {
            const chosen = selected === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 transition-all duration-150 hover:-translate-y-px ${
                  chosen
                    ? "border-[var(--brand-500)] bg-[var(--brand-100)] text-[var(--brand-900)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--brand-500)_25%,transparent)]"
                    : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--ink-800)] hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-card)]"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={`assessment-${currentQuestion.id}`}
                  checked={chosen}
                  onChange={() => setSelectedByQuestion((prev) => ({ ...prev, [currentQuestion.id]: option.id }))}
                />
                <span
                  className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    chosen ? "bg-[var(--brand-600)] text-white" : "bg-[var(--surface-3)] text-[var(--ink-600)]"
                  }`}
                >
                  {optionLabel(optionIndex)}
                </span>
                <span className="whitespace-pre-wrap pt-0.5 text-sm leading-relaxed">{option.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={moveNext} disabled={!selected || finished} size="lg">
          {last ? "Submit Assessment" : "Next Question →"}
        </Button>
      </div>
    </Card>
  );
}
