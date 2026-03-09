/**
 * Thin wrapper over sonner with student-friendly copy and branded styling.
 * Use these instead of calling `toast.*` from sonner directly.
 */
import { toast as sonnerToast } from "sonner";

type Options = { description?: string; duration?: number };

export const toast = {
  success(message: string, opts?: Options) {
    return sonnerToast.success(message, {
      duration: opts?.duration ?? 4000,
      description: opts?.description,
      style: {
        background: "color-mix(in srgb, var(--brand-100) 80%, white)",
        border: "1px solid color-mix(in srgb, var(--brand-500) 35%, var(--line))",
        color: "var(--brand-800)",
      },
    });
  },

  error(message: string, opts?: Options) {
    return sonnerToast.error(message, {
      duration: opts?.duration ?? 5000,
      description: opts?.description,
      style: {
        background: "color-mix(in srgb, #fee2e2 80%, white)",
        border: "1px solid #fca5a5",
        color: "#991b1b",
      },
    });
  },

  hint(message: string, opts?: Options) {
    return sonnerToast(message, {
      duration: opts?.duration ?? 4000,
      description: opts?.description,
      style: {
        background: "color-mix(in srgb, #fef9c3 80%, white)",
        border: "1px solid #fde047",
        color: "#713f12",
      },
    });
  },

  info(message: string, opts?: Options) {
    return sonnerToast.info(message, {
      duration: opts?.duration ?? 4000,
      description: opts?.description,
    });
  },
};
