import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useSettings } from "@/lib/settings-store";
import { useAuth } from "@/lib/auth-store";
import { useSubscription } from "@/lib/subscription/service";
import { useQuests } from "@/lib/quests-store";
import { isNative } from "@/lib/native/platform";
import { updateReminders } from "@/lib/notifications";
import { toast } from "sonner";
export function PreferencesRuntime() {
  const settings = useSettings((s) => s.settings),
    uid = useAuth((s) => s.user?.id);
  const trialEnd = useSubscription((s) => s.trialEnd),
    status = useSubscription((s) => s.status);
  const router = useRouter();
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: light)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "light",
        !!uid && (settings.theme === "light" || (settings.theme === "system" && media.matches)),
      );
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      document.documentElement.classList.remove("light");
    };
  }, [uid, settings.theme]);
  useEffect(() => {
    void updateReminders().catch(() =>
      toast.error(
        "Device reminders could not be updated. Check notification permission in Settings.",
      ),
    );
  }, [uid, settings.notifications, trialEnd, status]);
  useEffect(() => {
    if (!uid) return;
    let previousStatus = useSubscription.getState().status;
    const stopBilling = useSubscription.subscribe((s) => {
      if (
        s.status !== previousStatus &&
        s.loaded &&
        useSettings.getState().settings.notifications.billing
      )
        toast.info(
          s.status === "grace"
            ? "Payment needs attention. Review your subscription."
            : `Subscription status: ${s.status}.`,
        );
      previousStatus = s.status;
    });
    const stopQuests = useQuests.subscribe((s, previous) => {
      const added = s.events.filter(
        (e) =>
          !previous.events.some((p) => p.id === e.id) &&
          (e.kind === "achievement" || e.kind === "levelup"),
      );
      if (useSettings.getState().settings.notifications.achievements && added.length)
        toast.success("Your Legacy has a new milestone.");
    });
    return () => {
      stopBilling();
      stopQuests();
    };
  }, [uid]);
  useEffect(() => {
    if (!isNative()) return;
    let stopped = false;
    let remove: (() => void) | undefined;
    void import("@capacitor/local-notifications").then(async ({ LocalNotifications: n }) => {
      const handle = await n.addListener("localNotificationActionPerformed", ({ notification }) => {
        const extra = notification.extra;
        if (
          extra?.userId === useAuth.getState().user?.id &&
          (extra?.route === "/" || extra?.route === "/settings")
        )
          void router.navigate({ to: extra.route });
      });
      if (stopped) void handle.remove();
      else
        remove = () => {
          void handle.remove();
        };
    });
    return () => {
      stopped = true;
      remove?.();
    };
  }, [router]);
  return null;
}
