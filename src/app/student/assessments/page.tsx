"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { SectionHeader } from "@/components/ui/section-header";
import { useSessionStore } from "@/lib/auth/session-store";
import { useStudentDashboard } from "@/lib/hooks/queries";
import type { AssessmentType } from "@/types/models";

const tabs: Array<{ id: AssessmentType; label: string }> = [
  { id: "pretest", label: "Pre-test" },
  { id: "posttest", label: "Post-test" },
];

export default function StudentAssessmentsPage() {
  const user = useSessionStore((state) => state.user);
  const dashboard = useStudentDashboard(user?.id ?? "");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "pretest" || tab === "posttest") {
      router.replace(`/student/assessments/${tab}`);
    }
  }, [router, searchParams]);

  if (!user) return <PageErrorState title="Authentication required" backHref="/login" />;
  if (dashboard.isLoading) return <PageLoadingState title="Loading assessments..." />;
  if (dashboard.isError) return <PageErrorState title="Assessment state failed to load" backHref="/student/dashboard" />;
  if (!dashboard.data) return <PageEmptyState title="No assessment state available" />;

  const data = dashboard.data;
  const pretestCompleted = data.assessmentStatus?.pretestCompleted ?? false;
  const posttestCompleted = data.assessmentStatus?.posttestCompleted ?? false;
  const pretestWindowOpen = data.assessmentStatus?.pretestWindowOpen ?? false;
  const posttestWindowOpen = data.assessmentStatus?.posttestWindowOpen ?? false;
  // Rely on backend-computed phase/window rather than raw counts — the backend
  // applies intervention_min_artifacts correctly.
  const interventionComplete = phase !== "pretest" && phase !== "intervention";
  const phase = data.studyPhase;

  const formatDue = (iso?: string) => (iso ? new Date(iso).toLocaleString() : null);

  const states: Record<AssessmentType, { available: boolean; completed: boolean; reason: string; dueAt: string | null }> = {
    pretest: {
      available: !pretestCompleted && (!phase || phase === "pretest") && pretestWindowOpen,
      completed: pretestCompleted,
      reason: pretestCompleted
        ? "Pre-test completed."
        : phase && phase !== "pretest"
          ? "Not active for your current study phase."
          : !pretestWindowOpen
            ? "Window is currently closed."
            : "Available to start.",
      dueAt: formatDue(data.assessmentStatus?.pretestDueAt),
    },
    posttest: {
      available: pretestCompleted && interventionComplete && !posttestCompleted && (!phase || phase === "posttest") && posttestWindowOpen,
      completed: posttestCompleted,
      reason: posttestCompleted
        ? "Post-test completed."
        : !pretestCompleted
          ? "Complete pre-test first."
          : !interventionComplete
            ? "Complete intervention artifacts first."
            : phase && phase !== "posttest"
              ? "Not active for your current study phase."
              : !posttestWindowOpen
                ? "Window is currently closed."
                : "Available to start.",
      dueAt: formatDue(data.assessmentStatus?.posttestDueAt),
    },
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Student Assessment"
        title="Assessments"
        subtitle="Choose a test below. Test-taking runs on a dedicated page."
        actions={
          <Link href="/student/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {tabs.map((tab) => {
          const state = states[tab.id];
          return (
            <Card key={tab.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-500)]">Assessment</p>
                  <CardTitle className="mt-1">{tab.label}</CardTitle>
                </div>
                {state.completed ? <Badge label="Completed" tone="easy" /> : null}
                {!state.completed && state.available ? <Badge label="Open" tone="adaptive" /> : null}
                {!state.completed && !state.available ? <Badge label="Locked" tone="hard" /> : null}
              </div>

              <CardMeta>{state.reason}</CardMeta>
              {state.dueAt ? <p className="text-xs text-[var(--ink-500)]">Deadline: {state.dueAt}</p> : null}

              <Link href={`/student/assessments/${tab.id}`}>
                <Button type="button" className="w-full" variant={state.available ? "default" : "secondary"}>
                  <ClipboardList className="size-4" /> {state.available ? "Open Assessment" : "View Status"}
                </Button>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
