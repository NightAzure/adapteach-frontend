"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as Select from "@radix-ui/react-select";
import { ChevronDown, FlaskConical, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { useSessionStore } from "@/lib/auth/session-store";
import { useTelemetryMutation } from "@/lib/hooks/queries";
import { toast } from "@/lib/toast";
import type { UserRole } from "@/types/models";

type FormValues = {
  email: string;
  password: string;
  role: UserRole;
};

export default function LoginPage() {
  const router = useRouter();
  const { register, setValue, handleSubmit, formState } = useForm<FormValues>({
    defaultValues: { email: "", password: "", role: "student" },
  });
  const setUser = useSessionStore((state) => state.setUser);
  const existingUser = useSessionStore((state) => state.user);
  const { mutate: sendTelemetry } = useTelemetryMutation();
  const [role, setRole] = useState<UserRole>("student");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existingUser) {
      router.replace(existingUser.role === "admin" ? "/admin" : "/student/dashboard");
    }
  }, [existingUser, router]);

  const onSubmit = handleSubmit(async (values) => {
    setErrorMsg(null);
    try {
      const response = await apiClient.login(values.email, values.password, values.role);
      const user = response.data;
      setUser(user);
      sendTelemetry({ event: "user_login", userId: user.id, role: user.role, ts: new Date().toISOString() });
      toast.success("Welcome back! 🎉", { description: `Signed in as ${user.name}` });
      router.push(values.role === "admin" ? "/admin" : "/student/dashboard");
    } catch {
      setErrorMsg("Couldn't sign you in. Double-check your email and password.");
    }
  });

  return (
    <main
      className="grid min-h-screen place-items-center p-4"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -20%, color-mix(in srgb, var(--brand-500) 18%, transparent), transparent), var(--surface-0)",
      }}
    >
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center animate-fade-up">
          <div
            className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl text-2xl"
            style={{ background: "var(--brand-100)", color: "var(--brand-600)" }}
          >
            <Sparkles className="size-7" />
          </div>
          <h1 className="text-3xl font-semibold text-[var(--ink-900)]">Let's get started</h1>
          <p className="mt-2 text-sm text-[var(--ink-500)]">Sign in to continue your learning journey</p>
        </div>

        <div className="grid gap-4 animate-fade-up lg:grid-cols-[1.1fr_0.9fr]" style={{ animationDelay: "80ms" }}>
          {/* Feature panel */}
          <Card className="border-none bg-[linear-gradient(145deg,#17332f,#27554b_55%,#356f61)] text-white">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">AdapTeach</p>
            <h2 className="mt-3 text-2xl font-semibold lg:text-3xl">Adaptive Learning Platform</h2>
            <p className="mt-3 text-sm text-emerald-50/85">
              Personalized Python education powered by knowledge graphs and intelligent adaptation.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/20 bg-white/10 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap className="size-4" /> Student
                </p>
                <p className="text-xs text-emerald-100/80">
                  Activities, assessments, mastery tracking, and your personal survey.
                </p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <FlaskConical className="size-4" /> Admin
                </p>
                <p className="text-xs text-emerald-100/80">
                  Study controls, analytics, adaptive vs static comparisons, and content governance.
                </p>
              </div>
            </div>
          </Card>

          {/* Sign-in form */}
          <Card className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-[var(--ink-900)]">Sign in</h2>
              <p className="mt-1 text-sm text-[var(--ink-500)]">
                Use your study credentials to continue.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[var(--ink-800)]">Email</span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-[var(--radius-md)] border bg-[var(--surface-0)] px-3 py-2.5 text-sm transition-colors focus:border-[var(--brand-500)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-500)_30%,transparent)]"
                  style={{ borderColor: "var(--line)", color: "var(--ink-900)" }}
                  {...register("email", { required: true })}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[var(--ink-800)]">Password</span>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-[var(--radius-md)] border bg-[var(--surface-0)] px-3 py-2.5 text-sm transition-colors focus:border-[var(--brand-500)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-500)_30%,transparent)]"
                  style={{ borderColor: "var(--line)", color: "var(--ink-900)" }}
                  {...register("password", { required: true })}
                />
              </label>

              <div className="space-y-1.5">
                <span className="text-sm font-medium text-[var(--ink-800)]">Role</span>
                <Select.Root
                  value={role}
                  onValueChange={(value) => {
                    const nextRole = value as UserRole;
                    setRole(nextRole);
                    setValue("role", nextRole);
                  }}
                >
                  <Select.Trigger className="flex w-full items-center justify-between rounded-[var(--radius-md)] border bg-[var(--surface-0)] px-3 py-2.5 text-sm transition-colors focus:border-[var(--brand-500)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-500)_30%,transparent)]" style={{ borderColor: "var(--line)", color: "var(--ink-900)" }}>
                    <Select.Value placeholder="Select role" />
                    <Select.Icon>
                      <ChevronDown className="size-4 text-[var(--ink-500)]" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="z-50 rounded-[var(--radius-lg)] border bg-[var(--surface-1)] p-1.5 shadow-[var(--shadow-popover)]" style={{ borderColor: "var(--line)" }}>
                      <Select.Viewport>
                        <Select.Item value="student" className="cursor-pointer rounded-[var(--radius-sm)] px-3 py-2 text-sm outline-none hover:bg-[var(--surface-2)] data-[highlighted]:bg-[var(--surface-2)]" style={{ color: "var(--ink-900)" }}>
                          <Select.ItemText>Student</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="admin" className="cursor-pointer rounded-[var(--radius-sm)] px-3 py-2 text-sm outline-none hover:bg-[var(--surface-2)] data-[highlighted]:bg-[var(--surface-2)]" style={{ color: "var(--ink-900)" }}>
                          <Select.ItemText>Admin</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              {errorMsg && (
                <div className="animate-slide-in rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMsg}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                loading={formState.isSubmitting}
                disabled={formState.isSubmitting}
              >
                {formState.isSubmitting ? "Signing in…" : "Continue →"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
