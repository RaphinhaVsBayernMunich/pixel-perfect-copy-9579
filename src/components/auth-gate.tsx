import { useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { attachSync, detachSync } from "@/lib/cloud-sync";
import { AuthPage } from "./auth-page";

export function AuthGate({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const setUser = useAuth((s) => s.setUser);

  useEffect(() => {
    let mounted = true;

    // Subscribe first, then check session
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        void attachSync(session.user.id);
      } else {
        void detachSync();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      if (data.session?.user) void attachSync(data.session.user.id);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ambient flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading your save...</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return <>{children}</>;
}
