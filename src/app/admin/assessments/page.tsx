"use client";

import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import axios from "axios";
import { ChevronDown, Download, FileJson, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { SectionHeader } from "@/components/ui/section-header";
import { apiClient } from "@/lib/api/client";
import { useAssessment, useAssessmentItemStats, useAssessmentSubmissionsPage, useUploadAssessmentMutation } from "@/lib/hooks/queries";
import type { AssessmentQuestion, AssessmentType, Difficulty } from "@/types/models";

const tabs: AssessmentType[] = ["pretest", "posttest"];
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function deepCloneQuestions(questions: AssessmentQuestion[]): AssessmentQuestion[] {
  return questions.map((question) => ({
    ...question,
    options: question.options.map((option) => ({ ...option })),
  }));
}

function defaultQuestionId(type: AssessmentType, count: number) {
  return `${type === "pretest" ? "pre" : "post"}-${count + 1}`;
}

function defaultOptionId(count: number) {
  return String.fromCharCode(97 + Math.min(25, count));
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function formatPercent(value?: number) {
  if (typeof value !== "number") return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPoints(value?: number) {
  if (typeof value !== "number") return "N/A";
  const points = value * 100;
  return `${points >= 0 ? "+" : ""}${points.toFixed(1)} pts`;
}

export default function AdminAssessmentsPage() {
  const [activeTab, setActiveTab] = useState<AssessmentType>("pretest");
  const [titleDraft, setTitleDraft] = useState("");
  const [versionDraft, setVersionDraft] = useState("v1");
  const [questionsDraft, setQuestionsDraft] = useState<AssessmentQuestion[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [submissionPage, setSubmissionPage] = useState(1);
  const [submissionPageSize, setSubmissionPageSize] = useState(10);
  const [submissionUserFilter, setSubmissionUserFilter] = useState("");
  const [submissionGroupFilter, setSubmissionGroupFilter] = useState<"all" | "adaptive" | "static">("all");
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingBundle, setIsExportingBundle] = useState(false);
  const [isExportingResearch, setIsExportingResearch] = useState(false);
  const [isExportingObj3, setIsExportingObj3] = useState(false);
  const [jsonImportPreview, setJsonImportPreview] = useState<{
    questions: AssessmentQuestion[];
    titleHint?: string;
    versionHint?: string;
  } | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadAssessmentMutation();
  const pretest = useAssessment("pretest");
  const posttest = useAssessment("posttest");
  const activeAssessment = activeTab === "pretest" ? pretest : posttest;

  const submissionsQuery = useMemo(
    () => ({
      page: submissionPage,
      pageSize: submissionPageSize,
      assessmentType: activeTab,
      group: submissionGroupFilter,
      userId: submissionUserFilter.trim() || undefined,
    }),
    [activeTab, submissionGroupFilter, submissionPage, submissionPageSize, submissionUserFilter],
  );
  const submissions = useAssessmentSubmissionsPage(submissionsQuery, true);
  const itemStats = useAssessmentItemStats(activeTab, submissionGroupFilter, true);
  const itemStatsAll = useAssessmentItemStats(activeTab, "all", true);
  const itemStatsAdaptive = useAssessmentItemStats(activeTab, "adaptive", true);
  const itemStatsStatic = useAssessmentItemStats(activeTab, "static", true);

  const counts = useMemo(
    () => ({
      pretest: pretest.data?.questions.length ?? 0,
      posttest: posttest.data?.questions.length ?? 0,
    }),
    [posttest.data?.questions.length, pretest.data?.questions.length],
  );

  useEffect(() => {
    if (!activeAssessment.data) return;
    setTitleDraft(activeAssessment.data.title);
    setVersionDraft(activeAssessment.data.version);
    setQuestionsDraft(deepCloneQuestions(activeAssessment.data.questions));
    setSelectedQuestionIndex(0);
    setSubmissionPage(1);
  }, [activeAssessment.data, activeTab]);

  const selectedQuestion = questionsDraft[selectedQuestionIndex];

  const mutateQuestion = (index: number, updater: (question: AssessmentQuestion) => AssessmentQuestion) => {
    setQuestionsDraft((prev) => prev.map((question, i) => (i === index ? updater(question) : question)));
  };

  const addQuestion = () => {
    setQuestionsDraft((prev) => {
      const nextId = defaultQuestionId(activeTab, prev.length);
      const next: AssessmentQuestion = {
        id: nextId,
        question: "",
        concept: "",
        difficulty: "moderate",
        options: [
          { id: "a", label: "" },
          { id: "b", label: "" },
        ],
        correctOptionId: "a",
      };
      const updated = [...prev, next];
      setSelectedQuestionIndex(updated.length - 1);
      return updated;
    });
  };

  const deleteQuestion = (index: number) => {
    setQuestionsDraft((prev) => prev.filter((_, i) => i !== index));
    setSelectedQuestionIndex((prev) => Math.max(0, Math.min(prev, questionsDraft.length - 2)));
  };

  const duplicateQuestion = (index: number) => {
    setQuestionsDraft((prev) => {
      const source = prev[index];
      if (!source) return prev;
      const duplicate: AssessmentQuestion = {
        ...source,
        id: `${source.id}-copy`,
        options: source.options.map((option) => ({ ...option })),
      };
      const updated = [...prev.slice(0, index + 1), duplicate, ...prev.slice(index + 1)];
      setSelectedQuestionIndex(index + 1);
      return updated;
    });
  };

  const addOption = (questionIndex: number) => {
    mutateQuestion(questionIndex, (question) => ({
      ...question,
      options: [...question.options, { id: defaultOptionId(question.options.length), label: "" }],
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    mutateQuestion(questionIndex, (question) => {
      const nextOptions = question.options.filter((_, i) => i !== optionIndex);
      const fallbackCorrect =
        nextOptions.find((option) => option.id === question.correctOptionId)?.id ?? nextOptions[0]?.id;
      return {
        ...question,
        options: nextOptions,
        correctOptionId: fallbackCorrect,
      };
    });
  };

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!titleDraft.trim()) errors.push("Title is required.");
    if (!versionDraft.trim()) errors.push("Version is required.");
    if (questionsDraft.length === 0) errors.push("At least one question is required.");

    const questionIds = new Set<string>();
    questionsDraft.forEach((question, index) => {
      if (!question.id.trim()) errors.push(`Question #${index + 1}: id is required.`);
      if (questionIds.has(question.id)) errors.push(`Question #${index + 1}: id must be unique.`);
      questionIds.add(question.id);
      if (!question.question.trim()) errors.push(`Question #${index + 1}: prompt is required.`);
      if (question.options.length < 2) errors.push(`Question #${index + 1}: at least 2 options are required.`);

      const optionIds = new Set<string>();
      question.options.forEach((option, optIndex) => {
        if (!option.id.trim()) errors.push(`Question #${index + 1}, option #${optIndex + 1}: option id is required.`);
        if (optionIds.has(option.id)) errors.push(`Question #${index + 1}: option ids must be unique.`);
        optionIds.add(option.id);
        if (!option.label.trim()) errors.push(`Question #${index + 1}, option #${optIndex + 1}: option text is required.`);
      });

      if (!question.correctOptionId || !optionIds.has(question.correctOptionId)) {
        errors.push(`Question #${index + 1}: correct option id must match one option.`);
      }
    });
    return errors;
  }, [questionsDraft, titleDraft, versionDraft]);

  const submissionsData = submissions.data;
  const statsData = itemStats.data;
  const statsAll = itemStatsAll.data;
  const statsAdaptive = itemStatsAdaptive.data;
  const statsStatic = itemStatsStatic.data;

  const groupComparisonLoading = itemStatsAll.isLoading || itemStatsAdaptive.isLoading || itemStatsStatic.isLoading;
  const groupComparisonError = itemStatsAll.isError || itemStatsAdaptive.isError || itemStatsStatic.isError;
  const correctRateDelta =
    typeof statsAdaptive?.overallCorrectRate === "number" && typeof statsStatic?.overallCorrectRate === "number"
      ? statsAdaptive.overallCorrectRate - statsStatic.overallCorrectRate
      : undefined;
  const avgTimeDeltaSeconds =
    typeof statsAdaptive?.overallAvgDurationMs === "number" && typeof statsStatic?.overallAvgDurationMs === "number"
      ? (statsStatic.overallAvgDurationMs - statsAdaptive.overallAvgDurationMs) / 1000
      : undefined;

  const exportSubmissionCsv = async () => {
    try {
      setIsExportingCsv(true);
      const res = await apiClient.exportAssessmentSubmissionsCsv({
        assessmentType: activeTab,
        group: submissionGroupFilter,
        userId: submissionUserFilter.trim() || undefined,
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `assessment-submissions-${activeTab}-${submissionGroupFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV export ready", {
        description: "Assessment submission export downloaded.",
      });
    } catch (error) {
      toast.error("CSV export failed", { description: String(error) });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const exportResearchSummary = async () => {
    try {
      setIsExportingResearch(true);
      const res = await apiClient.exportResearchSummary();
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `research-summary-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Research summary ready", { description: "Per-student thesis analysis CSV downloaded." });
    } catch (error) {
      toast.error("Research export failed", { description: String(error) });
    } finally {
      setIsExportingResearch(false);
    }
  };

  const exportObjective3 = async () => {
    try {
      setIsExportingObj3(true);
      const res = await apiClient.exportObjective3();
      const url = URL.createObjectURL(res.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `adapteach_obj3_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Objective 3 export ready", {
        description: "ZIP downloaded: summary, item responses, and interaction log.",
      });
    } catch (error) {
      toast.error("Objective 3 export failed", { description: String(error) });
    } finally {
      setIsExportingObj3(false);
    }
  };

  const exportReportBundle = async () => {
    try {
      setIsExportingBundle(true);
      const res = await apiClient.exportAdminReportBundle({
        assessmentType: activeTab,
        group: submissionGroupFilter,
        userId: submissionUserFilter.trim() || undefined,
        event: "all",
        role: "all",
        artifactType: "all",
        flagStatus: "all",
        flagReason: "all",
      });

      const url = URL.createObjectURL(res.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `study-report-bundle-${activeTab}-${submissionGroupFilter}-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Report bundle ready", {
        description: "Study export bundle downloaded.",
      });
    } catch (error) {
      toast.error("Report bundle export failed", { description: String(error) });
    } finally {
      setIsExportingBundle(false);
    }
  };

  const handleJsonImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        let questions: AssessmentQuestion[];
        let titleHint: string | undefined;
        let versionHint: string | undefined;

        if (Array.isArray(parsed)) {
          questions = parsed as AssessmentQuestion[];
        } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.questions)) {
          questions = parsed.questions as AssessmentQuestion[];
          titleHint = typeof parsed.title === "string" ? parsed.title : undefined;
          versionHint = typeof parsed.version === "string" ? parsed.version : undefined;
        } else {
          toast.error("Invalid JSON format", { description: "Expected an array of questions or {title?, version?, questions:[]}." });
          return;
        }

        const invalid = questions.filter(
          (q) => !q.id || !q.question || !Array.isArray(q.options) || q.options.length < 2 || !q.correctOptionId,
        );
        if (invalid.length > 0) {
          toast.error("Invalid questions", {
            description: `${invalid.length} question(s) missing required fields (id, question, options, correctOptionId).`,
          });
          return;
        }

        setJsonImportPreview({ questions, titleHint, versionHint });
      } catch {
        toast.error("JSON parse error", { description: "Could not parse the selected file as JSON." });
      }
    };
    reader.readAsText(file);
  };

  const exportDraftAsJson = () => {
    const payload = { title: titleDraft, version: versionDraft, questions: questionsDraft };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `assessment-${activeTab}-${versionDraft || "draft"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (pretest.isLoading || posttest.isLoading) return <PageLoadingState title="Loading assessments..." />;
  if (pretest.isError || posttest.isError) return <PageErrorState title="Assessments failed to load" backHref="/admin" />;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Admin Assessments"
        title="Assessment Manager"
        subtitle="Create, edit, and maintain pre/post MCQ items directly in the UI, then review submission outcomes."
      />

      <Card className="space-y-4">
        <div className="flex gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-[var(--brand-100)] text-[var(--brand-800)]"
                  : "text-[var(--ink-600)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {tab === "pretest" ? "Pre-test" : "Post-test"} ({counts[tab]})
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium">Title</span>
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Version</span>
            <input
              value={versionDraft}
              onChange={(e) => setVersionDraft(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
            />
          </label>
        </div>
      </Card>

      <Card className="space-y-4">
        <input
          ref={jsonFileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleJsonImport(file);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Question Editor</CardTitle>
            <CardMeta>Add/edit/delete items and options, or import/export via JSON.</CardMeta>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => jsonFileInputRef.current?.click()}>
              <FileJson className="size-4" /> Import JSON
            </Button>
            <Button type="button" variant="secondary" onClick={exportDraftAsJson} disabled={questionsDraft.length === 0}>
              <Download className="size-4" /> Export JSON
            </Button>
            <Button type="button" onClick={addQuestion}>
              <Plus className="size-4" /> Add Question
            </Button>
          </div>
        </div>

        <details className="group rounded-xl border border-[var(--line)] bg-[var(--surface-1)]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--ink-700)] hover:bg-[var(--surface-2)] rounded-xl">
            <FileJson className="size-4 shrink-0 text-[var(--ink-500)]" />
            JSON Import Format Guide
            <ChevronDown className="ml-auto size-4 text-[var(--ink-400)] transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t border-[var(--line)] px-4 py-4 text-sm">
            <p className="text-[var(--ink-600)]">
              Two formats are accepted. The file must be valid JSON with a{" "}
              <code className="rounded bg-[var(--surface-2)] px-1 py-0.5 font-mono text-xs">.json</code> extension.
            </p>

            <div className="space-y-1">
              <p className="font-semibold text-[var(--ink-800)]">Format A — bare array of questions</p>
              <pre className="overflow-x-auto rounded-lg bg-[var(--surface-0)] p-3 font-mono text-xs leading-relaxed text-[var(--ink-700)]">{`[
  {
    "id": "pre-1",
    "question": "What does len([1,2,3]) return?",
    "concept": "Lists",
    "difficulty": "easy",
    "options": [
      { "id": "a", "label": "2" },
      { "id": "b", "label": "3" },
      { "id": "c", "label": "4" }
    ],
    "correctOptionId": "b"
  }
]`}</pre>
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-[var(--ink-800)]">Format B — full assessment object (title + version hints)</p>
              <pre className="overflow-x-auto rounded-lg bg-[var(--surface-0)] p-3 font-mono text-xs leading-relaxed text-[var(--ink-700)]">{`{
  "title": "Python Pre-test",
  "version": "v2",
  "questions": [ ...same array as Format A... ]
}`}</pre>
              <p className="text-xs text-[var(--ink-500)]">
                Title and version from Format B are applied to the form when you choose <strong>Replace</strong>.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-0)] p-3">
              <p className="mb-2 font-semibold text-[var(--ink-800)]">Field reference</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[var(--ink-500)]">
                    <th className="py-1 pr-4 font-semibold">Field</th>
                    <th className="py-1 pr-4 font-semibold">Type</th>
                    <th className="py-1 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--ink-700)]">
                  {(
                    [
                      ["id", "string", 'Unique within the assessment. e.g. "pre-1"'],
                      ["question", "string", "The question prompt shown to students"],
                      ["concept", "string", 'Optional. Topic label (e.g. "Loops")'],
                      ["difficulty", "string", 'Optional. "easy" | "moderate" | "hard"'],
                      ["options", "array", "At least 2 items. Each item: { id, label }"],
                      ["correctOptionId", "string", "Must match one of the option ids"],
                    ] as const
                  ).map(([field, type, notes]) => (
                    <tr key={field} className="border-t border-[var(--line)]">
                      <td className="py-1.5 pr-4 font-mono">{field}</td>
                      <td className="py-1.5 pr-4 text-[var(--ink-500)]">{type}</td>
                      <td className="py-1.5 text-[var(--ink-500)]">{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-[var(--ink-500)]">
              Tip: use <strong>Export JSON</strong> on any existing draft to get a real example you can edit and re-import.
            </p>
          </div>
        </details>

        {jsonImportPreview && (
          <div className="rounded-xl border border-[var(--brand-300)] bg-[var(--brand-50)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--brand-800)]">
                  <FileJson className="mr-1.5 inline size-4" />
                  {jsonImportPreview.questions.length} question(s) ready to import
                </p>
                {(jsonImportPreview.titleHint || jsonImportPreview.versionHint) && (
                  <p className="mt-0.5 text-xs text-[var(--brand-700)]">
                    {[jsonImportPreview.titleHint, jsonImportPreview.versionHint].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--ink-600)]">
                  Replace will overwrite all current questions. Append will add to the end.
                  {jsonImportPreview.titleHint && " Title/version hints from JSON will also be applied on Replace."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setQuestionsDraft(deepCloneQuestions(jsonImportPreview.questions));
                    if (jsonImportPreview.titleHint) setTitleDraft(jsonImportPreview.titleHint);
                    if (jsonImportPreview.versionHint) setVersionDraft(jsonImportPreview.versionHint);
                    setSelectedQuestionIndex(0);
                    setJsonImportPreview(null);
                    toast.success("Questions replaced", { description: `${jsonImportPreview.questions.length} question(s) loaded.` });
                  }}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setQuestionsDraft((prev) => [...prev, ...deepCloneQuestions(jsonImportPreview.questions)]);
                    setSelectedQuestionIndex(questionsDraft.length);
                    setJsonImportPreview(null);
                    toast.success("Questions appended", { description: `${jsonImportPreview.questions.length} question(s) added.` });
                  }}
                >
                  Append
                </Button>
                <Button type="button" variant="secondary" onClick={() => setJsonImportPreview(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-3">
            {questionsDraft.length === 0 ? (
              <p className="text-sm text-[var(--ink-500)]">No questions yet. Add one to start.</p>
            ) : (
              questionsDraft.map((question, index) => (
                <button
                  key={`${question.id}-${index}`}
                  type="button"
                  onClick={() => setSelectedQuestionIndex(index)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    selectedQuestionIndex === index
                      ? "border-[var(--brand-500)] bg-[var(--brand-100)] text-[var(--brand-800)]"
                      : "border-[var(--line)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <p className="font-semibold">{question.id || `Question ${index + 1}`}</p>
                  <p className="line-clamp-2 text-xs text-[var(--ink-600)]">
                    {question.question || "No prompt yet"}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-4">
            {selectedQuestion ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge label={`Question ${selectedQuestionIndex + 1}/${questionsDraft.length}`} tone="admin" />
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => duplicateQuestion(selectedQuestionIndex)}>
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => deleteQuestion(selectedQuestionIndex)}
                      disabled={questionsDraft.length === 0}
                    >
                      <Trash2 className="size-4" /> Delete
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-medium">Question ID</span>
                    <input
                      value={selectedQuestion.id}
                      onChange={(e) =>
                        mutateQuestion(selectedQuestionIndex, (question) => ({ ...question, id: e.target.value }))
                      }
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium">Concept</span>
                    <input
                      value={selectedQuestion.concept ?? ""}
                      onChange={(e) =>
                        mutateQuestion(selectedQuestionIndex, (question) => ({ ...question, concept: e.target.value }))
                      }
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
                    />
                  </label>
                </div>

                <label className="space-y-1">
                  <span className="text-sm font-medium">Question Prompt</span>
                  <textarea
                    value={selectedQuestion.question}
                    onChange={(e) =>
                      mutateQuestion(selectedQuestionIndex, (question) => ({ ...question, question: e.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-medium">Difficulty</span>
                    <select
                      value={selectedQuestion.difficulty ?? ""}
                      onChange={(e) =>
                        mutateQuestion(selectedQuestionIndex, (question) => ({
                          ...question,
                          difficulty: (e.target.value || undefined) as Difficulty | undefined,
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
                    >
                      <option value="">unset</option>
                      <option value="easy">easy</option>
                      <option value="moderate">moderate</option>
                      <option value="hard">hard</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium">Correct Option</span>
                    <select
                      value={selectedQuestion.correctOptionId ?? ""}
                      onChange={(e) =>
                        mutateQuestion(selectedQuestionIndex, (question) => ({
                          ...question,
                          correctOptionId: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
                    >
                      {selectedQuestion.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Options</p>
                    <Button type="button" variant="secondary" onClick={() => addOption(selectedQuestionIndex)}>
                      <Plus className="size-4" /> Add Option
                    </Button>
                  </div>

                  {selectedQuestion.options.map((option, optionIndex) => (
                    <div key={`${option.id}-${optionIndex}`} className="grid gap-2 md:grid-cols-[140px_1fr_auto]">
                      <input
                        value={option.id}
                        onChange={(e) =>
                          mutateQuestion(selectedQuestionIndex, (question) => ({
                            ...question,
                            options: question.options.map((item, i) =>
                              i === optionIndex ? { ...item, id: e.target.value } : item,
                            ),
                          }))
                        }
                        className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
                      />
                      <input
                        value={option.label}
                        onChange={(e) =>
                          mutateQuestion(selectedQuestionIndex, (question) => ({
                            ...question,
                            options: question.options.map((item, i) =>
                              i === optionIndex ? { ...item, label: e.target.value } : item,
                            ),
                          }))
                        }
                        className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={selectedQuestion.options.length <= 2}
                        onClick={() => removeOption(selectedQuestionIndex, optionIndex)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--ink-500)]">Select a question to edit.</p>
            )}
          </div>
        </div>

        {validationErrors.length > 0 ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {validationErrors.slice(0, 6).map((error) => (
              <p key={error}>- {error}</p>
            ))}
            {validationErrors.length > 6 ? <p>- ...and {validationErrors.length - 6} more</p> : null}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={uploadMutation.isPending || validationErrors.length > 0}
            onClick={() => {
              uploadMutation.mutate(
                {
                  assessmentType: activeTab,
                  title: titleDraft.trim(),
                  version: versionDraft.trim(),
                  questions: questionsDraft,
                },
                {
                  onSuccess: (res) => {
                    toast.success(`${activeTab} saved`, {
                      description: `${res.data.questions.length} question(s) updated.`,
                    });
                  },
                  onError: (err) => {
                    let detail: string | undefined;
                    if (axios.isAxiosError(err)) {
                      const raw = err.response?.data?.detail;
                      if (typeof raw === "string") detail = raw;
                      else if (Array.isArray(raw)) detail = raw.map((e) => e.msg ?? JSON.stringify(e)).join("; ");
                      else if (raw != null) detail = JSON.stringify(raw);
                    }
                    toast.error("Assessment save failed", { description: detail ?? "An unexpected error occurred." });
                  },
                },
              );
            }}
          >
            {uploadMutation.isPending ? "Saving..." : "Save Assessment"}
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <CardTitle>Condition Comparison ({activeTab})</CardTitle>
          <CardMeta>Assessment-level outcomes split by adaptive vs static conditions.</CardMeta>
        </div>

        {groupComparisonLoading ? (
          <PageLoadingState title="Loading group comparison..." />
        ) : groupComparisonError ? (
          <PageErrorState title="Failed to load condition comparison" backHref="/admin/assessments" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">All Correct</p>
              <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">{formatPercent(statsAll?.overallCorrectRate)}</p>
              <p className="mt-1 text-xs text-[var(--ink-600)]">{statsAll?.totalSubmissions ?? 0} submissions</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Adaptive Correct</p>
              <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">{formatPercent(statsAdaptive?.overallCorrectRate)}</p>
              <p className="mt-1 text-xs text-[var(--ink-600)]">{statsAdaptive?.totalSubmissions ?? 0} submissions</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Static Correct</p>
              <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">{formatPercent(statsStatic?.overallCorrectRate)}</p>
              <p className="mt-1 text-xs text-[var(--ink-600)]">{statsStatic?.totalSubmissions ?? 0} submissions</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Correct Delta</p>
              <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">{formatSignedPoints(correctRateDelta)}</p>
              <p className="mt-1 text-xs text-[var(--ink-600)]">adaptive - static</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Time Delta</p>
              <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">
                {typeof avgTimeDeltaSeconds === "number"
                  ? `${avgTimeDeltaSeconds >= 0 ? "+" : ""}${Math.round(avgTimeDeltaSeconds)}s`
                  : "N/A"}
              </p>
              <p className="mt-1 text-xs text-[var(--ink-600)]">static - adaptive avg/item</p>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div>
          <CardTitle>Per-Item Statistics ({activeTab})</CardTitle>
          <CardMeta>
            Correctness and time-per-question across {submissionGroupFilter === "all" ? "all groups" : `${submissionGroupFilter} group`} submissions.
          </CardMeta>
        </div>

        {itemStats.isLoading ? (
          <PageLoadingState title="Loading item statistics..." />
        ) : itemStats.isError ? (
          <PageErrorState title="Failed to load item statistics" backHref="/admin/assessments" />
        ) : statsData && statsData.rows.length > 0 ? (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Submissions</p>
                <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">{statsData.totalSubmissions}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Responses</p>
                <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">{statsData.totalResponses}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Overall Correct</p>
                <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">{formatPercent(statsData.overallCorrectRate)}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-1)] p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Avg Item Time</p>
                <p className="mt-1 text-xl font-semibold text-[var(--ink-900)]">
                  {typeof statsData.overallAvgDurationMs === "number"
                    ? `${Math.round(statsData.overallAvgDurationMs / 1000)}s`
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-600)]">
                  <tr>
                    <th className="px-4 py-3">Question</th>
                    <th className="px-4 py-3">Concept</th>
                    <th className="px-4 py-3">Difficulty</th>
                    <th className="px-4 py-3">Responses</th>
                    <th className="px-4 py-3">Correct Rate</th>
                    <th className="px-4 py-3">Avg Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {statsData.rows.map((row) => (
                    <tr key={row.questionId} className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-1)_92%,white)]">
                      <td className="px-4 py-3 font-mono text-xs text-[var(--ink-700)]">{row.questionId}</td>
                      <td className="px-4 py-3">{row.concept ?? "N/A"}</td>
                      <td className="px-4 py-3">{row.difficulty ?? "N/A"}</td>
                      <td className="px-4 py-3">{row.responses}</td>
                      <td className="px-4 py-3">{formatPercent(row.correctRate)}</td>
                      <td className="px-4 py-3">
                        {typeof row.avgDurationMs === "number" ? `${Math.round(row.avgDurationMs / 1000)}s` : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--ink-500)]">No item statistics available yet.</p>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Submission Results ({activeTab})</CardTitle>
            <CardMeta>Includes total duration and per-item timings from submitted attempts.</CardMeta>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={exportSubmissionCsv} disabled={isExportingCsv}>
              <Download className="size-4" /> {isExportingCsv ? "Exporting..." : "Export CSV"}
            </Button>
            <Button type="button" variant="secondary" onClick={exportReportBundle} disabled={isExportingBundle}>
              <Download className="size-4" /> {isExportingBundle ? "Bundling..." : "Export Study Bundle"}
            </Button>
            <Button type="button" variant="secondary" onClick={exportResearchSummary} disabled={isExportingResearch}>
              <Download className="size-4" /> {isExportingResearch ? "Exporting..." : "Export Research Summary"}
            </Button>
            <Button type="button" variant="secondary" onClick={exportObjective3} disabled={isExportingObj3}>
              <Download className="size-4" /> {isExportingObj3 ? "Building ZIP..." : "Export Obj 3 Data"}
            </Button>
            <label className="text-sm font-medium">Group</label>
            <select
              value={submissionGroupFilter}
              onChange={(e) => {
                setSubmissionPage(1);
                setSubmissionGroupFilter(e.target.value as "all" | "adaptive" | "static");
              }}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2 text-sm"
            >
              <option value="all">all</option>
              <option value="adaptive">adaptive</option>
              <option value="static">static</option>
            </select>
            <label className="text-sm font-medium">User</label>
            <input
              value={submissionUserFilter}
              onChange={(e) => {
                setSubmissionPage(1);
                setSubmissionUserFilter(e.target.value);
              }}
              placeholder="Filter by userId"
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2 text-sm"
            />
            <select
              value={submissionPageSize}
              onChange={(e) => {
                setSubmissionPage(1);
                setSubmissionPageSize(Number(e.target.value));
              }}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {submissions.isLoading ? (
          <PageLoadingState title="Loading submissions..." />
        ) : submissions.isError ? (
          <PageErrorState title="Failed to load submissions" backHref="/admin/assessments" />
        ) : submissionsData && submissionsData.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-sm">
                <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-600)]">
                  <tr>
                    <th className="px-4 py-3">Submission ID</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Group</th>
                    <th className="px-4 py-3">Answered</th>
                    <th className="px-4 py-3">Total Duration</th>
                    <th className="px-4 py-3">Avg Item Time</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3">Item Timings</th>
                  </tr>
                </thead>
                <tbody>
                  {submissionsData.items.map((row) => {
                    const avgMs = row.answeredItems > 0 ? row.totalDurationMs / row.answeredItems : 0;
                    return (
                      <tr key={row.id} className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-1)_92%,white)]">
                        <td className="px-4 py-3 font-mono text-xs text-[var(--ink-700)]">{row.id}</td>
                        <td className="px-4 py-3">{row.userId}</td>
                        <td className="px-4 py-3">{row.group ?? "N/A"}</td>
                        <td className="px-4 py-3">{row.answeredItems}/{row.totalItems}</td>
                        <td className="px-4 py-3">{Math.round(row.totalDurationMs / 1000)}s</td>
                        <td className="px-4 py-3">{Math.round(avgMs / 1000)}s</td>
                        <td className="px-4 py-3 text-xs text-[var(--ink-600)]">{formatTimestamp(row.submittedAt)}</td>
                        <td className="px-4 py-3">
                          <details className="text-xs text-[var(--ink-700)]">
                            <summary className="cursor-pointer font-semibold text-[var(--brand-700)]">
                              {row.items.length} item(s)
                            </summary>
                            <div className="mt-2 space-y-1">
                              {row.items.map((item) => (
                                <p key={`${row.id}-${item.questionId}-${item.order}`}>
                                  {item.questionId}: {Math.round(item.durationMs / 1000)}s (order {item.order + 1})
                                </p>
                              ))}
                            </div>
                          </details>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--ink-600)]">
                Showing {(submissionsData.page - 1) * submissionsData.pageSize + 1}-
                {Math.min(submissionsData.page * submissionsData.pageSize, submissionsData.total)} of {submissionsData.total}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submissionsData.page <= 1}
                  onClick={() => setSubmissionPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submissionsData.page >= submissionsData.totalPages}
                  onClick={() => setSubmissionPage((prev) => Math.min(submissionsData.totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--ink-500)]">No submissions found for current filters.</p>
        )}
      </Card>
    </div>
  );
}
