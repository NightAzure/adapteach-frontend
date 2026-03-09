"use client";

import { useCallback } from "react";
import { useTelemetryMutation } from "@/lib/hooks/queries";
import { useSessionStore } from "@/lib/auth/session-store";
import type { TelemetryEvent } from "@/types/models";

export function useTelemetry() {
  const { mutate } = useTelemetryMutation();
  const user = useSessionStore((s) => s.user);

  const track = useCallback(
    (event: Omit<TelemetryEvent, "userId" | "role" | "ts">) => {
      if (!user) return;
      mutate({
        ...event,
        userId: user.id,
        role: user.role,
        ts: new Date().toISOString(),
      });
    },
    [mutate, user],
  );

  return { track };
}
