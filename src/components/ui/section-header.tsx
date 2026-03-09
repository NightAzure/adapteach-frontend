import { cn } from "@/lib/utils/cn";

export function SectionHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="space-y-1">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">{eyebrow}</p> : null}
        <h2 className="text-2xl font-semibold text-[var(--ink-900)]">{title}</h2>
        {subtitle ? <p className="max-w-3xl text-sm text-[var(--ink-500)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
