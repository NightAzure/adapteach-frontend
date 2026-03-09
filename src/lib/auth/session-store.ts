"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile, UserRole } from "@/types/models";

interface SessionState {
  user: UserProfile | null;
  roleHint: UserRole | null;
  bootstrapping: boolean;
  setUser: (user: UserProfile | null) => void;
  setRoleHint: (role: UserRole | null) => void;
  setBootstrapping: (v: boolean) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      roleHint: null,
      bootstrapping: true,
      setUser: (user) => set({ user }),
      setRoleHint: (roleHint) => set({ roleHint }),
      setBootstrapping: (bootstrapping) => set({ bootstrapping }),
      clear: () => set({ user: null, roleHint: null }),
    }),
    { name: "adapteach-session", partialize: (state) => ({ roleHint: state.roleHint }) },
  ),
);
