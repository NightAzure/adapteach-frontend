import { cn } from "@/lib/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lift the card on hover with a deeper shadow */
  hoverable?: boolean;
  /** Show an explicit border (always-on, not just on hover) */
  bordered?: boolean;
}

export function Card({ className, hoverable, bordered, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border bg-[color-mix(in_srgb,var(--surface-1)_94%,white)] p-5",
        "shadow-[var(--shadow-card)]",
        hoverable && "cursor-pointer transition-all duration-[var(--duration-base)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-popover)]",
        bordered && "border-[var(--line)]",
        !bordered && "border-[var(--line)]",
        className,
      )}
      style={{ borderColor: "var(--line)" }}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold text-[var(--ink-900)]", className)} {...props} />;
}

export function CardMeta({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--ink-500)]", className)} {...props} />;
}
