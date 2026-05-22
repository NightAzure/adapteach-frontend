"use client";

import { useState, useMemo } from "react";
import { Download, GripVertical, MessageSquareText, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { SectionHeader } from "@/components/ui/section-header";
import { useAdminSurveyQuestions, useAdminSurveyResponses } from "@/lib/hooks/queries";
import { apiClient } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import type { SurveyQuestion, SurveyQuestionInput } from "@/types/models";

const QUESTION_TYPES = ["likert", "text"] as const;
type QuestionType = (typeof QUESTION_TYPES)[number];

function newQuestion(order: number): SurveyQuestionInput {
  return {
    id: `q-${Date.now()}-${order}`,
    label: "",
    questionType: "likert",
    section: null,
    min: 1,
    max: 7,
    minLabel: "Strongly Disagree",
    maxLabel: "Strongly Agree",
    displayOrder: order,
  };
}

function questionToInput(q: SurveyQuestion, order: number): SurveyQuestionInput {
  return {
    id: q.id,
    label: q.label,
    questionType: q.questionType ?? "likert",
    section: q.section ?? null,
    min: q.min,
    max: q.max,
    minLabel: q.minLabel ?? null,
    maxLabel: q.maxLabel ?? null,
    displayOrder: order,
  };
}

// Group responses by user for the responses table
function groupByUser(responses: import("@/types/models").SurveyResponseRow[]) {
  const map = new Map<string, { userName: string; answers: Map<string, string> }>();
  for (const r of responses) {
    if (!map.has(r.userId)) map.set(r.userId, { userName: r.userName, answers: new Map() });
    const answer = r.questionType === "text" ? (r.textValue ?? "") : String(r.value ?? "");
    map.get(r.userId)!.answers.set(r.questionId, answer);
  }
  return map;
}

export default function AdminSurveysPage() {
  const queryClient = useQueryClient();
  const surveyQ = useAdminSurveyQuestions();
  const responsesQ = useAdminSurveyResponses();

  const [draft, setDraft] = useState<SurveyQuestionInput[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "responses">("editor");

  // Initialize draft from fetched data
  const questions: SurveyQuestionInput[] = useMemo(() => {
    if (draft !== null) return draft;
    if (!surveyQ.data) return [];
    return surveyQ.data.map((q, i) => questionToInput(q, i));
  }, [draft, surveyQ.data]);

  const isDirty = draft !== null;

  function setQuestions(next: SurveyQuestionInput[]) {
    setDraft(next.map((q, i) => ({ ...q, displayOrder: i })));
  }

  function addQuestion() {
    setQuestions([...questions, newQuestion(questions.length)]);
  }

  function removeQuestion(idx: number) {
    setQuestions(questions.filter((_, i) => i !== idx));
  }

  function updateQuestion(idx: number, patch: Partial<SurveyQuestionInput>) {
    setQuestions(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const next = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setQuestions(next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiClient.adminUpsertSurveyQuestions(questions);
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminSurveyQuestions });
      setDraft(null);
      toast.success("Survey saved");
    } catch {
      toast.error("Failed to save survey");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await apiClient.adminExportSurveyResponsesCsv();
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "survey_responses.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (surveyQ.isLoading) return <PageLoadingState title="Loading survey…" />;
  if (surveyQ.isError) return <PageErrorState title="Failed to load survey" backHref="/admin" />;

  const responses = responsesQ.data ?? [];
  const uniqueQuestions = surveyQ.data ?? [];
  const byUser = groupByUser(responses);
  const respondentCount = byUser.size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--brand-100)]">
            <MessageSquareText className="size-5 text-[var(--brand-600)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--ink-900)]">Surveys</h1>
            <p className="text-sm text-[var(--ink-500)]">{questions.length} questions · {respondentCount} respondents</p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === "editor" && isDirty && (
            <Button size="sm" loading={saving} onClick={handleSave}>
              <Save className="size-4" /> Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border p-1" style={{ background: "var(--surface-1)", borderColor: "var(--line)" }}>
        {(["editor", "responses"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab
                ? "bg-[var(--surface-0)] text-[var(--ink-900)] shadow-sm"
                : "text-[var(--ink-500)] hover:text-[var(--ink-800)]"
            }`}
          >
            {tab === "editor" ? "Question Editor" : `Responses (${respondentCount})`}
          </button>
        ))}
      </div>

      {activeTab === "editor" && (
        <div className="space-y-4">
          <Card className="space-y-1">
            <CardTitle>Survey Questions</CardTitle>
            <CardMeta>
              Questions appear all at once (no paging). Supports Likert scale (1–7 or custom) and open-ended text.
              Drag to reorder using the grip handle.
            </CardMeta>
          </Card>

          {questions.length === 0 && (
            <Card className="py-10 text-center">
              <p className="text-sm text-[var(--ink-500)]">No questions yet. Add your first question below.</p>
            </Card>
          )}

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <Card key={q.id} className="space-y-4">
                {/* Question header row */}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="mt-1 cursor-grab text-[var(--ink-400)] hover:text-[var(--ink-700)]"
                    title="Drag to reorder"
                    onClick={() => {}}
                  >
                    <GripVertical className="size-4" />
                  </button>
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[var(--ink-400)]">#{idx + 1}</span>
                    <select
                      value={q.questionType}
                      onChange={(e) => updateQuestion(idx, { questionType: e.target.value as QuestionType })}
                      className="rounded-lg border px-2 py-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
                      style={{ background: "var(--surface-0)", borderColor: "var(--line)", color: "var(--ink-800)" }}
                    >
                      <option value="likert">Likert</option>
                      <option value="text">Open-ended</option>
                    </select>
                    <input
                      placeholder="Section label (optional, e.g. TAM, SUS)"
                      value={q.section ?? ""}
                      onChange={(e) => updateQuestion(idx, { section: e.target.value || null })}
                      className="rounded-lg border px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
                      style={{ background: "var(--surface-0)", borderColor: "var(--line)", color: "var(--ink-800)" }}
                    />
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveQuestion(idx, -1)}
                      className="rounded px-1 py-1 text-xs text-[var(--ink-400)] hover:bg-[var(--surface-2)] disabled:opacity-30"
                    >▲</button>
                    <button
                      type="button"
                      disabled={idx === questions.length - 1}
                      onClick={() => moveQuestion(idx, 1)}
                      className="rounded px-1 py-1 text-xs text-[var(--ink-400)] hover:bg-[var(--surface-2)] disabled:opacity-30"
                    >▼</button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="rounded p-1 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Question label */}
                <textarea
                  rows={2}
                  placeholder="Question text…"
                  value={q.label}
                  onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                  className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
                  style={{ background: "var(--surface-0)", borderColor: "var(--line)", color: "var(--ink-900)" }}
                />

                {/* Likert config */}
                {q.questionType === "likert" && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-[var(--ink-600)]">
                      Min
                      <input
                        type="number"
                        min={1} max={q.max - 1}
                        value={q.min}
                        onChange={(e) => updateQuestion(idx, { min: Number(e.target.value) })}
                        className="w-16 rounded-lg border px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
                        style={{ background: "var(--surface-0)", borderColor: "var(--line)", color: "var(--ink-800)" }}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--ink-600)]">
                      Max
                      <input
                        type="number"
                        min={q.min + 1} max={10}
                        value={q.max}
                        onChange={(e) => updateQuestion(idx, { max: Number(e.target.value) })}
                        className="w-16 rounded-lg border px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
                        style={{ background: "var(--surface-0)", borderColor: "var(--line)", color: "var(--ink-800)" }}
                      />
                    </label>
                    <input
                      placeholder="Min label (e.g. Strongly Disagree)"
                      value={q.minLabel ?? ""}
                      onChange={(e) => updateQuestion(idx, { minLabel: e.target.value || null })}
                      className="flex-1 rounded-lg border px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
                      style={{ background: "var(--surface-0)", borderColor: "var(--line)", color: "var(--ink-800)" }}
                    />
                    <input
                      placeholder="Max label (e.g. Strongly Agree)"
                      value={q.maxLabel ?? ""}
                      onChange={(e) => updateQuestion(idx, { maxLabel: e.target.value || null })}
                      className="flex-1 rounded-lg border px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)]"
                      style={{ background: "var(--surface-0)", borderColor: "var(--line)", color: "var(--ink-800)" }}
                    />
                  </div>
                )}
              </Card>
            ))}
          </div>

          <Button variant="secondary" onClick={addQuestion}>
            <Plus className="size-4" /> Add Question
          </Button>

          {isDirty && (
            <div className="flex items-center justify-between rounded-xl border p-4" style={{ background: "var(--surface-1)", borderColor: "var(--line)" }}>
              <p className="text-sm text-[var(--ink-600)]">You have unsaved changes.</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setDraft(null)}>Discard</Button>
                <Button size="sm" loading={saving} onClick={handleSave}>
                  <Save className="size-4" /> Save Survey
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "responses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionHeader title={`${respondentCount} student${respondentCount !== 1 ? "s" : ""} responded`} />
            <Button variant="secondary" size="sm" loading={exporting} onClick={handleExport}>
              <Download className="size-4" /> Export CSV
            </Button>
          </div>

          {respondentCount === 0 && (
            <Card className="py-10 text-center">
              <p className="text-sm text-[var(--ink-500)]">No responses yet.</p>
            </Card>
          )}

          {respondentCount > 0 && (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-xs font-semibold uppercase tracking-[0.07em] text-[var(--ink-500)]">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Student</th>
                    {uniqueQuestions.map((q) => (
                      <th key={q.id} className="px-3 py-3 max-w-[160px] whitespace-nowrap overflow-hidden text-ellipsis" title={q.label}>
                        {q.section ? <span className="mr-1 text-[var(--brand-600)]">[{q.section}]</span> : null}
                        {q.label.length > 40 ? q.label.slice(0, 40) + "…" : q.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(byUser.entries()).map(([userId, { userName, answers }], i) => (
                    <tr
                      key={userId}
                      className={`border-t border-[var(--line)] ${i % 2 === 0 ? "bg-[var(--surface-0)]" : "bg-[var(--surface-1)]"}`}
                    >
                      <td className="px-4 py-2.5 font-medium text-[var(--ink-800)] whitespace-nowrap">{userName}</td>
                      {uniqueQuestions.map((q) => {
                        const val = answers.get(q.id);
                        return (
                          <td key={q.id} className="px-3 py-2.5 text-[var(--ink-700)]">
                            {val !== undefined ? (
                              q.questionType === "text"
                                ? <span className="block max-w-[200px] truncate text-xs" title={val}>{val || <em className="text-[var(--ink-400)]">—</em>}</span>
                                : <Badge label={val} />
                            ) : (
                              <span className="text-[var(--ink-300)]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
