"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function NotFound() {
  return (
    <main
      className="relative grid min-h-screen place-items-center p-8"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -20%, color-mix(in srgb, var(--brand-500) 12%, transparent), transparent), var(--surface-0)",
      }}
    >
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="text-center">
        <p
          className="text-8xl font-bold leading-none tracking-tight"
          style={{ color: "var(--brand-600)", fontFamily: "var(--font-heading)" }}
        >
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-[var(--ink-900)]">Page not found</h1>
        <p className="mt-2 max-w-xs text-sm text-[var(--ink-500)]">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-[var(--brand-600)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-700)]"
          >
            Go home
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-[var(--ink-800)] transition-colors hover:bg-[var(--surface-2)]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
