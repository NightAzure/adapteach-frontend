"use client";

import { useEffect } from "react";
import { apiClient } from "@/lib/api/client";
import { useSessionStore } from "@/lib/auth/session-store";

export function SessionBootstrap() {
  const setUser = useSessionStore((state) => state.setUser);
  const setBootstrapping = useSessionStore((state) => state.setBootstrapping);
  const clear = useSessionStore((state) => state.clear);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // 1. Try to get the current user with the existing access token.
      try {
        const res = await apiClient.getCurrentUser();
        if (cancelled) return;
        if (res.data) {
          setUser(res.data);
          setBootstrapping(false);
          return;
        }
      } catch {
        if (cancelled) return;
        // 401 in prod — fall through to refresh attempt below.
      }

      // 2. Access token missing or expired — silently try to refresh.
      //    This handles both dev mode (returns null instead of 401)
      //    and prod mode (401 not caught by axios interceptor here).
      try {
        await apiClient.refreshToken();
        if (cancelled) return;
        const retry = await apiClient.getCurrentUser();
        if (cancelled) return;
        if (retry.data) {
          setUser(retry.data);
          setBootstrapping(false);
          return;
        }
      } catch {
        // Refresh also failed — no valid session.
      }

      // 3. Both failed — clear any stale session state.
      if (!cancelled) {
        clear();
        setBootstrapping(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [clear, setBootstrapping, setUser]);

  return null;
}
