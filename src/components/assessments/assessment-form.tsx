"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import type { AssessmentQuestion } from "@/types/models";

export function AssessmentForm({
  title,
  questions,
  onSubmit,
}: {
  title: string;
  questions: AssessmentQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  return (
    <form
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSubmit(answers);
      }}
    >
      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardMeta>Standardized checkpoint used for baseline and outcome measurement.</CardMeta>
          </div>
          <p
            className="rounded-full border border-[var(--line)] bg-[var(--surface-0)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-600)]"
            aria-live="polite"
          >
            {answeredCount}/{questions.length} answered
          </p>
        </div>

        {questions.map((q, idx) => (
          <fieldset key={q.id} className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-4">
            <legend className="text-sm font-semibold text-[var(--ink-800)]">
              {idx + 1}. {q.question}
            </legend>
            <div className="space-y-1">
              {q.options.map((opt) => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--surface-2)]">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                  />
                  <span className="text-sm text-[var(--ink-700)]">{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="flex justify-end">
          <Button type="submit" disabled={answeredCount === 0}>Submit Checkpoint</Button>
        </div>
      </Card>
    </form>
  );
}

