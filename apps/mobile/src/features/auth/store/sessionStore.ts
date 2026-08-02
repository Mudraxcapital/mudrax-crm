import type { AuthMe, AuthSession } from "@mudrax/types";
import { create } from "zustand";
import {
  bootstrapSession,
  loginWithCredentials,
  logout,
  refreshAuthMe,
} from "@/features/auth/data/authRepository";
import { useLeadWorkflowStore } from "@/features/leads/store/leadWorkflowStore";

interface SessionState {
  session: AuthSession | null;
  me: AuthMe | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  me: null,
  isHydrated: false,
  isAuthenticated: false,

  async hydrate() {
    try {
      const { session, me } = await bootstrapSession();
      set({
        session,
        me,
        isAuthenticated: Boolean(session?.user?.id && me?.user?.id),
        isHydrated: true,
      });
    } catch {
      set({ session: null, me: null, isAuthenticated: false, isHydrated: true });
    }
  },

  async signIn(email, password) {
    const { session, me } = await loginWithCredentials({ email, password });
    set({
      session,
      me,
      isAuthenticated: Boolean(session?.user?.id && me?.user?.id),
    });
  },

  async signOut() {
    await logout();
    useLeadWorkflowStore.getState().setSelectedCampaign(null);
    useLeadWorkflowStore.getState().resetFilters();
    set({ session: null, me: null, isAuthenticated: false });
  },

  async refreshMe() {
    const me = await refreshAuthMe();
    set({ me });
  },
}));
