import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-semibold transition-all duration-[var(--duration-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-600)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,var(--brand-600),var(--brand-500))] text-white shadow-[var(--shadow-brand)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_10px_24px_color-mix(in_srgb,var(--brand-700)_45%,transparent)] active:translate-y-0",
        secondary:
          "bg-[var(--surface-2)] text-[var(--ink-900)] border border-[var(--line)] hover:-translate-y-0.5 hover:bg-[var(--surface-3)] hover:shadow-[var(--shadow-card)] active:translate-y-0",
        ghost:
          "text-[var(--ink-700)] hover:bg-[var(--surface-2)] hover:text-[var(--ink-900)]",
        danger:
          "bg-[linear-gradient(135deg,#ca4867,#a12f4f)] text-white shadow-[0_6px_16px_rgba(161,47,79,0.35)] hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show a spinner and disable the button while true */
  loading?: boolean;
  /** Icon rendered to the left of the label */
  icon?: React.ReactNode;
}

export function Button({ className, variant, size, loading, icon, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : icon ? (
        <span className="size-4 shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
