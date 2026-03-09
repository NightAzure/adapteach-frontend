"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ArtifactSubmitResult } from "@/components/artifacts/artifact-renderer";
import type { Artifact } from "@/types/models";

export function FlashcardPanel({
  artifact,
  onResult,
  locked,
}: {
  artifact: Artifact;
  onResult?: (result: ArtifactSubmitResult) => void;
  locked?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const options = artifact.options ?? [];
  const correct = artifact.answerOptionId ?? null;
  const score = submitted && selected === correct ? 1 : 0;

  const optionState = (id: string) => {
    if (!submitted) return selected === id ? "selected" : "idle";
    if (id === correct) return "correct";
    if (id === selected) return "wrong";
    return "idle";
  };

  const stateClass: Record<string, string> = {
    idle: "border-[var(--line)] bg-[var(--surface-0)] text-[var(--ink-800)] hover:border-[var(--brand-400)] hover:bg-[var(--brand-50)]",
    selected: "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-900)]",
    correct: "border-emerald-400 bg-emerald-50 text-emerald-900",
    wrong: "border-rose-400 bg-rose-50 text-rose-900",
  };

  const hasCode = Boolean(artifact.starterCode?.trim());

  return (
    <div className={`grid gap-4 lg:items-start ${hasCode ? "lg:grid-cols-[1.4fr_1fr]" : ""}`}>
      {/* ── Code panel — sticky ── */}
      {hasCode && (
        <Card className="lg:sticky lg:top-4">
          <p className="mb-3 text-sm font-medium text-[var(--ink-600)]">Code to Analyze</p>
          <Editor
            height="320px"
            defaultLanguage="python"
            value={artifact.starterCode}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              ariaLabel: "Read-only code for flashcard question",
            }}
          />
        </Card>
      )}

      {/* ── Question + options ── */}
      <Card className="space-y-4">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Question</p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-[var(--ink-900)]">{artifact.prompt}</p>
        </div>

        <div className="space-y-2" role="radiogroup" aria-label="Answer options">
          {options.map((opt) => {
            const state = optionState(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={submitted}
                onClick={() => setSelected(opt.id)}
                role="radio"
                aria-checked={selected === opt.id}
                className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all disabled:cursor-default ${stateClass[state]}`}
              >
                <span className="mr-3 inline-block w-5 font-bold uppercase text-inherit opacity-60">
                  {opt.id}.
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>

        {submitted && (
          <div className={`space-y-2 rounded-xl px-4 py-3 text-sm ${score === 1 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            <p className="font-medium">
              {score === 1
                ? "Correct!"
                : `Incorrect — the correct answer is ${options.find((o) => o.id === correct)?.label ?? correct}.`}
            </p>
            {artifact.solutionExplanation && (
              <p className="whitespace-pre-wrap border-t border-current/20 pt-2 font-normal opacity-90">
                {artifact.solutionExplanation}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--line)] pt-3">
          <p className="text-xs text-[var(--ink-500)]">
            {submitted
              ? score === 1
                ? "Well done!"
                : "Keep practicing."
              : "Select the best answer."}
          </p>
          <Button
            type="button"
            disabled={!selected || submitted || locked}
            onClick={() => {
              setSubmitted(true);
              onResult?.({
                score,
                responseSummary: `Selected option ${selected} — ${score === 1 ? "correct" : "incorrect"}.`,
                responseData: { selectedOptionId: selected, correctOptionId: correct },
              });
            }}
          >
            Submit Answer
          </Button>
        </div>
      </Card>
    </div>
  );
}
