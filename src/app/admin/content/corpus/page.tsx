"use client";

import { useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import {
  useCorpusDatasetChunksPage,
  useCorpusDatasetsPage,
  useDeleteCorpusDatasetMutation,
  useEnqueueCorpusChunkJobAsyncMutation,
  useEnqueueEmbedCorpusJobAsyncMutation,
  useUploadCorpusMutation,
} from "@/lib/hooks/queries";

const CHUNKING_OPTIONS: Array<"castplus" | "cast" | "fixed"> = ["castplus", "cast", "fixed"];

export default function CorpusPage() {
  const [corpusName, setCorpusName] = useState("");
  const [corpusDescription, setCorpusDescription] = useState("");
  const [corpusChunkingMethod, setCorpusChunkingMethod] = useState<"castplus" | "cast" | "fixed">("castplus");
  const [corpusFiles, setCorpusFiles] = useState<File[]>([]);
  const [corpusPage, setCorpusPage] = useState(1);
  const [corpusPageSize, setCorpusPageSize] = useState(10);
  const [selectedCorpusDatasetId, setSelectedCorpusDatasetId] = useState("");

  const corpusDatasets = useCorpusDatasetsPage({ page: corpusPage, pageSize: corpusPageSize });
  const corpusDatasetRows = useMemo(() => corpusDatasets.data?.items ?? [], [corpusDatasets.data?.items]);

  const selectedDatasetId = useMemo(() => {
    if (!corpusDatasetRows.length) return "";
    if (selectedCorpusDatasetId && corpusDatasetRows.some((row) => row.id === selectedCorpusDatasetId)) {
      return selectedCorpusDatasetId;
    }
    return corpusDatasetRows[0]?.id ?? "";
  }, [corpusDatasetRows, selectedCorpusDatasetId]);

  const corpusChunks = useCorpusDatasetChunksPage(
    { datasetId: selectedDatasetId, page: 1, pageSize: 5 },
    Boolean(selectedDatasetId),
  );

  const uploadCorpusMutation = useUploadCorpusMutation();
  const deleteDatasetMutation = useDeleteCorpusDatasetMutation();
  const enqueueChunkJobMutation = useEnqueueCorpusChunkJobAsyncMutation();
  const enqueueEmbedJobMutation = useEnqueueEmbedCorpusJobAsyncMutation();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Admin Content"
        title="Corpus Management"
        subtitle="Upload source files, chunk with cAST+, and build the RAG index for artifact generation."
      />

      {/* Upload form */}
      <Card className="space-y-4">
        <div>
          <CardTitle>Upload Corpus</CardTitle>
          <CardMeta>Upload source files or a ZIP. Documents are chunked automatically using the selected method.</CardMeta>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Corpus Name</span>
            <input
              value={corpusName}
              onChange={(e) => setCorpusName(e.target.value)}
              placeholder="e.g. Intro Python Week 1 Corpus"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Description</span>
            <textarea
              value={corpusDescription}
              onChange={(e) => setCorpusDescription(e.target.value)}
              rows={2}
              placeholder="What this corpus contains and where it came from."
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Chunking Method</span>
            <select
              value={corpusChunkingMethod}
              onChange={(e) => setCorpusChunkingMethod(e.target.value as "castplus" | "cast" | "fixed")}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
            >
              {CHUNKING_OPTIONS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Files / ZIP</span>
            <input
              type="file"
              multiple
              onChange={(e) => setCorpusFiles(Array.from(e.target.files ?? []))}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
            />
          </label>
        </div>
        <Button
          type="button"
          disabled={uploadCorpusMutation.isPending || corpusFiles.length === 0 || !corpusName.trim()}
          onClick={() => {
            uploadCorpusMutation.mutate(
              {
                name: corpusName.trim(),
                description: corpusDescription.trim() || undefined,
                chunkingMethod: corpusChunkingMethod,
                autoChunk: true,
                maxChunkSize: 2000,
                files: corpusFiles,
              },
              {
                onSuccess: (res) => {
                  toast.success("Corpus uploaded", {
                    description: `${res.data.documentsCreated} documents accepted.`,
                  });
                  setCorpusFiles([]);
                  setCorpusName("");
                  setCorpusDescription("");
                },
                onError: (err) => toast.error("Corpus upload failed", { description: String(err) }),
              },
            );
          }}
        >
          {uploadCorpusMutation.isPending ? "Uploading..." : "Upload Corpus"}
        </Button>
      </Card>

      {/* Dataset list */}
      <Card className="space-y-4">
        <div>
          <CardTitle>Corpus Datasets</CardTitle>
          <CardMeta>Select a dataset to preview chunks or run re-chunk / RAG index jobs.</CardMeta>
        </div>

        <div className="space-y-2">
          {corpusDatasetRows.map((row) => (
            <div
              key={row.id}
              className={`rounded-xl border px-4 py-3 transition ${
                row.id === selectedDatasetId ? "corpus-card-selected" : "corpus-card-default"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCorpusDatasetId(row.id)}
                  className="flex-1 text-left"
                >
                  <p className="font-semibold text-[var(--ink-800)]">{row.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-500)]">
                    {row.chunkingMethod} · {row.sourceCount} docs · {row.chunkCount} chunks
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge
                      label={row.status}
                      tone={row.status === "chunked" ? "adaptive" : row.status === "failed" ? "hard" : "static"}
                    />
                    <Badge
                      label={
                        row.ragStatus === "indexed" ? "RAG Ready"
                        : row.ragStatus === "indexing" ? "Indexing…"
                        : row.ragStatus === "failed" ? "Index Failed"
                        : "Not Indexed"
                      }
                      tone={
                        row.ragStatus === "indexed" ? "adaptive"
                        : row.ragStatus === "indexing" ? "moderate"
                        : row.ragStatus === "failed" ? "hard"
                        : "static"
                      }
                    />
                  </div>
                </button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={enqueueChunkJobMutation.isPending}
                    onClick={() => {
                      enqueueChunkJobMutation.mutate(
                        { datasetId: row.id, chunkingMethod: corpusChunkingMethod, maxChunkSize: 2000, maxAttempts: 3 },
                        {
                          onSuccess: (res) => toast.success("Chunk job queued", { description: res.data.id }),
                          onError: (err) => toast.error("Failed to queue chunk job", { description: String(err) }),
                        },
                      );
                    }}
                  >
                    Re-Chunk
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={enqueueEmbedJobMutation.isPending}
                    onClick={() => {
                      enqueueEmbedJobMutation.mutate(
                        { datasetId: row.id, maxAttempts: 3 },
                        {
                          onSuccess: (res) => toast.success("RAG index job queued", { description: res.data.id }),
                          onError: (err) => toast.error("Failed to queue RAG index job", { description: String(err) }),
                        },
                      );
                    }}
                  >
                    Build RAG Index
                  </Button>
                  <button
                    type="button"
                    disabled={deleteDatasetMutation.isPending && deleteDatasetMutation.variables === row.id}
                    onClick={() => {
                      if (!window.confirm(`Delete "${row.name}"?\n\nThis will permanently remove all documents and chunks. This cannot be undone.`)) return;
                      deleteDatasetMutation.mutate(row.id, {
                        onSuccess: () => {
                          toast.success("Dataset deleted", { description: row.name });
                          if (selectedCorpusDatasetId === row.id) setSelectedCorpusDatasetId("");
                        },
                        onError: (err) => toast.error("Delete failed", { description: String(err) }),
                      });
                    }}
                    className="btn-danger rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                  >
                    {deleteDatasetMutation.isPending && deleteDatasetMutation.variables === row.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {corpusDatasetRows.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--ink-500)]">No datasets yet. Upload a corpus above.</p>
          )}
        </div>

        {/* Dataset pagination */}
        <div className="flex items-center justify-between text-xs text-[var(--ink-600)]">
          <span>{corpusDatasets.data ? `${corpusDatasets.data.total} dataset(s)` : "—"}</span>
          <div className="flex items-center gap-2">
            <select
              value={corpusPageSize}
              onChange={(e) => { setCorpusPage(1); setCorpusPageSize(Number(e.target.value)); }}
              className="rounded-lg border border-[var(--line)] bg-[var(--surface-0)] px-2 py-1 text-xs"
            >
              {[10, 20, 50].map((size) => <option key={size} value={size}>{size}/page</option>)}
            </select>
            <Button type="button" variant="secondary" disabled={corpusPage <= 1} onClick={() => setCorpusPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={corpusPage >= (corpusDatasets.data?.totalPages ?? 1)}
              onClick={() => setCorpusPage((p) => Math.min(corpusDatasets.data?.totalPages ?? 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Chunk preview */}
      {selectedDatasetId && (
        <Card className="space-y-3">
          <div>
            <CardTitle>Chunk Preview</CardTitle>
            <CardMeta>Top 5 chunks for the selected dataset.</CardMeta>
          </div>
          <div className="space-y-2">
            {(corpusChunks.data?.items ?? []).map((chunk) => (
              <div key={chunk.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface-1)] p-3 text-xs text-[var(--ink-700)]">
                <div className="font-mono text-[10px] text-[var(--ink-500)]">
                  {chunk.documentPath} #{chunk.chunkIndex}
                </div>
                <div className="mt-1 line-clamp-4 whitespace-pre-wrap">{chunk.text}</div>
              </div>
            ))}
            {(corpusChunks.data?.items ?? []).length === 0 && (
              <p className="text-xs text-[var(--ink-500)]">No chunks yet — run Re-Chunk first.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
