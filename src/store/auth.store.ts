import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { setSession } from '@/services/session';
import type { SessionAdmin } from '@/types/admin';

interface AuthState {
  token: string | null;
  admin: SessionAdmin | null;
  signIn: (token: string, admin: SessionAdmin) => void;
  setAdmin: (admin: SessionAdmin) => void;
  signOut: () => void;
}

/**
 * Demo-mode session. In production keep the token in an httpOnly cookie set
 * by the backend and only cache the profile here — never trust these values
 * for authorisation; the API enforces permissions.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      signIn: (token, admin) => {
        setSession(token, admin.id);
        set({ token, admin });
      },
      setAdmin: (admin) => set({ admin }),
      signOut: () => {
        setSession(null, null);
        set({ token: null, admin: null });
      },
    }),
    {
      name: 'servio-console-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ token: s.token, admin: s.admin }),
      onRehydrateStorage: () => (state) => {
        if (state?.token && state.admin) setSession(state.token, state.admin.id);
      },
    },
  ),
);

// Synchronously prime the session for the very first render (persist hydrates synchronously for localStorage).
{
  const s = useAuthStore.getState();
  if (s.token && s.admin) setSession(s.token, s.admin.id);
}
