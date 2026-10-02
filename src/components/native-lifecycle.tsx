import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { isNative } from "@/lib/native/platform";
import { supabase } from "@/integrations/supabase/client";
import { acceptNativeAuth } from "@/lib/native/auth";
import { retrySync } from "@/lib/cloud-sync";
import { useSubscription } from "@/lib/subscription/service";
import { useUI } from "@/lib/ui-store";
import { toast } from "sonner";
export function NativeLifecycle() {
  const router = useRouter();
  useEffect(() => {
    if (!isNative()) return;
    let stopped = false;
    const cleanup: (() => void)[] = [];
    const accept = async (url: string) => {
      try {
        await acceptNativeAuth(url);
      } catch {
        toast.error("Sign-in could not finish. Please try again.");
      }
    };
    void (async () => {
      const { App } = await import("@capacitor/app");
      for (const handle of [
        await App.addListener("appUrlOpen", ({ url }) => {
          void accept(url);
        }),
        await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            supabase.auth.startAutoRefresh();
            void retrySync();
            void useSubscription.getState().refreshFromBackend();
          } else supabase.auth.stopAutoRefresh();
        }),
        await App.addListener("backButton", () => {
          const ui = useUI.getState();
          if (
            ui.quickAddOpen ||
            ui.aiCoachOpen ||
            ui.paywallOpen ||
            ui.editorQuestId ||
            ui.checkoutClientSecret
          ) {
            useUI.setState({
              quickAddOpen: false,
              aiCoachOpen: false,
              paywallOpen: false,
              editorQuestId: undefined,
              checkoutClientSecret: null,
            });
            return;
          }
          if (router.state.location.pathname !== "/") void router.navigate({ to: "/" });
          else void App.minimizeApp();
        }),
      ]) {
        if (stopped) void handle.remove();
        else
          cleanup.push(() => {
            void handle.remove();
          });
      }
      const launch = await App.getLaunchUrl();
      if (launch && !stopped) await accept(launch.url);
    })().catch(() => toast.error("Native lifecycle could not initialize. Restart the app."));
    return () => {
      stopped = true;
      cleanup.forEach((fn) => fn());
    };
  }, [router]);
  return null;
}
