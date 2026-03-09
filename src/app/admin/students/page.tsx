"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Portal } from "@/components/ui/portal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/page-states";
import { SectionHeader } from "@/components/ui/section-header";
import {
  useClearStudentActivityMutation,
  useClearStudentAllProgressMutation,
  useClearStudentAssessmentMutation,
  useClearStudentBktMutation,
  useDeleteStudentMutation,
  useInviteStudentMutation,
  useResendInviteMutation,
  useRevokeInviteMutation,
  useStudentInvitesPage,
  useStudentProgress,
  useStudentProtocolAuditPage,
  useStudentProtocolControl,
  useStudentsPage,
  useUpdateStudentMutation,
  useUpdateStudentProtocolControlMutation,
} from "@/lib/hooks/queries";
import type { StudentInviteInput, StudentInviteListQuery, StudentListQuery, UpdateStudentInput, UserProfile } from "@/types/models";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function toDateTimeLocal(iso?: string) {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function toLocalDateTime(iso?: string) {
  if (!iso) return "n/a";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString();
}

function toWindowLabel(value?: boolean) {
  if (value === true) return "open";
  if (value === false) return "closed";
  return "auto";
}

type ProtocolDraft = {
  phase: "auto" | "pretest" | "intervention" | "posttest" | "survey";
  pretestWindow: "auto" | "open" | "closed";
  posttestWindow: "auto" | "open" | "closed";
  pretestDue: string;
  posttestDue: string;
  note: string;
};

const MODAL_OVERLAY = "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16";
const MODAL_BACKDROP = "rgba(0,0,0,0.5)";
const MODAL_PANEL = "relative w-full rounded-[var(--radius-xl)] border bg-[var(--surface-1)] shadow-[var(--shadow-modal)]";

export default function AdminStudentsPage() {
  const inviteMutation = useInviteStudentMutation();
  const resendMutation = useResendInviteMutation();
  const revokeMutation = useRevokeInviteMutation();
  const deleteMutation = useDeleteStudentMutation();
  const updateStudentMutation = useUpdateStudentMutation();
  const updateProtocolMutation = useUpdateStudentProtocolControlMutation();
  const clearAssessmentMutation = useClearStudentAssessmentMutation();
  const clearBktMutation = useClearStudentBktMutation();
  const clearActivityMutation = useClearStudentActivityMutation();
  const clearAllMutation = useClearStudentAllProgressMutation();

  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [editStudent, setEditStudent] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; email: string; group: "adaptive" | "static" | "auto"; password: string; confirmPassword: string }>({ name: "", email: "", group: "auto", password: "", confirmPassword: "" });
  const [progressUserId, setProgressUserId] = useState<string | null>(null);
  const [protocolUserId, setProtocolUserId] = useState<string | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<"students" | "invites">("students");

  // Invite form
  const [form, setForm] = useState<Pick<StudentInviteInput, "name" | "email" | "group">>({
    name: "",
    email: "",
    group: undefined,
  });

  // Student filters
  const [studentSearchDraft, setStudentSearchDraft] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentGroup, setStudentGroup] = useState<"all" | "adaptive" | "static">("all");
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(20);

  // Invite filters
  const [inviteSearchDraft, setInviteSearchDraft] = useState("");
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"all" | "invited" | "accepted" | "expired">("all");
  const [inviteGroup, setInviteGroup] = useState<"all" | "adaptive" | "static">("all");
  const [invitePage, setInvitePage] = useState(1);
  const [invitePageSize, setInvitePageSize] = useState(20);

  // Protocol
  const [protocolAuditPage, setProtocolAuditPage] = useState(1);
  const [protocolAuditPageSize, setProtocolAuditPageSize] = useState(10);
  const [protocolDraftByUserId, setProtocolDraftByUserId] = useState<Record<string, ProtocolDraft>>({});

  useEffect(() => {
    const id = setTimeout(() => {
      setStudentPage(1);
      setStudentSearch(studentSearchDraft.trim());
    }, 250);
    return () => clearTimeout(id);
  }, [studentSearchDraft]);

  useEffect(() => {
    const id = setTimeout(() => {
      setInvitePage(1);
      setInviteSearch(inviteSearchDraft.trim());
    }, 250);
    return () => clearTimeout(id);
  }, [inviteSearchDraft]);

  const studentsQuery = useMemo<StudentListQuery>(
    () => ({ page: studentPage, pageSize: studentPageSize, search: studentSearch || undefined, group: studentGroup }),
    [studentGroup, studentPage, studentPageSize, studentSearch],
  );

  const invitesQuery = useMemo<StudentInviteListQuery>(
    () => ({ page: invitePage, pageSize: invitePageSize, search: inviteSearch || undefined, group: inviteGroup, status: inviteStatus }),
    [inviteGroup, invitePage, invitePageSize, inviteSearch, inviteStatus],
  );

  const students = useStudentsPage(studentsQuery);
  const invites = useStudentInvitesPage(invitesQuery);
  const studentProgress = useStudentProgress(progressUserId ?? "", Boolean(progressUserId));
  const protocolControl = useStudentProtocolControl(protocolUserId ?? "", Boolean(protocolUserId));
  const protocolAudit = useStudentProtocolAuditPage(
    protocolUserId ?? "",
    { page: protocolAuditPage, pageSize: protocolAuditPageSize },
    Boolean(protocolUserId),
  );

  const defaultProtocolDraft = useMemo<ProtocolDraft | null>(() => {
    if (!protocolControl.data) return null;
    const override = protocolControl.data.override;
    return {
      phase: (override?.forceStudyPhase as ProtocolDraft["phase"] | undefined) ?? "auto",
      pretestWindow:
        override?.forcePretestWindowOpen === true ? "open" : override?.forcePretestWindowOpen === false ? "closed" : "auto",
      posttestWindow:
        override?.forcePosttestWindowOpen === true ? "open" : override?.forcePosttestWindowOpen === false ? "closed" : "auto",
      pretestDue: toDateTimeLocal(override?.pretestDueAt),
      posttestDue: toDateTimeLocal(override?.posttestDueAt),
      note: override?.note ?? "",
    };
  }, [protocolControl.data]);

  const protocolDraft =
    (protocolUserId ? protocolDraftByUserId[protocolUserId] : undefined) ?? defaultProtocolDraft;

  const updateProtocolDraft = (updater: (current: ProtocolDraft) => ProtocolDraft) => {
    if (!protocolUserId || !protocolDraft) return;
    setProtocolDraftByUserId((prev) => ({ ...prev, [protocolUserId]: updater(protocolDraft) }));
  };

  if (students.isLoading || invites.isLoading) return <PageLoadingState title="Loading students manager..." />;
  if (students.isError || invites.isError) return <PageErrorState title="Students manager failed to load" backHref="/admin" />;
  if (!students.data || !invites.data) return <PageEmptyState title="No student data" />;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Admin Participants"
        title="Student Manager"
        subtitle="Scalable participant operations with server-driven filtering and pagination."
      />

      {/* ── Unified participants card ──────────────────────────── */}
      <Card className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Participants</CardTitle>
            <CardMeta>
              {students.data.total} registered · {invites.data.total} invite{invites.data.total !== 1 ? "s" : ""}
            </CardMeta>
          </div>
          <Button type="button" onClick={() => setInviteModalOpen(true)}>
            <Plus className="size-4" />
            Invite Student
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-1">
          {(["students", "invites"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-[var(--surface-1)] text-[var(--ink-900)] shadow-sm"
                  : "text-[var(--ink-500)] hover:text-[var(--ink-800)]"
              }`}
            >
              {tab === "students"
                ? `Students (${students.data.total})`
                : `Invites (${invites.data.total})`}
            </button>
          ))}
        </div>

        {/* ── Students tab ── */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Search</span>
                <input
                  value={studentSearchDraft}
                  onChange={(e) => setStudentSearchDraft(e.target.value)}
                  placeholder="Search id, name, email"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Group</span>
                <select
                  value={studentGroup}
                  onChange={(e) => { setStudentPage(1); setStudentGroup(e.target.value as "all" | "adaptive" | "static"); }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                >
                  <option value="all">all</option>
                  <option value="adaptive">adaptive</option>
                  <option value="static">static</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Page Size</span>
                <select
                  value={studentPageSize}
                  onChange={(e) => { setStudentPage(1); setStudentPageSize(Number(e.target.value)); }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                >
                  {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>

            {students.data.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-600)]">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3">Protocol</th>
                      <th className="px-4 py-3">Progress</th>
                      <th className="px-4 py-3">Logs</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.data.items.map((student) => (
                      <tr key={student.id} className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-1)_92%,white)]">
                        <td className="px-4 py-3 font-mono text-xs text-[var(--ink-600)]">{student.id}</td>
                        <td className="px-4 py-3 font-medium text-[var(--ink-800)]">{student.name}</td>
                        <td className="px-4 py-3 text-[var(--ink-600)]">{student.email ?? "n/a"}</td>
                        <td className="px-4 py-3">
                          {student.group
                            ? <Badge label={student.group} tone={student.group === "adaptive" ? "adaptive" : "static"} />
                            : <span className="text-[var(--ink-400)]">n/a</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              setProtocolUserId(student.id);
                              setProtocolAuditPage(1);
                              setProtocolDraftByUserId((prev) => {
                                const next = { ...prev };
                                delete next[student.id];
                                return next;
                              });
                            }}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--brand-700)] transition-colors hover:bg-[var(--brand-50)]"
                          >
                            Configure
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setProgressUserId(student.id)}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--brand-700)] transition-colors hover:bg-[var(--brand-50)]"
                          >
                            <Activity className="size-3.5" />
                            Progress
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/logs?tab=activity&studentId=${encodeURIComponent(student.id)}`}
                            className="text-xs font-semibold text-[var(--brand-700)] hover:underline"
                          >
                            View Logs
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditStudent(student);
                                setEditForm({
                                  name: student.name,
                                  email: student.email ?? "",
                                  group: student.group ?? "auto",
                                  password: "",
                                  confirmPassword: "",
                                });
                              }}
                              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--ink-600)] transition-colors hover:bg-[var(--surface-2)]"
                              title="Edit student details"
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm({ id: student.id, name: student.name })}
                              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <PageEmptyState title="No students" message="No student rows match current filters." />
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--ink-500)]">
                Page {students.data.page} of {students.data.totalPages}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" disabled={students.data.page <= 1} onClick={() => setStudentPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button type="button" variant="secondary" disabled={students.data.page >= students.data.totalPages} onClick={() => setStudentPage((p) => Math.min(students.data.totalPages, p + 1))}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Invites tab ── */}
        {activeTab === "invites" && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Search</span>
                <input
                  value={inviteSearchDraft}
                  onChange={(e) => setInviteSearchDraft(e.target.value)}
                  placeholder="Search invite id, name, email"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Status</span>
                <select
                  value={inviteStatus}
                  onChange={(e) => { setInvitePage(1); setInviteStatus(e.target.value as "all" | "invited" | "accepted" | "expired"); }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                >
                  <option value="all">all</option>
                  <option value="invited">invited</option>
                  <option value="accepted">accepted</option>
                  <option value="expired">expired</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Group</span>
                <select
                  value={inviteGroup}
                  onChange={(e) => { setInvitePage(1); setInviteGroup(e.target.value as "all" | "adaptive" | "static"); }}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                >
                  <option value="all">all</option>
                  <option value="adaptive">adaptive</option>
                  <option value="static">static</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--ink-500)]">
                {invites.data.total} total · page {invites.data.page} of {invites.data.totalPages}
              </span>
              <label className="flex items-center gap-2 text-xs text-[var(--ink-500)]">
                Per page
                <select
                  value={invitePageSize}
                  onChange={(e) => { setInvitePage(1); setInvitePageSize(Number(e.target.value)); }}
                  className="rounded-lg border border-[var(--line)] bg-[var(--surface-0)] px-2 py-1 text-xs"
                >
                  {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>

            {invites.data.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-600)]">
                    <tr>
                      <th className="px-4 py-3">Invite ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Invited At</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.data.items.map((invite) => (
                      <tr key={invite.id} className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-1)_92%,white)]">
                        <td className="px-4 py-3 font-mono text-xs text-[var(--ink-600)]">{invite.id}</td>
                        <td className="px-4 py-3 font-medium text-[var(--ink-800)]">{invite.name}</td>
                        <td className="px-4 py-3 text-[var(--ink-600)]">{invite.email}</td>
                        <td className="px-4 py-3">
                          <Badge label={invite.group} tone={invite.group === "adaptive" ? "adaptive" : "static"} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            label={invite.status}
                            tone={invite.status === "accepted" ? "adaptive" : invite.status === "expired" ? "static" : "admin"}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--ink-500)]">{invite.invitedAt}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {invite.status !== "accepted" && (
                              <button
                                type="button"
                                disabled={resendMutation.isPending}
                                onClick={() => resendMutation.mutate(invite.id, {
                                  onSuccess: () => toast.success(`Invite re-queued for ${invite.email}`),
                                  onError: () => toast.error("Resend failed"),
                                })}
                                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--brand-700)] transition-colors hover:bg-[var(--brand-50)]"
                                title="Resend invite email"
                              >
                                <RotateCcw className="size-3.5" />
                                Resend
                              </button>
                            )}
                            {invite.status === "invited" && (
                              <button
                                type="button"
                                disabled={revokeMutation.isPending}
                                onClick={() => revokeMutation.mutate(invite.id, {
                                  onSuccess: () => toast.success(`Invite for ${invite.email} revoked`),
                                  onError: () => toast.error("Revoke failed"),
                                })}
                                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-50"
                                title="Revoke invite"
                              >
                                <X className="size-3.5" />
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <PageEmptyState title="No invites" message="No invite rows match current filters." />
            )}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" disabled={invites.data.page <= 1} onClick={() => setInvitePage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button type="button" variant="secondary" disabled={invites.data.page >= invites.data.totalPages} onClick={() => setInvitePage((p) => Math.min(invites.data.totalPages, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Invite Student Modal ──────────────────────────── */}
      {inviteModalOpen && (
        <Portal>
          <div
            className={MODAL_OVERLAY}
            style={{ background: MODAL_BACKDROP }}
            onClick={() => setInviteModalOpen(false)}
          >
            <div
              className={`${MODAL_PANEL} max-w-md`}
              style={{ borderColor: "var(--line)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--ink-900)]">Invite Student</h2>
                  <p className="mt-0.5 text-xs text-[var(--ink-500)]">
                    If the email is not yet registered, an invite is dispatched. Group defaults to auto-balanced.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--ink-400)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-700)]"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form
                className="space-y-4 px-6 py-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMutation.mutate(
                    { name: form.name, email: form.email, group: form.group },
                    {
                      onSuccess: (res) => {
                        toast.success(`Invite sent to ${res.data.email}`, { description: `Assigned group: ${res.data.group}` });
                        setForm({ name: "", email: "", group: undefined });
                        setInviteModalOpen(false);
                        setActiveTab("invites");
                      },
                      onError: (err: unknown) => {
                        const status = (err as { response?: { status?: number } })?.response?.status;
                        if (status === 409) {
                          toast.error("Invite already exists", { description: `An active invite has already been sent to ${form.email}.` });
                        } else {
                          toast.error("Invite failed", { description: "Please verify the fields and try again." });
                        }
                      },
                    },
                  );
                }}
              >
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[var(--ink-800)]">Full name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                    placeholder="e.g. Juan Dela Cruz"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[var(--ink-800)]">Email address</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                    placeholder="student@university.edu"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[var(--ink-800)]">Group assignment</span>
                  <select
                    value={form.group ?? "auto"}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((prev) => ({ ...prev, group: v === "auto" ? undefined : (v as "adaptive" | "static") }));
                    }}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                  >
                    <option value="auto">Auto (balanced)</option>
                    <option value="adaptive">Adaptive</option>
                    <option value="static">Static</option>
                  </select>
                </label>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" onClick={() => setInviteModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending ? "Sending…" : "Send Invite"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Protocol Controls Modal ──────────────────────────── */}
      {protocolUserId && (
        <Portal>
          <div
            className={MODAL_OVERLAY}
            style={{ background: MODAL_BACKDROP }}
            onClick={() => setProtocolUserId(null)}
          >
            <div
              className={`${MODAL_PANEL} max-w-3xl`}
              style={{ borderColor: "var(--line)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--ink-900)]">Protocol Controls</h2>
                  <p className="mt-0.5 font-mono text-xs text-[var(--ink-500)]">{protocolUserId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setProtocolUserId(null)}
                  className="rounded-lg p-1.5 text-[var(--ink-400)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-700)]"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                {protocolControl.isLoading ? (
                  <PageLoadingState title="Loading protocol controls..." />
                ) : protocolControl.isError || !protocolControl.data || !protocolDraft ? (
                  <PageErrorState title="Failed to load protocol controls" backHref="/admin/students" />
                ) : (
                  <>
                    <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Computed phase</p>
                        <p className="mt-1 text-sm font-semibold capitalize">{protocolControl.data.studyPhase}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Pre-test window</p>
                        <p className="mt-1 text-sm font-semibold">{protocolControl.data.assessmentStatus.pretestWindowOpen ? "Open" : "Closed"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Post-test window</p>
                        <p className="mt-1 text-sm font-semibold">{protocolControl.data.assessmentStatus.posttestWindowOpen ? "Open" : "Closed"}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Completed</p>
                        <p className="mt-1 text-sm font-semibold">
                          Pre: {protocolControl.data.assessmentStatus.pretestCompleted ? "yes" : "no"} · Post: {protocolControl.data.assessmentStatus.posttestCompleted ? "yes" : "no"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-sm font-medium">Force Study Phase</span>
                        <select
                          value={protocolDraft.phase}
                          onChange={(e) => updateProtocolDraft((c) => ({ ...c, phase: e.target.value as ProtocolDraft["phase"] }))}
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                        >
                          <option value="auto">Auto (computed)</option>
                          <option value="pretest">pretest</option>
                          <option value="intervention">intervention</option>
                          <option value="posttest">posttest</option>
                          <option value="survey">survey</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm font-medium">Pre-test Window Override</span>
                        <select
                          value={protocolDraft.pretestWindow}
                          onChange={(e) => updateProtocolDraft((c) => ({ ...c, pretestWindow: e.target.value as ProtocolDraft["pretestWindow"] }))}
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                        >
                          <option value="auto">Auto</option>
                          <option value="open">Force open</option>
                          <option value="closed">Force closed</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm font-medium">Post-test Window Override</span>
                        <select
                          value={protocolDraft.posttestWindow}
                          onChange={(e) => updateProtocolDraft((c) => ({ ...c, posttestWindow: e.target.value as ProtocolDraft["posttestWindow"] }))}
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                        >
                          <option value="auto">Auto</option>
                          <option value="open">Force open</option>
                          <option value="closed">Force closed</option>
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm font-medium">Pre-test Due</span>
                        <input
                          type="datetime-local"
                          value={protocolDraft.pretestDue}
                          onChange={(e) => updateProtocolDraft((c) => ({ ...c, pretestDue: e.target.value }))}
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-sm font-medium">Post-test Due</span>
                        <input
                          type="datetime-local"
                          value={protocolDraft.posttestDue}
                          onChange={(e) => updateProtocolDraft((c) => ({ ...c, posttestDue: e.target.value }))}
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                        />
                      </label>
                      <label className="space-y-1 md:col-span-2">
                        <span className="text-sm font-medium">Admin Note</span>
                        <textarea
                          rows={2}
                          value={protocolDraft.note}
                          onChange={(e) => updateProtocolDraft((c) => ({ ...c, note: e.target.value }))}
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={updateProtocolMutation.isPending}
                        onClick={() => {
                          setProtocolDraftByUserId((prev) => { const next = { ...prev }; delete next[protocolUserId]; return next; });
                          updateProtocolMutation.mutate(
                            { userId: protocolUserId, input: { forceStudyPhase: undefined, forcePretestWindowOpen: undefined, forcePosttestWindowOpen: undefined, pretestDueAt: undefined, posttestDueAt: undefined, note: undefined } },
                            {
                              onSuccess: () => toast.success("Protocol overrides reset"),
                              onError: () => toast.error("Reset failed"),
                            },
                          );
                        }}
                      >
                        Reset Overrides
                      </Button>
                      <Button
                        type="button"
                        disabled={updateProtocolMutation.isPending}
                        onClick={() => {
                          updateProtocolMutation.mutate(
                            {
                              userId: protocolUserId,
                              input: {
                                forceStudyPhase: protocolDraft.phase === "auto" ? undefined : protocolDraft.phase,
                                forcePretestWindowOpen: protocolDraft.pretestWindow === "auto" ? undefined : protocolDraft.pretestWindow === "open",
                                forcePosttestWindowOpen: protocolDraft.posttestWindow === "auto" ? undefined : protocolDraft.posttestWindow === "open",
                                pretestDueAt: protocolDraft.pretestDue ? new Date(protocolDraft.pretestDue).toISOString() : undefined,
                                posttestDueAt: protocolDraft.posttestDue ? new Date(protocolDraft.posttestDue).toISOString() : undefined,
                                note: protocolDraft.note.trim() || undefined,
                              },
                            },
                            {
                              onSuccess: () => toast.success("Protocol controls updated"),
                              onError: () => toast.error("Protocol update failed"),
                            },
                          );
                        }}
                      >
                        {updateProtocolMutation.isPending ? "Saving…" : "Save Protocol Controls"}
                      </Button>
                    </div>

                    {/* Audit log */}
                    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink-800)]">Recent Protocol Changes</p>
                          <p className="text-xs text-[var(--ink-500)]">Append-only audit log for this learner.</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-[var(--ink-500)]">
                          Per page
                          <select
                            value={protocolAuditPageSize}
                            onChange={(e) => { setProtocolAuditPage(1); setProtocolAuditPageSize(Number(e.target.value)); }}
                            className="rounded-lg border border-[var(--line)] bg-[var(--surface-1)] px-2 py-1 text-xs"
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </label>
                      </div>

                      {protocolAudit.isLoading ? (
                        <PageLoadingState title="Loading protocol audit..." />
                      ) : protocolAudit.isError || !protocolAudit.data ? (
                        <PageErrorState title="Failed to load protocol audit log" backHref="/admin/students" />
                      ) : protocolAudit.data.items.length === 0 ? (
                        <PageEmptyState title="No protocol updates yet" message="Overrides will appear here after the first save." />
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[860px] text-sm">
                              <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-600)]">
                                <tr>
                                  <th className="px-3 py-2">When</th>
                                  <th className="px-3 py-2">By</th>
                                  <th className="px-3 py-2">Phase</th>
                                  <th className="px-3 py-2">Pre Window</th>
                                  <th className="px-3 py-2">Post Window</th>
                                  <th className="px-3 py-2">Pre Due</th>
                                  <th className="px-3 py-2">Post Due</th>
                                  <th className="px-3 py-2">Note</th>
                                </tr>
                              </thead>
                              <tbody>
                                {protocolAudit.data.items.map((entry) => (
                                  <tr key={entry.id} className="border-t border-[var(--line)]">
                                    <td className="px-3 py-2 text-xs text-[var(--ink-500)]">{toLocalDateTime(entry.changedAt)}</td>
                                    <td className="px-3 py-2 font-mono text-xs text-[var(--ink-600)]">{entry.changedBy ?? "system"}</td>
                                    <td className="px-3 py-2 capitalize">{entry.after?.forceStudyPhase ?? "auto"}</td>
                                    <td className="px-3 py-2 capitalize">{toWindowLabel(entry.after?.forcePretestWindowOpen)}</td>
                                    <td className="px-3 py-2 capitalize">{toWindowLabel(entry.after?.forcePosttestWindowOpen)}</td>
                                    <td className="px-3 py-2 text-xs">{toLocalDateTime(entry.after?.pretestDueAt)}</td>
                                    <td className="px-3 py-2 text-xs">{toLocalDateTime(entry.after?.posttestDueAt)}</td>
                                    <td className="px-3 py-2 text-xs">{entry.after?.note?.trim() || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-[var(--ink-500)]">Page {protocolAudit.data.page} of {protocolAudit.data.totalPages}</span>
                            <Button type="button" variant="secondary" disabled={protocolAudit.data.page <= 1} onClick={() => setProtocolAuditPage((p) => Math.max(1, p - 1))}>Previous</Button>
                            <Button type="button" variant="secondary" disabled={protocolAudit.data.page >= protocolAudit.data.totalPages} onClick={() => setProtocolAuditPage((p) => Math.min(protocolAudit.data.totalPages, p + 1))}>Next</Button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Progress Manager Modal ──────────────────────────── */}
      {progressUserId && (
        <Portal>
          <div
            className={MODAL_OVERLAY}
            style={{ background: MODAL_BACKDROP }}
            onClick={() => setProgressUserId(null)}
          >
            <div
              className={`${MODAL_PANEL} max-w-lg`}
              style={{ borderColor: "var(--line)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--ink-900)]">Progress Manager</h2>
                  <p className="mt-0.5 font-mono text-xs text-[var(--ink-500)]">{progressUserId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setProgressUserId(null)}
                  className="rounded-lg p-1.5 text-[var(--ink-400)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-700)]"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                {studentProgress.isLoading ? (
                  <PageLoadingState title="Loading progress..." />
                ) : studentProgress.isError || !studentProgress.data ? (
                  <PageErrorState title="Failed to load progress" backHref="/admin/students" />
                ) : (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Pre-test</p>
                        <p className={`mt-1 text-sm font-semibold ${studentProgress.data.pretestSubmitted ? "text-emerald-700" : "text-[var(--ink-400)]"}`}>
                          {studentProgress.data.pretestSubmitted ? "Submitted" : "Not submitted"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Post-test</p>
                        <p className={`mt-1 text-sm font-semibold ${studentProgress.data.posttestSubmitted ? "text-emerald-700" : "text-[var(--ink-400)]"}`}>
                          {studentProgress.data.posttestSubmitted ? "Submitted" : "Not submitted"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Activities Done</p>
                        <p className="mt-1 text-sm font-semibold">{studentProgress.data.activityCount}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.08em] text-[var(--ink-500)]">Open Attempts</p>
                        <p className="mt-1 text-sm font-semibold">
                          {studentProgress.data.openAttempts.length === 0 ? "None" : studentProgress.data.openAttempts.join(", ")}
                        </p>
                      </div>
                    </div>

                    {/* BKT mastery */}
                    {studentProgress.data.bktConcepts.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">BKT Mastery</p>
                        <div className="flex flex-wrap gap-2">
                          {studentProgress.data.bktConcepts.map((c) => (
                            <div key={c.concept} className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-0)] px-3 py-1.5 text-xs">
                              <span className="font-medium text-[var(--ink-800)]">{c.concept}</span>
                              <span className={`font-bold ${c.pKnow >= 0.7 ? "text-emerald-600" : c.pKnow >= 0.4 ? "text-amber-600" : "text-rose-600"}`}>
                                {(c.pKnow * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clear actions */}
                    <div className="space-y-2 border-t border-[var(--line)] pt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Clear Actions</p>
                      <p className="text-xs text-[var(--ink-400)]">All actions are permanent and cannot be undone.</p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={(!studentProgress.data.pretestSubmitted && !studentProgress.data.openAttempts.includes("pretest")) || clearAssessmentMutation.isPending}
                          onClick={() => {
                            if (!window.confirm(`Clear pre-test submission and all attempts for ${progressUserId}?`)) return;
                            clearAssessmentMutation.mutate(
                              { userId: progressUserId, assessmentType: "pretest" },
                              {
                                onSuccess: (res) => toast.success("Pre-test cleared", { description: `${res.data.deletedRows} row(s) removed.` }),
                                onError: () => toast.error("Clear pre-test failed"),
                              },
                            );
                          }}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Clear Pre-test
                        </button>
                        <button
                          type="button"
                          disabled={(!studentProgress.data.posttestSubmitted && !studentProgress.data.openAttempts.includes("posttest")) || clearAssessmentMutation.isPending}
                          onClick={() => {
                            if (!window.confirm(`Clear post-test submission and all attempts for ${progressUserId}?`)) return;
                            clearAssessmentMutation.mutate(
                              { userId: progressUserId, assessmentType: "posttest" },
                              {
                                onSuccess: (res) => toast.success("Post-test cleared", { description: `${res.data.deletedRows} row(s) removed.` }),
                                onError: () => toast.error("Clear post-test failed"),
                              },
                            );
                          }}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Clear Post-test
                        </button>
                        <button
                          type="button"
                          disabled={studentProgress.data.bktConcepts.length === 0 || clearBktMutation.isPending}
                          onClick={() => {
                            if (!window.confirm(`Reset BKT mastery for all concepts for ${progressUserId}?`)) return;
                            clearBktMutation.mutate(progressUserId, {
                              onSuccess: (res) => toast.success("BKT reset", { description: `${res.data.deletedRows} concept(s) cleared.` }),
                              onError: () => toast.error("BKT reset failed"),
                            });
                          }}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Reset BKT Mastery
                        </button>
                        <button
                          type="button"
                          disabled={studentProgress.data.activityCount === 0 || clearActivityMutation.isPending}
                          onClick={() => {
                            if (!window.confirm(`Delete all ${studentProgress.data?.activityCount} activity records for ${progressUserId}?`)) return;
                            clearActivityMutation.mutate(progressUserId, {
                              onSuccess: (res) => toast.success("Activity cleared", { description: `${res.data.deletedRows} record(s) removed.` }),
                              onError: () => toast.error("Activity clear failed"),
                            });
                          }}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Clear Activity
                        </button>
                        <button
                          type="button"
                          disabled={clearAllMutation.isPending}
                          onClick={() => {
                            if (!window.confirm(`Clear ALL progress for ${progressUserId}? Removes assessments, BKT, and activity history.`)) return;
                            clearAllMutation.mutate(progressUserId, {
                              onSuccess: (res) => toast.success("All progress cleared", { description: `${res.data.deletedRows} total row(s) removed.` }),
                              onError: () => toast.error("Clear all failed"),
                            });
                          }}
                          className="col-span-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Clear All Progress
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Edit Student Modal ──────────────────────────── */}
      {editStudent && (
        <Portal>
          <div
            className={MODAL_OVERLAY}
            style={{ background: MODAL_BACKDROP }}
            onClick={() => setEditStudent(null)}
          >
            <div
              className={`${MODAL_PANEL} max-w-md`}
              style={{ borderColor: "var(--line)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--ink-900)]">Edit Student</h2>
                  <p className="mt-0.5 font-mono text-xs text-[var(--ink-500)]">{editStudent.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="rounded-lg p-1.5 text-[var(--ink-400)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-700)]"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form
                className="space-y-4 px-6 py-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editForm.password && editForm.password !== editForm.confirmPassword) {
                    toast.error("Passwords do not match");
                    return;
                  }
                  const input: UpdateStudentInput = {};
                  if (editForm.name.trim() && editForm.name.trim() !== editStudent.name) input.name = editForm.name.trim();
                  if (editForm.email.trim() && editForm.email.trim() !== editStudent.email) input.email = editForm.email.trim();
                  if (editForm.group !== "auto" && editForm.group !== editStudent.group) input.group = editForm.group;
                  if (editForm.password) input.password = editForm.password;
                  if (Object.keys(input).length === 0) {
                    toast("No changes detected");
                    return;
                  }
                  updateStudentMutation.mutate(
                    { userId: editStudent.id, input },
                    {
                      onSuccess: () => {
                        toast.success("Student updated");
                        setEditStudent(null);
                      },
                      onError: (err: unknown) => {
                        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
                        toast.error("Update failed", { description: detail ?? "An unexpected error occurred." });
                      },
                    },
                  );
                }}
              >
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[var(--ink-800)]">Full name</span>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                    placeholder="Full name"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[var(--ink-800)]">Email address</span>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                    placeholder="student@university.edu"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium text-[var(--ink-800)]">Group assignment</span>
                  <select
                    value={editForm.group}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, group: e.target.value as "adaptive" | "static" | "auto" }))}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                  >
                    <option value="auto">No change</option>
                    <option value="adaptive">Adaptive</option>
                    <option value="static">Static</option>
                  </select>
                </label>

                <div className="space-y-1 rounded-xl border border-[var(--line)] bg-[var(--surface-0)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">Change Password</p>
                  <p className="mb-2 text-xs text-[var(--ink-400)]">Leave blank to keep current password.</p>
                  <div className="space-y-3">
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-[var(--ink-800)]">New password</span>
                      <input
                        type="password"
                        value={editForm.password}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2"
                        placeholder="Min 8 characters"
                        minLength={editForm.password ? 8 : undefined}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-[var(--ink-800)]">Confirm password</span>
                      <input
                        type="password"
                        value={editForm.confirmPassword}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className={`w-full rounded-xl border px-3 py-2 ${editForm.confirmPassword && editForm.password !== editForm.confirmPassword ? "border-rose-400 bg-rose-50" : "border-[var(--line)] bg-[var(--surface-1)]"}`}
                        placeholder="Repeat new password"
                      />
                      {editForm.confirmPassword && editForm.password !== editForm.confirmPassword && (
                        <p className="text-xs text-rose-600">Passwords do not match</p>
                      )}
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" onClick={() => setEditStudent(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateStudentMutation.isPending}>
                    {updateStudentMutation.isPending ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* ── Delete confirmation modal ──────────────────────────── */}
      {deleteConfirm && (
        <Portal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: MODAL_BACKDROP }}
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              className="w-full max-w-sm rounded-[var(--radius-xl)] border bg-[var(--surface-1)] p-6 shadow-[var(--shadow-modal)]"
              style={{ borderColor: "var(--line)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 flex items-center gap-2 text-rose-600">
                <Trash2 className="size-5 shrink-0" />
                <h2 className="text-base font-semibold">Delete student?</h2>
              </div>
              <p className="mt-2 text-sm text-[var(--ink-600)]">
                <span className="font-semibold text-[var(--ink-900)]">{deleteConfirm.name}</span> and all their
                associated data (assessments, activity history, BKT states) will be permanently removed. This cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setDeleteConfirm(null)} disabled={deleteMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={deleteMutation.isPending}
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => {
                    deleteMutation.mutate(deleteConfirm.id, {
                      onSuccess: () => {
                        toast.success(`${deleteConfirm.name} has been deleted`);
                        setDeleteConfirm(null);
                        if (protocolUserId === deleteConfirm.id) setProtocolUserId(null);
                        if (progressUserId === deleteConfirm.id) setProgressUserId(null);
                      },
                      onError: (err) => toast.error("Delete failed", { description: String(err) }),
                    });
                  }}
                >
                  {deleteMutation.isPending ? "Deleting…" : "Yes, delete"}
                </Button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
