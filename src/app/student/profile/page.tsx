"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Pencil, UserCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { useSessionStore } from "@/lib/auth/session-store";
import { useStudentDashboard, useStudentHistory, useUpdateSelfMutation } from "@/lib/hooks/queries";
import { toast } from "@/lib/toast";

function EditProfileForm({ onCancel }: { onCancel: () => void }) {
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  const updateSelf = useUpdateSelfMutation();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    const payload: Record<string, string> = {};
    if (name.trim() && name.trim() !== user?.name) payload.name = name.trim();
    if (email.trim() && email.trim() !== user?.email) payload.email = email.trim();
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }
    if (Object.keys(payload).length === 0) {
      onCancel();
      return;
    }
    updateSelf.mutate(payload, {
      onSuccess: (res) => {
        setUser(res.data);
        toast.success("Profile updated");
        onCancel();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? String(err);
        toast.error("Update failed", { description: msg });
      },
    });
  }

  const fieldClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink-800)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--ink-600)]">Full name</label>
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--ink-600)]">Email address</label>
          <input className={fieldClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <hr className="border-[var(--border)]" />
      <p className="text-xs font-medium text-[var(--ink-500)]">Change password — leave blank to keep current</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--ink-600)]">Current password</label>
          <input
            className={fieldClass}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--ink-600)]">New password</label>
          <input
            className={fieldClass}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--ink-600)]">Confirm new password</label>
          <input
            className={fieldClass}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="default" loading={updateSelf.isPending}>
          Save changes
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={updateSelf.isPending}>
          <X className="size-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function StudentProfilePage() {
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const clear = useSessionStore((state) => state.clear);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const dashboard = useStudentDashboard(user?.id ?? "");
  const history = useStudentHistory(user?.id ?? "");

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const avgScore =
    history.data && history.data.length > 0
      ? Math.round(
          (history.data.reduce((s, r) => s + r.correctness, 0) / history.data.length) * 100
        )
      : null;

  const activitiesDone = history.data?.length ?? 0;
  const streak = dashboard.data?.streakDays ?? 0;
  const overallMastery =
    dashboard.data?.conceptMastery && dashboard.data.conceptMastery.length > 0
      ? Math.round(
          (dashboard.data.conceptMastery.reduce((s, c) => s + c.mastery, 0) /
            dashboard.data.conceptMastery.length) *
            100
        )
      : null;

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <Card>
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div
            className="grid size-20 shrink-0 place-items-center rounded-2xl text-2xl font-bold text-white shadow-[var(--shadow-card)]"
            style={{ background: "linear-gradient(135deg, var(--brand-600), var(--brand-500))" }}
          >
            {initials}
          </div>

          <div className="flex-1">
            <CardTitle className="text-2xl">{user?.name ?? "Student"}</CardTitle>
            <CardMeta className="mt-1">{user?.email ?? user?.id}</CardMeta>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge label={user?.role ?? "student"} tone="static" />
              {user?.group && (
                <Badge
                  label={user.group === "adaptive" ? "Adaptive group" : "Static group"}
                  tone={user.group === "adaptive" ? "adaptive" : "static"}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <UserCircle className="size-5 text-[var(--ink-400)]" />
            <span className="text-xs text-[var(--ink-500)]">Study participant</span>
          </div>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Mastery", value: overallMastery !== null ? `${overallMastery}%` : "—", sub: "avg across concepts" },
          { label: "Activities", value: String(activitiesDone), sub: "completed" },
          { label: "Avg score", value: avgScore !== null ? `${avgScore}%` : "—", sub: "correctness" },
          { label: "Streak", value: `${streak} day${streak !== 1 ? "s" : ""}`, sub: "current" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs font-medium text-[var(--ink-500)]">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--ink-900)]">{stat.value}</p>
            <p className="text-[11px] text-[var(--ink-400)]">{stat.sub}</p>
          </Card>
        ))}
      </div>

      {/* Edit profile */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Account</CardTitle>
            <CardMeta>Update your name, email, or password.</CardMeta>
          </div>
          {!editing && (
            <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
        {editing ? (
          <EditProfileForm onCancel={() => setEditing(false)} />
        ) : (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-[var(--ink-500)]">Name</span>
              <p className="font-medium text-[var(--ink-800)]">{user?.name ?? "—"}</p>
            </div>
            <div>
              <span className="text-[var(--ink-500)]">Email</span>
              <p className="font-medium text-[var(--ink-800)]">{user?.email ?? "—"}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Session controls */}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Session</CardTitle>
          <CardMeta>Signing out clears your local session.</CardMeta>
        </div>
        <Button
          variant="danger"
          loading={isLoggingOut}
          onClick={async () => {
            setIsLoggingOut(true);
            try {
              await apiClient.logout();
            } catch {
              toast.error("Logout failed", { description: "Local session was still cleared." });
            } finally {
              clear();
              router.replace("/login");
              setIsLoggingOut(false);
            }
          }}
        >
          <LogOut className="size-4" />
          {isLoggingOut ? "Signing out…" : "Sign out"}
        </Button>
      </Card>
    </div>
  );
}
