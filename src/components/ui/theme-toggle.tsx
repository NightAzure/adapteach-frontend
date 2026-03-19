"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`rounded-full border p-2 text-[var(--ink-500)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink-900)] ${className}`}
      style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
