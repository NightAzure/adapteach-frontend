"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Artifact } from "@/types/models";

export function QuizBoard({ artifact, onResult }: { artifact: Artifact; onResult?: (score: number) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const correct = selected && selected === artifact.answerOptionId;

  return (
    <Card className="space-y-4">
      <h3 className="text-base font-semibold">{artifact.prompt}</h3>
      <div className="space-y-2">
        {(artifact.options ?? []).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
              selected === opt.id
                ? "border-[var(--brand-500)] bg-[var(--brand-100)]"
                : "border-[var(--line)] bg-[var(--surface-0)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--ink-600)]">
          {submitted ? (correct ? "Correct answer." : "Incorrect, review complexity notes.") : "Choose one option."}
        </p>
        <Button
          onClick={() => {
            setSubmitted(true);
            onResult?.(correct ? 1 : 0);
          }}
          disabled={!selected}
        >
          Submit
        </Button>
      </div>
    </Card>
  );
}
