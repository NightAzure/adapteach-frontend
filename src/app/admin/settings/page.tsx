"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { useSessionStore } from "@/lib/auth/session-store";
import {
  useCheckGeminiHealthMutation,
  useSetGeminiModelMutation,
  useUpdateSelfMutation,
} from "@/lib/hooks/queries";
import type { GeminiHealth } from "@/types/models";

function GeminiStatusRow({ health, activeModelOverride }: { health: GeminiHealth; activeModelOverride: string | null }) {
  const displayModel = activeModelOverride ?? health.activeModel;
  if (!health.configured) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        <strong>Not configured</strong> — set{" "}
        <code className="rounded bg-rose-100 px-1">ADAPTEACH_LLM_GEMINI_API_KEY</code> in backend{" "}
        <code>.env</code>.
      </div>
    );
  }
  if (!health.reachable) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Key set but unreachable.</strong>
        {health.error ? <span className="ml-1 font-mono text-xs">{health.error}</span> : null}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <strong>Connected</strong> — active model:{" "}
      <span className="font-mono text-xs">{displayModel}</span>
    </div>
  );
}

function GeminiModelSelector({
  health,
  onSaved,
}: {
  health: GeminiHealth;
  onSaved: (model: string) => void;
}) {
  const [committed, setCommitted] = useState(health.activeModel);
  const [selected, setSelected] = useState(health.activeModel);
  const setModel = useSetGeminiModelMutation();

  useEffect(() => {
    setCommitted(health.activeModel);
    setSelected(health.activeModel);
  }, [health.activeModel]);

  if (!health.reachable || health.availableModels.length === 0) return null;

  const isDirty = selected !== committed;

  function handleSave() {
    setModel.mutate(selected, {
      onSuccess: () => {
        setCommitted(selected);
        onSaved(selected);
        toast.success("Model saved", { description: selected });
      },
      onError: (err) => {
        toast.error("Failed to save model", { description: String(err) });
      },
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[var(--ink-700)]">Active model</p>
      <div className="flex items-center gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink-800)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          {health.availableModels.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
          {!health.availableModels.includes(selected) && (
            <option value={selected}>{selected} (current)</option>
          )}
        </select>
        <Button
          type="button"
          variant="default"
          disabled={!isDirty || setModel.isPending}
          onClick={handleSave}
        >
          {setModel.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {setModel.isError && (
        <p className="text-xs text-rose-700">
          Failed to save — check backend logs and try again.
        </p>
      )}
    </div>
  );
}

function EditAccountForm({ onCancel }: { onCancel: () => void }) {
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
        toast.success("Account updated");
        onCancel();
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          String(err);
        toast.error("Update failed", { description: msg });
      },
    });
  }

  const fieldClass =
    "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink-800)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

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

export default function AdminSettingsPage() {
  const user = useSessionStore((state) => state.user);
  const geminiHealth = useCheckGeminiHealthMutation();
  const [activeModelOverride, setActiveModelOverride] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState(false);

  useEffect(() => {
    if (geminiHealth.isSuccess) setActiveModelOverride(null);
  }, [geminiHealth.isSuccess, geminiHealth.data]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Admin Settings"
        title="Integration Controls"
        subtitle="Environment and policy controls for deployment readiness."
      />

      {/* Account */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Account</CardTitle>
            <CardMeta>Update your name, email address, or password.</CardMeta>
          </div>
          {!editingAccount && (
            <Button type="button" variant="secondary" onClick={() => setEditingAccount(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
        {editingAccount ? (
          <EditAccountForm onCancel={() => setEditingAccount(false)} />
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

      {/* Gemini API */}
      <Card className="space-y-3">
        <CardTitle>Gemini API</CardTitle>
        <CardMeta>
          Verifies that <code>ADAPTEACH_LLM_GEMINI_API_KEY</code> is set and accepted by the
          Gemini API. Fetches the list of available models — no tokens are generated.
        </CardMeta>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={geminiHealth.isPending}
            onClick={() => geminiHealth.mutate()}
          >
            {geminiHealth.isPending ? "Checking…" : "Test Connection"}
          </Button>
          {geminiHealth.isIdle && (
            <span className="text-sm text-[var(--ink-500)]">
              Click to check connectivity and browse available models.
            </span>
          )}
        </div>
        {geminiHealth.data && (
          <div className="space-y-3">
            <GeminiStatusRow
              health={geminiHealth.data.data}
              activeModelOverride={activeModelOverride}
            />
            <GeminiModelSelector
              health={geminiHealth.data.data}
              onSaved={(model) => setActiveModelOverride(model)}
            />
          </div>
        )}
        {geminiHealth.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Request failed — backend may be down or auth is required.
          </div>
        )}
      </Card>
    </div>
  );
}
