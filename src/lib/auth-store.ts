import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
  cloudLoaded: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setCloudLoaded: (v: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  cloudLoaded: false,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  setCloudLoaded: (v) => set({ cloudLoaded: v }),
}));
