import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Session = { token: string; userId: string; email: string; fullName: string; expiresAt: string };

type AuthState = {
  session: Session | null;
  setSession: (s: Session) => void;
  logout: () => void;
};

// Persisted to localStorage so a refresh keeps you logged in.
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      logout: () => set({ session: null }),
    }),
    { name: "aiws-auth" }
  )
);
