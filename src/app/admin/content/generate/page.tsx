"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import {
  useCorpusDatasetsPage,
  useEnqueueGenerateArtifactsBatchJobAsyncMutation,
} from "@/lib/hooks/queries";
import type { ArtifactType, Difficulty } from "@/types/models";

const ALL_CONCEPTS = ["Variables", "Conditionals", "Loops", "Functions"];
const ALL_TYPES: ArtifactType[] = ["parsons", "tracing", "mutation", "flashcard"];
const ALL_DIFFICULTIES: Difficulty[] = ["easy", "moderate", "hard"];

export default function GeneratePage() {
  const [selectedCorpusDatasetId, setSelectedCorpusDatasetId] = useState("");
  const [batchConcepts, setBatchConcepts] = useState<string[]>(["Variables", "Conditionals", "Loops", "Functions"]);
  const [batchTypes, setBatchTypes] = useState<ArtifactType[]>(["mutation"]);
  const [batchDifficulties, setBatchDifficulties] = useState<Difficulty[]>(["easy", "moderate", "hard"]);
  const [batchCountPerCombo, setBatchCountPerCombo] = useState(1);
  const [batchTemp, setBatchTemp] = useState(0.7);
  const [useBatch, setUseBatch] = useState(true);
  const [batchIsQueuing, setBatchIsQueuing] = useState(false);

  const corpusDatasets = useCorpusDatasetsPage({ page: 1, pageSize: 50 });
  const corpusDatasetRows = useMemo(() => corpusDatasets.data?.items ?? [], [corpusDatasets.data?.items]);

  const selectedDatasetId = useMemo(() => {
    if (!corpusDatasetRows.length) return "";
    if (selectedCorpusDatasetId && corpusDatasetRows.some((row) => row.id === selectedCorpusDatasetId)) {
      return selectedCorpusDatasetId;
    }
    return corpusDatasetRows[0]?.id ?? "";
  }, [corpusDatasetRows, selectedCorpusDatasetId]);

  const enqueueBatchMutation = useEnqueueGenerateArtifactsBatchJobAsyncMutation();

  const totalCombos = batchConcepts.length * batchTypes.length * batchDifficulties.length;
  const totalArtifacts = totalCombos * batchCountPerCombo;

  const canQueue =
    Boolean(selectedDatasetId) &&
    batchConcepts.length > 0 &&
    batchTypes.length > 0 &&
    batchDifficulties.length > 0 &&
    !batchIsQueuing &&
    !enqueueBatchMutation.isPending;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Admin Content"
        title="Generate Artifacts"
        subtitle="Queue batch artifact generation jobs across concept, type, and difficulty combinations."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main form */}
        <div className="space-y-6">
          {/* Dataset */}
          <Card className="space-y-3">
            <div>
              <CardTitle>Corpus Dataset</CardTitle>
              <CardMeta>Select which dataset to ground generation on. Dataset must have chunks and ideally a RAG index.</CardMeta>
            </div>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedCorpusDatasetId(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
            >
              {corpusDatasetRows.length === 0 ? (
                <option value="">No corpus uploaded yet</option>
              ) : (
                corpusDatasetRows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} — {row.chunkCount} chunks · RAG: {row.ragStatus}
                  </option>
                ))
              )}
            </select>
            {corpusDatasetRows.length === 0 && (
              <p className="text-xs text-rose-700">
                No datasets found.{" "}
                <Link href="/admin/content/corpus" className="font-semibold underline">
                  Upload a corpus first.
                </Link>
              </p>
            )}
          </Card>

          {/* Selections */}
          <Card className="space-y-4">
            <CardTitle>Generation Parameters</CardTitle>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Concepts */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Concepts</p>
                {ALL_CONCEPTS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={batchConcepts.includes(c)}
                      onChange={(e) =>
                        setBatchConcepts((prev) =>
                          e.target.checked ? [...prev, c] : prev.filter((x) => x !== c),
                        )
                      }
                    />
                    {c}
                  </label>
                ))}
              </div>

              {/* Types */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Artifact Types</p>
                {ALL_TYPES.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm capitalize">
                    <input
                      type="checkbox"
                      checked={batchTypes.includes(t)}
                      onChange={(e) =>
                        setBatchTypes((prev) =>
                          e.target.checked ? [...prev, t] : prev.filter((x) => x !== t),
                        )
                      }
                    />
                    {t}
                  </label>
                ))}

                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Difficulties</p>
                {ALL_DIFFICULTIES.map((d) => (
                  <label key={d} className="flex items-center gap-2 text-sm capitalize">
                    <input
                      type="checkbox"
                      checked={batchDifficulties.includes(d)}
                      onChange={(e) =>
                        setBatchDifficulties((prev) =>
                          e.target.checked ? [...prev, d] : prev.filter((x) => x !== d),
                        )
                      }
                    />
                    {d}
                  </label>
                ))}
              </div>

              {/* Count + temp */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Per Combination</p>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={batchCountPerCombo}
                    onChange={(e) => setBatchCountPerCombo(Math.max(1, Number(e.target.value)))}
                    className="w-24 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1 text-sm"
                  />
                  <p className="text-xs text-[var(--ink-500)]">1 job per combo, all sent in one Gemini batch</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Temperature</p>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={batchTemp}
                    onChange={(e) => setBatchTemp(Number(e.target.value))}
                    className="w-24 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Gemini Batch API</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={useBatch}
                      onChange={(e) => setUseBatch(e.target.checked)}
                    />
                    Use batch API (50% cheaper)
                  </label>
                  <p className="text-xs text-[var(--ink-400)]">Uncheck to call Gemini sequentially.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Queue summary sidebar */}
        <div className="space-y-4">
          <Card className="space-y-3">
            <CardTitle>Queue Summary</CardTitle>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-[var(--ink-500)]">Dataset</span>
                <span className="text-right font-medium text-[var(--ink-800)]">
                  {selectedDatasetId
                    ? (corpusDatasetRows.find((r) => r.id === selectedDatasetId)?.name ?? selectedDatasetId)
                    : <span className="text-rose-600">none</span>}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--ink-500)]">Concepts</span>
                <span className="font-medium">{batchConcepts.length === 0 ? <span className="text-rose-600">none</span> : batchConcepts.length}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--ink-500)]">Types</span>
                <span className="font-medium">{batchTypes.length === 0 ? <span className="text-rose-600">none</span> : batchTypes.length}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--ink-500)]">Difficulties</span>
                <span className="font-medium">{batchDifficulties.length === 0 ? <span className="text-rose-600">none</span> : batchDifficulties.length}</span>
              </div>
              <div className="border-t border-[var(--line)] pt-2">
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--ink-500)]">Jobs to queue</span>
                  <span className="font-bold text-[var(--ink-900)]">1</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--ink-500)]">Combinations</span>
                  <span className="font-bold text-[var(--ink-900)]">{totalCombos}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--ink-500)]">Artifacts total</span>
                  <span className="font-bold text-[var(--ink-900)]">{totalArtifacts}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-[var(--line)] pt-3">
              <Button
                type="button"
                disabled={!canQueue}
                className="w-full"
                onClick={() => {
                  setBatchIsQueuing(true);
                  enqueueBatchMutation.mutate(
                    {
                      corpusDatasetId: selectedDatasetId,
                      concepts: batchConcepts,
                      artifactTypes: batchTypes,
                      difficulties: batchDifficulties,
                      countPerCombo: batchCountPerCombo,
                      temperature: batchTemp,
                      maxContextChars: 4000,
                      maxAttempts: 3,
                      useBatch,
                    },
                    {
                      onSuccess: () => {
                        toast.success("1 batch job queued", {
                          description: `${totalArtifacts} artifacts across ${totalCombos} combos. Go to Jobs → Process Pending.`,
                        });
                      },
                      onError: () => {
                        toast.error("Failed to queue batch job");
                      },
                      onSettled: () => setBatchIsQueuing(false),
                    },
                  );
                }}
              >
                {batchIsQueuing ? "Queuing…" : "Queue Batch Job"}
              </Button>
              <Link href="/admin/jobs" className="block">
                <Button type="button" variant="secondary" className="w-full">
                  Open Jobs
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
