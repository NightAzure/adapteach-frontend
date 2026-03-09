"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { Portal } from "@/components/ui/portal";
import { SectionHeader } from "@/components/ui/section-header";
import {
  useArtifactIssueReportsPage,
  useStudentHistoryPage,
  useStudentsPage,
  useTelemetryEventsPage,
  useTelemetrySummary,
  useUpdateArtifactIssueStatusMutation,
} from "@/lib/hooks/queries";
import type {
  ArtifactIssueReportListQuery,
  ArtifactType,
  StudentHistoryListQuery,
  StudentListQuery,
  TelemetryEventListQuery,
} from "@/types/models";

type AdminLogTab = "events" | "activity" | "flags";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const EVENT_TYPE_DEFAULTS = [
  "artifact_submit",
  "artifact_hint_used",
  "artifact_flagged",
  "assessment_started",
  "assessment_item_answered",
  "assessment_submit",
  "survey_submit",
  "session_sequence_assigned",
  "bkt_update",
];

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export default function AdminLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTabParam = searchParams.get("tab");
  const initialTab: AdminLogTab =
    initialTabParam === "events" || initialTabParam === "activity" || initialTabParam === "flags"
      ? initialTabParam
      : "events";
  const initialStudent = searchParams.get("studentId") ?? "";

  const [activeTab, setActiveTab] = useState<AdminLogTab>(initialTab);

  const handleTabChange = (tab: AdminLogTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const [studentLookupDraft, setStudentLookupDraft] = useState("");
  const [studentLookupSearch, setStudentLookupSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudent);

  const [historySearchDraft, setHistorySearchDraft] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);

  const [flagSearchDraft, setFlagSearchDraft] = useState("");
  const [flagSearch, setFlagSearch] = useState("");
  const [flagStatus, setFlagStatus] = useState<"all" | "open" | "reviewed" | "resolved">("all");
  const [flagReason, setFlagReason] = useState<
    "all" | "incorrect_feedback" | "broken_logic" | "unclear_instruction" | "other"
  >("all");
  const [flagPage, setFlagPage] = useState(1);
  const [flagPageSize, setFlagPageSize] = useState(20);

  const [eventSearchDraft, setEventSearchDraft] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [eventType, setEventType] = useState<string | "all">("all");
  const [eventRole, setEventRole] = useState<"all" | "student" | "admin">("all");
  const [eventGroup, setEventGroup] = useState<"all" | "adaptive" | "static">("all");
  const [eventArtifactType, setEventArtifactType] = useState<ArtifactType | "all">("all");
  const [eventConcept, setEventConcept] = useState<string | "all">("all");
  const [eventPage, setEventPage] = useState(1);
  const [eventPageSize, setEventPageSize] = useState(20);

  useEffect(() => {
    const id = setTimeout(() => setStudentLookupSearch(studentLookupDraft.trim()), 250);
    return () => clearTimeout(id);
  }, [studentLookupDraft]);

  useEffect(() => {
    const id = setTimeout(() => {
      setHistoryPage(1);
      setHistorySearch(historySearchDraft.trim());
    }, 250);
    return () => clearTimeout(id);
  }, [historySearchDraft]);

  useEffect(() => {
    const id = setTimeout(() => {
      setFlagPage(1);
      setFlagSearch(flagSearchDraft.trim());
    }, 250);
    return () => clearTimeout(id);
  }, [flagSearchDraft]);

  useEffect(() => {
    const id = setTimeout(() => {
      setEventPage(1);
      setEventSearch(eventSearchDraft.trim());
    }, 250);
    return () => clearTimeout(id);
  }, [eventSearchDraft]);

  const studentLookupQuery = useMemo<StudentListQuery>(
    () => ({
      page: 1,
      pageSize: 25,
      search: studentLookupSearch || undefined,
      group: "all",
    }),
    [studentLookupSearch],
  );

  const historyQuery = useMemo<StudentHistoryListQuery>(
    () => ({
      page: historyPage,
      pageSize: historyPageSize,
      search: historySearch || undefined,
    }),
    [historyPage, historyPageSize, historySearch],
  );

  const flagsQuery = useMemo<ArtifactIssueReportListQuery>(
    () => ({
      page: flagPage,
      pageSize: flagPageSize,
      search: flagSearch || undefined,
      status: flagStatus,
      reason: flagReason,
    }),
    [flagPage, flagPageSize, flagReason, flagSearch, flagStatus],
  );

  const eventsQuery = useMemo<TelemetryEventListQuery>(
    () => ({
      page: eventPage,
      pageSize: eventPageSize,
      search: eventSearch || undefined,
      event: eventType,
      role: eventRole,
      group: eventGroup,
      artifactType: eventArtifactType,
      concept: eventConcept === "all" ? undefined : eventConcept,
    }),
    [eventArtifactType, eventConcept, eventGroup, eventPage, eventPageSize, eventRole, eventSearch, eventType],
  );

  const eventSummaryQuery = useMemo<Omit<TelemetryEventListQuery, "page" | "pageSize">>(
    () => ({
      search: eventSearch || undefined,
      event: eventType,
      role: eventRole,
      group: eventGroup,
      artifactType: eventArtifactType,
      concept: eventConcept === "all" ? undefined : eventConcept,
    }),
    [eventArtifactType, eventConcept, eventGroup, eventRole, eventSearch, eventType],
  );

  const students = useStudentsPage(studentLookupQuery, activeTab === "activity");
  const selectedStudentIdEffective = selectedStudentId || students.data?.items[0]?.id || "";
  const history = useStudentHistoryPage(
    selectedStudentIdEffective,
    historyQuery,
    activeTab === "activity" && Boolean(selectedStudentIdEffective),
  );
  const flags = useArtifactIssueReportsPage(flagsQuery, activeTab === "flags");
  const updateIssueStatus = useUpdateArtifactIssueStatusMutation();
  const telemetry = useTelemetryEventsPage(eventsQuery, activeTab === "events");
  const telemetrySummary = useTelemetrySummary(eventSummaryQuery, activeTab === "events");

  const [noteDialog, setNoteDialog] = useState<{
    reportId: string;
    status: "reviewed" | "resolved";
    note: string;
  } | null>(null);

  if (activeTab === "activity" && students.isLoading) return <PageLoadingState title="Loading student activity..." />;
  if (activeTab === "activity" && students.isError) return <PageErrorState title="Student lookup failed" backHref="/admin" />;

  if (activeTab === "activity" && selectedStudentIdEffective && history.isLoading) {
    return <PageLoadingState title="Loading student history..." />;
  }
  if (activeTab === "activity" && history.isError) return <PageErrorState title="Student activity failed to load" backHref="/admin" />;

  if (activeTab === "flags" && flags.isLoading) return <PageLoadingState title="Loading flagged artifacts..." />;
  if (activeTab === "flags" && flags.isError) return <PageErrorState title="Flags failed to load" backHref="/admin" />;

  if (activeTab === "events" && (telemetry.isLoading || telemetrySummary.isLoading)) {
    return <PageLoadingState title="Loading telemetry events..." />;
  }
  if (activeTab === "events" && (telemetry.isError || telemetrySummary.isError)) {
    return <PageErrorState title="Telemetry events failed to load" backHref="/admin" />;
  }

  const historyData = history.data;
  const historyRows = historyData?.items ?? [];
  const totalMinutes = historyRows.reduce((sum, row) => sum + row.durationMin, 0);
  const avgMinutes = historyRows.length > 0 ? totalMinutes / historyRows.length : 0;
  const avgCorrectness =
    historyRows.length > 0 ? historyRows.reduce((sum, row) => sum + row.correctness, 0) / historyRows.length : 0;

  const flagsData = flags.data;
  const openReportsCount = (flagsData?.items ?? []).filter((r) => r.status === "open").length;

  const updateFlagStatus = (
    reportId: string,
    status: "open" | "reviewed" | "resolved",
    statusNote?: string,
  ) => {
    updateIssueStatus.mutate(
      { reportId, payload: { status, statusNote } },
      {
        onSuccess: () => {
          toast.success("Flag status updated");
        },
        onError: (error) => {
          toast.error("Failed to update flag status", { description: String(error) });
        },
      },
    );
  };

  const telemetryData = telemetry.data;
  const telemetryRows = telemetryData?.items ?? [];
  const telemetryStats = telemetrySummary.data;
  const eventTypeOptions = Array.from(
    new Set([
      "all",
      ...EVENT_TYPE_DEFAULTS,
      ...(telemetryStats?.topEventTypes.map((item) => item.event) ?? []),
    ]),
  );
  const conceptOptions = [
    "all",
    ...(telemetryStats?.topConcepts.map((item) => item.concept).filter(Boolean) ?? []),
  ];

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";
  const buildExportUrl = (extra?: Record<string, string>) => {
    const params = new URLSearchParams({
      assessmentType: "all",
      group: "all",
      event: eventType === "all" ? "all" : eventType,
      role: eventRole,
      artifactType: eventArtifactType,
      flagStatus: "all",
      flagReason: "all",
      ...(eventConcept !== "all" ? { concept: eventConcept } : {}),
      ...extra,
    });
    return `${API_BASE}/admin/reports/export-bundle?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Admin Telemetry"
        title="Operational Logs"
        subtitle="Audit events, inspect student activity timing, and review flagged artifacts at scale."
        actions={
          <a href={buildExportUrl()} download="adapteach-export.zip">
            <Button variant="secondary">
              <Download className="size-4" /> Export Research Bundle
            </Button>
          </a>
        }
      />

      <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-2">
        <Button type="button" variant={activeTab === "events" ? "default" : "secondary"} onClick={() => handleTabChange("events")}>
          Events
        </Button>
        <Button type="button" variant={activeTab === "activity" ? "default" : "secondary"} onClick={() => handleTabChange("activity")}>
          Student Activity
        </Button>
        <Button type="button" variant={activeTab === "flags" ? "default" : "secondary"} onClick={() => handleTabChange("flags")}>
          Flagged Artifacts
        </Button>
      </div>

      {activeTab === "events" ? (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle>Event Stream</CardTitle>
                <CardMeta>
                  Filterable and paginated telemetry feed for reproducibility and protocol audits.
                </CardMeta>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge label={`${telemetryStats?.totalEvents ?? 0} events`} tone="admin" />
                <Badge label={`${telemetryStats?.uniqueLearners ?? 0} learners`} tone="static" />
                <Badge label={`${Math.round((telemetryStats?.avgDurationMs ?? 0) / 1000)}s avg duration`} tone="moderate" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Artifact Submits</p>
                <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">{telemetryStats?.submitEvents ?? 0}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Hint Events</p>
                <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">{telemetryStats?.hintEvents ?? 0}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Flagged Events</p>
                <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">{telemetryStats?.flaggedEvents ?? 0}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Assessment Item Events</p>
                <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">{telemetryStats?.assessmentItemEvents ?? 0}</p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Top Event Types</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(telemetryStats?.topEventTypes ?? []).slice(0, 5).map((row) => (
                    <Badge key={row.event} label={`${row.event} (${row.count})`} tone="admin" />
                  ))}
                  {!telemetryStats?.topEventTypes.length ? <span className="text-sm text-[var(--ink-500)]">No event data</span> : null}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Top Concepts</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(telemetryStats?.topConcepts ?? []).slice(0, 5).map((row) => (
                    <Badge key={row.concept} label={`${row.concept} (${row.count})`} tone="static" />
                  ))}
                  {!telemetryStats?.topConcepts.length ? <span className="text-sm text-[var(--ink-500)]">No concept-tagged events</span> : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr] xl:grid-cols-[2fr_repeat(6,minmax(0,1fr))]">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Search</span>
                <input
                  value={eventSearchDraft}
                  onChange={(e) => setEventSearchDraft(e.target.value)}
                  placeholder="Search event, user, artifact, concept"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Event</span>
                <select
                  value={eventType}
                  onChange={(e) => {
                    setEventPage(1);
                    setEventType(e.target.value);
                  }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                >
                  {eventTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Role</span>
                <select
                  value={eventRole}
                  onChange={(e) => {
                    setEventPage(1);
                    setEventRole(e.target.value as "all" | "student" | "admin");
                  }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                >
                  <option value="all">all</option>
                  <option value="student">student</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Group</span>
                <select
                  value={eventGroup}
                  onChange={(e) => {
                    setEventPage(1);
                    setEventGroup(e.target.value as "all" | "adaptive" | "static");
                  }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                >
                  <option value="all">all</option>
                  <option value="adaptive">adaptive</option>
                  <option value="static">static</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Artifact Type</span>
                <select
                  value={eventArtifactType}
                  onChange={(e) => {
                    setEventPage(1);
                    setEventArtifactType(e.target.value as ArtifactType | "all");
                  }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                >
                  <option value="all">all</option>
                  <option value="parsons">parsons</option>
                  <option value="tracing">tracing</option>
                  <option value="mutation">mutation</option>
                  <option value="slicing">slicing</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Concept</span>
                <select
                  value={eventConcept}
                  onChange={(e) => {
                    setEventPage(1);
                    setEventConcept(e.target.value);
                  }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                >
                  {conceptOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Page Size</span>
                <select
                  value={eventPageSize}
                  onChange={(e) => {
                    setEventPage(1);
                    setEventPageSize(Number(e.target.value));
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

          {telemetryData && telemetryRows.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1500px] text-sm">
                  <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-600)]">
                    <tr>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3">Artifact</th>
                      <th className="px-4 py-3">Concept</th>
                      <th className="px-4 py-3">Difficulty</th>
                      <th className="px-4 py-3">Correctness</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Attempt/Hints</th>
                      <th className="px-4 py-3">Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telemetryRows.map((row) => (
                      <tr key={row.id} className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-1)_92%,white)]">
                        <td className="px-4 py-3 text-xs text-[var(--ink-600)]">{formatTimestamp(row.ts)}</td>
                        <td className="px-4 py-3"><Badge label={row.event} tone="admin" /></td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--ink-700)]">{row.userId}</td>
                        <td className="px-4 py-3">
                          {row.group ? <Badge label={row.group} tone={row.group === "adaptive" ? "adaptive" : "static"} /> : "-"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {row.artifactId ? (
                            <Link href={`/admin/content/artifacts/${row.artifactId}`} className="font-semibold text-[var(--brand-700)]">
                              {row.artifactId}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3">{row.concept ?? "-"}</td>
                        <td className="px-4 py-3">{row.difficulty ?? "-"}</td>
                        <td className="px-4 py-3">
                          {typeof row.correctness === "number" ? `${Math.round(row.correctness * 100)}%` : "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--ink-600)]">
                          {typeof row.durationMs === "number" ? `${Math.round(row.durationMs / 1000)}s` : "-"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--ink-600)]">
                          a={row.attempt ?? "-"} | h={row.hintsUsed ?? "-"}
                        </td>
                        <td className="px-4 py-3 max-w-[420px] truncate text-[var(--ink-700)]" title={row.responseSummary ?? ""}>
                          {row.responseSummary ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <PageEmptyState title="No telemetry events" message="No event rows matched current filters." />
          )}

          {telemetryData ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[var(--ink-600)]">
                Showing {(telemetryData.page - 1) * telemetryData.pageSize + 1}-
                {Math.min(telemetryData.page * telemetryData.pageSize, telemetryData.total)} of {telemetryData.total}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={telemetryData.page <= 1}
                  onClick={() => setEventPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={telemetryData.page >= telemetryData.totalPages}
                  onClick={() => setEventPage((prev) => Math.min(telemetryData.totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "activity" ? (
        <div id="activity" className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle>Student Activity Detail</CardTitle>
                <CardMeta>Includes time per artifact, attempts, hints, correctness, and completion timestamp.</CardMeta>
              </div>
              <label className="space-y-1">
                <span className="text-sm font-medium">Find student</span>
                <input
                  value={studentLookupDraft}
                  onChange={(e) => setStudentLookupDraft(e.target.value)}
                  placeholder="Search name, email, id"
                  className="min-w-[260px] rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                />
              </label>
            </div>

            {students.data && students.data.items.length > 0 ? (
              <label className="space-y-1">
                <span className="text-sm font-medium">Student</span>
                <select
                  value={selectedStudentIdEffective}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2 text-sm"
                >
                  {students.data.items.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.id})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <PageEmptyState title="No students found" message="Try a different student search term." />
            )}

            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">History Search</span>
                <input
                  value={historySearchDraft}
                  onChange={(e) => setHistorySearchDraft(e.target.value)}
                  placeholder="Search artifact title, id, concept"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Page Size</span>
                <select
                  value={historyPageSize}
                  onChange={(e) => {
                    setHistoryPage(1);
                    setHistoryPageSize(Number(e.target.value));
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
              <div className="flex flex-wrap items-end gap-2">
                <Badge label={`${historyData?.total ?? 0} rows`} tone="admin" />
                <Badge label={`${totalMinutes.toFixed(1)} min`} tone="static" />
                <Badge label={`${avgMinutes.toFixed(1)} min avg`} tone="moderate" />
                <Badge label={`${(avgCorrectness * 100).toFixed(0)}% correct`} tone="easy" />
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            {historyRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-600)]">
                    <tr>
                      <th className="px-4 py-3">Artifact</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Concept</th>
                      <th className="px-4 py-3">Attempts</th>
                      <th className="px-4 py-3">Hints</th>
                      <th className="px-4 py-3">Duration (min)</th>
                      <th className="px-4 py-3">Correctness</th>
                      <th className="px-4 py-3">Completed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row) => (
                      <tr key={`${row.artifactId}-${row.completedAt}`} className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-1)_92%,white)]">
                        <td className="px-4 py-3 font-medium text-[var(--ink-800)]">{row.artifactTitle}</td>
                        <td className="px-4 py-3"><Badge label={row.type} tone="static" /></td>
                        <td className="px-4 py-3">{row.concept}</td>
                        <td className="px-4 py-3">{row.attempts}</td>
                        <td className="px-4 py-3">{row.hintsUsed}</td>
                        <td className="px-4 py-3">{row.durationMin.toFixed(1)}</td>
                        <td className="px-4 py-3">{(row.correctness * 100).toFixed(0)}%</td>
                        <td className="px-4 py-3 text-xs text-[var(--ink-600)]">{row.completedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <PageEmptyState title="No activity rows" message="No artifact attempts found for this student/filter." />
              </div>
            )}
          </Card>

          {historyData ? (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={historyData.page <= 1} onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}>
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={historyData.page >= historyData.totalPages}
                onClick={() => setHistoryPage((prev) => Math.min(historyData.totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "flags" ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle>Flagged Artifact Reports</CardTitle>
              <div className="flex gap-2">
                <Badge label={`${flagsData?.total ?? 0} total`} tone="admin" />
                <Badge label={`${openReportsCount} open`} tone="hard" />
              </div>
            </div>
            <CardMeta>Review learner-reported issues to verify validator behavior and instruction quality.</CardMeta>

            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Search</span>
                <input
                  value={flagSearchDraft}
                  onChange={(e) => setFlagSearchDraft(e.target.value)}
                  placeholder="Search report, artifact, learner, note"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Status</span>
                <select
                  value={flagStatus}
                  onChange={(e) => {
                    setFlagPage(1);
                    setFlagStatus(e.target.value as "all" | "open" | "reviewed" | "resolved");
                  }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                >
                  <option value="all">all</option>
                  <option value="open">open</option>
                  <option value="reviewed">reviewed</option>
                  <option value="resolved">resolved</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Reason</span>
                <select
                  value={flagReason}
                  onChange={(e) => {
                    setFlagPage(1);
                    setFlagReason(
                      e.target.value as
                        | "all"
                        | "incorrect_feedback"
                        | "broken_logic"
                        | "unclear_instruction"
                        | "other",
                    );
                  }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                >
                  <option value="all">all</option>
                  <option value="incorrect_feedback">incorrect_feedback</option>
                  <option value="broken_logic">broken_logic</option>
                  <option value="unclear_instruction">unclear_instruction</option>
                  <option value="other">other</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Page Size</span>
                <select
                  value={flagPageSize}
                  onChange={(e) => {
                    setFlagPage(1);
                    setFlagPageSize(Number(e.target.value));
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

          {flagsData && flagsData.items.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-600)]">
                    <tr>
                      <th className="px-4 py-3">Report</th>
                      <th className="px-4 py-3">Artifact</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Learner</th>
                      <th className="px-4 py-3">Attempts/Hints</th>
                      <th className="px-4 py-3">Note</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Status Audit</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flagsData.items.map((report) => (
                      <tr key={report.id} className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-1)_92%,white)]">
                        <td className="px-4 py-3 font-mono text-xs text-[var(--ink-600)]">{report.id}</td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/content/artifacts/${report.artifactId}`} className="font-semibold text-[var(--brand-700)]">
                            {report.artifactId}
                          </Link>
                        </td>
                        <td className="px-4 py-3"><Badge label={report.artifactType} tone="static" /></td>
                        <td className="px-4 py-3"><Badge label={report.reason} tone="admin" /></td>
                        <td className="px-4 py-3">
                          <Badge label={report.status} tone={report.status === "open" ? "hard" : "easy"} />
                        </td>
                        <td className="px-4 py-3">{report.userId}</td>
                        <td className="px-4 py-3 text-xs text-[var(--ink-600)]">
                          attempt={report.attempt ?? "n/a"} | hints={report.hintsUsed ?? 0}
                        </td>
                        <td className="px-4 py-3 text-[var(--ink-700)]">{report.note ?? "-"}</td>
                        <td className="px-4 py-3 text-xs text-[var(--ink-500)]">{report.createdAt}</td>
                        <td className="px-4 py-3 text-xs text-[var(--ink-600)]">
                          {report.statusUpdatedAt ? (
                            <div className="space-y-1">
                              <p>{formatTimestamp(report.statusUpdatedAt)}</p>
                              <p className="font-mono text-[11px]">{report.statusUpdatedBy ?? "unknown-admin"}</p>
                              {report.statusNote ? <p className="max-w-[220px] truncate" title={report.statusNote}>{report.statusNote}</p> : null}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {report.status !== "open" ? (
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={updateIssueStatus.isPending}
                                onClick={() => updateFlagStatus(report.id, "open")}
                              >
                                Reopen
                              </Button>
                            ) : null}
                            {report.status === "open" ? (
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={updateIssueStatus.isPending}
                                onClick={() => setNoteDialog({ reportId: report.id, status: "reviewed", note: "" })}
                              >
                                Mark Reviewed
                              </Button>
                            ) : null}
                            {report.status !== "resolved" ? (
                              <Button
                                type="button"
                                disabled={updateIssueStatus.isPending}
                                onClick={() => setNoteDialog({ reportId: report.id, status: "resolved", note: "" })}
                              >
                                Mark Resolved
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <PageEmptyState title="No flagged rows" message="No flagged artifacts matched current filters." />
          )}

          {flagsData ? (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={flagsData.page <= 1} onClick={() => setFlagPage((prev) => Math.max(1, prev - 1))}>
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={flagsData.page >= flagsData.totalPages}
                onClick={() => setFlagPage((prev) => Math.min(flagsData.totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {noteDialog ? (
        <Portal>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="note-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setNoteDialog(null); }}
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-6 shadow-xl">
            <h2 id="note-dialog-title" className="mb-1 text-base font-semibold text-[var(--ink-900)]">
              Mark as {noteDialog.status === "reviewed" ? "Reviewed" : "Resolved"}
            </h2>
            <p className="mb-4 text-sm text-[var(--ink-500)]">
              Optionally add a note explaining this status change.
            </p>
            <textarea
              autoFocus
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-0)] p-3 text-sm text-[var(--ink-900)] placeholder:text-[var(--ink-400)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              rows={4}
              placeholder="Optional note…"
              value={noteDialog.note}
              onChange={(e) => setNoteDialog((prev) => prev ? { ...prev, note: e.target.value } : null)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setNoteDialog(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updateIssueStatus.isPending}
                onClick={() => {
                  const trimmed = noteDialog.note.trim();
                  updateFlagStatus(noteDialog.reportId, noteDialog.status, trimmed.length > 0 ? trimmed : undefined);
                  setNoteDialog(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
        </Portal>
      ) : null}
    </div>
  );
}
