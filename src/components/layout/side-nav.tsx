"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  ChartNoAxesCombined,
  ClipboardList,
  Cpu,
  Database,
  Home,
  LibraryBig,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  LayoutDashboard,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };

const studentNav: NavItem[] = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/session", label: "Activities", icon: BookOpenCheck },
  { href: "/student/assessments", label: "Assessments", icon: ClipboardList },
  { href: "/student/history", label: "Progress", icon: ChartNoAxesCombined },
  { href: "/student/profile", label: "Profile", icon: Settings },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: Home },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/assessments", label: "Assessments", icon: ClipboardList },
  { href: "/admin/content", label: "Artifact Library", icon: LibraryBig, exact: true },
  { href: "/admin/content/corpus", label: "Corpus", icon: Database },
  { href: "/admin/content/generate", label: "Generate", icon: Sparkles },
  { href: "/admin/jobs", label: "Jobs", icon: Cpu },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
  { href: "/admin/analytics", label: "Analytics", icon: Activity },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function navForRole(role: "student" | "admin") {
  return role === "student" ? studentNav : adminNav;
}

export function SideNav({ role }: { role: "student" | "admin" }) {
  const pathname = usePathname();
  const nav = navForRole(role);

  return (
    <aside
      className="hidden w-64 flex-col gap-2 border-r p-4 lg:flex"
      style={{
        background: "var(--surface-sidebar)",
        borderColor: "var(--line)",
        minHeight: "100vh",
      }}
    >
      {/* Logo / brand */}
      <div className="mb-4 px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ink-500)]">AdapTeach</p>
        <h1 className="text-base font-semibold text-[var(--ink-900)]">
          {role === "student" ? "Learning Studio" : "Admin Observatory"}
        </h1>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[linear-gradient(90deg,var(--brand-100),color-mix(in_srgb,var(--brand-100)_60%,transparent))] text-[var(--brand-800)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-500)_30%,transparent)]"
                  : "text-[var(--ink-600)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-900)]",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active ? "text-[var(--brand-600)]" : "text-[var(--ink-500)] group-hover:text-[var(--ink-700)]",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav({ role }: { role: "student" | "admin" }) {
  const pathname = usePathname();
  const nav = navForRole(role);

  return (
    <nav className="border-b bg-[var(--surface-header)] px-2 py-2 backdrop-blur-sm lg:hidden" style={{ borderColor: "var(--line)" }}>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all",
                active
                  ? "border-[color-mix(in_srgb,var(--brand-500)_40%,var(--line))] bg-[var(--brand-100)] text-[var(--brand-800)]"
                  : "border-[var(--line)] bg-[var(--surface-1)] text-[var(--ink-600)] hover:bg-[var(--surface-2)]",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
