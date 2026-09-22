import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
  cloudLoaded: boolean;
  syncError: string | null;
  setSyncError: (error: string | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setCloudLoaded: (v: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  cloudLoaded: false,
  syncError: null,
  setSyncError: (syncError) => set({ syncError }),
  setUser: (user) =>
    set((state) => ({
      user,
      loading: false,
      ...(state.user?.id !== user?.id ? { cloudLoaded: false, syncError: null } : {}),
    })),
  setLoading: (loading) => set({ loading }),
  setCloudLoaded: (v) => set({ cloudLoaded: v }),
}));
