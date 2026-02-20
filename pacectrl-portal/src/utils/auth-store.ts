/* ============================================================
 * Auth Store – Zustand store for authentication state
 * ============================================================ */

import { create } from "zustand";
import type { MeResponse } from "./types";
import { login as apiLogin, getMe } from "./api";

interface AuthState {
  token: string | null;
  user: MeResponse | null;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token:
    typeof window !== "undefined"
      ? localStorage.getItem("pacectrl_token")
      : null,
  user: null,
  isLoading: false,
  error: null,

  /** Log in with username + password, then fetch the current user profile */
  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiLogin(username, password);
      localStorage.setItem("pacectrl_token", res.access_token);
      set({ token: res.access_token });
      const me = await getMe();
      localStorage.setItem("pacectrl_operator_id", String(me.operator_id));
      set({ user: me, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Login failed",
        isLoading: false,
      });
      throw err;
    }
  },

  /** Clear auth state and redirect to login */
  logout: () => {
    localStorage.removeItem("pacectrl_token");
    localStorage.removeItem("pacectrl_operator_id");
    set({ token: null, user: null });
  },

  /** Rehydrate user on app boot if token exists */
  hydrate: async () => {
    const t =
      typeof window !== "undefined"
        ? localStorage.getItem("pacectrl_token")
        : null;
    if (!t) return;
    set({ isLoading: true });
    try {
      const me = await getMe();
      set({ token: t, user: me, isLoading: false });
    } catch {
      // Token expired / invalid – clean up
      localStorage.removeItem("pacectrl_token");
      localStorage.removeItem("pacectrl_operator_id");
      set({ token: null, user: null, isLoading: false });
    }
  },
}));
