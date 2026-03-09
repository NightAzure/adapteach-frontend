"use client";

import { useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { SectionHeader } from "@/components/ui/section-header";
import { useAsyncJobsPage, useCancelAllAsyncJobsMutation, useCancelAsyncJobMutation, useProcessPendingAsyncJobsMutation } from "@/lib/hooks/queries";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function formatTimestamp(iso: string | undefined) {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function statusTone(status: "queued" | "running" | "succeeded" | "failed") {
  if (status === "succeeded") return "adaptive" as const;
  if (status === "failed") return "hard" as const;
  if (status === "running") return "moderate" as const;
  return "static" as const;
}

export default function AdminJobsPage() {
  const [jobType, setJobType] = useState<"corpus_chunk" | "artifact_generate" | "embed_corpus" | "all">("all");
  const [status, setStatus] = useState<"queued" | "running" | "succeeded" | "failed" | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const query = useMemo(
    () => ({
      page,
      pageSize,
      jobType,
      status,
    }),
    [jobType, page, pageSize, status],
  );

  const jobs = useAsyncJobsPage(query, true);
  const processPending = useProcessPendingAsyncJobsMutation();
  const cancelJob = useCancelAsyncJobMutation();
  const cancelAll = useCancelAllAsyncJobsMutation();

  if (jobs.isLoading) return <PageLoadingState title="Loading async jobs..." />;
  if (jobs.isError) return <PageErrorState title="Failed to load async jobs" backHref="/admin" />;
  if (!jobs.data) return <PageEmptyState title="No job data" />;

  const data = jobs.data;
  const items = data.items;
  const queued = items.filter((item) => item.status === "queued").length;
  const running = items.filter((item) => item.status === "running").length;
  const failed = items.filter((item) => item.status === "failed").length;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Admin Queue"
        title="Async Jobs"
        subtitle="Queue and monitor long-running corpus chunking and artifact generation tasks."
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={cancelAll.isPending || (queued + running === 0)}
              onClick={() => {
                if (!window.confirm(`Cancel all ${queued + running} active job(s)?`)) return;
                cancelAll.mutate(undefined, {
                  onSuccess: (res) => {
                    toast.success(`Cancelled ${res.data.cancelled} job(s)`);
                  },
                  onError: (err) => {
                    toast.error("Cancel all failed", { description: String(err) });
                  },
                });
              }}
              className="text-rose-700 hover:bg-rose-50"
            >
              {cancelAll.isPending ? "Cancelling…" : "Cancel All"}
            </Button>
            <Button
              type="button"
              disabled={processPending.isPending}
              onClick={() => {
                processPending.mutate(20, {
                  onSuccess: (res) => {
                    toast.success("Processed pending jobs", {
                      description: `processed=${res.data.processed}, succeeded=${res.data.succeeded}, retried=${res.data.retried}, failed=${res.data.failed}`,
                    });
                  },
                  onError: (err) => {
                    toast.error("Job processing failed", { description: String(err) });
                  },
                });
              }}
            >
              {processPending.isPending ? "Processing..." : "Process Pending"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardMeta>Visible Jobs</CardMeta>
          <CardTitle>{items.length}</CardTitle>
        </Card>
        <Card>
          <CardMeta>Queued</CardMeta>
          <CardTitle>{queued}</CardTitle>
        </Card>
        <Card>
          <CardMeta>Running</CardMeta>
          <CardTitle>{running}</CardTitle>
        </Card>
        <Card>
          <CardMeta>Failed</CardMeta>
          <CardTitle>{failed}</CardTitle>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Job Type</span>
            <select
              value={jobType}
              onChange={(e) => {
                setPage(1);
                setJobType(e.target.value as "corpus_chunk" | "artifact_generate" | "embed_corpus" | "all");
              }}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
            >
              <option value="all">all</option>
              <option value="corpus_chunk">corpus_chunk</option>
              <option value="embed_corpus">embed_corpus</option>
              <option value="artifact_generate">artifact_generate</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Status</span>
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value as "queued" | "running" | "succeeded" | "failed" | "all");
              }}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
            >
              <option value="all">all</option>
              <option value="queued">queued</option>
              <option value="running">running</option>
              <option value="succeeded">succeeded</option>
              <option value="failed">failed</option>
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
      </Card>

      {items.length === 0 ? (
        <PageEmptyState title="No jobs found" message="No async jobs match current filters." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-600)]">
                <tr>
                  <th className="px-4 py-3">Job ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Run At</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Finished</th>
                  <th className="px-4 py-3">Result / Error</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((job) => (
                  <tr key={job.id} className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-1)_92%,white)]">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--ink-700)]">{job.id}</td>
                    <td className="px-4 py-3"><Badge label={job.jobType} tone="static" /></td>
                    <td className="px-4 py-3"><Badge label={job.status} tone={statusTone(job.status)} /></td>
                    <td className="px-4 py-3">{job.attemptCount}/{job.maxAttempts}</td>
                    <td className="px-4 py-3 text-xs text-[var(--ink-600)]">{formatTimestamp(job.runAt)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--ink-600)]">{formatTimestamp(job.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--ink-600)]">{formatTimestamp(job.startedAt)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--ink-600)]">{formatTimestamp(job.finishedAt)}</td>
                    <td className="px-4 py-3 max-w-[520px]">
                      {job.error ? (
                        <details className="text-xs text-rose-700">
                          <summary className="cursor-pointer font-semibold text-rose-700 hover:underline">
                            {job.error.slice(0, 80)}{job.error.length > 80 ? "…" : ""}
                          </summary>
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-800">
                            {job.error}
                          </pre>
                        </details>
                      ) : job.result ? (
                        <details className="text-xs text-[var(--ink-700)]">
                          <summary className="cursor-pointer font-semibold text-[var(--brand-700)]">View Result</summary>
                          <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--surface-0)] p-2">
                            {JSON.stringify(job.result, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-xs text-[var(--ink-500)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(job.status === "queued" || job.status === "running") && (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={cancelJob.isPending && cancelJob.variables === job.id}
                          onClick={() => {
                            if (!window.confirm(`Cancel job ${job.id}?`)) return;
                            cancelJob.mutate(job.id, {
                              onSuccess: () => toast.success("Job cancelled"),
                              onError: (err) => toast.error("Cancel failed", { description: String(err) }),
                            });
                          }}
                          className="text-rose-700 hover:bg-rose-50"
                        >
                          {cancelJob.isPending && cancelJob.variables === job.id ? "Cancelling…" : "Cancel"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--ink-600)]">
          Showing {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)} of {data.total}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={data.page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={data.page >= data.totalPages}
            onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
