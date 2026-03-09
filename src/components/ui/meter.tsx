"use client";

import * as Progress from "@radix-ui/react-progress";
import { cn } from "@/lib/utils/cn";

type MeterVariant = "brand" | "green" | "amber" | "red" | "auto";

function colorForValue(value: number, variant: MeterVariant): string {
  if (variant === "green") return "bg-emerald-500";
  if (variant === "amber") return "bg-amber-400";
  if (variant === "red")   return "bg-rose-500";
  if (variant === "brand") return "bg-[var(--brand-600)]";
  // auto: derive from threshold
  if (value >= 0.6) return "bg-[var(--brand-600)]";
  if (value >= 0.35) return "bg-amber-400";
  return "bg-rose-500";
}

interface MeterProps {
  value: number;
  variant?: MeterVariant;
  className?: string;
}

export function Meter({ value, variant = "auto", className }: MeterProps) {
  const safe = Number.isFinite(value) ? value : 0;
  const percent = Math.max(0, Math.min(100, Math.round(safe * 100)));
  const colorClass = colorForValue(safe, variant);

  return (
    <Progress.Root
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]", className)}
      value={percent}
    >
      <Progress.Indicator
        className={cn("h-full rounded-full transition-transform duration-500", colorClass)}
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </Progress.Root>
  );
}
