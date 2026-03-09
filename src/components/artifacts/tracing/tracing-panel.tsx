"use client";

/**
 * Semantically compare a student's trace answer against the expected value.
 * Handles: exact match, case-insensitive booleans/None, numeric equivalence
 * (3 == 3.0), and string literals with different quote styles ('x' == "x").
 */
function traceValuesEqual(student: string, expected: string): boolean {
  const s = student.trim();
  const e = expected.trim();
  if (s === e) return true;
  if (s.toLowerCase() === e.toLowerCase()) return true;
  const ns = parseFloat(s);
  const ne = parseFloat(e);
  if (!isNaN(ns) && !isNaN(ne) && String(ns) !== "" && String(ne) !== "" && ns === ne) return true;
  const unquote = (v: string) => (/^(['"])(.*)\1$/.test(v) ? v.slice(1, -1) : v);
  if (unquote(s) === unquote(e)) return true;
  return false;
}

import { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ArtifactSubmitResult } from "@/components/artifacts/artifact-renderer";
import type { Artifact } from "@/types/models";

export function TracingPanel({
  artifact,
  onResult,
  locked,
}: {
  artifact: Artifact;
  onResult?: (result: ArtifactSubmitResult) => void;
  locked?: boolean;
}) {
  const traceRows = useMemo(() => artifact.traceTable ?? [], [artifact.traceTable]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const score = useMemo(() => {
    if (!traceRows.length) return 0;
    const hit = traceRows.filter((row) => traceValuesEqual(answers[row.step] ?? "", row.expected ?? "")).length;
    return hit / traceRows.length;
  }, [answers, traceRows]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      {/* ── Code panel — sticky so it stays visible while scrolling the trace table ── */}
      <Card className="lg:sticky lg:top-4">
        <p className="mb-3 text-sm font-medium text-[var(--ink-600)]">Code Context</p>
        <Editor
          height="420px"
          defaultLanguage="python"
          value={artifact.starterCode}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            ariaLabel: "Read-only code context for tracing",
          }}
        />
      </Card>

      {/* ── Trace table ── */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Trace Table</h3>
          <span className="text-xs text-[var(--ink-500)]">{traceRows.length} steps</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onResult?.({
              score,
              responseSummary: `Submitted trace answers for ${traceRows.length} steps.`,
              responseData: { answers, expectedSteps: traceRows.length },
            });
          }}
        >
          {/* Scrollable table area */}
          <div className="max-h-[420px] overflow-y-auto rounded-xl border border-[var(--line)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-xs font-semibold uppercase tracking-[0.07em] text-[var(--ink-500)]">
                <tr>
                  <th className="px-3 py-2 w-12">Step</th>
                  <th className="px-3 py-2">Expression</th>
                  <th className="px-3 py-2 w-36">Your Answer</th>
                </tr>
              </thead>
              <tbody>
                {traceRows.map((row, i) => {
                  const answered = (answers[row.step] ?? "").trim() !== "";
                  const correct = answered && traceValuesEqual(answers[row.step] ?? "", row.expected ?? "");
                  return (
                    <tr
                      key={row.step}
                      className={`border-t border-[var(--line)] ${i % 2 === 0 ? "bg-[var(--surface-0)]" : "bg-[var(--surface-1)]"}`}
                    >
                      <td className="px-3 py-2 text-center font-mono text-xs font-semibold text-[var(--ink-500)]">
                        {row.step}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-[var(--ink-800)]">
                        {row.expression}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          aria-label={`Answer for step ${row.step}: ${row.expression}`}
                          className={`w-full rounded-lg border px-2 py-1.5 text-xs font-mono outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)] ${
                            answered && correct
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                              : answered
                              ? "border-rose-300 bg-rose-50 text-rose-800"
                              : "border-[var(--line)] bg-[var(--surface-0)]"
                          }`}
                          placeholder="value…"
                          value={answers[row.step] ?? ""}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [row.step]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-3">
            <p className="text-sm text-[var(--ink-600)]" aria-live="polite">
              Score:{" "}
              <span className="font-semibold">
                {traceRows.filter((r) => traceValuesEqual(answers[r.step] ?? "", r.expected ?? "")).length}
                /{traceRows.length}
              </span>{" "}
              <span className="text-[var(--ink-400)]">({(score * 100).toFixed(0)}%)</span>
            </p>
            <Button type="submit" disabled={locked}>Submit Trace</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
