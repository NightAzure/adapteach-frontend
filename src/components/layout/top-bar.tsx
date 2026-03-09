"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Moon, Sun, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { useSessionStore } from "@/lib/auth/session-store";

/** Build a readable breadcrumb from a Next.js pathname */
function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const labels: Record<string, string> = {
    student: "Student",
    admin: "Admin",
    dashboard: "Dashboard",
    session: "Learning Session",
    artifact: "Activity",
    assessments: "Assessments",
    pretest: "Pre-test",
    posttest: "Post-test",
    history: "History",
    profile: "Profile",
    survey: "Survey",
    overview: "Overview",
    students: "Students",
    content: "Content",
    jobs: "Jobs",
    logs: "Logs",
    analytics: "Analytics",
    settings: "Settings",
    experiments: "Experiments",
    runs: "Runs",
    artifacts: "Artifacts",
  };

  return segments.map((seg, idx) => ({
    label: labels[seg] ?? (seg.length === 36 ? "Detail" : seg.charAt(0).toUpperCase() + seg.slice(1)),
    isLast: idx === segments.length - 1,
  }));
}

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const clearSession = useSessionStore((state) => state.clear);
  const [loggingOut, setLoggingOut] = useState(false);
  const breadcrumbs = useBreadcrumbs();

  async function handleLogout() {
    setLoggingOut(true);
    if (user) {
      void apiClient.sendTelemetry({ event: "user_logout", userId: user.id, role: user.role, ts: new Date().toISOString() }).catch(() => undefined);
    }
    try {
      await apiClient.logout();
    } finally {
      clearSession();
      router.push("/login");
    }
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <header
      className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-4 py-2 backdrop-blur-md lg:px-6"
      style={{
        background: "var(--surface-header)",
        borderColor: "var(--line)",
        boxShadow: "0 1px 0 color-mix(in srgb, var(--line) 60%, transparent), var(--shadow-card)",
      }}
    >
      {/* Left — breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="size-3 text-[var(--ink-500)]" />}
            <span
              className={
                crumb.isLast
                  ? "font-semibold text-[var(--ink-900)]"
                  : "text-[var(--ink-500)]"
              }
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Right — actions */}
      <div className="flex items-center gap-1.5">
        {/* Friendly greeting — hidden on very small screens */}
        <span className="hidden rounded-full bg-[var(--brand-100)] px-3 py-1 text-xs font-semibold text-[var(--brand-800)] sm:inline-flex">
          Hi, {firstName} 👋
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="rounded-full"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* Avatar chip */}
        <div
          className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--line)",
            color: "var(--ink-700)",
          }}
        >
          <span
            className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
            style={{ background: "var(--brand-600)" }}
            aria-hidden
          >
            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </span>
          <span className="hidden sm:inline">{user?.name ?? "Guest"}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Sign out"
          className="rounded-full"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
