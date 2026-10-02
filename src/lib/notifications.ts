/** Local reminders only. No push token or remote push service is used. */
import { isNative } from "./native/platform";
import { useAuth } from "./auth-store";
import { useSettings } from "./settings-store";
import { useSubscription } from "./subscription/service";
let generation = 0;
let queue = Promise.resolve();
export async function requestReminderPermission() {
  if (!isNative()) return "unavailable";
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const { display } = await LocalNotifications.requestPermissions();
  if (display === "granted") await updateReminders();
  return display;
}
export function updateReminders() {
  const version = ++generation;
  queue = queue
    .catch(() => {})
    .then(async () => {
      if (!isNative()) return;
      const { LocalNotifications: n } = await import("@capacitor/local-notifications");
      const pending = await n.getPending();
      if (pending.notifications.length) await n.cancel(pending);
      await n.removeAllDeliveredNotifications();
      if (version !== generation) return;
      const uid = useAuth.getState().user?.id;
      if (!uid || (await n.checkPermissions()).display !== "granted") return;
      const settings = useSettings.getState().settings.notifications,
        subscription = useSubscription.getState();
      const notifications = [];
      if (settings.dailyBrief)
        notifications.push({
          id: 1001,
          title: "QuestOS daily check-in",
          body: "Open your Coach when you are ready.",
          schedule: { on: { hour: 8, minute: 0 }, repeats: true },
          extra: { userId: uid, route: "/" },
        });
      if (settings.trialReminders && subscription.status === "trial" && subscription.trialEnd) {
        for (const days of [3, 1]) {
          const at = new Date(Date.parse(subscription.trialEnd) - days * 86400000);
          if (at.getTime() > Date.now())
            notifications.push({
              id: 1100 + days,
              title: "QuestOS trial reminder",
              body: "Review your plan in Settings. Your core quests remain available on Free.",
              schedule: { at },
              extra: { userId: uid, route: "/settings" },
            });
        }
      }
      if (version === generation && notifications.length) await n.schedule({ notifications });
    });
  return queue;
}
