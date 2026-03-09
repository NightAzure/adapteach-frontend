"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import type { ArtifactSubmitResult } from "@/components/artifacts/artifact-renderer";
import type { Artifact } from "@/types/models";

export function MutationWorkbench({
  artifact,
  onResult,
  locked,
}: {
  artifact: Artifact;
  onResult?: (result: ArtifactSubmitResult) => void;
  locked?: boolean;
}) {
  const lines = useMemo(() => (artifact.starterCode ?? "").split("\n"), [artifact.starterCode]);
  const bugLineNo = artifact.bugLineNo ?? 1;
  const bugLineIndex = Math.max(0, Math.min(lines.length - 1, bugLineNo - 1));
  const patchInputId = `mutation-line-${bugLineNo}`;
  const hintId = `mutation-hint-${bugLineNo}`;
  const statusId = `mutation-status-${bugLineNo}`;
  const [patchedLine, setPatchedLine] = useState(lines[bugLineIndex] ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<boolean | null>(null);

  const patchedCode = useMemo(
    () =>
      lines
        .map((line, index) => (index === bugLineIndex ? patchedLine : line))
        .join("\n"),
    [bugLineIndex, lines, patchedLine],
  );

  const isValid = checkResult ?? false;
  const showCorrect = submitted && isValid;
  const showIncorrect = submitted && !isValid && !checking;

  return (
    <Card className="space-y-4">
      <p className="text-sm text-[var(--ink-600)]">
        Find and fix the bug on the highlighted line. Only edit that line — the rest is read-only context.
      </p>

      {/* Code viewer */}
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border"
        style={{ borderColor: "var(--line)" }}
      >
        <div
          className="flex items-center gap-2 border-b px-4 py-2"
          style={{ background: "var(--surface-2)", borderColor: "var(--line)" }}
        >
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-rose-400/70" />
            <span className="size-3 rounded-full bg-amber-400/70" />
            <span className="size-3 rounded-full bg-emerald-400/70" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-500)]">
            Code context
          </span>
        </div>

        <div className="max-h-[300px] overflow-auto" style={{ background: "var(--surface-0)" }}>
          {lines.map((line, index) => {
            const lineNo = index + 1;
            const isBugLine = lineNo === bugLineNo;
            const isFixed = isBugLine && showCorrect;

            return (
              <div
                key={`${lineNo}-${line}`}
                className={`grid grid-cols-[44px_1fr] gap-2 px-3 py-1 font-mono text-[13px] leading-relaxed transition-colors duration-300 ${
                  isFixed
                    ? "bg-emerald-50 text-emerald-800"
                    : isBugLine
                      ? "bg-amber-50 text-amber-900"
                      : "text-[var(--ink-800)]"
                }`}
              >
                <span
                  className={`select-none text-right text-[11px] leading-relaxed ${
                    isFixed
                      ? "text-emerald-500"
                      : isBugLine
                        ? "text-amber-500"
                        : "text-[var(--ink-400)]"
                  }`}
                >
                  {lineNo}
                </span>
                <div className="flex items-center gap-2">
                  <code className="whitespace-pre-wrap">{isBugLine && submitted ? patchedLine : line}</code>
                  {isFixed && <CheckCircle2 className="size-4 shrink-0 text-emerald-500 animate-pop" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Patch input */}
      <div
        className="space-y-2 rounded-[var(--radius-lg)] border p-4"
        style={{
          background: "var(--surface-1)",
          borderColor: showCorrect
            ? "#6ee7b7"
            : showIncorrect
              ? "#fca5a5"
              : "var(--line)",
        }}
      >
        <label htmlFor={patchInputId} className="flex items-center gap-2 text-sm font-medium text-[var(--ink-800)]">
          Fix line {bugLineNo}
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Bug line
          </span>
        </label>
        <input
          id={patchInputId}
          value={patchedLine}
          onChange={(e) => {
            setPatchedLine(e.target.value);
            if (submitted) { setSubmitted(false); setCheckResult(null); }
          }}
          className={`w-full rounded-[var(--radius-md)] border px-3 py-2 font-mono text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--brand-600)] ${
            showCorrect
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : showIncorrect
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-[var(--line)] bg-[var(--surface-0)] text-[var(--ink-900)]"
          }`}
          aria-label={`Patch for line ${bugLineNo}`}
          aria-describedby={`${statusId}${artifact.bugLineFixExample ? ` ${hintId}` : ""}`}
          aria-invalid={showIncorrect}
        />
        <p id={hintId} className="text-xs text-[var(--ink-500)]">
          Use the hint button if you need guidance.
        </p>
      </div>

      {/* Preview */}
      <div
        className="space-y-2 rounded-[var(--radius-lg)] border p-4"
        style={{ background: "var(--surface-0)", borderColor: "var(--line)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-600)]">
          Patched preview
        </p>
        <pre className="overflow-auto rounded-[var(--radius-md)] p-3 font-mono text-[12px] text-[var(--ink-800)]"
          style={{ background: "var(--surface-2)" }}>
          {patchedCode}
        </pre>
      </div>

      <div className="flex items-center justify-between">
        <p id={statusId} className="text-sm" aria-live="polite">
          {showCorrect ? (
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
              <CheckCircle2 className="size-4" /> Correct fix!
            </span>
          ) : showIncorrect ? (
            <span className="text-rose-600 font-medium">Not quite — check the logic and try again.</span>
          ) : (
            <span className="text-[var(--ink-400)]">Ready to check…</span>
          )}
        </p>
        <Button
          type="button"
          disabled={checking || locked}
          onClick={async () => {
            setSubmitted(true);
            setChecking(true);
            setCheckResult(null);
            try {
              const res = await apiClient.checkArtifactAnswer(artifact.id, {
                answerType: "mutation",
                patchedLine,
              });
              const correct = res.data?.correct ?? false;
              setCheckResult(correct);
              onResult?.({
                score: correct ? 1 : 0,
                responseSummary: `Patched bug line ${bugLineNo}${correct ? " correctly" : ""}.`,
                responseData: { bugLineNo, patchedLine },
              });
            } finally {
              setChecking(false);
            }
          }}
        >
          {checking ? "Checking…" : "Submit Patch"}
        </Button>
      </div>
    </Card>
  );
}

