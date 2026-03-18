"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ChevronDown, ChevronRight, Copy, LayoutGrid, List, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { SectionHeader } from "@/components/ui/section-header";
import {
  useArtifactCoverage,
  useArtifactDuplicates,
  useArtifactsPage,
  useBatchDeleteArtifactsMutation,
  useDeleteArtifactMutation,
} from "@/lib/hooks/queries";
import type { ArtifactCoverageCell, ArtifactDuplicateGroup, ArtifactListQuery, ArtifactType, Difficulty } from "@/types/models";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const TYPE_OPTIONS: Array<ArtifactType | "all"> = ["all", "parsons", "tracing", "mutation", "flashcard"];
const DIFFICULTY_OPTIONS: Array<Difficulty | "all"> = ["all", "easy", "moderate", "hard"];
const SORT_OPTIONS = [
  { value: "title:asc", label: "Title A-Z" },
  { value: "title:desc", label: "Title Z-A" },
  { value: "type:asc", label: "Type A-Z" },
  { value: "difficulty:asc", label: "Difficulty A-Z" },
  { value: "concept:asc", label: "Concept A-Z" },
];

// Coverage matrix constants
const COVERAGE_CONCEPTS = ["Variables", "Conditionals", "Loops", "Functions"] as const;
const COVERAGE_TYPES: ArtifactType[] = ["parsons", "tracing", "mutation", "flashcard"];
const COVERAGE_DIFFICULTIES: Difficulty[] = ["easy", "moderate", "hard"];

function parseSort(value: string): Pick<ArtifactListQuery, "sortBy" | "sortDir"> {
  const [sortBy, sortDir] = value.split(":") as [ArtifactListQuery["sortBy"], ArtifactListQuery["sortDir"]];
  return { sortBy, sortDir };
}

function getCoverageCount(
  cells: ArtifactCoverageCell[],
  concept: string,
  type: ArtifactType,
  difficulty: Difficulty,
): number {
  return cells.find((c) => c.concept === concept && c.type === type && c.difficulty === difficulty)?.count ?? 0;
}

function difficultyBadgeTone(count: number): string {
  if (count === 0) return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  if (count <= 2) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
}

export default function AdminContentPage() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ArtifactType | "all">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "all">("all");
  const [conceptFilter, setConceptFilter] = useState<string | null>(null);
  const [missingContentFilter, setMissingContentFilter] = useState(false);
  const [sort, setSort] = useState("title:asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Multi-select state (table view only)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Expandable row preview state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAnswerIds, setShowAnswerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      setSearch(searchDraft.trim());
    }, 250);

    return () => clearTimeout(id);
  }, [searchDraft]);

  const sortParts = parseSort(sort);

  const query = useMemo<ArtifactListQuery>(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      type: typeFilter,
      difficulty: difficultyFilter,
      concept: conceptFilter ?? undefined,
      missingContent: missingContentFilter || undefined,
      sortBy: sortParts.sortBy,
      sortDir: sortParts.sortDir,
    }),
    [conceptFilter, difficultyFilter, missingContentFilter, page, pageSize, search, sortParts.sortBy, sortParts.sortDir, typeFilter],
  );

  const artifacts = useArtifactsPage(query);
  const coverageQuery = useArtifactCoverage();
  const duplicatesQuery = useArtifactDuplicates();
  const deleteArtifactMutation = useDeleteArtifactMutation();
  const batchDeleteMutation = useBatchDeleteArtifactsMutation();

  // Reset to page 1 if current page exceeds totalPages after a delete or filter change
  useEffect(() => {
    if (artifacts.data && page > artifacts.data.totalPages && artifacts.data.totalPages > 0) {
      setPage(artifacts.data.totalPages);
    }
  }, [artifacts.data, page]);

  if (artifacts.isLoading) return <PageLoadingState title="Loading artifact bank..." />;
  if (artifacts.isError) return <PageErrorState title="Artifact bank failed to load" backHref="/admin" />;
  if (!artifacts.data) return <PageEmptyState title="No artifact bank data" />;

  const data = artifacts.data;
  const items = data.items;

  const coverageCells = coverageQuery.data ?? [];

  // Multi-select helpers
  const visibleIds = items.map((a) => a.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Admin Content"
        title="Artifact Library"
        subtitle="Browse, filter, and manage your artifact bank."
      />

      {/* Coverage Matrix */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Coverage Matrix</CardTitle>
            <CardMeta>Click a cell to filter. Badges show easy / moderate / hard counts.</CardMeta>
          </div>
          {conceptFilter && (
            <button
              type="button"
              onClick={() => {
                setConceptFilter(null);
                setPage(1);
              }}
              className="rounded-lg border border-[var(--line)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--ink-700)] transition hover:bg-[var(--surface-2)]"
            >
              Clear filter: {conceptFilter}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-[var(--ink-500)]">Concept</th>
                {COVERAGE_TYPES.map((t) => (
                  <th key={t} className="px-3 py-2 text-center font-semibold text-[var(--ink-500)] capitalize">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COVERAGE_CONCEPTS.map((concept) => (
                <tr key={concept} className="border-t border-[var(--line)]">
                  <td className="px-3 py-2 font-semibold text-[var(--ink-700)]">{concept}</td>
                  {COVERAGE_TYPES.map((type) => {
                    const counts = COVERAGE_DIFFICULTIES.map((d) => ({
                      d,
                      n: getCoverageCount(coverageCells, concept, type, d),
                    }));
                    const isActive = conceptFilter === concept && typeFilter === type;
                    return (
                      <td key={type} className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setConceptFilter(concept);
                            setTypeFilter(type);
                            setPage(1);
                          }}
                          className={`inline-flex gap-1 rounded-lg px-2 py-1 transition hover:ring-2 hover:ring-[var(--brand-400)] ${isActive ? "ring-2 ring-[var(--brand-500)]" : ""}`}
                        >
                          {counts.map(({ d, n }) => (
                            <span
                              key={d}
                              className={`rounded px-1 py-0.5 font-mono text-[10px] font-semibold ${difficultyBadgeTone(n)}`}
                              title={`${d}: ${n}`}
                            >
                              {n}
                            </span>
                          ))}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {coverageQuery.isLoading && (
          <p className="text-xs text-[var(--ink-500)]">Loading coverage data…</p>
        )}
      </Card>

      {/* Duplicate Detection Panel */}
      {(duplicatesQuery.data ?? []).length > 0 && (
        <Card className="space-y-3 border-amber-500/40" style={{ background: "color-mix(in srgb, var(--surface-1) 85%, #f59e0b10)" }}>
          <div className="flex items-center gap-3">
            <Copy className="size-4 text-amber-500 shrink-0" />
            <div>
              <CardTitle>Duplicate Artifacts Detected</CardTitle>
              <CardMeta>{duplicatesQuery.data!.length} group(s) with identical titles in the same concept / type / difficulty slot.</CardMeta>
            </div>
          </div>
          <div className="space-y-2">
            {(duplicatesQuery.data as ArtifactDuplicateGroup[]).map((group, gi) => (
              <div key={gi} className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge label={group.concept} tone="admin" />
                  <Badge label={group.type} tone="static" />
                  <Badge label={group.difficulty} tone={group.difficulty as Difficulty} />
                  <span className="font-semibold text-[var(--ink-800)] truncate max-w-xs">{group.title}</span>
                  <span className="text-[var(--ink-400)]">({group.artifacts.length} copies)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.artifacts.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1 text-xs">
                      <span className="font-mono text-[var(--ink-500)]">{entry.id}</span>
                      <button
                        type="button"
                        title="Delete this artifact"
                        disabled={deleteArtifactMutation.isPending && deleteArtifactMutation.variables === entry.id}
                        onClick={() => {
                          if (!window.confirm(`Delete duplicate artifact "${entry.title}" (${entry.id})?\nThis cannot be undone.`)) return;
                          deleteArtifactMutation.mutate(entry.id, {
                            onSuccess: () => toast.success("Duplicate deleted", { description: entry.id }),
                            onError: (err) => toast.error("Delete failed", { description: String(err) }),
                          });
                        }}
                        className="text-rose-600 hover:text-rose-800 disabled:opacity-40 transition"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Search</span>
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search id, title, concept, prompt"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Type</span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setPage(1);
                setTypeFilter(e.target.value as ArtifactType | "all");
              }}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
            >
              {TYPE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Difficulty</span>
            <select
              value={difficultyFilter}
              onChange={(e) => {
                setPage(1);
                setDifficultyFilter(e.target.value as Difficulty | "all");
              }}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
            >
              {DIFFICULTY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Review</span>
            <label className="flex h-[38px] cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={missingContentFilter}
                onChange={(e) => { setPage(1); setMissingContentFilter(e.target.checked); }}
                className="cursor-pointer accent-amber-500"
              />
              <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
              <span className="text-[var(--ink-700)]">Missing content</span>
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Sort</span>
            <select
              value={sort}
              onChange={(e) => {
                setPage(1);
                setSort(e.target.value);
              }}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Page Size</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge label={`${data.total} total`} tone="adaptive" />
            <Badge label={`page ${data.page}/${data.totalPages}`} tone="static" />
            <Badge label={`${items.length} visible`} tone="admin" />
            {conceptFilter && (
              <Badge label={`concept: ${conceptFilter}`} tone="moderate" />
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant={viewMode === "table" ? "default" : "secondary"} onClick={() => setViewMode("table")}>
              <List className="size-4" /> Table
            </Button>
            <Button type="button" variant={viewMode === "grid" ? "default" : "secondary"} onClick={() => setViewMode("grid")}>
              <LayoutGrid className="size-4" /> Grid
            </Button>
          </div>
        </div>
      </Card>

      {items.length === 0 ? (
        <PageEmptyState title="No artifacts matched" message="Adjust filters or search terms." />
      ) : viewMode === "table" ? (
        <Card className="overflow-hidden p-0">
          {/* Batch action bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-sm">
              <span className="font-semibold text-[var(--ink-700)]">{selectedIds.size} selected</span>
              <span className="text-[var(--ink-400)]">·</span>
              <button
                type="button"
                disabled={batchDeleteMutation.isPending}
                onClick={() => {
                  const ids = Array.from(selectedIds);
                  if (!window.confirm(`Delete ${ids.length} artifact(s)? This cannot be undone.`)) return;
                  batchDeleteMutation.mutate(ids, {
                    onSuccess: (res) => {
                      toast.success(`${res.data.deleted} artifact(s) deleted`);
                      setSelectedIds(new Set());
                    },
                    onError: (err) => toast.error("Batch delete failed", { description: String(err) }),
                  });
                }}
                className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
              >
                {batchDeleteMutation.isPending ? "Deleting…" : "Delete Selected"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-lg border border-[var(--line)] bg-[var(--surface-0)] px-3 py-1 text-xs font-semibold text-[var(--ink-600)] transition hover:bg-[var(--surface-1)]"
              >
                Clear
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-600)]">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                      title="Select all visible"
                    />
                  </th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Concept</th>
                  <th className="px-4 py-3">Prompt</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((artifact) => {
                  const isExpanded = expandedId === artifact.id;
                  const isSelected = selectedIds.has(artifact.id);

                  const showAnswer = showAnswerIds.has(artifact.id);
                  const toggleAnswer = () =>
                    setShowAnswerIds((prev) => {
                      const next = new Set(prev);
                      next.has(artifact.id) ? next.delete(artifact.id) : next.add(artifact.id);
                      return next;
                    });

                  return (
                    <Fragment key={artifact.id}>
                      <tr
                        className={`border-t border-[var(--line)] ${isSelected ? "bg-[var(--brand-500)]/10" : "bg-[var(--surface-1)]"}`}
                      >
                        <td className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(artifact.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--ink-600)]">{artifact.id}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--ink-800)]">
                          <span className="flex items-center gap-1.5">
                            {artifact.title}
                            {((!artifact.hints || artifact.hints.length === 0) || !artifact.conceptExplanation || !artifact.solutionExplanation) && (
                              <span
                                title={[
                                  (!artifact.hints || artifact.hints.length === 0) && "No hints",
                                  !artifact.conceptExplanation && "No concept explanation",
                                  !artifact.solutionExplanation && "No solution explanation",
                                ].filter(Boolean).join(" · ")}
                                className="flex items-center"
                              >
                                <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3"><Badge label={artifact.type} tone="static" /></td>
                        <td className="px-4 py-3"><Badge label={artifact.difficulty} tone={artifact.difficulty} /></td>
                        <td className="px-4 py-3">{artifact.concept}</td>
                        <td className="px-4 py-3 max-w-[380px] truncate text-[var(--ink-600)]" title={artifact.prompt}>{artifact.prompt}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : artifact.id)}
                              className="text-[var(--ink-500)] transition hover:text-[var(--ink-800)]"
                              title={isExpanded ? "Collapse preview" : "Expand preview"}
                            >
                              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </button>
                            <Link href={`/admin/content/artifacts/${artifact.id}`} className="font-semibold text-[var(--brand-700)]">
                              Open
                            </Link>
                            <button
                              type="button"
                              disabled={deleteArtifactMutation.isPending && deleteArtifactMutation.variables === artifact.id}
                              onClick={() => {
                                if (!window.confirm(`Delete "${artifact.title}"?\nThis cannot be undone.`)) return;
                                deleteArtifactMutation.mutate(artifact.id, {
                                  onSuccess: () => {
                                    toast.success("Artifact deleted", { description: artifact.title });
                                    setSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      next.delete(artifact.id);
                                      return next;
                                    });
                                  },
                                  onError: (err) => toast.error("Delete failed", { description: String(err) }),
                                });
                              }}
                              className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50"
                            >
                              {deleteArtifactMutation.isPending && deleteArtifactMutation.variables === artifact.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${artifact.id}-preview`} className="border-t border-[var(--line)] bg-[var(--surface-0)]">
                          <td colSpan={8} className="px-6 py-5">
                            <div className="space-y-4 text-xs text-[var(--ink-700)]">
                              {/* Prompt + hints */}
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <p className="mb-1 font-semibold uppercase tracking-wide text-[var(--ink-500)]">Prompt</p>
                                  <p className="whitespace-pre-wrap">{artifact.prompt}</p>
                                </div>
                                {artifact.hints && artifact.hints.length > 0 && (
                                  <div>
                                    <p className="mb-1 font-semibold uppercase tracking-wide text-[var(--ink-500)]">Hints</p>
                                    <ol className="list-decimal pl-4 space-y-0.5">
                                      {artifact.hints.map((h, i) => <li key={i}>{h}</li>)}
                                    </ol>
                                  </div>
                                )}
                              </div>

                              {/* Type-specific content */}
                              {artifact.type === "parsons" && artifact.lines && artifact.lines.length > 0 && (
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <p className="mb-1 font-semibold uppercase tracking-wide text-[var(--ink-500)]">Shuffled Lines</p>
                                    <div className="space-y-1 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] p-3 font-mono text-[11px]">
                                      {artifact.lines.map((line, i) => (
                                        <div key={i} className="flex gap-2">
                                          <span className="w-5 shrink-0 text-[var(--ink-400)]">{i}</span>
                                          <span>{line}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {showAnswer && artifact.solutionOrder && (
                                    <div>
                                      <p className="mb-1 font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Correct Order</p>
                                      <div className="space-y-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 font-mono text-[11px]">
                                        {artifact.solutionOrder.map((lineIdx, pos) => (
                                          <div key={pos} className="flex gap-2">
                                            <span className="w-5 shrink-0 font-semibold text-emerald-600 dark:text-emerald-400">{pos + 1}.</span>
                                            <span className="text-[var(--ink-800)]">{artifact.lines?.[lineIdx]}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {(artifact.type === "mutation" || artifact.type === "tracing") && artifact.starterCode && (
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <p className="mb-1 font-semibold uppercase tracking-wide text-[var(--ink-500)]">Starter Code</p>
                                    <pre className="overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface-1)] p-3 font-mono text-[11px]">
                                      {artifact.starterCode}
                                    </pre>
                                  </div>
                                  {showAnswer && (
                                    <div>
                                      <p className="mb-1 font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Answer</p>
                                      {artifact.type === "mutation" ? (
                                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-1">
                                          <p className="text-emerald-700 dark:text-emerald-300">Bug on line <span className="font-bold">{artifact.bugLineNo}</span></p>
                                          {artifact.bugLineFixExample && (
                                            <pre className="font-mono text-[11px] text-[var(--ink-800)] whitespace-pre-wrap">{artifact.bugLineFixExample}</pre>
                                          )}
                                        </div>
                                      ) : (
                                        // tracing
                                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 overflow-hidden">
                                          <table className="w-full text-[11px]">
                                            <thead className="bg-emerald-500/20">
                                              <tr>
                                                <th className="px-2 py-1.5 text-left font-semibold text-emerald-700 dark:text-emerald-400 w-10">Step</th>
                                                <th className="px-2 py-1.5 text-left font-semibold text-emerald-700 dark:text-emerald-400">Expression</th>
                                                <th className="px-2 py-1.5 text-left font-semibold text-emerald-700 dark:text-emerald-400">Expected</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {(artifact.traceTable ?? []).map((row) => (
                                                <tr key={row.step} className="border-t border-emerald-500/20">
                                                  <td className="px-2 py-1 font-mono text-emerald-700 dark:text-emerald-400">{row.step}</td>
                                                  <td className="px-2 py-1 font-mono text-[var(--ink-800)]">{row.expression}</td>
                                                  <td className="px-2 py-1 font-mono font-bold text-emerald-700 dark:text-emerald-400">{row.expected}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {artifact.type === "flashcard" && artifact.options && artifact.options.length > 0 && (
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <p className="mb-1 font-semibold uppercase tracking-wide text-[var(--ink-500)]">Answer Options</p>
                                    <div className="space-y-1 rounded-lg border border-[var(--line)] bg-[var(--surface-1)] p-3 text-[11px]">
                                      {artifact.options.map((opt) => (
                                        <div key={opt.id} className="flex gap-2">
                                          <span className="w-4 shrink-0 font-bold uppercase text-[var(--ink-500)]">{opt.id}.</span>
                                          <span>{opt.label}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {showAnswer && artifact.answerOptionId && (
                                    <div>
                                      <p className="mb-1 font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Correct Answer</p>
                                      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-[11px]">
                                        <span className="font-bold uppercase text-emerald-700 dark:text-emerald-400">{artifact.answerOptionId}.</span>{" "}
                                        <span className="text-[var(--ink-800)]">
                                          {artifact.options.find((o) => o.id === artifact.answerOptionId)?.label ?? artifact.answerOptionId}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Show/hide answers toggle */}
                              <div className="flex justify-end border-t border-[var(--line)] pt-3">
                                <button
                                  type="button"
                                  onClick={toggleAnswer}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    showAnswer
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                                      : "bg-[var(--surface-2)] text-[var(--ink-600)] hover:bg-[var(--surface-1)]"
                                  }`}
                                >
                                  {showAnswer ? "Hide Answers" : "Show Answers"}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((artifact) => (
            <Card key={artifact.id} className="h-full space-y-2">
              <Link href={`/admin/content/artifacts/${artifact.id}`} className="block transition hover:opacity-80">
                <CardTitle className="flex items-start justify-between gap-2">
                  <span>{artifact.title}</span>
                  <ArrowRight className="size-4 shrink-0 text-[var(--ink-500)]" />
                </CardTitle>
                <CardMeta className="line-clamp-2">{artifact.prompt}</CardMeta>
                <div className="flex flex-wrap gap-2">
                  <Badge label={artifact.type} tone="static" />
                  <Badge label={artifact.difficulty} tone={artifact.difficulty} />
                  <Badge label={artifact.concept} tone="admin" />
                </div>
              </Link>
              <div className="flex justify-end border-t border-[var(--line)] pt-2">
                <button
                  type="button"
                  disabled={deleteArtifactMutation.isPending && deleteArtifactMutation.variables === artifact.id}
                  onClick={() => {
                    if (!window.confirm(`Delete "${artifact.title}"?\nThis cannot be undone.`)) return;
                    deleteArtifactMutation.mutate(artifact.id, {
                      onSuccess: () => toast.success("Artifact deleted", { description: artifact.title }),
                      onError: (err) => toast.error("Delete failed", { description: String(err) }),
                    });
                  }}
                  className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50"
                >
                  {deleteArtifactMutation.isPending && deleteArtifactMutation.variables === artifact.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--ink-600)]">
          Showing {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)} of {data.total}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={data.page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Previous
          </Button>
          <Button type="button" variant="secondary" disabled={data.page >= data.totalPages} onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
