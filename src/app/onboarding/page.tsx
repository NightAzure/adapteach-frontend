"use client";

import axios from "axios";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSessionStore } from "@/lib/auth/session-store";
import { apiClient } from "@/lib/api/client";
import type { StudentInvite } from "@/types/models";

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useSessionStore((state) => state.setUser);

  // SEC-05: inviteId and email are plaintext in the URL. At thesis scale the inviteId is a
  // random UUID-hex token (hard to guess) and the email allows pre-filling the form. A
  // production system should use a single opaque signed JWT token instead of two params.
  const inviteId = searchParams.get("invite")?.trim() ?? "";
  const inviteEmail = searchParams.get("email")?.trim() ?? "";

  const [invite, setInvite] = useState<StudentInvite | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      if (typeof detail === "string" && detail.trim().length > 0) {
        return detail;
      }
    }
    return fallback;
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!inviteId || !inviteEmail) return;
      setLoadingInvite(true);
      setInviteError("");
      try {
        const res = await apiClient.getInviteForAcceptance(inviteId, inviteEmail);
        if (cancelled) return;
        setInvite(res.data);
        setName(res.data.name);
      } catch {
        if (cancelled) return;
        setInvite(null);
        setInviteError("Invite link is invalid or expired.");
      } finally {
        if (!cancelled) setLoadingInvite(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [inviteEmail, inviteId]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteId || !inviteEmail) {
      toast.error("Invite link is incomplete");
      return;
    }
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.acceptInvite(inviteId, {
        email: inviteEmail,
        password,
        name: name.trim() || undefined,
      });
      setUser(res.data);
      toast.success("Invitation accepted");
      router.push("/student/dashboard");
    } catch (error) {
      toast.error("Failed to accept invite", {
        description: getErrorMessage(error, "Invite is invalid, expired, or already used."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div className="absolute right-0 top-4">
        <ThemeToggle />
      </div>
      <SectionHeader
        eyebrow="Student Onboarding"
        title="Accept Study Invitation"
        subtitle="Create your learner access and continue to the protocol dashboard."
      />

      {!inviteId || !inviteEmail ? (
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-[var(--ink-800)]">Missing invite details</p>
          <p className="text-sm text-[var(--ink-600)]">
            Open this page using the invite link sent by your instructor.
          </p>
        </Card>
      ) : null}

      {loadingInvite ? (
        <Card>
          <p className="text-sm text-[var(--ink-600)]">Verifying invite...</p>
        </Card>
      ) : null}

      {inviteError ? (
        <Card className="space-y-2 border-rose-200 bg-rose-50">
          <p className="text-sm font-semibold text-rose-700">Invite unavailable</p>
          <p className="text-sm text-rose-700">{inviteError}</p>
        </Card>
      ) : null}

      {invite && !loadingInvite ? (
        <Card className="space-y-4">
          <div className="grid gap-2 text-sm">
            <p>
              <span className="font-semibold text-[var(--ink-700)]">Invite ID:</span> {invite.id}
            </p>
            <p>
              <span className="font-semibold text-[var(--ink-700)]">Assigned Group:</span> {invite.group}
            </p>
            <p>
              <span className="font-semibold text-[var(--ink-700)]">Status:</span> {invite.status}
            </p>
          </div>

          {invite.status !== "invited" ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              This invite is already {invite.status}. If you need access, ask your admin for a new invite.
            </p>
          ) : (
            <form className="space-y-3" onSubmit={submit}>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Full Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">Email</span>
                <input
                  value={inviteEmail}
                  disabled
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[var(--ink-600)]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">Create Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">Confirm Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-0)] px-3 py-2"
                />
              </label>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Activating..." : "Accept Invite & Continue"}
              </Button>
            </form>
          )}
        </Card>
      ) : null}
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
          <Card>
            <p className="text-sm text-[var(--ink-600)]">Loading onboarding...</p>
          </Card>
        </main>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}
