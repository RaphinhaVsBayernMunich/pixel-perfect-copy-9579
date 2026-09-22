import { useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";
import { useQuests } from "@/lib/quests-store";
import { attachSync, detachSync, retrySync } from "@/lib/cloud-sync";
import { useUI } from "@/lib/ui-store";
import { resetAnalytics } from "@/lib/analytics";
import { useSubscription } from "@/lib/subscription/service";
import { AuthPage } from "./auth-page";
import { OnboardingWizard } from "./onboarding/wizard";

export function AuthGate({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const cloudLoaded = useAuth((s) => s.cloudLoaded);
  const syncError = useAuth((s) => s.syncError);
  const setUser = useAuth((s) => s.setUser);
  const onboardingCompleted = useQuests((s) => s.onboardingCompleted);
  const initSubscription = useSubscription((s) => s.init);
  const resetSubscription = useSubscription((s) => s.reset);

  const userId = user?.id;
  useEffect(() => {
    if (userId && cloudLoaded) void initSubscription(userId);
    if (!user) resetSubscription();
  }, [userId, cloudLoaded, initSubscription, resetSubscription]);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (useAuth.getState().user?.id !== session?.user?.id) {
        detachSync();
        resetSubscription();
        resetAnalytics();
        useUI.setState({
          quickAddOpen: false,
          editorQuestId: undefined,
          aiCoachOpen: false,
          paywallOpen: false,
          checkoutClientSecret: null,
        });
      }
      setUser(session?.user ?? null);
      clearTimeout(timer);
      if (session?.user) {
        // Do not perform additional auth/network work inside the Supabase callback.
        timer = setTimeout(() => {
          if (mounted && useAuth.getState().user?.id === session.user.id) {
            void attachSync(session.user.id, session.access_token);
          }
        }, 0);
      } else {
        void detachSync();
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
      detachSync();
    };
  }, [setUser, resetSubscription]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ambient flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading your save...</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (!cloudLoaded) {
    return (
      <div className="min-h-screen bg-ambient flex items-center justify-center">
        {syncError ? (
          <div role="alert">
            <p>{syncError}</p>
            <button onClick={() => void retrySync()}>Retry sync</button>
          </div>
        ) : (
          <div className="animate-pulse text-sm text-muted-foreground">Syncing your legacy...</div>
        )}
      </div>
    );
  }

  return (
    <div key={user.id}>
      {syncError && (
        <div role="alert" className="border-b border-destructive p-3 text-sm">
          {syncError}{" "}
          <button className="underline" onClick={() => void retrySync()}>
            Retry sync
          </button>
        </div>
      )}
      {!onboardingCompleted ? <OnboardingWizard /> : children}
    </div>
  );
}
