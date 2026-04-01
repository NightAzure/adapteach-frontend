"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MobileNav, SideNav } from "@/components/layout/side-nav";
import { TopBar } from "@/components/layout/top-bar";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/auth/session-store";
import type { UserRole } from "@/types/models";

export function AppShell({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const user = useSessionStore((state) => state.user);
  const bootstrapping = useSessionStore((state) => state.bootstrapping);
  const isRefreshing = useSessionStore((state) => state.isRefreshing);
  const setRoleHint = useSessionStore((state) => state.setRoleHint);

  useEffect(() => {
    setRoleHint(role);
  }, [role, setRoleHint]);

  if (bootstrapping || isRefreshing) {
    return <div className="grid min-h-screen place-items-center"><div className="size-8 animate-spin rounded-full border-4 border-[var(--brand-200)] border-t-[var(--brand-600)]" /></div>;
  }

  if (!user || user.role !== role) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div
          className="max-w-md animate-pop rounded-2xl border p-8 text-center"
          style={{
            background: "var(--surface-1)",
            borderColor: "var(--line)",
            boxShadow: "var(--shadow-modal)",
          }}
        >
          <div
            className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl text-2xl"
            style={{ background: "var(--brand-100)", color: "var(--brand-600)" }}
          >
            🔐
          </div>
          <h1 className="text-xl font-semibold text-[var(--ink-900)]">Sign in required</h1>
          <p className="mt-2 text-sm text-[var(--ink-500)]">
            Please sign in as <span className="font-semibold text-[var(--ink-700)]">{role}</span> to access this workspace.
          </p>
          <div className="mt-6">
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--surface-0)", color: "var(--ink-900)" }}>
      <SideNav role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <MobileNav role={role} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto w-full max-w-6xl animate-fade-up" style={{ animationDelay: "60ms" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
