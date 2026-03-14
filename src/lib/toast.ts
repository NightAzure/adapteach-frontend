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
        background: "#dcfce7",
        border: "1.5px solid #86efac",
        color: "#15803d",
      },
    });
  },

  error(message: string, opts?: Options) {
    return sonnerToast.error(message, {
      duration: opts?.duration ?? 5000,
      description: opts?.description,
      style: {
        background: "#fee2e2",
        border: "1.5px solid #fca5a5",
        color: "#991b1b",
      },
    });
  },

  hint(message: string, opts?: Options) {
    return sonnerToast(message, {
      duration: opts?.duration ?? 4000,
      description: opts?.description,
      style: {
        background: "#fef9c3",
        border: "1.5px solid #fbbf24",
        color: "#92400e",
      },
    });
  },

  info(message: string, opts?: Options) {
    return sonnerToast.info(message, {
      duration: opts?.duration ?? 4000,
      description: opts?.description,
      style: {
        background: "#dbeafe",
        border: "1.5px solid #93c5fd",
        color: "#1e40af",
      },
    });
  },
};
